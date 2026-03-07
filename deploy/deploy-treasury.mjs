/**
 * BitPredict — Deploy Treasury on OPNet testnet
 *
 * Usage: OPNET_MNEMONIC="12 words..." node deploy/deploy-treasury.mjs
 * Or reads from ../.opnet_seed
 *
 * Requires: WBTC token address + server ML-DSA pubkey hash (32 bytes)
 */
import {
    Mnemonic, TransactionFactory, ChallengeSolution,
    OPNetLimitedProvider,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = process.env.OPNET_RPC_URL || 'https://testnet.opnet.org';

// Read mnemonic from env or .opnet_seed file
let phrase = process.env.OPNET_MNEMONIC;
if (!phrase) {
    try {
        phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim();
    } catch { /* ignore */ }
}
if (!phrase) { console.error('Set OPNET_MNEMONIC or create .opnet_seed'); process.exit(1); }

// WBTC token address (from env or default)
const WBTC_ADDRESS = process.env.WBTC_ADDRESS || '';

// 1. Derive wallet
const network = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

// Server ML-DSA pubkey hash — sha256 of the deployer's ML-DSA public key
// In production, this would be a separate server key
const serverMLDSAPubKey = wallet.mldsaKeypair.publicKey;
const serverSignerHash = createHash('sha256').update(serverMLDSAPubKey).digest();
console.log('Server signer hash:', '0x' + serverSignerHash.toString('hex'));

// 2. Provider
const provider = new OPNetLimitedProvider(RPC_URL);

// 3. Get epoch challenge
async function getChallenge() {
    const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_latestEpoch', params: [], id: 1 }),
        signal: AbortSignal.timeout(12000),
    });
    const { result: e } = await res.json();
    console.log('Epoch:', e.epochNumber, '| blocks', e.startBlock, '-', e.endBlock);

    return new ChallengeSolution({
        epochNumber: e.epochNumber,
        mldsaPublicKey: e.proposer.mldsaPublicKey,
        legacyPublicKey: e.proposer.legacyPublicKey,
        solution: e.proposer.solution,
        salt: e.proposer.salt,
        graffiti: e.proposer.graffiti,
        difficulty: Number(e.difficultyScaled),
        verification: {
            epochHash: e.epochHash,
            epochRoot: e.epochRoot,
            targetHash: e.targetHash,
            targetChecksum: e.targetHash,
            startBlock: e.startBlock,
            endBlock: e.endBlock,
            proofs: e.proofs,
        },
    });
}

// 4. Build calldata: tokenAddress (32 bytes) + serverSignerHash (32 bytes)
// Use BinaryWriter pattern from OPNet
import { BinaryWriter } from './node_modules/@btc-vision/transaction/build/index.js';

const calldataWriter = new BinaryWriter();
// Write WBTC token address
calldataWriter.writeString(WBTC_ADDRESS);
calldataWriter.writeBytes(serverSignerHash);

const calldata = calldataWriter.getBuffer();

// 5. Deploy Treasury
const wasmPath = join(__dirname, '..', 'contracts', 'build', 'Treasury.wasm');
console.log(`\nUsing WASM: ${wasmPath}`);

let bytecode;
try {
    bytecode = new Uint8Array(readFileSync(wasmPath));
    console.log(`  Bytecode: ${bytecode.length} bytes`);
} catch (e) {
    console.error(`Treasury.wasm not found. Build first: cd contracts && npx asc --target treasury-release`);
    process.exit(1);
}

const challenge = await getChallenge();

const utxos = await provider.fetchUTXO({
    address: wallet.p2tr,
    minAmount: 10000n,
    requestedAmount: 400000n,
});
console.log(`\nUTXOs: ${utxos.length} (${utxos.reduce((a, u) => a + u.value, 0n)} sats)`);

if (!utxos || utxos.length === 0) {
    console.error('No UTXOs. Fund wallet:', wallet.p2tr);
    process.exit(1);
}

console.log(`\nDeploying Treasury...`);
const factory = new TransactionFactory();
const result = await factory.signDeployment({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    network,
    utxos,
    from: wallet.p2tr,
    feeRate: 2,
    priorityFee: 1000n,
    gasSatFee: 100_000n,
    bytecode,
    calldata: new Uint8Array(calldata),
    challenge,
    linkMLDSAPublicKeyToAddress: true,
    revealMLDSAPublicKey: true,
});

console.log(`Broadcasting funding tx...`);
const b1 = await provider.broadcastTransaction(result.transaction[0], false);
console.log('   Funding:', JSON.stringify(b1));

await new Promise(r => setTimeout(r, 3000));

console.log(`Broadcasting deployment tx...`);
const b2 = await provider.broadcastTransaction(result.transaction[1], false);
console.log('   Deploy:', JSON.stringify(b2));

console.log(`\nTreasury deployed!`);
console.log(`   Address: ${result.contractAddress}`);
console.log(`   Pubkey:  ${result.contractPubKey}`);

// Save
const deployInfo = {
    network: 'testnet',
    deployer: wallet.p2tr,
    contract: {
        name: 'Treasury',
        address: result.contractAddress,
        pubkey: result.contractPubKey,
    },
    config: {
        wbtcAddress: WBTC_ADDRESS,
        serverSignerHash: '0x' + serverSignerHash.toString('hex'),
    },
    deployedAt: new Date().toISOString(),
};

writeFileSync(join(__dirname, 'treasury-deployed.json'), JSON.stringify(deployInfo, null, 2));
console.log('\nSaved to deploy/treasury-deployed.json');
console.log('\n════════════════════════════════════════════');
console.log('Treasury address:', result.contractAddress);
console.log('Treasury pubkey: ', result.contractPubKey);
console.log('════════════════════════════════════════════');
