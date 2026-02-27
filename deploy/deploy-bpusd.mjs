/**
 * Deploy BPUSD MintableToken for BitPredict
 * Usage: OPNET_MNEMONIC="12 words..." node deploy/deploy-bpusd.mjs
 * Based on vibe's redeploy-mintable.mjs (proven working)
 */
import {
    Mnemonic, TransactionFactory, ChallengeSolution,
    OPNetLimitedProvider, BinaryWriter,
} from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = 'https://testnet.opnet.org';

const phrase = process.env.OPNET_MNEMONIC;
if (!phrase) { console.error('Set OPNET_MNEMONIC env var'); process.exit(1); }

// 1. Derive wallet
const network = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

// 2. Provider
const provider = new OPNetLimitedProvider(RPC_URL);

// 3. Token config
const TOKEN = {
    name: 'BitPredict USD',
    symbol: 'BPUSD',
    decimals: 8,
    maxSupply: 1_000_000_000n,    // 1B
    initialMintPct: 0n,           // 0% to deployer — all via publicMint
    maxMintPerTx: 10_000_000n,    // 10M per tx
};

// 4. Encode calldata
function encodeMintableCalldata(token) {
    const writer = new BinaryWriter();
    const decimalsMultiplier = 10n ** BigInt(token.decimals);
    const maxSupplyRaw = token.maxSupply * decimalsMultiplier;
    const initialMintAmount = (maxSupplyRaw * token.initialMintPct) / 100n;
    const maxMintPerTxRaw = token.maxMintPerTx * decimalsMultiplier;

    writer.writeU256(maxSupplyRaw);
    writer.writeU8(token.decimals);
    writer.writeStringWithLength(token.name);
    writer.writeStringWithLength(token.symbol);
    writer.writeU256(initialMintAmount);
    writer.writeBoolean(true);               // publicMintEnabled = true
    writer.writeU256(maxMintPerTxRaw);

    console.log(`  maxSupply: ${maxSupplyRaw}`);
    console.log(`  initialMint (${token.initialMintPct}%): ${initialMintAmount}`);
    console.log(`  publicMint: enabled, maxPerTx: ${maxMintPerTxRaw}`);
    return writer.getBuffer();
}

// 5. Get epoch challenge
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
            epochHash: e.epochHash, epochRoot: e.epochRoot,
            targetHash: e.targetHash, targetChecksum: e.targetHash,
            startBlock: e.startBlock, endBlock: e.endBlock,
            proofs: e.proofs,
        },
    });
}

// 6. Deploy
const wasmPath = join(__dirname, 'MintableToken.wasm');
console.log(`\nUsing WASM: ${wasmPath}`);

const bytecode = new Uint8Array(readFileSync(wasmPath));
const calldata = encodeMintableCalldata(TOKEN);
console.log(`Bytecode: ${bytecode.length} bytes, Calldata: ${calldata.length} bytes`);

const challenge = await getChallenge();

const utxos = await provider.fetchUTXO({
    address: wallet.p2tr,
    minAmount: 10000n,
    requestedAmount: 400000n,
});
console.log(`UTXOs: ${utxos.length} (${utxos.reduce((a, u) => a + u.value, 0n)} sats)`);

if (!utxos.length) { console.error('No UTXOs! Fund wallet first.'); process.exit(1); }

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

console.log('\nBroadcasting funding tx...');
const b1 = await provider.broadcastTransaction(result.transaction[0], false);
console.log('Funding:', JSON.stringify(b1));

await new Promise(r => setTimeout(r, 3000));

console.log('Broadcasting deployment tx...');
const b2 = await provider.broadcastTransaction(result.transaction[1], false);
console.log('Deploy:', JSON.stringify(b2));

console.log('\n=== BPUSD DEPLOYED ===');
console.log('Address:', result.contractAddress);
console.log('Pubkey: ', result.contractPubKey);
console.log('Funding TX:', b1?.result || 'unknown');
console.log('Deploy TX: ', b2?.result || 'unknown');

const deployInfo = {
    address: result.contractAddress,
    pubkey: result.contractPubKey,
    symbol: 'BPUSD',
    name: 'BitPredict USD',
    decimals: 8,
    maxSupply: '1000000000',
    publicMint: true,
    maxMintPerTx: '10000000',
    fundingTx: b1?.result || '',
    deployTx: b2?.result || '',
    deployedAt: new Date().toISOString(),
};
writeFileSync(join(__dirname, 'deployed-bpusd.json'), JSON.stringify(deployInfo, null, 2));
console.log('Saved to deploy/deployed-bpusd.json');
