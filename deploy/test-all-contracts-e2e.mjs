/**
 * BitPredict — Full E2E Test: ALL Contracts × 2 Wallets
 *
 * Usage:
 *   node test-all-contracts-e2e.mjs                  # Phase 1 only (view + setup broadcasts)
 *   node test-all-contracts-e2e.mjs --wait            # Full run: setup → wait 10min → state tests
 *   node test-all-contracts-e2e.mjs --phase2          # Phase 2 only (state tests, run after block)
 *   node test-all-contracts-e2e.mjs --views-only      # View methods only (fast check)
 *
 * Phase 1: View methods + wrap BTC→WBTC + increaseAllowance (broadcasts to mempool)
 * Phase 2: State-changing tests (stake, deposit, buyShares) — needs Phase 1 confirmed
 */
import {
    Mnemonic, OPNetLimitedProvider, Address,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { getContract, JSONRpcProvider, OP_20_ABI } from './node_modules/opnet/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = 'https://testnet.opnet.org';
const args = process.argv.slice(2);
const WAIT_MODE = args.includes('--wait');
const PHASE2_ONLY = args.includes('--phase2');
const VIEWS_ONLY = args.includes('--views-only');

// ═══ Contract Addresses & Pubkeys ═══
const WBTC_ADDRESS = 'opt1sqzymwwcv446449k8ntgzw3mw5qvv3e77mskm2ry2';
const WBTC_PUBKEY = '0xabf2cab66aa84b86759c3aa948d8f73b108fe8f14f0dc717424727ca3687f6c5';
const POOL_ADDRESS = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';
const VAULT_ADDRESS = 'opt1sqqxqss2hqn7hn5xhkv7fzupvn6u3yq7puuypj3uv';
const VAULT_PUBKEY = '0x75b069d8a074f563548101b01800f0632101600412fba0746a3ea7b0d9321fb0';
const TREASURY_ADDRESS = 'opt1sqru309gppp8qv4rqc5wclkq9jlpewh0cfv3c7zrl';
const TREASURY_PUBKEY = '0x69333116fbed463c1709bd8b5b0a75bdc8d6710a3be87a92ea23b509883495cf';
const MARKET_ADDRESS = 'opt1sqreccuzczkhepndmqgumvj9a92zkpjv2asf79nlx';
const MARKET_PUBKEY = '0x29f94407b3a54183f6239c493df2fa0b6807b3c627396e20ac8430b009ed417a';
const ORACLE_ADDRESS = 'opt1sqq6cuxydx96fy3eerrxm6q6een27737ahu0n0jn2';

// Address objects for increaseAllowance spender parameter
const VAULT_ADDR_OBJ = Address.fromString(VAULT_PUBKEY);
const TREASURY_ADDR_OBJ = Address.fromString(TREASURY_PUBKEY);
const MARKET_ADDR_OBJ = Address.fromString(MARKET_PUBKEY);

// ═══ Read mnemonic ═══
let phrase;
try { phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim(); }
catch { phrase = process.env.OPNET_MNEMONIC; }
if (!phrase) { console.error('No mnemonic'); process.exit(1); }

// ═══ Network ═══
const NETWORK = networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet };

// ═══ Derive wallets ═══
const mnemonic = new Mnemonic(phrase, '', NETWORK);
const wallet0 = mnemonic.deriveOPWallet(undefined, 0);
const wallet1 = mnemonic.deriveOPWallet(undefined, 1);

// ═══ Providers ═══
const provider = new OPNetLimitedProvider(RPC_URL);
const rpcProvider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

// ═══ ABIs ═══
const WBTCAbi = [
    { name: 'wrap', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'unwrap', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'getTotalWrapped', inputs: [], outputs: [{ name: 'totalWrapped', type: 'UINT256' }], type: 'function' },
    { name: 'getPoolAddress', inputs: [], outputs: [{ name: 'poolAddress', type: 'STRING' }], type: 'function' },
    { name: 'setPoolAddress', inputs: [{ name: 'newPool', type: 'STRING' }], outputs: [], type: 'function' },
    { name: 'approve', inputs: [{ name: 'spender', type: 'ADDRESS' }, { name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'pause', inputs: [], outputs: [], type: 'function' },
    { name: 'unpause', inputs: [], outputs: [], type: 'function' },
];

const VaultAbi = [
    { name: 'stake', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'unstake', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'claimRewards', inputs: [], outputs: [{ name: 'claimed', type: 'UINT256' }], type: 'function' },
    { name: 'setAutoCompound', inputs: [{ name: 'enabled', type: 'BOOL' }], outputs: [], type: 'function' },
    { name: 'getVaultInfo', inputs: [], outputs: [{ name: 'totalStaked', type: 'UINT256' }], type: 'function' },
    { name: 'getUserInfo', inputs: [{ name: 'user', type: 'ADDRESS' }], outputs: [{ name: 'staked', type: 'UINT256' }], type: 'function' },
    { name: 'emergencyWithdraw', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'pause', inputs: [], outputs: [], type: 'function' },
    { name: 'unpause', inputs: [], outputs: [], type: 'function' },
];

const TreasuryAbi = [
    { name: 'deposit', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'getBalance', inputs: [{ name: 'user', type: 'ADDRESS' }], outputs: [{ name: 'balance', type: 'UINT256' }], type: 'function' },
    { name: 'getNonce', inputs: [{ name: 'user', type: 'ADDRESS' }], outputs: [{ name: 'nonce', type: 'UINT256' }], type: 'function' },
    { name: 'getTotalDeposits', inputs: [], outputs: [{ name: 'total', type: 'UINT256' }], type: 'function' },
    { name: 'isPaused', inputs: [], outputs: [{ name: 'paused', type: 'BOOL' }], type: 'function' },
    { name: 'getEmergencyInfo', inputs: [{ name: 'user', type: 'ADDRESS' }], outputs: [{ name: 'amount', type: 'UINT256' }, { name: 'unlockBlock', type: 'UINT256' }], type: 'function' },
    { name: 'requestEmergencyWithdraw', inputs: [{ name: 'amount', type: 'UINT256' }], outputs: [], type: 'function' },
    { name: 'executeEmergencyWithdraw', inputs: [], outputs: [], type: 'function' },
    { name: 'pause', inputs: [], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
    { name: 'unpause', inputs: [], outputs: [{ name: 'success', type: 'BOOL' }], type: 'function' },
];

const MarketAbi = [
    { name: 'createMarket', inputs: [{ name: 'endBlock', type: 'UINT256' }], outputs: [{ name: 'marketId', type: 'UINT256' }], type: 'function' },
    { name: 'buyShares', inputs: [{ name: 'marketId', type: 'UINT256' }, { name: 'isYes', type: 'BOOL' }, { name: 'amount', type: 'UINT256' }, { name: 'minSharesOut', type: 'UINT256' }], outputs: [{ name: 'shares', type: 'UINT256' }], type: 'function' },
    { name: 'sellShares', inputs: [{ name: 'marketId', type: 'UINT256' }, { name: 'isYes', type: 'BOOL' }, { name: 'shares', type: 'UINT256' }, { name: 'minPayoutOut', type: 'UINT256' }], outputs: [{ name: 'payout', type: 'UINT256' }], type: 'function' },
    { name: 'resolveMarket', inputs: [{ name: 'marketId', type: 'UINT256' }, { name: 'outcome', type: 'BOOL' }], outputs: [], type: 'function' },
    { name: 'claimPayout', inputs: [{ name: 'marketId', type: 'UINT256' }], outputs: [{ name: 'payout', type: 'UINT256' }], type: 'function' },
    { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: 'UINT256' }], outputs: [{ name: 'yesReserve', type: 'UINT256' }], type: 'function' },
    { name: 'getUserShares', inputs: [{ name: 'marketId', type: 'UINT256' }, { name: 'user', type: 'ADDRESS' }], outputs: [{ name: 'yesShares', type: 'UINT256' }], type: 'function' },
    { name: 'getPrice', inputs: [{ name: 'marketId', type: 'UINT256' }], outputs: [{ name: 'yesPriceBps', type: 'UINT256' }], type: 'function' },
    { name: 'pause', inputs: [], outputs: [], type: 'function' },
    { name: 'unpause', inputs: [], outputs: [], type: 'function' },
];

const OracleAbi = [
    { name: 'submitPrice', inputs: [{ name: 'assetId', type: 'UINT256' }, { name: 'price', type: 'UINT256' }], outputs: [], type: 'function' },
    { name: 'getPrice', inputs: [{ name: 'assetId', type: 'UINT256' }], outputs: [{ name: 'price', type: 'UINT256' }], type: 'function' },
    { name: 'getSubmission', inputs: [{ name: 'assetId', type: 'UINT256' }, { name: 'slot', type: 'UINT256' }], outputs: [{ name: 'price', type: 'UINT256' }], type: 'function' },
    { name: 'getOracleInfo', inputs: [{ name: 'oracle', type: 'ADDRESS' }], outputs: [{ name: 'authorized', type: 'BOOL' }], type: 'function' },
    { name: 'addOracle', inputs: [{ name: 'oracle', type: 'ADDRESS' }], outputs: [], type: 'function' },
    { name: 'removeOracle', inputs: [{ name: 'oracle', type: 'ADDRESS' }], outputs: [], type: 'function' },
    { name: 'pause', inputs: [], outputs: [], type: 'function' },
    { name: 'unpause', inputs: [], outputs: [], type: 'function' },
];

// ═══ Helpers ═══
let passed = 0, failed = 0, skipped = 0;
function ok(name, detail) { passed++; console.log(`  ✓ ${name}${detail ? ': ' + detail : ''}`); }
function fail(name, err) { failed++; console.error(`  ✗ ${name}: ${err}`); }
function skip(name, reason) { skipped++; console.log(`  ⊘ ${name}: ${reason}`); }

async function expectRevert(contract, method, args, expectedMsg, label) {
    try {
        const res = args ? await contract[method](...args) : await contract[method]();
        if (res.revert) {
            if (expectedMsg && !res.revert.includes(expectedMsg)) {
                fail(label, `wrong revert: "${res.revert.slice(0, 80)}" (expected: "${expectedMsg}")`);
            } else {
                ok(label, `reverted: ${res.revert.slice(0, 60)}`);
            }
        } else {
            fail(label, 'expected revert but succeeded');
        }
    } catch (e) {
        const msg = e.message || '';
        if (expectedMsg && msg.includes(expectedMsg)) {
            ok(label, `reverted: ${msg.slice(0, 60)}`);
        } else if (msg.includes('Error in calling') || msg.includes('Revert') || msg.includes('revert')) {
            ok(label, `reverted: ${msg.slice(0, 60)}`);
        } else {
            fail(label, `unexpected error: ${msg.slice(0, 100)}`);
        }
    }
}

async function viewCall(contract, method, args, label) {
    try {
        const res = args ? await contract[method](...args) : await contract[method]();
        if (res.revert) throw new Error('revert: ' + res.revert);
        const keys = Object.keys(res.properties || {});
        const val = keys.length > 0 ? keys.map(k => `${k}=${res.properties[k]}`).join(', ') : (res.decoded?.[0] ?? 'ok');
        ok(label, String(val));
        return res;
    } catch (e) {
        fail(label, e.message?.slice(0, 120));
        return null;
    }
}

async function simCall(contract, method, args, label) {
    try {
        const res = args ? await contract[method](...args) : await contract[method]();
        if (res.revert) throw new Error('revert: ' + res.revert);
        ok(`${label} (sim)`, 'success');
        return res;
    } catch (e) {
        fail(`${label} (sim)`, e.message?.slice(0, 150));
        return null;
    }
}

async function broadcastSim(sim, wallet, label, extraOutputs) {
    try {
        const receipt = await sim.sendTransaction({
            signer: wallet.keypair,
            mldsaSigner: wallet.mldsaKeypair,
            refundTo: wallet.p2tr,
            maximumAllowedSatToSpend: 300000n,
            network: NETWORK,
            feeRate: 2,
            priorityFee: 0n,
            ...(extraOutputs ? { extraOutputs } : {}),
        });
        const txid = receipt?.transactionId || receipt?.txid || '';
        if (txid) { ok(`${label} (TX)`, txid.slice(0, 16) + '...'); }
        else { fail(`${label} (TX)`, 'No txid'); }
        return receipt;
    } catch (e) {
        fail(`${label} (TX)`, e.message?.slice(0, 120));
        return null;
    }
}

// ═══ MAIN ═══
console.log('═══════════════════════════════════════════════════════════');
console.log('BitPredict — Full E2E Test: ALL Contracts × 2 Wallets');
console.log('═══════════════════════════════════════════════════════════');
console.log('Mode:', VIEWS_ONLY ? 'VIEWS ONLY' : PHASE2_ONLY ? 'PHASE 2 (state tests)' : WAIT_MODE ? 'FULL (setup → wait → state)' : 'PHASE 1 (view + setup broadcasts)');
console.log('Wallet0 (deployer):', wallet0.p2tr);
console.log('Wallet1 (test):    ', wallet1.p2tr);
console.log('');

// ═══════════════════════════════════════════════════════
// BTC + WBTC Balances
// ═══════════════════════════════════════════════════════
console.log('══ 0. Current Balances ══');
let w0WbtcBal = 0n, w1WbtcBal = 0n;
{
    // BTC
    for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
        try {
            const utxos = await provider.fetchUTXO({ address: wallet.p2tr, minAmount: 1000n, requestedAmount: 100_000_000n }).catch(() => []);
            const bal = utxos.reduce((a, u) => a + u.value, 0n);
            ok(`Wallet${idx} BTC`, `${bal} sats (${utxos.length} UTXOs)`);
        } catch (e) { fail(`Wallet${idx} BTC`, e.message); }
    }
    // WBTC
    const wbtc0 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const b0 = await wbtc0.balanceOf(wallet0.address);
    w0WbtcBal = b0.properties?.balance ?? b0.decoded?.[0] ?? 0n;
    ok('Wallet0 WBTC', `${w0WbtcBal}`);

    const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
    const b1 = await wbtc1.balanceOf(wallet1.address);
    w1WbtcBal = b1.properties?.balance ?? b1.decoded?.[0] ?? 0n;
    ok('Wallet1 WBTC', `${w1WbtcBal}`);
}

// ═══════════════════════════════════════════════════════
// SECTION 1: ALL VIEW METHODS
// ═══════════════════════════════════════════════════════

// --- WBTC Views ---
console.log('\n══ 1. WBTC View Methods ══');
for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
    console.log(`\n── WBTC View (Wallet${idx}) ──`);
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet.address);
    await viewCall(wbtc, 'name', null, 'name()');
    await viewCall(wbtc, 'symbol', null, 'symbol()');
    await viewCall(wbtc, 'decimals', null, 'decimals()');
    await viewCall(wbtc, 'getTotalWrapped', null, 'getTotalWrapped()');
    await viewCall(wbtc, 'getPoolAddress', null, 'getPoolAddress()');
    await viewCall(wbtc, 'balanceOf', [wallet.address], `balanceOf(wallet${idx})`);
}

// --- StakingVault Views ---
console.log('\n══ 2. StakingVault View Methods ══');
for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
    console.log(`\n── Vault View (Wallet${idx}) ──`);
    const vault = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet.address);
    await viewCall(vault, 'getVaultInfo', null, 'getVaultInfo()');
    await viewCall(vault, 'getUserInfo', [wallet.address], `getUserInfo(wallet${idx})`);
}

// --- Treasury Views ---
console.log('\n══ 3. Treasury View Methods ══');
for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
    console.log(`\n── Treasury View (Wallet${idx}) ──`);
    const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet.address);
    await viewCall(treasury, 'getTotalDeposits', null, 'getTotalDeposits()');
    await viewCall(treasury, 'isPaused', null, 'isPaused()');
    await viewCall(treasury, 'getBalance', [wallet.address], `getBalance(wallet${idx})`);
    await viewCall(treasury, 'getNonce', [wallet.address], `getNonce(wallet${idx})`);
    await viewCall(treasury, 'getEmergencyInfo', [wallet.address], `getEmergencyInfo(wallet${idx})`);
}

// --- PredictionMarket Views ---
console.log('\n══ 4. PredictionMarket View Methods ══');
for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
    console.log(`\n── Market View (Wallet${idx}) ──`);
    const market = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet.address);
    await viewCall(market, 'getMarketInfo', [1n], 'getMarketInfo(1)');
    await viewCall(market, 'getUserShares', [1n, wallet.address], `getUserShares(1, wallet${idx})`);
    // getPrice(0) may fail with div-by-zero if no liquidity — expected
    await viewCall(market, 'getPrice', [1n], 'getPrice(1)');
}

// --- PriceOracle Views ---
console.log('\n══ 5. PriceOracle View Methods ══');
for (const [idx, wallet] of [[0, wallet0], [1, wallet1]]) {
    console.log(`\n── Oracle View (Wallet${idx}) ──`);
    const oracle = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet.address);
    await viewCall(oracle, 'getPrice', [0n], 'getPrice(0)');
    await viewCall(oracle, 'getOracleInfo', [wallet.address], `getOracleInfo(wallet${idx})`);
    await viewCall(oracle, 'getSubmission', [0n, 0n], 'getSubmission(0, 0)');
}

if (VIEWS_ONLY) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`View tests complete: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log('═══════════════════════════════════════════════════════════');
    process.exit(failed > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════════
// PHASE 1: Setup — Wrap + Allowances (broadcast to mempool)
// ═══════════════════════════════════════════════════════
if (!PHASE2_ONLY) {
    // --- How much WBTC do we need? ---
    // W0: 5000 (vault stake) + 5000 (treasury deposit) + 55000 (market buy) = 65,000
    // W1: 3000 (vault stake) + 3000 (treasury deposit) + 52000 (market buy) = 58,000
    const W0_NEED = 65000n;
    const W1_NEED = 58000n;
    const W0_WRAP = w0WbtcBal < W0_NEED ? (W0_NEED - w0WbtcBal + 5000n) : 0n; // +5000 buffer
    const W1_WRAP = w1WbtcBal < W1_NEED ? (W1_NEED - w1WbtcBal + 5000n) : 0n;

    console.log('\n══ PHASE 1: Setup (Wrap + Allowances) ══');
    console.log(`  W0 needs ${W0_NEED} WBTC, has ${w0WbtcBal}, wrapping ${W0_WRAP}`);
    console.log(`  W1 needs ${W1_NEED} WBTC, has ${w1WbtcBal}, wrapping ${W1_WRAP}`);

    // --- Wrap BTC→WBTC ---
    for (const [idx, wallet, wrapAmt] of [[0, wallet0, W0_WRAP], [1, wallet1, W1_WRAP]]) {
        if (wrapAmt <= 0n) {
            skip(`Wrap W${idx}`, `already has enough WBTC`);
            continue;
        }
        console.log(`\n── Wrap ${wrapAmt} sats → WBTC (Wallet${idx}) ──`);
        const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet.address);
        await wbtc.setTransactionDetails({
            inputs: [],
            outputs: [{ index: 1, value: wrapAmt, to: POOL_ADDRESS, flags: 0, scriptPubKey: undefined }],
        });
        const sim = await simCall(wbtc, 'wrap', [wrapAmt], `wrap(${wrapAmt})`);
        if (sim) await broadcastSim(sim, wallet, `wrap(${wrapAmt}) W${idx}`, [{ address: POOL_ADDRESS, value: wrapAmt }]);
    }

    // --- increaseAllowance for all contracts ---
    console.log('\n── Allowances (Wallet0) ──');
    {
        const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
        // Vault
        const a1 = await simCall(wbtc, 'increaseAllowance', [VAULT_ADDR_OBJ, 100000n], 'increaseAllowance(vault, 100000)');
        if (a1) await broadcastSim(a1, wallet0, 'approve W0→Vault');
        // Treasury
        const a2 = await simCall(wbtc, 'increaseAllowance', [TREASURY_ADDR_OBJ, 100000n], 'increaseAllowance(treasury, 100000)');
        if (a2) await broadcastSim(a2, wallet0, 'approve W0→Treasury');
        // Market
        const a3 = await simCall(wbtc, 'increaseAllowance', [MARKET_ADDR_OBJ, 100000n], 'increaseAllowance(market, 100000)');
        if (a3) await broadcastSim(a3, wallet0, 'approve W0→Market');
    }

    console.log('\n── Allowances (Wallet1) ──');
    {
        const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
        // Vault
        const a1 = await simCall(wbtc, 'increaseAllowance', [VAULT_ADDR_OBJ, 100000n], 'increaseAllowance(vault, 100000)');
        if (a1) await broadcastSim(a1, wallet1, 'approve W1→Vault');
        // Treasury
        const a2 = await simCall(wbtc, 'increaseAllowance', [TREASURY_ADDR_OBJ, 100000n], 'increaseAllowance(treasury, 100000)');
        if (a2) await broadcastSim(a2, wallet1, 'approve W1→Treasury');
        // Market
        const a3 = await simCall(wbtc, 'increaseAllowance', [MARKET_ADDR_OBJ, 100000n], 'increaseAllowance(market, 100000)');
        if (a3) await broadcastSim(a3, wallet1, 'approve W1→Market');
    }

    // --- addOracle for Wallet0 (deployer = admin) ---
    console.log('\n── Add Oracle (Wallet0 as admin) ──');
    {
        const oracle = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet0.address);
        const sim = await simCall(oracle, 'addOracle', [wallet0.address], 'addOracle(wallet0)');
        if (sim) await broadcastSim(sim, wallet0, 'addOracle(W0)');
    }

    // --- createMarket from Wallet0 (admin) ---
    console.log('\n── Create Market (Wallet0 = admin) ──');
    {
        const market = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
        const endBlock = 999999n;
        const sim = await simCall(market, 'createMarket', [endBlock], 'createMarket(999999)');
        if (sim) await broadcastSim(sim, wallet0, 'createMarket() W0');
    }

    if (!WAIT_MODE) {
        console.log('\n═══════════════════════════════════════════════════════════');
        console.log(`Phase 1 complete: ${passed} passed, ${failed} failed, ${skipped} skipped`);
        console.log('');
        console.log('Next: Wait ~10 minutes for block confirmation, then run:');
        console.log('  node test-all-contracts-e2e.mjs --phase2');
        console.log('Or run full test with automatic wait:');
        console.log('  node test-all-contracts-e2e.mjs --wait');
        console.log('═══════════════════════════════════════════════════════════');
        process.exit(failed > 0 ? 1 : 0);
    }

    // Wait for block confirmation
    console.log('\n══ Waiting 660s (11 min) for block confirmation... ══');
    console.log('  (OPNet testnet block time ≈ 600s)');
    for (let i = 660; i > 0; i -= 60) {
        console.log(`  ${i}s remaining...`);
        await new Promise(r => setTimeout(r, 60000));
    }
    console.log('  Block confirmation wait complete.');
}

// ═══════════════════════════════════════════════════════
// PHASE 2: State-Changing Tests
// ═══════════════════════════════════════════════════════
console.log('\n══ PHASE 2: State-Changing Tests ══');

// Refresh WBTC balances
console.log('\n── Post-setup WBTC Balances ──');
{
    const wbtc0 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const b0 = await wbtc0.balanceOf(wallet0.address);
    w0WbtcBal = b0.properties?.balance ?? b0.decoded?.[0] ?? 0n;
    ok('Wallet0 WBTC', `${w0WbtcBal}`);

    const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
    const b1 = await wbtc1.balanceOf(wallet1.address);
    w1WbtcBal = b1.properties?.balance ?? b1.decoded?.[0] ?? 0n;
    ok('Wallet1 WBTC', `${w1WbtcBal}`);
}

// --- StakingVault: stake ---
console.log('\n── Vault Stake (Wallet0: 5000) ──');
{
    const vault = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const sim = await simCall(vault, 'stake', [5000n], 'stake(5000)');
    if (sim) await broadcastSim(sim, wallet0, 'stake(5000) W0');
}

console.log('\n── Vault Stake (Wallet1: 3000) ──');
{
    const vault = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
    const sim = await simCall(vault, 'stake', [3000n], 'stake(3000)');
    if (sim) await broadcastSim(sim, wallet1, 'stake(3000) W1');
}

// --- Treasury: deposit ---
console.log('\n── Treasury Deposit (Wallet0: 5000) ──');
{
    const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet0.address);
    const sim = await simCall(treasury, 'deposit', [5000n], 'deposit(5000)');
    if (sim) await broadcastSim(sim, wallet0, 'deposit(5000) W0');
}

console.log('\n── Treasury Deposit (Wallet1: 3000) ──');
{
    const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet1.address);
    const sim = await simCall(treasury, 'deposit', [3000n], 'deposit(3000)');
    if (sim) await broadcastSim(sim, wallet1, 'deposit(3000) W1');
}

// --- Auto wrap + approve if WBTC balance is too low ---
const BUY_W0 = 55000n, BUY_W1 = 52000n;
const TOTAL_NEED_W0 = 5000n + 5000n + BUY_W0; // stake + deposit + buy
const TOTAL_NEED_W1 = 3000n + 3000n + BUY_W1;
if (w0WbtcBal < BUY_W0 || w1WbtcBal < BUY_W1) {
    console.log('\n── Auto-Wrap + Approve (balance too low) ──');
    for (const [idx, wallet, need] of [[0, wallet0, TOTAL_NEED_W0 + 5000n], [1, wallet1, TOTAL_NEED_W1 + 5000n]]) {
        const curBal = idx === 0 ? w0WbtcBal : w1WbtcBal;
        if (curBal < (idx === 0 ? BUY_W0 : BUY_W1)) {
            const wrapAmt = need - curBal;
            const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet.address);
            await wbtc.setTransactionDetails({
                inputs: [],
                outputs: [{ index: 1, value: wrapAmt, to: POOL_ADDRESS, flags: 0, scriptPubKey: undefined }],
            });
            const ws = await simCall(wbtc, 'wrap', [wrapAmt], `auto-wrap(${wrapAmt}) W${idx}`);
            if (ws) await broadcastSim(ws, wallet, `auto-wrap W${idx}`, [{ address: POOL_ADDRESS, value: wrapAmt }]);
            // Re-approve
            const a1 = await simCall(wbtc, 'increaseAllowance', [MARKET_ADDR_OBJ, need], `auto-approve(market, ${need}) W${idx}`);
            if (a1) await broadcastSim(a1, wallet, `auto-approve W${idx}→Market`);
        }
    }
    console.log('  ⚠ Auto-wrap/approve broadcast. buyShares may fail until next block.');
}

// --- PredictionMarket: buyShares (skip if already have shares from previous run) ---
{
    const mCheck = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
    const existingShares = await mCheck.getUserShares(1n, wallet0.address);
    const w0Shares = BigInt(existingShares.properties?.yesShares ?? existingShares.decoded?.[0] ?? 0n);

    if (w0Shares > 0n) {
        console.log('\n── Market BuyShares (skipped — shares already exist) ──');
        skip('buyShares(W0)', `already has ${w0Shares} YES shares`);
        skip('buyShares(W1)', 'W0 already has shares, skipping pair');
    } else {
        console.log('\n── Market BuyShares (Wallet0: 55000 YES) ──');
        const market0 = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
        const sim0 = await simCall(market0, 'buyShares', [1n, true, BUY_W0, 0n], `buyShares(1, YES, ${BUY_W0}, 0)`);
        if (sim0) await broadcastSim(sim0, wallet0, 'buyShares() W0');

        console.log('\n── Market BuyShares (Wallet1: 52000 NO) ──');
        const market1 = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet1.address);
        const sim1 = await simCall(market1, 'buyShares', [1n, false, BUY_W1, 0n], `buyShares(1, NO, ${BUY_W1}, 0)`);
        if (sim1) await broadcastSim(sim1, wallet1, 'buyShares() W1');
    }
}

// --- PriceOracle: submitPrice ---
console.log('\n── Oracle Submit (Wallet0) ──');
{
    const oracle = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet0.address);
    const sim = await simCall(oracle, 'submitPrice', [0n, 72000_00000000n], 'submitPrice(0, $72000)');
    if (sim) await broadcastSim(sim, wallet0, 'submitPrice() W0');
}


// ═══════════════════════════════════════════════════════
// SECTION 6: Negative-Path Tests (sim-only — expected reverts)
// ═══════════════════════════════════════════════════════
console.log('\n══ 6. Negative-Path Tests (Expected Reverts) ══');

// --- 6a. WBTC Negative ---
console.log('\n── 6a. WBTC Negative ──');
{
    const wbtc0 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);

    // wrap(0) → "Amount must be > 0"
    await expectRevert(wbtc0, 'wrap', [0n], 'Amount must be > 0', 'wrap(0) → revert');

    // approve() blocked → "Use increaseAllowance"
    await expectRevert(wbtc0, 'approve', [VAULT_ADDR_OBJ, 1000n], 'increaseAllowance', 'approve() → revert');

    // setPoolAddress by non-admin → "Only admin"
    await expectRevert(wbtc1, 'setPoolAddress', ['tb1qtest'], 'Only admin', 'setPoolAddress(W1) → revert');

    // pause by non-admin → "Only admin"
    await expectRevert(wbtc1, 'pause', null, 'Only admin', 'wbtc pause(W1) → revert');

    // unpause by non-admin → "Only admin"
    await expectRevert(wbtc1, 'unpause', null, 'Only admin', 'wbtc unpause(W1) → revert');

    // Admin CAN pause/unpause (sim only — don't broadcast!)
    await simCall(wbtc0, 'pause', null, 'wbtc pause(admin)');
    await simCall(wbtc0, 'unpause', null, 'wbtc unpause(admin)');
}

// --- 6b. StakingVault Negative ---
console.log('\n── 6b. StakingVault Negative ──');
{
    const vault0 = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const vault1 = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);

    // unstake when nothing staked on-chain → "Insufficient staked amount"
    await expectRevert(vault1, 'unstake', [1000n], 'Insufficient staked', 'unstake(W1) no stake → revert');

    // unstake by W0 — either "Insufficient" (not confirmed) or "locked" (CSV timelock)
    await expectRevert(vault0, 'unstake', [1000n], '', 'unstake(W0) timelock/no-stake → revert');

    // emergencyWithdraw with nothing staked
    await expectRevert(vault1, 'emergencyWithdraw', [1000n], 'Insufficient staked', 'emergencyWithdraw(W1) no stake → revert');

    // claimRewards with no rewards
    await expectRevert(vault0, 'claimRewards', null, 'No rewards', 'claimRewards() no rewards → revert');

    // pause by non-admin → "Only admin"
    await expectRevert(vault1, 'pause', null, 'Only admin', 'vault pause(W1) → revert');

    // Admin CAN pause/unpause (sim only)
    await simCall(vault0, 'pause', null, 'vault pause(admin)');
    await simCall(vault0, 'unpause', null, 'vault unpause(admin)');
}

// --- 6c. Treasury Negative ---
console.log('\n── 6c. Treasury Negative ──');
{
    const treasury0 = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet0.address);
    const treasury1 = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet1.address);

    // executeEmergencyWithdraw when none pending
    await expectRevert(treasury0, 'executeEmergencyWithdraw', null, 'No emergency withdrawal pending', 'executeEmergencyWithdraw() none pending → revert');

    // requestEmergencyWithdraw with amount > balance (use huge number)
    await expectRevert(treasury1, 'requestEmergencyWithdraw', [999_999_999n], 'Insufficient balance', 'requestEmergencyWithdraw(W1) huge amt → revert');

    // pause by non-admin
    await expectRevert(treasury1, 'pause', null, 'Only admin', 'treasury pause(W1) → revert');

    // unpause by non-admin
    await expectRevert(treasury1, 'unpause', null, 'Only admin', 'treasury unpause(W1) → revert');

    // Admin CAN pause/unpause (sim only)
    await simCall(treasury0, 'pause', null, 'treasury pause(admin)');
    await simCall(treasury0, 'unpause', null, 'treasury unpause(admin)');
}

// --- 6d. PredictionMarket Negative ---
console.log('\n── 6d. PredictionMarket Negative ──');
{
    const market0 = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
    const market1 = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet1.address);

    // buyShares below minimum (MIN_TRADE_AMOUNT = 50000)
    await expectRevert(market0, 'buyShares', [1n, true, 100n, 0n], 'Amount below minimum', 'buyShares(100) below min → revert');

    // buyShares on non-existent market
    await expectRevert(market0, 'buyShares', [999n, true, 55000n, 0n], 'Market does not exist', 'buyShares(market 999) → revert');

    // sellShares with 0 shares
    await expectRevert(market0, 'sellShares', [1n, true, 0n, 0n], 'Shares must be > 0', 'sellShares(0) → revert');

    // sellShares when user has no shares on this side
    await expectRevert(market1, 'sellShares', [1n, true, 1000n, 0n], 'Insufficient shares', 'sellShares(W1 YES) no shares → revert');

    // sellShares on non-existent market
    await expectRevert(market0, 'sellShares', [999n, true, 1000n, 0n], 'Market does not exist', 'sellShares(market 999) → revert');

    // resolveMarket by non-admin
    await expectRevert(market1, 'resolveMarket', [1n, true], 'Only admin', 'resolveMarket(W1) → revert');

    // resolveMarket before endBlock (market 1 endBlock=999999)
    await expectRevert(market0, 'resolveMarket', [1n, true], 'Market has not ended yet', 'resolveMarket(1) not ended → revert');

    // claimPayout before resolution
    await expectRevert(market0, 'claimPayout', [1n], 'Market not resolved', 'claimPayout(1) not resolved → revert');

    // createMarket by non-admin
    await expectRevert(market1, 'createMarket', [999999n], 'Only admin', 'createMarket(W1) → revert');

    // pause by non-admin
    await expectRevert(market1, 'pause', null, 'Only admin', 'market pause(W1) → revert');

    // Admin CAN pause/unpause (sim only)
    await simCall(market0, 'pause', null, 'market pause(admin)');
    await simCall(market0, 'unpause', null, 'market unpause(admin)');
}

// --- 6e. PriceOracle Negative ---
console.log('\n── 6e. PriceOracle Negative ──');
{
    const oracle0 = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet0.address);
    const oracle1 = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet1.address);

    // submitPrice with price=0
    await expectRevert(oracle0, 'submitPrice', [0n, 0n], 'Price cannot be zero', 'submitPrice(price=0) → revert');

    // submitPrice by non-oracle
    await expectRevert(oracle1, 'submitPrice', [0n, 72000_00000000n], 'Not authorized oracle', 'submitPrice(W1) unauthorized → revert');

    // addOracle by non-admin
    await expectRevert(oracle1, 'addOracle', [wallet1.address], 'Only admin', 'addOracle(W1 non-admin) → revert');

    // addOracle duplicate
    await expectRevert(oracle0, 'addOracle', [wallet0.address], 'already authorized', 'addOracle(W0 duplicate) → revert');

    // removeOracle by non-admin
    await expectRevert(oracle1, 'removeOracle', [wallet0.address], 'Only admin', 'removeOracle(W1) → revert');

    // removeOracle for non-oracle
    await expectRevert(oracle0, 'removeOracle', [wallet1.address], 'not authorized', 'removeOracle(W1 not oracle) → revert');

    // Admin CAN pause/unpause (sim only)
    await simCall(oracle0, 'pause', null, 'oracle pause(admin)');
    await simCall(oracle0, 'unpause', null, 'oracle unpause(admin)');
}

// ═══════════════════════════════════════════════════════
// SECTION 7: Edge Case Tests
// ═══════════════════════════════════════════════════════
console.log('\n══ 7. Edge Case Tests ══');
{
    // WBTC: unwrap more than balance
    const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
    await expectRevert(wbtc1, 'unwrap', [999_999_999n], 'Insufficient', 'unwrap(huge) → revert');

    // WBTC: setPoolAddress with invalid bech32 (admin)
    const wbtc0 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    await expectRevert(wbtc0, 'setPoolAddress', ['not-a-bech32'], 'Invalid pool bech32', 'setPoolAddress(invalid) → revert');

    // Market: getMarketInfo for non-existent market (should return 0, not revert)
    const market0 = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(market0, 'getMarketInfo', [999n], 'getMarketInfo(999) non-existent');

    // Market: getUserShares for non-existent market
    await viewCall(market0, 'getUserShares', [999n, wallet0.address], 'getUserShares(999) non-existent');

    // Market: getPrice for non-existent market (div-by-zero guard → 5000 bps)
    await viewCall(market0, 'getPrice', [999n], 'getPrice(999) non-existent');

    // Oracle: getPrice for non-existent asset (should return 0)
    const oracle0 = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(oracle0, 'getPrice', [999n], 'oracle getPrice(999) non-existent');

    // Vault: getUserInfo for address with no stake
    const vault0 = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    await viewCall(vault0, 'getUserInfo', [wallet1.address], 'vault getUserInfo(W1) no stake');

    // Treasury: getBalance for address with no deposits
    const treasury0 = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(treasury0, 'getBalance', [wallet1.address], 'treasury getBalance(W1) no deposit');

    // Treasury: getEmergencyInfo for user with no emergency
    await viewCall(treasury0, 'getEmergencyInfo', [wallet1.address], 'treasury getEmergencyInfo(W1) none');
}

// ═══════════════════════════════════════════════════════
// POST-STATE: Check updated state
// ═══════════════════════════════════════════════════════
console.log('\n══ Post-State Verification ══');
{
    // WBTC balances
    const wbtc0 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    await viewCall(wbtc0, 'balanceOf', [wallet0.address], 'W0 WBTC post-ops');
    await viewCall(wbtc0, 'getTotalWrapped', null, 'totalWrapped post-ops');

    // Vault
    const vault = getContract(VAULT_ADDRESS, [...VaultAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    await viewCall(vault, 'getVaultInfo', null, 'vault totalStaked');
    await viewCall(vault, 'getUserInfo', [wallet0.address], 'vault W0 staked');
    await viewCall(vault, 'getUserInfo', [wallet1.address], 'vault W1 staked');

    // Treasury
    const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(treasury, 'getTotalDeposits', null, 'treasury totalDeposits');
    await viewCall(treasury, 'getBalance', [wallet0.address], 'treasury W0 balance');
    await viewCall(treasury, 'getBalance', [wallet1.address], 'treasury W1 balance');

    // Market
    const market = getContract(MARKET_ADDRESS, MarketAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(market, 'getMarketInfo', [1n], 'market 1 info');
    await viewCall(market, 'getUserShares', [1n, wallet0.address], 'market W0 shares');
    await viewCall(market, 'getUserShares', [1n, wallet1.address], 'market W1 shares');

    // Oracle
    const oracle = getContract(ORACLE_ADDRESS, OracleAbi, rpcProvider, NETWORK, wallet0.address);
    await viewCall(oracle, 'getPrice', [0n], 'oracle price(0)');
}

// ═══════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
console.log('═══════════════════════════════════════════════════════════');
if (failed > 0) {
    console.log('\nFailed tests listed above. Possible expected failures:');
    console.log('  - Phase 2 sims may fail if Phase 1 TXs not yet confirmed');
    console.log('  - unstake(W0) may show "Insufficient" if stake not confirmed');
}
process.exit(failed > 0 ? 1 : 0);
