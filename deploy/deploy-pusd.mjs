/**
 * BitPredict — Deploy PUSD MintableToken on OPNet testnet
 * 50% to deployer (for pool/reserves), 50% public mint (users claim via faucet)
 * 
 * Usage: OPNET_MNEMONIC="12 words..." node deploy/deploy-pusd.mjs
 * Based on working pattern from C:\vibe\deploy\redeploy-mintable.mjs
 */
import {
    Mnemonic, TransactionFactory, ChallengeSolution,
    OPNetLimitedProvider, BinaryWriter, MLDSASecurityLevel, AddressTypes,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = 'https://testnet.opnet.org';

const phrase = process.env.OPNET_MNEMONIC;
if (!phrase) { console.error('❌ Set OPNET_MNEMONIC env var'); process.exit(1); }

// ── 1. Derive wallet ─────────────────────────────────────────────────────────
const network = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network, MLDSASecurityLevel.LEVEL2);
const wallet = mnemonic.deriveUnisat(AddressTypes.P2TR, 0);
console.log('✅ Wallet:', wallet.p2tr);

// ── 2. Provider ───────────────────────────────────────────────────────────────
const provider = new OPNetLimitedProvider(RPC_URL);

// ── 3. PUSD Token config ─────────────────────────────────────────────────────
const TOKEN = {
    name: 'Prediction USD',
    symbol: 'PUSD',
    decimals: 8,
    maxSupply: 1_000_000_000n,      // 1B PUSD
    initialMintPct: 50n,             // 50% to deployer (for pool/reserves)
    maxMintPerTx: 10_000_000n,       // 10M per tx public mint
};

// ── 4. Encode MintableToken calldata ──────────────────────────────────────────
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
    writer.writeU256(initialMintAmount);      // initial mint to deployer
    writer.writeBoolean(true);                // publicMintEnabled = true
    writer.writeU256(maxMintPerTxRaw);        // max per tx

    console.log(`  maxSupply: ${maxSupplyRaw}`);
    console.log(`  initialMint (${token.initialMintPct}%): ${initialMintAmount}`);
    console.log(`  publicMint: enabled, maxPerTx: ${maxMintPerTxRaw}`);

    return writer.getBuffer();
}

// ── 5. Get epoch challenge ────────────────────────────────────────────────────
async function getChallenge() {
    const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_latestEpoch', params: [], id: 1 }),
        signal: AbortSignal.timeout(12000),
    });
    const { result: e } = await res.json();
    console.log('📦 Epoch:', e.epochNumber, '| blocks', e.startBlock, '-', e.endBlock);

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

// ── 6. Deploy ─────────────────────────────────────────────────────────────────
const wasmPath = join(__dirname, 'MintableToken.wasm');
console.log(`\n📄 Using WASM: ${wasmPath}`);

const bytecode = new Uint8Array(readFileSync(wasmPath));
const calldata = encodeMintableCalldata(TOKEN);
console.log(`  Bytecode: ${bytecode.length} bytes, Calldata: ${calldata.length} bytes`);

const challenge = await getChallenge();

const utxos = await provider.fetchUTXO({
    address: wallet.p2tr,
    minAmount: 10000n,
    requestedAmount: 400000n,
});
console.log(`\n💰 UTXOs: ${utxos.length} (${utxos.reduce((a, u) => a + u.value, 0n)} sats)`);

if (!utxos || utxos.length === 0) {
    console.error('❌ No UTXOs. Fund wallet:', wallet.p2tr);
    process.exit(1);
}

console.log(`\n🚀 Deploying PUSD MintableToken...`);
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

console.log(`📡 Broadcasting funding tx...`);
const b1 = await provider.broadcastTransaction(result.transaction[0], false);
console.log('   Funding:', JSON.stringify(b1));

await new Promise(r => setTimeout(r, 3000));

console.log(`📡 Broadcasting deployment tx...`);
const b2 = await provider.broadcastTransaction(result.transaction[1], false);
console.log('   Deploy:', JSON.stringify(b2));

console.log(`\n✅ PUSD deployed!`);
console.log(`   Address: ${result.contractAddress}`);
console.log(`   Pubkey:  ${result.contractPubKey}`);

// ── 7. Save results ───────────────────────────────────────────────────────────
const deployInfo = {
    network: 'testnet',
    deployer: wallet.p2tr,
    token: {
        name: TOKEN.name,
        symbol: TOKEN.symbol,
        address: result.contractAddress,
        pubkey: result.contractPubKey,
        decimals: TOKEN.decimals,
        maxSupply: TOKEN.maxSupply.toString(),
        initialMintPct: 50,
        publicMint: true,
        maxMintPerTx: TOKEN.maxMintPerTx.toString(),
    },
    deployedAt: new Date().toISOString(),
};

writeFileSync(join(__dirname, 'pusd-deployed.json'), JSON.stringify(deployInfo, null, 2));
console.log('\n📝 Saved to deploy/pusd-deployed.json');
console.log('\n════════════════════════════════════════════');
console.log('PUSD address:', result.contractAddress);
console.log('PUSD pubkey: ', result.contractPubKey);
console.log('════════════════════════════════════════════');
console.log('\nNext: update server/index.js and src/ with new PUSD address');
