/**
 * BitPredict — Deploy WBTC (Wrapped Bitcoin) on OPNet
 *
 * Usage: OPNET_MNEMONIC="12 words..." node deploy/deploy-wbtc.mjs
 * Or reads from ../.opnet_seed
 *
 * Set OPNET_NETWORK=mainnet for mainnet deployment (default: testnet)
 * Pool address = deployer's p2tr (BTC sent here during wrap)
 */
import {
    Mnemonic, TransactionFactory, ChallengeSolution,
    OPNetLimitedProvider, BinaryWriter,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NETWORK_NAME = process.env.OPNET_NETWORK || 'testnet';
const RPC_URL = process.env.OPNET_RPC_URL || (NETWORK_NAME === 'mainnet' ? 'https://api.opnet.org' : 'https://testnet.opnet.org');
console.log(`Network: ${NETWORK_NAME} | RPC: ${RPC_URL}`);

// Read mnemonic from env or .opnet_seed file
let phrase = process.env.OPNET_MNEMONIC;
if (!phrase) {
    try {
        phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim();
    } catch { /* ignore */ }
}
if (!phrase) { console.error('Set OPNET_MNEMONIC or create .opnet_seed'); process.exit(1); }

// 1. Derive wallet
const network = NETWORK_NAME === 'mainnet' ? networks.bitcoin : (networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet });
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
const poolAddress = wallet.p2tr; // Pool = deployer's p2tr
console.log('Wallet (deployer):', wallet.p2tr);
console.log('Pool BTC address:', poolAddress);

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

// 4. Build calldata: poolBtcAddress (string with u32 length prefix)
// MUST match contract's calldata.readStringWithLength()
const calldataWriter = new BinaryWriter();
calldataWriter.writeStringWithLength(poolAddress);
const calldata = calldataWriter.getBuffer();

// 5. Deploy WBTC
const wasmPath = join(__dirname, '..', 'contracts', 'build', 'WBTC.wasm');
console.log(`\nUsing WASM: ${wasmPath}`);

let bytecode;
try {
    bytecode = new Uint8Array(readFileSync(wasmPath));
    console.log(`  Bytecode: ${bytecode.length} bytes`);
} catch (e) {
    console.error(`WBTC.wasm not found. Build first: cd contracts && npm run build:wbtc`);
    process.exit(1);
}

// Validate WASM exports (must have 'execute' and 'onDeploy')
try {
    const wasmModule = await WebAssembly.compile(bytecode);
    const exports = WebAssembly.Module.exports(wasmModule).map(e => e.name);
    const required = ['execute', 'onDeploy'];
    const missing = required.filter(name => !exports.includes(name));
    if (missing.length > 0) {
        console.error(`WASM missing required exports: ${missing.join(', ')}`);
        console.error('Available exports:', exports.join(', '));
        process.exit(1);
    }
    console.log('  WASM exports validated: execute, onDeploy present');
} catch (e) {
    console.error(`WASM validation failed: ${e.message}`);
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

// Get dynamic fee rate
let feeRate = 2;
try {
    const feeRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_gasParameters', params: [], id: 2 }),
        signal: AbortSignal.timeout(10000),
    });
    const feeData = await feeRes.json();
    if (feeData.result) feeRate = Math.max(2, Number(feeData.result.feeRate || feeData.result.fastestFee || 2));
    console.log(`Fee rate: ${feeRate} sat/vB`);
} catch { console.log('Using default fee rate: 2 sat/vB'); }

console.log(`\nDeploying WBTC...`);
const factory = new TransactionFactory();
const result = await factory.signDeployment({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    network,
    utxos,
    from: wallet.p2tr,
    feeRate,
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

console.log(`\nWBTC deployed!`);
console.log(`   Address: ${result.contractAddress}`);
console.log(`   Pubkey:  ${result.contractPubKey}`);

// Save deployment info
const deployInfo = {
    network: NETWORK_NAME,
    deployer: wallet.p2tr,
    contract: {
        name: 'WBTC',
        address: result.contractAddress,
        pubkey: result.contractPubKey,
    },
    poolAddress,
    deployedAt: new Date().toISOString(),
};

writeFileSync(join(__dirname, 'wbtc-deployed.json'), JSON.stringify(deployInfo, null, 2));
console.log('\nSaved to deploy/wbtc-deployed.json');
console.log('\n════════════════════════════════════════════');
console.log('WBTC contract address:', result.contractAddress);
console.log('WBTC contract pubkey: ', result.contractPubKey);
console.log('Pool BTC address:     ', poolAddress);
console.log('════════════════════════════════════════════');
console.log('\nUpdate .env with:');
console.log(`VITE_TOKEN_ADDRESS=${result.contractAddress}`);
console.log(`VITE_TOKEN_PUBKEY=${result.contractPubKey}`);
console.log(`VITE_WBTC_POOL_ADDRESS=${poolAddress}`);
