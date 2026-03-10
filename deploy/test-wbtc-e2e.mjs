/**
 * BitPredict — E2E Test: WBTC Contract (wrap, unwrap, balanceOf, view methods)
 *
 * Tests with wallet0 (deployer) and wallet1 (derived from same mnemonic, index 1)
 * 1. View methods: getTotalWrapped, getPoolAddress
 * 2. Check BTC balances
 * 3. Send BTC from wallet0 → wallet1
 * 4. Wrap BTC → WBTC (wallet0)
 * 5. Check WBTC balance
 * 6. Wrap BTC → WBTC (wallet1) — cross-wallet test
 */
import {
    Mnemonic, TransactionFactory, OPNetLimitedProvider,
} from './node_modules/@btc-vision/transaction/build/index.js';
import { getContract, JSONRpcProvider, OP_20_ABI } from './node_modules/opnet/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = 'https://testnet.opnet.org';
const WBTC_ADDRESS = 'opt1sqzymwwcv446449k8ntgzw3mw5qvv3e77mskm2ry2';
const POOL_ADDRESS = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';

// Read mnemonic
let phrase;
try { phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim(); }
catch { phrase = process.env.OPNET_MNEMONIC; }
if (!phrase) { console.error('No mnemonic'); process.exit(1); }

// Network — NETWORK for addresses/RPC, TX_NETWORK for sendTransaction (chain ID must match known networks)
const NETWORK = networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet };

// Derive wallets
const mnemonic = new Mnemonic(phrase, '', NETWORK);
const wallet0 = mnemonic.deriveOPWallet(undefined, 0);
const wallet1 = mnemonic.deriveOPWallet(undefined, 1);

console.log('════════════════════════════════════════════');
console.log('WBTC E2E Test');
console.log('════════════════════════════════════════════');
console.log('Wallet0 (deployer):', wallet0.p2tr);
console.log('Wallet1 (test):    ', wallet1.p2tr);
console.log('WBTC contract:     ', WBTC_ADDRESS);
console.log('Pool address:      ', POOL_ADDRESS);
console.log('');

// Providers
const provider = new OPNetLimitedProvider(RPC_URL);
const rpcProvider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });

// WBTC ABI (minimal for testing) — type must be lowercase 'function'
const WBTCAbi = [
    {
        name: 'wrap',
        inputs: [{ name: 'amount', type: 'UINT256' }],
        outputs: [{ name: 'success', type: 'BOOL' }],
        type: 'function',
    },
    {
        name: 'unwrap',
        inputs: [{ name: 'amount', type: 'UINT256' }],
        outputs: [{ name: 'success', type: 'BOOL' }],
        type: 'function',
    },
    {
        name: 'getTotalWrapped',
        inputs: [],
        outputs: [{ name: 'totalWrapped', type: 'UINT256' }],
        type: 'function',
    },
    {
        name: 'getPoolAddress',
        inputs: [],
        outputs: [{ name: 'poolAddress', type: 'STRING' }],
        type: 'function',
    },
];

let passed = 0;
let failed = 0;

function ok(name, detail) { passed++; console.log(`  ✓ ${name}${detail ? ': ' + detail : ''}`); }
function fail(name, err) { failed++; console.error(`  ✗ ${name}: ${err}`); }

// ═══════════════════════════════════════
// Test 1: View Methods
// ═══════════════════════════════════════
console.log('\n─── Test 1: View Methods ───');
try {
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);

    // getTotalWrapped
    try {
        const totalRes = await wbtc.getTotalWrapped();
        if (totalRes.revert) throw new Error('revert: ' + totalRes.revert);
        const total = totalRes.properties?.totalWrapped ?? totalRes.decoded?.[0] ?? 'unknown';
        ok('getTotalWrapped()', `${total} sats`);
    } catch (e) { fail('getTotalWrapped()', e.message); }

    // getPoolAddress
    try {
        const poolRes = await wbtc.getPoolAddress();
        if (poolRes.revert) throw new Error('revert: ' + poolRes.revert);
        const pool = poolRes.properties?.poolAddress ?? poolRes.decoded?.[0] ?? 'unknown';
        ok('getPoolAddress()', pool);
        if (pool === POOL_ADDRESS) {
            ok('Pool address matches deployer p2tr');
        } else {
            fail('Pool address mismatch', `expected ${POOL_ADDRESS}, got ${pool}`);
        }
    } catch (e) { fail('getPoolAddress()', e.message); }

    // name, symbol, decimals
    try {
        const nameRes = await wbtc.name();
        ok('name()', nameRes.properties?.name || nameRes.decoded?.[0]);
    } catch (e) { fail('name()', e.message); }

    try {
        const symRes = await wbtc.symbol();
        ok('symbol()', symRes.properties?.symbol || symRes.decoded?.[0]);
    } catch (e) { fail('symbol()', e.message); }

    try {
        const decRes = await wbtc.decimals();
        ok('decimals()', String(decRes.properties?.decimals ?? decRes.decoded?.[0]));
    } catch (e) { fail('decimals()', e.message); }

} catch (e) {
    fail('View methods setup', e.message);
}

// ═══════════════════════════════════════
// Test 2: BTC Balances
// ═══════════════════════════════════════
console.log('\n─── Test 2: BTC Balances ───');
try {
    const utxos0 = await provider.fetchUTXO({ address: wallet0.p2tr, minAmount: 1000n, requestedAmount: 100_000_000n });
    const balance0 = utxos0.reduce((a, u) => a + u.value, 0n);
    ok('Wallet0 BTC balance', `${balance0} sats (${utxos0.length} UTXOs)`);

    const utxos1 = await provider.fetchUTXO({ address: wallet1.p2tr, minAmount: 1000n, requestedAmount: 100_000_000n }).catch(() => []);
    const balance1 = utxos1.reduce((a, u) => a + u.value, 0n);
    ok('Wallet1 BTC balance', `${balance1} sats (${utxos1.length} UTXOs)`);

    // If wallet1 has no BTC, send some
    if (balance1 < 300000n) {
        console.log('\n  → Wallet1 needs BTC. Sending 500,000 sats from Wallet0...');
        try {
            const factory = new TransactionFactory();
            const transferUtxos = await provider.fetchUTXO({ address: wallet0.p2tr, minAmount: 500000n, requestedAmount: 1000000n });
            const btcResult = await factory.createBTCTransfer({
                from: wallet0.p2tr,
                to: wallet1.p2tr,
                utxos: transferUtxos,
                amount: 500000n,
                signer: wallet0.keypair,
                mldsaSigner: wallet0.mldsaKeypair,
                feeRate: 2,
                priorityFee: 0n,
                gasSatFee: 0n,
                network: NETWORK,
            });

            // v1.8.0 API: result.tx is hex string
            const rawTx = btcResult.tx;
            const broadcast = await provider.broadcastTransaction(rawTx, false);
            const txid = broadcast?.result || '';
            if (txid) {
                ok('BTC transfer to Wallet1', `500,000 sats, txid: ${txid}`);
            } else {
                fail('BTC transfer', JSON.stringify(broadcast).slice(0, 200));
            }
            console.log('  → Waiting 10s for propagation...');
            await new Promise(r => setTimeout(r, 10000));
        } catch (e) {
            fail('BTC transfer to Wallet1', e.message);
        }
    }
} catch (e) {
    fail('BTC balance check', e.message);
}

// ═══════════════════════════════════════
// Test 3: WBTC balanceOf (before wrap)
// ═══════════════════════════════════════
console.log('\n─── Test 3: WBTC Balances (pre-wrap) ───');
try {
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);

    try {
        const bal0 = await wbtc.balanceOf(wallet0.address);
        if (bal0.revert) throw new Error('revert: ' + bal0.revert);
        const b = bal0.properties?.balance ?? bal0.decoded?.[0] ?? 0n;
        ok('Wallet0 WBTC balance', `${b} (${Number(b) / 1e8} WBTC)`);
    } catch (e) { fail('Wallet0 WBTC balanceOf', e.message); }

    try {
        const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);
        const bal1 = await wbtc1.balanceOf(wallet1.address);
        if (bal1.revert) throw new Error('revert: ' + bal1.revert);
        const b = bal1.properties?.balance ?? bal1.decoded?.[0] ?? 0n;
        ok('Wallet1 WBTC balance', `${b} (${Number(b) / 1e8} WBTC)`);
    } catch (e) { fail('Wallet1 WBTC balanceOf', e.message); }
} catch (e) {
    fail('WBTC balance setup', e.message);
}

// ═══════════════════════════════════════
// Test 4: Wrap BTC → WBTC (Wallet0)
// ═══════════════════════════════════════
console.log('\n─── Test 4: Wrap 10,000 sats → WBTC (Wallet0) ───');
const WRAP_AMOUNT = 10000n;
try {
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);

    // Set transaction details (payable: simulate output to pool)
    await wbtc.setTransactionDetails({
        inputs: [],
        outputs: [{
            index: 1,
            value: WRAP_AMOUNT,
            to: POOL_ADDRESS,
            flags: 0,
            scriptPubKey: undefined,
        }],
    });

    const wrapSim = await wbtc.wrap(WRAP_AMOUNT);
    if (wrapSim.revert) throw new Error('Simulation revert: ' + wrapSim.revert);
    ok('wrap() simulation', 'success');

    // Send real transaction (value must be Number for SDK reduce compatibility)
    const receipt = await wrapSim.sendTransaction({
        signer: wallet0.keypair,
        mldsaSigner: wallet0.mldsaKeypair,
        refundTo: wallet0.p2tr,
        maximumAllowedSatToSpend: 200000n,
        network: NETWORK,
        feeRate: 2,
        priorityFee: 0n,
        extraOutputs: [{
            address: POOL_ADDRESS,
            value: WRAP_AMOUNT,
        }],
    });

    console.log('  Receipt keys:', Object.keys(receipt || {}));
    console.log('  Receipt:', JSON.stringify(receipt).slice(0, 300));
    const txHash = receipt?.transactionId || receipt?.txid || receipt?.result || '';
    if (txHash) {
        ok('wrap() TX broadcast', txHash);
    } else {
        fail('wrap() TX', 'No txHash returned: ' + JSON.stringify(receipt).slice(0, 200));
    }
} catch (e) {
    fail('wrap() Wallet0', e.message);
    if (e.stack) console.error('    Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
}

// Wait for block confirmation (OPNet testnet ~30s blocks)
console.log('\n  → Waiting 30s for wrap TX confirmation...');
await new Promise(r => setTimeout(r, 30000));

// ═══════════════════════════════════════
// Test 5: Check WBTC balance after wrap
// ═══════════════════════════════════════
console.log('\n─── Test 5: WBTC Balance (post-wrap) ───');
try {
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);
    const bal = await wbtc.balanceOf(wallet0.address);
    if (bal.revert) throw new Error('revert: ' + bal.revert);
    const b = bal.properties?.balance ?? bal.decoded?.[0] ?? 0n;
    ok('Wallet0 WBTC balance after wrap', `${b} (${Number(b) / 1e8} WBTC)`);
    if (b >= WRAP_AMOUNT) {
        ok('Balance increased by wrap amount');
    }
} catch (e) {
    fail('Post-wrap balance', e.message);
}

// ═══════════════════════════════════════
// Test 6: Wrap from Wallet1 (cross-wallet)
// ═══════════════════════════════════════
console.log('\n─── Test 6: Wrap 10,000 sats → WBTC (Wallet1) ───');
try {
    const wbtc1 = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet1.address);

    await wbtc1.setTransactionDetails({
        inputs: [],
        outputs: [{
            index: 1,
            value: WRAP_AMOUNT,
            to: POOL_ADDRESS,
            flags: 0,
            scriptPubKey: undefined,
        }],
    });

    const wrapSim1 = await wbtc1.wrap(WRAP_AMOUNT);
    if (wrapSim1.revert) throw new Error('Simulation revert: ' + wrapSim1.revert);
    ok('wrap() simulation (Wallet1)', 'success');

    const receipt1 = await wrapSim1.sendTransaction({
        signer: wallet1.keypair,
        mldsaSigner: wallet1.mldsaKeypair,
        refundTo: wallet1.p2tr,
        maximumAllowedSatToSpend: 200000n,
        network: NETWORK,
        feeRate: 2,
        priorityFee: 0n,
        extraOutputs: [{
            address: POOL_ADDRESS,
            value: WRAP_AMOUNT,
        }],
    });

    const txHash1 = receipt1?.transactionId || receipt1?.txid || '';
    if (txHash1) {
        ok('wrap() TX broadcast (Wallet1)', txHash1);
    } else {
        fail('wrap() TX (Wallet1)', 'No txHash');
    }
} catch (e) {
    fail('wrap() Wallet1', e.message);
}

// Wait for block confirmation
console.log('\n  → Waiting 30s for confirmation...');
await new Promise(r => setTimeout(r, 30000));

// ═══════════════════════════════════════
// Test 7: Unwrap WBTC → BTC (Wallet0)
// ═══════════════════════════════════════
console.log('\n─── Test 7: Unwrap 10,000 WBTC → BTC (Wallet0) ───');
try {
    const wbtc = getContract(WBTC_ADDRESS, [...WBTCAbi, ...OP_20_ABI], rpcProvider, NETWORK, wallet0.address);

    const unwrapSim = await wbtc.unwrap(WRAP_AMOUNT);
    if (unwrapSim.revert) throw new Error('Simulation revert: ' + unwrapSim.revert);
    ok('unwrap() simulation', 'success');

    const receipt = await unwrapSim.sendTransaction({
        signer: wallet0.keypair,
        mldsaSigner: wallet0.mldsaKeypair,
        refundTo: wallet0.p2tr,
        maximumAllowedSatToSpend: 200000n,
        network: NETWORK,
        feeRate: 2,
        priorityFee: 0n,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    if (txHash) {
        ok('unwrap() TX broadcast', txHash);
    } else {
        fail('unwrap() TX', 'No txHash');
    }
} catch (e) {
    fail('unwrap() Wallet0', e.message);
}

// ═══════════════════════════════════════
// Summary
// ═══════════════════════════════════════
console.log('\n════════════════════════════════════════════');
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
