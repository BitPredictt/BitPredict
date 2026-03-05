/**
 * BitPredict Oracle Bot
 *
 * Fetches real BTC/USD price from Binance (CoinGecko fallback),
 * derives 3 oracle wallets from a mnemonic, and submits prices
 * every N blocks to the PriceOracle contract (3-of-5 quorum).
 *
 * Env vars:
 *   OPNET_SEED             — BIP39 mnemonic (same used for deploy)
 *   OPNET_NETWORK           — "testnet" | "mainnet" (default: testnet)
 *   OPNET_RPC_BASE          — RPC base URL (default: https://testnet.opnet.org)
 *   ORACLE_CONTRACT_PUBKEY  — hex pubkey of PriceOracle contract
 *   ORACLE_INTERVAL_BLOCKS  — submit every N blocks (default: 2)
 */

import { JSONRpcProvider, getContract, OP_NET_ABI } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, Address } from '@btc-vision/transaction';

// --- Config ---
const NETWORK_NAME = process.env.OPNET_NETWORK || 'testnet';
const RPC_URL = process.env.OPNET_RPC_BASE || 'https://testnet.opnet.org';
const SEED = process.env.OPNET_SEED;
const ORACLE_PUBKEY = process.env.ORACLE_CONTRACT_PUBKEY;
const INTERVAL_BLOCKS = parseInt(process.env.ORACLE_INTERVAL_BLOCKS || '2', 10);
const ASSET_ID = 1n; // BTC/USD = asset 1
const PRICE_DECIMALS = 1e8; // oracle stores price × 1e8

if (!SEED) { console.error('OPNET_SEED is required'); process.exit(1); }
if (!ORACLE_PUBKEY) { console.error('ORACLE_CONTRACT_PUBKEY is required'); process.exit(1); }

const network = NETWORK_NAME === 'mainnet' ? networks.bitcoin : networks.opnetTestnet;
const provider = new JSONRpcProvider({ url: RPC_URL, network });
const oracleAddr = Address.fromString(ORACLE_PUBKEY);

const PriceOracleAbi = [
  { name: 'submitPrice', inputs: [{ name: 'assetId', type: 'UINT256' }, { name: 'price', type: 'UINT256' }], outputs: [], type: 'function' },
  { name: 'getPrice', inputs: [{ name: 'assetId', type: 'UINT256' }], outputs: [{ name: 'price', type: 'UINT256' }], type: 'function' },
  ...OP_NET_ABI,
];

// Derive 3 oracle wallets (indices 0, 1, 2)
const wallets = [];
for (let i = 0; i < 3; i++) {
  wallets.push(new Mnemonic(SEED, '', network).deriveOPWallet(undefined, i));
}

console.log('=== BitPredict Oracle Bot ===');
console.log(`Network: ${NETWORK_NAME} | RPC: ${RPC_URL}`);
console.log(`Oracle contract: ${ORACLE_PUBKEY.slice(0, 20)}...`);
console.log(`Interval: every ${INTERVAL_BLOCKS} block(s)`);
console.log('Wallets:');
wallets.forEach((w, i) => console.log(`  [${i}] ${w.p2tr}`));
console.log('');

// --- Price fetching ---

async function fetchBinancePrice() {
  const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Binance HTTP ${res.status}`);
  const data = await res.json();
  return parseFloat(data.price);
}

async function fetchCoinGeckoPrice() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  return data.bitcoin.usd;
}

// Price sanity bounds
const MIN_BTC_PRICE = 1000;
const MAX_BTC_PRICE = 10_000_000;
let lastKnownPrice = 0;

function validatePrice(price) {
  if (!Number.isFinite(price) || price <= 0) return false;
  if (price < MIN_BTC_PRICE || price > MAX_BTC_PRICE) return false;
  // Spike detection: reject >30% change from last known price
  if (lastKnownPrice > 0 && Math.abs(price - lastKnownPrice) / lastKnownPrice > 0.3) {
    console.warn(`Price spike detected: $${price} vs last $${lastKnownPrice} (>30% change)`);
    return false;
  }
  return true;
}

async function fetchBtcPrice() {
  try {
    const price = await fetchBinancePrice();
    if (validatePrice(price)) { lastKnownPrice = price; return { price, source: 'Binance' }; }
  } catch (e) {
    console.warn('Binance failed:', e.message);
  }
  try {
    const price = await fetchCoinGeckoPrice();
    if (validatePrice(price)) { lastKnownPrice = price; return { price, source: 'CoinGecko' }; }
  } catch (e) {
    console.warn('CoinGecko failed:', e.message);
  }
  return null;
}

// --- Submit price from one wallet ---

async function submitFromWallet(walletIdx, priceBigInt) {
  const w = wallets[walletIdx];
  const oracle = getContract(oracleAddr, PriceOracleAbi, provider, network, w.address);
  try {
    const sim = await oracle.submitPrice(ASSET_ID, priceBigInt);
    if (sim.revert) {
      console.log(`  [${walletIdx}] revert: ${sim.revert}`);
      return false;
    }
    const tx = await sim.sendTransaction({
      signer: w.keypair,
      mldsaSigner: w.mldsaKeypair,
      refundTo: w.p2tr,
      maximumAllowedSatToSpend: 20000n,
      network,
    });
    const txId = tx.transactionId || tx.txId || JSON.stringify(tx);
    console.log(`  [${walletIdx}] submitted, tx=${String(txId).slice(0, 40)}`);
    return true;
  } catch (e) {
    console.error(`  [${walletIdx}] error: ${e.message}`);
    return false;
  }
}

// --- Wait for N new blocks ---

const MAX_WAIT_MINUTES = 120; // max 2 hours waiting for blocks

async function waitBlocks(n) {
  const start = Number(await provider.getBlockNumber());
  const target = start + n;
  const deadline = Date.now() + MAX_WAIT_MINUTES * 60 * 1000;
  console.log(`Waiting for block ${target} (current: ${start})...`);
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 30000)); // poll every 30s
    try {
      const current = Number(await provider.getBlockNumber());
      if (current >= target) {
        console.log(`Block ${current} reached.`);
        return current;
      }
      process.stdout.write('.');
    } catch {
      process.stdout.write('x'); // RPC error, retry
    }
  }
  throw new Error(`Timeout: no new block after ${MAX_WAIT_MINUTES} minutes`);
}

// --- Read current aggregated price ---

async function readAggregatedPrice() {
  const oracle = getContract(oracleAddr, PriceOracleAbi, provider, network, wallets[0].address);
  try {
    const r = await oracle.getPrice(ASSET_ID);
    const raw = r?.properties?.price?.toString() || '0';
    return Number(raw) / PRICE_DECIMALS;
  } catch {
    return 0;
  }
}

// --- Main loop ---

async function runOnce() {
  const result = await fetchBtcPrice();
  if (!result) {
    console.error('All price sources failed, skipping this round.');
    return;
  }

  const { price, source } = result;
  console.log(`\nBTC price: $${price.toFixed(2)} (${source})`);

  // ±0.1% spread for each oracle (simulate different sources)
  const spreads = [-0.001, 0, 0.001];

  // Strategy: submit oracle 0+1 in same block → wait 1 block → submit oracle 2
  // Oracle 2's _tryAggregate sees oracles 0+1 from storage + its own = 3 >= QUORUM
  // (AddressMemoryMap.get() can't see set() from same TX, so we need separate blocks)

  console.log('  Phase 1: submitting oracles 0 and 1...');
  let phase1ok = 0;
  for (let i = 0; i < 2; i++) {
    const adjustedPrice = price * (1 + spreads[i]);
    const priceBigInt = BigInt(Math.round(adjustedPrice * PRICE_DECIMALS));
    console.log(`  [${i}] price=$${adjustedPrice.toFixed(2)} → ${priceBigInt}`);
    const ok = await submitFromWallet(i, priceBigInt);
    if (ok) phase1ok++;
    if (i === 0) await new Promise(r => setTimeout(r, 3000));
  }
  console.log(`  Phase 1: ${phase1ok}/2 submitted`);

  if (phase1ok < 2) {
    console.warn('  Phase 1 failed — not enough submissions, skipping phase 2');
    return;
  }

  // Wait 1 block for phase 1 TXs to finalize
  console.log('  Waiting 1 block for phase 1 to finalize...');
  await waitBlocks(1);

  // Phase 2: submit oracle 2 (triggers aggregation)
  console.log('  Phase 2: submitting oracle 2 (triggers aggregation)...');
  const adjustedPrice2 = price * (1 + spreads[2]);
  const priceBigInt2 = BigInt(Math.round(adjustedPrice2 * PRICE_DECIMALS));
  console.log(`  [2] price=$${adjustedPrice2.toFixed(2)} → ${priceBigInt2}`);
  const ok2 = await submitFromWallet(2, priceBigInt2);

  if (ok2) {
    console.log('  Waiting 1 block for aggregation...');
    await waitBlocks(1);
    const aggregated = await readAggregatedPrice();
    if (aggregated > 0) {
      console.log(`  ✅ Aggregated oracle price: $${aggregated.toFixed(2)}`);
    } else {
      console.log('  ⚠ Aggregated price still 0 — check quorum');
    }
  } else {
    console.warn('  Oracle 2 submission failed');
  }
}

async function main() {
  console.log('Starting oracle bot loop...\n');

  // First run immediately
  await runOnce();

  // Then loop every INTERVAL_BLOCKS
  while (true) {
    await waitBlocks(INTERVAL_BLOCKS);
    await runOnce();
  }
}

// Graceful shutdown
let shuttingDown = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n${sig} received, shutting down...`);
    shuttingDown = true;
    setTimeout(() => process.exit(0), 5000); // force exit after 5s
  });
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
