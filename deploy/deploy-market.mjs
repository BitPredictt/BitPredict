/**
 * BitPredict — Deploy PredictionMarket on OPNet
 *
 * Usage: node deploy/deploy-market.mjs
 * Reads mnemonic from ../.opnet_seed or OPNET_MNEMONIC env
 */
import {
    Mnemonic, TransactionFactory, ChallengeSolution,
    OPNetLimitedProvider, BinaryWriter, Address,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NETWORK_NAME = process.env.OPNET_NETWORK || 'testnet';
const RPC_URL = process.env.OPNET_RPC_URL || (NETWORK_NAME === 'mainnet' ? 'https://api.opnet.org' : 'https://testnet.opnet.org');
console.log(`Network: ${NETWORK_NAME} | RPC: ${RPC_URL}`);

let phrase = process.env.OPNET_MNEMONIC;
if (!phrase) {
    try { phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim(); }
    catch { /* ignore */ }
}
if (!phrase) { console.error('Set OPNET_MNEMONIC or create .opnet_seed'); process.exit(1); }

// WBTC token pubkey (contract reads readAddress = 32-byte pubkey)
const WBTC_PUBKEY = process.env.WBTC_PUBKEY || '0xabf2cab66aa84b86759c3aa948d8f73b108fe8f14f0dc717424727ca3687f6c5';

const network = NETWORK_NAME === 'mainnet' ? networks.bitcoin : (networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet });
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

const provider = new OPNetLimitedProvider(RPC_URL);

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

// Calldata: tokenAddress (32-byte Address)
const calldataWriter = new BinaryWriter();
calldataWriter.writeAddress(Address.fromString(WBTC_PUBKEY));
const calldata = new Uint8Array(calldataWriter.getBuffer());
console.log(`  Token pubkey: ${WBTC_PUBKEY}`);

const wasmPath = join(__dirname, '..', 'contracts', 'build', 'PredictionMarket.wasm');
console.log(`\nUsing WASM: ${wasmPath}`);

let bytecode;
try {
    bytecode = new Uint8Array(readFileSync(wasmPath));
    console.log(`  Bytecode: ${bytecode.length} bytes`);
} catch (e) {
    console.error(`PredictionMarket.wasm not found. Build first: cd contracts && npm run build:market`);
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

console.log(`\nDeploying PredictionMarket...`);
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
    calldata,
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

console.log(`\nPredictionMarket deployed!`);
console.log(`   Address: ${result.contractAddress}`);
console.log(`   Pubkey:  ${result.contractPubKey}`);

const deployInfo = {
    network: NETWORK_NAME,
    deployer: wallet.p2tr,
    contract: {
        name: 'PredictionMarket',
        address: result.contractAddress,
        pubkey: result.contractPubKey,
    },
    tokenPubkey: WBTC_PUBKEY,
    deployedAt: new Date().toISOString(),
};

writeFileSync(join(__dirname, 'market-deployed.json'), JSON.stringify(deployInfo, null, 2));
console.log('\nSaved to deploy/market-deployed.json');
console.log('\n════════════════════════════════════════════');
console.log('PredictionMarket address:', result.contractAddress);
console.log('PredictionMarket pubkey: ', result.contractPubKey);
console.log('════════════════════════════════════════════');
