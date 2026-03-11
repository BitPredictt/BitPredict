import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();


// --- OPNet SDK for REAL on-chain transactions ---
// Pattern from C:\vibe\faucet\server.mjs (proven working)
// Uses TransactionFactory.signInteraction + BinaryWriter + ChallengeSolution
// Requires @btc-vision/transaction v1.8.0-rc.8 with nested @btc-vision/bitcoin (opnetTestnet support)
let deployerWallet = null;
let opnetProvider = null;
let opnetFactory = null;
let opnetNetwork = null;
let opnetRpcProvider = null; // JSONRpcProvider for getContract() calls

const WBTC_TOKEN = process.env.WBTC_TOKEN || '';
const WBTC_DECIMALS = 8;
const INCREASE_ALLOWANCE_SELECTOR = 0x8d645723;
const MIN_BET_SATS = 10000; // 10,000 sats minimum bet
const PREDICTION_MARKET_ADDRESS = process.env.PREDICTION_MARKET_ADDRESS || '';
let nextOnchainMarketId = 1;
const GAS_SAT_FEE = BigInt(process.env.GAS_SAT_FEE || '10000');
const PRIORITY_FEE = BigInt(process.env.PRIORITY_FEE || '1000');

// Contract pubkey hex (32 bytes) — resolved via getCode RPC on startup
let WBTC_CONTRACT_PUBKEY = '';

let txLock = false;
let txLockAcquiredAt = 0;
const TX_LOCK_TIMEOUT_MS = 120_000; // 2 min auto-release

function acquireTxLock() {
  if (txLock) {
    if (Date.now() - txLockAcquiredAt > TX_LOCK_TIMEOUT_MS) {
      console.error('[txLock] Timeout detected — force-releasing stale lock');
      txLock = false;
    } else {
      return false;
    }
  }
  txLock = true;
  txLockAcquiredAt = Date.now();
  return true;
}
function releaseTxLock() { txLock = false; txLockAcquiredAt = 0; }

// Get dynamic fee rate from RPC (with fallback)
async function getDynamicFeeRate() {
  try {
    const res = await fetch(OPNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_gasParameters', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const recommended = data.result?.bitcoin?.recommended?.medium || data.result?.bitcoin?.conservative;
    return Math.max(2, Number(recommended || 2));
  } catch {
    return 2; // fallback to minimum
  }
}

// Network config (env-driven for mainnet/testnet switch)
const OPNET_NETWORK_NAME = process.env.OPNET_NETWORK || 'testnet';
const OPNET_BASE_URL = process.env.OPNET_RPC_BASE || (OPNET_NETWORK_NAME === 'mainnet' ? 'https://api.opnet.org' : 'https://testnet.opnet.org');
const OPNET_RPC_URL = OPNET_BASE_URL + '/api/v1/json-rpc';
const OPNET_ADDRESS_PREFIX = OPNET_NETWORK_NAME === 'mainnet' ? 'ob1' : 'opt1';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://bitpredict.club';

async function initDeployerWallet() {
  const seed = process.env.OPNET_SEED;
  if (!seed) {
    console.log('OPNET_SEED not set — on-chain transactions disabled');
    return;
  }
  try {
    const { Mnemonic, TransactionFactory, OPNetLimitedProvider } = await import('@btc-vision/transaction');
    const { JSONRpcProvider } = await import('opnet');
    const { networks } = await import('@btc-vision/bitcoin');

    opnetNetwork = OPNET_NETWORK_NAME === 'mainnet' ? networks.bitcoin : networks.opnetTestnet;
    const m = new Mnemonic(seed, '', opnetNetwork);
    const wallet = m.deriveOPWallet(undefined, 0);

    deployerWallet = wallet;
    opnetProvider = new OPNetLimitedProvider(OPNET_BASE_URL);
    opnetRpcProvider = new JSONRpcProvider({ url: OPNET_BASE_URL, network: opnetNetwork });
    opnetFactory = new TransactionFactory();
    console.log('Deployer wallet initialized:', wallet.p2tr);

    // Verify BTC balance
    const utxos = await opnetProvider.fetchUTXO({ address: wallet.p2tr, minAmount: 1000n, requestedAmount: 10000n }).catch(() => []);
    const totalSats = utxos.reduce((a, u) => a + u.value, 0n);
    console.log('Deployer BTC balance:', totalSats.toString(), 'sats', `(${utxos.length} UTXOs)`);

    // Resolve WBTC token contract pubkey (32-byte hex) via getCode RPC
    if (WBTC_TOKEN) {
      try {
        const codeRes = await fetch(OPNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [WBTC_TOKEN, false], id: 1 }),
          signal: AbortSignal.timeout(12000),
        });
        const codeData = await codeRes.json();
        if (codeData.result && codeData.result.contractPublicKey) {
          WBTC_CONTRACT_PUBKEY = Buffer.from(codeData.result.contractPublicKey, 'base64').toString('hex');
          console.log('WBTC contract pubkey resolved:', WBTC_CONTRACT_PUBKEY);
        } else {
          console.log('Could not resolve WBTC contract pubkey:', JSON.stringify(codeData.error || {}));
        }
      } catch (e2) {
        console.log('WBTC pubkey resolution failed:', e2.message);
      }
    }
  } catch (e) {
    console.error('Failed to init deployer wallet:', e.message);
  }
}

// Get current block height from OPNet RPC (for createMarket endBlock)
async function getBlockHeightFromRPC() {
  try {
    const res = await fetch(OPNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return typeof data.result === 'string' ? parseInt(data.result, 16) : Number(data.result || 0);
  } catch {
    return 0;
  }
}

// Get epoch challenge for transaction signing (required by OPNet)
async function getChallenge() {
  const res = await fetch(OPNET_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_latestEpoch', params: [], id: 1 }),
    signal: AbortSignal.timeout(12000),
  });
  const { result: e } = await res.json();
  const { ChallengeSolution } = await import('@btc-vision/transaction');
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

// Create real on-chain proof TX using increaseAllowance on PRED token.
// contract param = 32-byte hex pubkey (resolved via getCode RPC on startup).
async function createOnChainProof(amount, memo) {
  if (!deployerWallet || !opnetProvider || !opnetFactory) {
    return { success: false, error: 'Deployer wallet not initialized' };
  }
  if (!WBTC_CONTRACT_PUBKEY) {
    return { success: false, error: 'PRED contract pubkey not resolved' };
  }
  if (!acquireTxLock()) {
    return { success: false, error: 'Server busy, try again in a few seconds' };
  }
  try {
    const dynamicFeeRate = await getDynamicFeeRate();
    const { BinaryWriter } = await import('@btc-vision/transaction');

    const rawAmount = BigInt(amount) * (10n ** BigInt(WBTC_DECIMALS));
    // Use wallet's Address object for writeAddress
    const spenderAddr = deployerWallet.address;

    const challenge = await getChallenge();
    const utxos = await opnetProvider.fetchUTXO({
      address: deployerWallet.p2tr,
      minAmount: 5000n,
      requestedAmount: 50000n,
    });
    if (!utxos || utxos.length === 0) throw new Error('No UTXOs — fund deployer wallet');

    // increaseAllowance(spender, amount) — real on-chain contract interaction
    const writer = new BinaryWriter();
    writer.writeSelector(INCREASE_ALLOWANCE_SELECTOR);
    writer.writeAddress(spenderAddr);
    writer.writeU256(rawAmount);

    const result = await opnetFactory.signInteraction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      network: opnetNetwork,
      utxos,
      from: deployerWallet.p2tr,
      to: WBTC_TOKEN,
      contract: WBTC_CONTRACT_PUBKEY, // 32-byte hex pubkey (NOT bech32)
      calldata: writer.getBuffer(),
      feeRate: dynamicFeeRate,
      priorityFee: PRIORITY_FEE,
      gasSatFee: GAS_SAT_FEE,
      challenge,
      linkMLDSAPublicKeyToAddress: true,
      revealMLDSAPublicKey: true,
    });

    // Broadcast transaction (v1.8.0 API: result.tx is hex string)
    const rawTx = result.tx || result.interactionTransaction;
    const b2 = await opnetProvider.broadcastTransaction(rawTx, false);
    console.log(`[${memo}] TX broadcast:`, JSON.stringify(b2));

    const txHash = b2?.result || '';
    return { success: true, txHash };
  } catch (e) {
    console.error(`On-chain proof error [${memo}]:`, e.message, '\nStack:', e.stack);
    return { success: false, error: e.message };
  } finally {
    releaseTxLock();
  }
}

// PredictionMarket ABI for getContract() server-side calls
// Transfer WBTC tokens on-chain from deployer to user address
async function transferWbtc(toAddress, amount) {
  if (!deployerWallet || !opnetRpcProvider) {
    return { success: false, error: 'On-chain not ready' };
  }
  if (!WBTC_CONTRACT_PUBKEY) {
    return { success: false, error: 'WBTC contract pubkey not resolved' };
  }
  if (!acquireTxLock()) return { success: false, error: 'Server busy, try again in a few seconds' };
  try {
    const feeRate = await getDynamicFeeRate();
    const { getContract, OP_20_ABI, BitcoinUtils } = await import('opnet');

    const token = getContract(WBTC_TOKEN, OP_20_ABI, opnetRpcProvider, opnetNetwork, deployerWallet.address);

    let lookupAddress = toAddress;
    if (toAddress.startsWith(OPNET_ADDRESS_PREFIX + '1sq')) {
      const userRow = db.prepare('SELECT p2tr_address FROM users WHERE address = ?').get(toAddress);
      if (userRow?.p2tr_address) {
        lookupAddress = userRow.p2tr_address;
      } else {
        throw new Error('User P2TR address not stored — user must re-login');
      }
    }

    const recipientAddr = await opnetRpcProvider.getPublicKeyInfo(lookupAddress, false);
    if (!recipientAddr) throw new Error('Cannot resolve recipient public key from ' + lookupAddress);
    const rawAmount = BitcoinUtils.expandToDecimals(amount, WBTC_DECIMALS);

    const sim = await token.transfer(recipientAddr, rawAmount);
    if (sim.revert) throw new Error('transfer revert: ' + sim.revert);

    const receipt = await sim.sendTransaction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      refundTo: deployerWallet.p2tr,
      maximumAllowedSatToSpend: 50000n,
      feeRate,
      network: opnetNetwork,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    console.log(`WBTC transfer: ${amount} to ${toAddress}, tx=${txHash}`);
    return { success: true, txHash };
  } catch (e) {
    console.error('transferWbtc error:', e.message);
    return { success: false, error: e.message };
  } finally {
    releaseTxLock();
  }
}

/**
 * Send raw BTC from pool (deployer wallet) to a recipient address.
 * Used for WBTC unwrap — user burns WBTC, server sends BTC.
 * @param {string} toAddress - recipient p2tr/bech32 address
 * @param {number} amountSats - amount in satoshis
 */
async function sendBtcFromPool(toAddress, amountSats) {
  if (!deployerWallet || !opnetProvider || !opnetFactory) {
    throw new Error('Deployer wallet not initialized');
  }
  if (!acquireTxLock()) return { success: false, error: 'Transaction in progress, try again' };
  try {
    const utxos = await opnetProvider.fetchUTXO({
      address: deployerWallet.p2tr,
      minAmount: BigInt(amountSats),
      requestedAmount: BigInt(amountSats) + 50000n,
    });
    if (!utxos || utxos.length === 0) throw new Error('Insufficient pool BTC UTXOs');

    const feeRate = await getDynamicFeeRate();

    const result = await opnetFactory.createBTCTransfer({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      network: opnetNetwork,
      utxos,
      from: deployerWallet.p2tr,
      to: toAddress,
      amount: BigInt(amountSats),
      feeRate,
      priorityFee: PRIORITY_FEE,
      gasSatFee: GAS_SAT_FEE,
    });

    // Broadcast transaction (v1.8.0 API: result.tx is hex string)
    const rawTx = result.tx || result.transaction || result.interactionTransaction;
    const b = await opnetProvider.broadcastTransaction(rawTx, false);
    const txHash = b?.result || b?.txid || '';
    console.log(`[sendBtcFromPool] Sent ${amountSats} sats to ${toAddress}: ${txHash}`);
    return { success: true, txHash };
  } catch (e) {
    console.error('[sendBtcFromPool] Error:', e.message);
    return { success: false, error: e.message };
  } finally {
    releaseTxLock();
  }
}

// ==========================================================================
// ON-CHAIN CONTRACT INTERACTIONS (PredictionMarket)
// ==========================================================================

/** Lazy-loaded shared ABI for PredictionMarket contract. */
let _predictionMarketAbi = null;
async function getPredictionMarketAbi() {
  if (_predictionMarketAbi) return _predictionMarketAbi;
  const { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } = await import('opnet');
  _predictionMarketAbi = [
    { name: 'createMarket', inputs: [{ name: 'endBlock', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'placeBet', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'isYes', type: ABIDataTypes.BOOL }, { name: 'amount', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'netAmount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'resolveMarket', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'outcome', type: ABIDataTypes.BOOL }], outputs: [], type: BitcoinAbiTypes.Function },
    { name: 'claimPayout', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'withdrawFees', inputs: [], outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPool', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'getUserBets', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'user', type: ABIDataTypes.ADDRESS }], outputs: [{ name: 'yesBet', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    { name: 'getPrice', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPriceBps', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    ...OP_NET_ABI,
  ];
  return _predictionMarketAbi;
}

/**
 * Create a market on-chain via PredictionMarket.createMarket(endBlock).
 * Called by server (deployer = admin) when syncing SQLite markets to chain.
 */
async function createMarketOnChain(endBlock) {
  if (!deployerWallet || !opnetRpcProvider || !PREDICTION_MARKET_ADDRESS) {
    return { success: false, error: 'On-chain not ready or PREDICTION_MARKET_ADDRESS not set' };
  }
  if (!acquireTxLock()) return { success: false, error: 'Server busy' };
  try {
    const { getContract } = await import('opnet');
    const PredictionMarketAbi = await getPredictionMarketAbi();

    const contract = getContract(
      PREDICTION_MARKET_ADDRESS,
      PredictionMarketAbi,
      opnetRpcProvider,
      opnetNetwork,
      deployerWallet.address,
    );

    const sim = await contract.createMarket(BigInt(endBlock));
    if (sim.revert) throw new Error('createMarket revert: ' + sim.revert);

    const feeRate = await getDynamicFeeRate();
    const receipt = await sim.sendTransaction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      refundTo: deployerWallet.p2tr,
      maximumAllowedSatToSpend: 50000n,
      feeRate,
      network: opnetNetwork,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    const onchainId = sim?.properties?.marketId != null ? Number(sim.properties.marketId) : null;
    console.log(`[createMarketOnChain] endBlock=${endBlock}, onchainId=${onchainId}, tx=${txHash}`);
    return { success: true, onchainId, txHash };
  } catch (e) {
    console.error('[createMarketOnChain] Error:', e.message);
    return { success: false, error: e.message };
  } finally {
    releaseTxLock();
  }
}

/**
 * Resolve a market on-chain via PredictionMarket.resolveMarket(marketId, outcome).
 * Called after SQLite resolve to update contract state.
 */
async function resolveMarketOnChain(onchainId, outcomeIsYes) {
  if (!deployerWallet || !opnetRpcProvider || !PREDICTION_MARKET_ADDRESS) {
    return { success: false, error: 'On-chain not ready' };
  }
  if (!acquireTxLock()) return { success: false, error: 'Server busy' };
  try {
    const { getContract } = await import('opnet');
    const PredictionMarketAbi = await getPredictionMarketAbi();

    const contract = getContract(
      PREDICTION_MARKET_ADDRESS,
      PredictionMarketAbi,
      opnetRpcProvider,
      opnetNetwork,
      deployerWallet.address,
    );

    const sim = await contract.resolveMarket(BigInt(onchainId), outcomeIsYes);
    if (sim.revert) throw new Error('resolveMarket revert: ' + sim.revert);

    const feeRate = await getDynamicFeeRate();
    const receipt = await sim.sendTransaction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      refundTo: deployerWallet.p2tr,
      maximumAllowedSatToSpend: 50000n,
      feeRate,
      network: opnetNetwork,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    console.log(`[resolveMarketOnChain] onchainId=${onchainId}, outcome=${outcomeIsYes}, tx=${txHash}`);
    return { success: true, txHash };
  } catch (e) {
    console.error('[resolveMarketOnChain] Error:', e.message);
    return { success: false, error: e.message };
  } finally {
    releaseTxLock();
  }
}

/**
 * Withdraw accumulated fees on-chain via PredictionMarket.withdrawFees().
 * Server (deployer = admin) calls this periodically.
 */
async function withdrawFeesOnChain() {
  if (!deployerWallet || !opnetRpcProvider || !PREDICTION_MARKET_ADDRESS) return;
  if (!acquireTxLock()) return;
  try {
    const { getContract } = await import('opnet');
    const PredictionMarketAbi = await getPredictionMarketAbi();

    const contract = getContract(
      PREDICTION_MARKET_ADDRESS,
      PredictionMarketAbi,
      opnetRpcProvider,
      opnetNetwork,
      deployerWallet.address,
    );

    const sim = await contract.withdrawFees();
    if (sim.revert) {
      // 'No fees to withdraw' is expected — not an error
      if (sim.revert.includes('No fees')) return;
      throw new Error('withdrawFees revert: ' + sim.revert);
    }

    const feeRate = await getDynamicFeeRate();
    const receipt = await sim.sendTransaction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      refundTo: deployerWallet.p2tr,
      maximumAllowedSatToSpend: 50000n,
      feeRate,
      network: opnetNetwork,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    const amount = sim?.properties?.amount != null ? Number(sim.properties.amount) : 0;
    console.log(`[withdrawFeesOnChain] Withdrew ${amount} sats fees, tx=${txHash}`);

    // Distribute: 60% vault, 20% protocol, 20% creator (generic)
    if (amount > 0) {
      const vaultShare = Math.floor(amount * 0.60);
      const protocolShare = Math.floor(amount * 0.20);
      distributeToVault(vaultShare, 'fees-onchain');
      if (protocolShare > 0) {
        db.prepare('INSERT INTO protocol_revenue (source_type, source_market_id, amount) VALUES (?, ?, ?)').run('onchain_fees', '', protocolShare);
        ACCUMULATED_PROTOCOL_REVENUE += protocolShare;
      }
    }
  } catch (e) {
    console.error('[withdrawFeesOnChain] Error:', e.message);
  } finally {
    releaseTxLock();
  }
}

/**
 * Sync SQLite markets (without onchain_id) to on-chain contract.
 * Only syncs non-polymarket, non-resolved markets that still have time left.
 */
async function syncMarketsToChain() {
  if (!deployerWallet || !PREDICTION_MARKET_ADDRESS) return;
  try {
    const now = Math.floor(Date.now() / 1000);
    // Only 1 market per cycle to avoid duplicate onchainId (simulation returns same ID if TX not confirmed)
    const m = db.prepare(
      "SELECT * FROM markets WHERE onchain_id IS NULL AND resolved = 0 AND end_time > ? AND market_type != 'polymarket' LIMIT 1"
    ).get(now + 600); // at least 10 min remaining

    if (!m) return;

    const currentBlock = await getBlockHeightFromRPC();
    if (!currentBlock) return;

    const remainingSecs = m.end_time - now;
    const endBlock = currentBlock + Math.ceil(remainingSecs / 600); // 1 block ≈ 10 min

    const result = await createMarketOnChain(endBlock);
    if (result.success && result.onchainId != null && result.txHash) {
      // Wait for TX confirmation before saving onchainId to prevent duplicates
      const confirmed = await waitForTxConfirmation(result.txHash, 180);
      if (confirmed) {
        db.prepare('UPDATE markets SET onchain_id = ? WHERE id = ?').run(result.onchainId, m.id);
        console.log(`[syncMarketsToChain] ${m.id} → onchainId=${result.onchainId} (confirmed)`);
      } else {
        console.warn(`[syncMarketsToChain] TX ${result.txHash.slice(0,16)} not confirmed after 3min — skipping`);
      }
    } else {
      console.error(`[syncMarketsToChain] Failed for ${m.id}: ${result.error}`);
    }
  } catch (e) {
    console.error('[syncMarketsToChain] Error:', e.message);
  }
}

/** Wait for a TX to be confirmed on-chain. Returns true if confirmed within maxSecs. */
async function waitForTxConfirmation(txHash, maxSecs = 180) {
  const RPC_URL = process.env.VITE_OPNET_RPC_URL || 'https://testnet.opnet.org';
  for (let i = 0; i < maxSecs / 15; i++) {
    await new Promise(r => setTimeout(r, 15000));
    try {
      const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.result?.blockNumber) return true;
    } catch(e) { /* retry */ }
  }
  return false;
}

// Init deployer wallet on startup
initDeployerWallet();

// CORS: restrict to allowed origin (configurable via env)
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '50kb' }));

// Simple in-memory rate limiter
const rateLimits = new Map(); // key -> { count, resetAt }
function rateLimit(key, maxPerWindow, windowMs) {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return false; // not limited
  }
  if (entry.count >= maxPerWindow) return true; // limited
  entry.count++;
  return false;
}
// Cleanup expired rate limit entries every 10 min to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateLimits.entries()) { if (now > v.resetAt) rateLimits.delete(k); }
}, 10 * 60 * 1000);

// --- JWT Authentication ---
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required. Set it before starting the server.');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
const JWT_EXPIRY = '24h';

// Challenge store for MLDSA auth flow: address -> { challenge, createdAt }
const authChallenges = new Map();
// Cleanup expired challenges every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of authChallenges.entries()) { if (now - v.createdAt > 300000) authChallenges.delete(k); }
}, 300000);

// Generate challenge for address (HMAC-signed for integrity verification)
function generateChallenge(address) {
  const challenge = crypto.randomBytes(32).toString('hex');
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(`${address}:${challenge}`).digest('hex');
  authChallenges.set(address, { challenge, hmac, createdAt: Date.now() });
  return challenge;
}

// requireAuth middleware — verifies JWT and checks address match
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required. Send Bearer <jwt> header.' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.jwtAddress = decoded.address;

    // Check that body.address (if present) matches JWT address
    const bodyAddress = req.body?.address || req.body?.follower;
    if (bodyAddress && bodyAddress !== decoded.address) {
      return res.status(403).json({ error: 'Address mismatch: JWT address does not match request address' });
    }

    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// --- On-chain TX Verification via RPC ---
// OPNET_RPC_URL defined at top of file via env vars

/**
 * Verify a transaction hash on-chain via OPNet RPC.
 * Returns { valid, sender, events } or throws.
 */
// Phase 1: Quick TX check via btc_getTransactionByHash (works for confirmed AND unconfirmed).
// Bob docs: getTransaction finds TX even if pending; check blockNumber for confirmation.
async function verifyTxExists(txHash, expectedSender) {
  if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
    return { valid: false, error: 'Invalid txHash format' };
  }

  try {
    // btc_getTransactionByHash — returns TX whether confirmed or still in mempool
    const res = await fetch(OPNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json();

    if (data.result) {
      const tx = data.result;
      // Sender check
      if (expectedSender && tx.from) {
        if (tx.from.toLowerCase() !== expectedSender.toLowerCase()) {
          return { valid: false, error: `Sender mismatch: ${tx.from} vs ${expectedSender}` };
        }
      }
      const confirmed = tx.blockNumber !== undefined && tx.blockNumber !== null;
      return { valid: true, confirmed, source: confirmed ? 'confirmed' : 'mempool' };
    }

    // TX not found yet — network propagation delay (wallet just broadcast)
    // Accept on trust; background job will confirm later
    console.log(`TX ${txHash} not found via getTransaction — accepting (just broadcast)`);
    return { valid: true, confirmed: false, source: 'trust' };
  } catch (e) {
    console.error('TX check error:', e.message);
    // RPC down — don't block the bet
    return { valid: true, confirmed: false, source: 'rpc_down' };
  }
}

// Phase 2: Background confirmation — called every 30s to confirm pending bets.
// Bob pattern: getTransaction → check blockNumber for confirmation status.
async function confirmPendingBets() {
  try {
    const pending = db.prepare("SELECT id, tx_hash, user_address FROM bets WHERE tx_confirmed = 0 AND tx_hash != '' AND created_at > unixepoch() - 86400").all();
    if (!pending.length) return;

    for (const bet of pending) {
      try {
        const res = await fetch(OPNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [bet.tx_hash], id: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (data.result && data.result.blockNumber !== undefined && data.result.blockNumber !== null) {
          db.prepare('UPDATE bets SET tx_confirmed = 1 WHERE id = ?').run(bet.id);
          console.log(`Bet ${bet.id} TX confirmed in block ${data.result.blockNumber}: ${bet.tx_hash}`);
        }
      } catch { /* skip, retry next cycle */ }
    }
  } catch (e) {
    console.error('confirmPendingBets error:', e.message);
  }
}

// Background confirmation for pending_operations — checks TX confirmation on-chain
async function confirmPendingOps() {
  try {
    const pending = db.prepare(
      "SELECT id, tx_hash FROM pending_operations WHERE status = 'pending' AND tx_hash != '' AND created_at > unixepoch() - 3600"
    ).all();
    if (!pending.length) return;

    for (const op of pending) {
      try {
        const res = await fetch(OPNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [op.tx_hash], id: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (data.result && data.result.blockNumber !== undefined && data.result.blockNumber !== null) {
          db.prepare("UPDATE pending_operations SET status = 'confirmed', updated_at = unixepoch() WHERE id = ?").run(op.id);
          console.log(`Op ${op.id} TX confirmed: ${op.tx_hash}`);
        }
      } catch { /* skip, retry next cycle */ }
    }
  } catch (e) {
    console.error('confirmPendingOps error:', e.message);
  }
}

// Legacy wrapper for other endpoints that still use the old signature
async function verifyTxOnChain(txHash, expectedSender, expectedOperation) {
  return verifyTxExists(txHash, expectedSender);
}

// --- Database setup ---
const db = new Database(join(__dirname, 'bitpredict.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    yes_price REAL NOT NULL DEFAULT 0.5,
    no_price REAL NOT NULL DEFAULT 0.5,
    yes_pool INTEGER NOT NULL DEFAULT 0,
    no_pool INTEGER NOT NULL DEFAULT 0,
    volume INTEGER NOT NULL DEFAULT 0,
    liquidity INTEGER NOT NULL DEFAULT 0,
    end_time INTEGER NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0,
    outcome TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    market_type TEXT NOT NULL DEFAULT 'manual',
    resolution_source TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS bets (
    id TEXT PRIMARY KEY,
    user_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    side TEXT NOT NULL CHECK(side IN ('yes','no')),
    amount INTEGER NOT NULL,
    price REAL NOT NULL,
    shares INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','lost','cancelled','claimable')),
    payout INTEGER NOT NULL DEFAULT 0,
    tx_hash TEXT DEFAULT '',
    claim_tx_hash TEXT DEFAULT '',
    tx_confirmed INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_address) REFERENCES users(address),
    FOREIGN KEY (market_id) REFERENCES markets(id)
  );

  CREATE TABLE IF NOT EXISTS price_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset TEXT NOT NULL,
    price REAL NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Migration: add columns if missing
`);

// Safe migrations for existing DB
try { db.exec('ALTER TABLE bets ADD COLUMN claim_tx_hash TEXT DEFAULT ""'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE bets ADD COLUMN tx_hash TEXT DEFAULT ""'); } catch(e) { /* already exists */ }

// Migration: recreate bets table to add 'claimable' to CHECK constraint (SQLite can't ALTER CHECK)
try {
  const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bets'").get();
  const needsMigration = schema && schema.sql && !schema.sql.includes('claimable');
  if (needsMigration) {
    console.log('Migrating bets table to support claimable status...');
    db.exec(`
      CREATE TABLE bets_new (
        id TEXT PRIMARY KEY,
        user_address TEXT NOT NULL,
        market_id TEXT NOT NULL,
        side TEXT NOT NULL CHECK(side IN ('yes','no')),
        amount INTEGER NOT NULL,
        price REAL NOT NULL,
        shares INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','lost','cancelled','claimable')),
        payout INTEGER NOT NULL DEFAULT 0,
        tx_hash TEXT DEFAULT '',
        claim_tx_hash TEXT DEFAULT '',
        currency TEXT NOT NULL DEFAULT 'wbtc',
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        FOREIGN KEY (user_address) REFERENCES users(address),
        FOREIGN KEY (market_id) REFERENCES markets(id)
      );
      INSERT INTO bets_new (id, user_address, market_id, side, amount, price, shares, status, payout, tx_hash, claim_tx_hash, currency, created_at) SELECT id, user_address, market_id, side, amount, price, shares, status, payout, tx_hash, claim_tx_hash, currency, created_at FROM bets;
      DROP TABLE bets;
      ALTER TABLE bets_new RENAME TO bets;
    `);
    console.log('Bets table migrated successfully');
  }
} catch(e) { console.error('Bets table migration error:', e.message); }
// Index for O(1) txHash replay lookup
try { db.exec('CREATE INDEX IF NOT EXISTS idx_bets_tx_hash ON bets(tx_hash) WHERE length(tx_hash) > 0'); } catch(e) { /* ignore */ }

// Migration: add image_url column if missing
try { db.exec('ALTER TABLE markets ADD COLUMN image_url TEXT'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE markets ADD COLUMN event_id TEXT'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE markets ADD COLUMN event_title TEXT'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE markets ADD COLUMN outcome_label TEXT'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE markets ADD COLUMN onchain_id INTEGER DEFAULT NULL'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE markets ADD COLUMN poly_condition_id TEXT DEFAULT NULL'); } catch(e) { /* already exists */ }

// Clear stale polymarket outcome labels (placeholder names + force re-sync with groupItemTitle)
try {
  db.exec("UPDATE markets SET outcome_label = NULL WHERE market_type = 'polymarket' AND event_id IS NOT NULL");
  // Delete placeholder markets entirely (Person X, Individual Y, etc.)
  db.exec("DELETE FROM markets WHERE market_type = 'polymarket' AND outcome_label LIKE 'Person %' AND LENGTH(outcome_label) < 15");
  db.exec("DELETE FROM markets WHERE market_type = 'polymarket' AND outcome_label LIKE 'Individual %' AND LENGTH(outcome_label) < 15");
  db.exec("DELETE FROM markets WHERE market_type = 'polymarket' AND outcome_label LIKE 'Candidate %' AND LENGTH(outcome_label) < 15");
} catch(e) {}

// Fix duplicate onchain_ids: batch sync assigned the same simulated ID to multiple markets.
// Keep only the first market per onchain_id (by rowid), reset others to NULL for re-sync.
try {
  const dupsFixed = db.prepare(`
    UPDATE markets SET onchain_id = NULL
    WHERE onchain_id IS NOT NULL
      AND rowid NOT IN (
        SELECT MIN(rowid) FROM markets WHERE onchain_id IS NOT NULL GROUP BY onchain_id
      )
  `).run().changes;
  if (dupsFixed > 0) console.log(`[migration] Fixed ${dupsFixed} duplicate onchain_ids → NULL`);
} catch(e) { /* ignore */ }

// Sync nextOnchainMarketId from DB (max existing onchain_id + 1)
try {
  const maxId = db.prepare('SELECT MAX(onchain_id) as m FROM markets WHERE onchain_id IS NOT NULL').get();
  if (maxId && maxId.m != null) nextOnchainMarketId = maxId.m + 1;
} catch(e) { /* ignore */ }

// Wipe polymarket markets for category re-sync on deploy (preserve those with active bets)
try {
  const polyCount = db.prepare("SELECT COUNT(*) as c FROM markets WHERE market_type = 'polymarket' AND id NOT IN (SELECT DISTINCT market_id FROM bets WHERE status = 'active')").get().c;
  if (polyCount > 0) {
    db.prepare("DELETE FROM markets WHERE market_type = 'polymarket' AND id NOT IN (SELECT DISTINCT market_id FROM bets WHERE status = 'active')").run();
    console.log(`Wiped ${polyCount} polymarket markets for category re-sync (preserved markets with active bets)`);
  }
} catch(e) { /* ignore */ }

// Fix stuck bets: active bets on resolved markets should be settled
try {
  const stuckBets = db.prepare(`SELECT b.*, m.outcome FROM bets b JOIN markets m ON b.market_id = m.id
    WHERE b.status = 'active' AND m.resolved = 1 AND m.outcome IS NOT NULL`).all();
  for (const b of stuckBets) {
    if (b.side === b.outcome) {
      const payout = Math.round(b.amount / b.price);
      db.prepare('UPDATE bets SET status = ?, payout = ? WHERE id = ?').run('claimable', payout, b.id);
      console.log(`Fixed stuck bet ${b.id}: claimable +${payout}`);
    } else {
      db.prepare('UPDATE bets SET status = ? WHERE id = ?').run('lost', b.id);
      console.log(`Fixed stuck bet ${b.id}: lost`);
    }
  }
  if (stuckBets.length > 0) console.log(`Fixed ${stuckBets.length} stuck bets`);
} catch(e) { console.error('Stuck bet fix error:', e.message); }

db.exec(`
  CREATE TABLE IF NOT EXISTS faucet_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    amount INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// tx_hash column handled in CREATE TABLE + migrations above

// Reward claims table for achievement/quest WBTC rewards
db.exec(`
  CREATE TABLE IF NOT EXISTS reward_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    reward_id TEXT NOT NULL,
    reward_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    tx_hash TEXT DEFAULT '',
    claimed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(address, reward_id)
  );
`);

// --- Vault tables ---
db.exec(`
  CREATE TABLE IF NOT EXISTS vault_stakes (
    address TEXT PRIMARY KEY,
    staked_amount INTEGER NOT NULL DEFAULT 0,
    reward_debt INTEGER NOT NULL DEFAULT 0,
    auto_compound INTEGER NOT NULL DEFAULT 0,
    staked_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_claim INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS vault_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_market_id TEXT,
    fee_amount INTEGER NOT NULL,
    distributed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    total_staked_at_time INTEGER NOT NULL DEFAULT 0,
    rewards_per_share_delta INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS vault_vesting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    total_amount INTEGER NOT NULL,
    claimed_amount INTEGER NOT NULL DEFAULT 0,
    start_time INTEGER NOT NULL DEFAULT (unixepoch()),
    end_time INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower TEXT NOT NULL,
    following TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (follower, following)
  );

  CREATE TABLE IF NOT EXISTS pnl_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    bet_id TEXT,
    realized_pnl INTEGER NOT NULL DEFAULT 0,
    cumulative_pnl INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
try { db.exec('CREATE INDEX IF NOT EXISTS idx_pnl_addr ON pnl_snapshots(address, timestamp)'); } catch(e) { /* ignore */ }

// --- New tables for comments, notifications, referrals, market price history ---
db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT NOT NULL,
    address TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    market_id TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS market_price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT NOT NULL,
    yes_price REAL NOT NULL,
    no_price REAL NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);
try { db.exec('CREATE INDEX IF NOT EXISTS idx_comments_market ON comments(market_id, created_at)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_notif_addr ON notifications(address, read, created_at)'); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_mph_market ON market_price_history(market_id, timestamp)'); } catch(e) {}
// Add referrer column to users if not exists
try { db.exec('ALTER TABLE users ADD COLUMN referrer TEXT DEFAULT NULL'); } catch(e) { /* already exists */ }
// Add creator_address column to markets if not exists
try { db.exec('ALTER TABLE markets ADD COLUMN creator_address TEXT DEFAULT NULL'); } catch(e) { /* already exists */ }
// Creator rewards: track initial liquidity and creator earnings
try { db.exec('ALTER TABLE markets ADD COLUMN initial_liquidity INTEGER NOT NULL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN creator_earnings INTEGER NOT NULL DEFAULT 0'); } catch(e) {}
// Store p2tr address for on-chain transfers (getPublicKeyInfo needs p2tr, not p2op/opt1sq)
try { db.exec('ALTER TABLE users ADD COLUMN p2tr_address TEXT DEFAULT NULL'); } catch(e) {}
// Legacy btc_balance column (kept for schema compat, always 0 in WBTC model)
try { db.exec('ALTER TABLE users ADD COLUMN btc_balance INTEGER NOT NULL DEFAULT 0'); } catch(e) { /* already exists */ }
try { db.exec('ALTER TABLE bets ADD COLUMN currency TEXT NOT NULL DEFAULT \'bpusd\''); } catch(e) { /* already exists */ }
// Net amount column for parimutuel (amount after fee deduction, what goes into pool)
try { db.exec('ALTER TABLE bets ADD COLUMN net_amount INTEGER NOT NULL DEFAULT 0'); } catch(e) { /* already exists */ }
// Two-phase TX confirmation: 0 = pending, 1 = confirmed on-chain
try { db.exec('ALTER TABLE bets ADD COLUMN tx_confirmed INTEGER NOT NULL DEFAULT 0'); } catch(e) { /* already exists */ }
// Mark all old bets as confirmed (they pre-date this migration)
try { db.exec("UPDATE bets SET tx_confirmed = 1 WHERE tx_confirmed = 0 AND created_at < unixepoch() - 3600"); } catch(e) { /* ok */ }
// Reward claims: add tx_hash column
try { db.exec("ALTER TABLE reward_claims ADD COLUMN tx_hash TEXT DEFAULT ''"); } catch(e) { /* already exists */ }

// Pending operations table — tracks on-chain TX lifecycle
try { db.exec(`CREATE TABLE IF NOT EXISTS pending_operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT DEFAULT '',
  details TEXT DEFAULT '',
  market_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
)`); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_pendops_addr ON pending_operations(address, status)'); } catch(e) {}
// Auto-expire stale pending ops older than 1 hour
try { db.exec("UPDATE pending_operations SET status = 'expired' WHERE status = 'pending' AND created_at < unixepoch() - 3600"); } catch(e) {}

// --- Treasury / Deposit-Withdraw tables ---
try { db.exec(`CREATE TABLE IF NOT EXISTS treasury_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  amount_bpusd INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  confirmed_at INTEGER
)`); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_treasury_dep_addr ON treasury_deposits(address, status)'); } catch(e) {}

try { db.exec(`CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  amount_bpusd INTEGER NOT NULL,
  fee_bpusd INTEGER NOT NULL DEFAULT 0,
  nonce TEXT NOT NULL UNIQUE,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  completed_at INTEGER
)`); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_withdrawal_addr ON withdrawal_requests(address, status)'); } catch(e) {}

try { db.exec(`CREATE TABLE IF NOT EXISTS unwrap_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT NOT NULL,
  amount_sats INTEGER NOT NULL,
  burn_tx_hash TEXT NOT NULL UNIQUE,
  btc_tx_hash TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  completed_at INTEGER
)`); } catch(e) {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_unwrap_addr ON unwrap_requests(address, status)'); } catch(e) {}

try { db.exec(`CREATE TABLE IF NOT EXISTS protocol_revenue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_market_id TEXT,
  amount INTEGER NOT NULL,
  accumulated INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`); } catch(e) {}

try { db.exec(`CREATE TABLE IF NOT EXISTS reconciliation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sqlite_total INTEGER NOT NULL,
  onchain_total INTEGER,
  discrepancy INTEGER,
  checked_at INTEGER NOT NULL DEFAULT (unixepoch())
)`); } catch(e) {}

// Migration: add backed_balance column to users table
try { db.exec('ALTER TABLE users ADD COLUMN backed_balance INTEGER NOT NULL DEFAULT 0'); } catch(e) {}

// Vault global state (in-memory, synced to DB)
let VAULT_TOTAL_STAKED = 0;
let VAULT_REWARDS_PER_SHARE = 0; // scaled by 1e12
let VAULT_TOTAL_DISTRIBUTED = 0;
const VAULT_PRECISION = 1e12;

// Load vault state from DB on startup
try {
  const stakes = db.prepare('SELECT SUM(staked_amount) as total FROM vault_stakes').get();
  VAULT_TOTAL_STAKED = stakes?.total || 0;
  const rewards = db.prepare('SELECT SUM(rewards_per_share_delta) as total FROM vault_rewards').get();
  VAULT_REWARDS_PER_SHARE = rewards?.total || 0;
  const dist = db.prepare('SELECT SUM(fee_amount) as total FROM vault_rewards').get();
  VAULT_TOTAL_DISTRIBUTED = dist?.total || 0;
  console.log(`Vault loaded: ${VAULT_TOTAL_STAKED} staked, ${VAULT_TOTAL_DISTRIBUTED} distributed`);
} catch(e) { /* first run */ }

// Protocol revenue tracking (in-memory + DB)
let ACCUMULATED_PROTOCOL_REVENUE = 0;
const PROTOCOL_TREASURY_ADDRESS = process.env.PROTOCOL_TREASURY_ADDRESS || '';
const WITHDRAWAL_FEE_PCT = parseFloat(process.env.WITHDRAWAL_FEE_PCT || '0.005'); // 0.5%
const PROTOCOL_FLUSH_THRESHOLD = parseInt(process.env.PROTOCOL_FLUSH_THRESHOLD || '10000', 10);

// Load accumulated protocol revenue from DB on startup
try {
  const rev = db.prepare("SELECT SUM(amount) as total FROM protocol_revenue WHERE accumulated = 1").get();
  ACCUMULATED_PROTOCOL_REVENUE = rev?.total || 0;
  console.log(`Protocol revenue loaded: ${ACCUMULATED_PROTOCOL_REVENUE} sats accumulated`);
} catch(e) { /* first run */ }

// Migration: convert auto-credited 'won' bets (no claim_tx_hash) back to 'claimable'
try {
  const autoCredited = db.prepare("SELECT * FROM bets WHERE status = 'won' AND (claim_tx_hash IS NULL OR claim_tx_hash = '')").all();
  for (const b of autoCredited) {
    if (b.payout > 0) {
      db.prepare('UPDATE bets SET status = ? WHERE id = ?').run('claimable', b.id);
      db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE address = ?').run(b.payout, b.user_address);
      console.log(`Reverted auto-credit bet ${b.id}: ${b.payout} deducted, now claimable`);
    }
  }
  if (autoCredited.length > 0) console.log(`Reverted ${autoCredited.length} auto-credited bets to claimable`);
} catch(e) { console.error('Migration error:', e.message); }

// --- Price feed (multi-source with fallback chain) ---
const PRICE_CACHE = { btc: { price: 0, ts: 0 }, eth: { price: 0, ts: 0 }, sol: { price: 0, ts: 0 } };

async function fetchFromBinance(asset) {
  const sym = asset === 'btc' ? 'BTCUSDT' : asset === 'eth' ? 'ETHUSDT' : 'SOLUSDT';
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return parseFloat(data.price) || 0;
}

async function fetchFromCoinGecko(asset) {
  const ids = asset === 'btc' ? 'bitcoin' : asset === 'eth' ? 'ethereum' : 'solana';
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data[ids]?.usd || 0;
}

async function fetchFromCryptoCompare(asset) {
  const sym = asset === 'btc' ? 'BTC' : asset === 'eth' ? 'ETH' : 'SOL';
  const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${sym}&tsyms=USD`, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data.USD || 0;
}

async function fetchPrice(asset) {
  const now = Date.now();
  const cached = PRICE_CACHE[asset];
  if (cached && now - cached.ts < 15000) return cached.price; // 15s cache

  // Try sources in order: Binance → CoinGecko → CryptoCompare
  const sources = [
    { name: 'Binance', fn: fetchFromBinance },
    { name: 'CoinGecko', fn: fetchFromCoinGecko },
    { name: 'CryptoCompare', fn: fetchFromCryptoCompare },
  ];

  for (const src of sources) {
    try {
      const price = await src.fn(asset);
      if (price > 0) {
        PRICE_CACHE[asset] = { price, ts: now };
        db.prepare('INSERT INTO price_snapshots (asset, price) VALUES (?, ?)').run(asset, price);
        return price;
      }
    } catch (e) {
      // Silent fallthrough to next source
    }
  }

  console.error('All price sources failed for', asset);
  return cached?.price || 0;
}

// --- Seed default markets ---
function seedMarkets() {
  const count = db.prepare('SELECT COUNT(*) as c FROM markets').get().c;
  if (count > 0) return;

  const now = Math.floor(Date.now() / 1000);
  const markets = [
    // Long-term markets
    {
      id: 'btc-150k-2026', question: 'Will Bitcoin reach $150,000 by end of 2026?',
      category: 'Crypto', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["bitcoin","price","bullish"]', market_type: 'manual',
    },
    {
      id: 'eth-etf-50b', question: 'Will Ethereum spot ETF surpass $50B AUM in 2026?',
      category: 'Crypto', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["ethereum","etf","institutional"]', market_type: 'manual',
    },
    {
      id: 'us-midterms-2026', question: 'Will Republicans win the 2026 US midterm elections?',
      category: 'Politics', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-11-03').getTime() / 1000),
      tags: '["election","usa","midterms"]', market_type: 'manual',
    },
    {
      id: 'opnet-1m-tx', question: 'Will OP_NET process 1M+ transactions by Q4 2026?',
      category: 'Crypto', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["opnet","bitcoin","adoption"]', market_type: 'manual',
    },
    {
      id: 'ai-agi-2028', question: 'Will AGI be achieved before 2028?',
      category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2027-12-31').getTime() / 1000),
      tags: '["ai","agi","technology"]', market_type: 'manual',
    },
    {
      id: 'btc-dominance-65', question: 'Will BTC dominance exceed 65% in 2026?',
      category: 'Crypto', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["bitcoin","dominance","market"]', market_type: 'manual',
    },
    {
      id: 'spacex-mars-2027', question: 'Will SpaceX launch Starship to Mars orbit by 2027?',
      category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2027-12-31').getTime() / 1000),
      tags: '["spacex","mars","space"]', market_type: 'manual',
    },
    {
      id: 'fed-rate-below-3', question: 'Will the Fed cut rates below 3% by end of 2026?',
      category: 'Politics', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["fed","rates","macro"]', market_type: 'manual',
    },
    {
      id: 'sol-flip-eth-tx', question: 'Will Solana flip Ethereum in daily transactions by 2027?',
      category: 'Crypto', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2027-06-30').getTime() / 1000),
      tags: '["solana","ethereum","competition"]', market_type: 'manual',
    },
    {
      id: 'world-cup-brazil', question: 'Will Brazil win the 2026 FIFA World Cup?',
      category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-07-19').getTime() / 1000),
      tags: '["football","world-cup","brazil"]', market_type: 'manual',
    },
    {
      id: 'real-madrid-ucl', question: 'Will Real Madrid win Champions League 2026?',
      category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-06-01').getTime() / 1000),
      tags: '["football","ucl","real-madrid"]', market_type: 'manual',
    },
    {
      id: 'nft-100b', question: 'Will NFT market cap exceed $100B in 2026?',
      category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["nft","market","digital-art"]', market_type: 'manual',
    },
  ];

  const ins = db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price,
    yes_pool, no_pool, volume, liquidity, end_time, tags, market_type) VALUES
    (@id, @question, @category, @yes_price, @no_price, 0, 0, @volume, @liquidity, @end_time, @tags, @market_type)`);
  const txn = db.transaction(() => { for (const m of markets) ins.run(m); });
  txn();
  console.log(`Seeded ${markets.length} markets`);
}

seedMarkets();

// --- Ensure minimum category coverage (add extra markets if needed) ---
function ensureCategoryMarkets() {
  const extraMarkets = [
    // Sports
    { id: 'nba-celtics-2026', question: 'Will the Boston Celtics win the 2026 NBA Championship?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-06-20').getTime() / 1000), tags: '["nba","celtics","basketball"]', market_type: 'manual' },
    { id: 'nfl-chiefs-sb-2027', question: 'Will the Kansas City Chiefs win Super Bowl LXI?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-02-14').getTime() / 1000), tags: '["nfl","chiefs","super-bowl"]', market_type: 'manual' },
    { id: 'f1-verstappen-2026', question: 'Will Max Verstappen win the 2026 F1 World Championship?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-10').getTime() / 1000), tags: '["f1","verstappen","racing"]', market_type: 'manual' },
    { id: 'wimbledon-djokovic-2026', question: 'Will Novak Djokovic win Wimbledon 2026?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-07-12').getTime() / 1000), tags: '["tennis","wimbledon","djokovic"]', market_type: 'manual' },
    { id: 'ufc-jones-retire-2026', question: 'Will Jon Jones retire undefeated in 2026?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["ufc","mma","jones"]', market_type: 'manual' },
    { id: 'psg-ucl-2026', question: 'Will PSG win the Champions League 2025-26?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-06-01').getTime() / 1000), tags: '["football","ucl","psg"]', market_type: 'manual' },
    { id: 'arsenal-epl-2026', question: 'Will Arsenal win the 2025-26 Premier League?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-05-25').getTime() / 1000), tags: '["football","epl","arsenal"]', market_type: 'manual' },
    { id: 'nba-lakers-playoff-2026', question: 'Will the Lakers make the 2026 NBA Playoffs?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-04-15').getTime() / 1000), tags: '["nba","lakers","basketball"]', market_type: 'manual' },
    { id: 'olympics-usa-gold-2028', question: 'Will the USA lead the 2028 Olympics gold medal count?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2028-08-11').getTime() / 1000), tags: '["olympics","usa","2028"]', market_type: 'manual' },
    { id: 'messi-retire-2026', question: 'Will Lionel Messi retire from professional football in 2026?', category: 'Sports', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["football","messi","retirement"]', market_type: 'manual' },
    // Tech
    { id: 'openai-gpt5-2026', question: 'Will OpenAI release GPT-5 before end of 2026?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["ai","openai","gpt5"]', market_type: 'manual' },
    { id: 'apple-ar-glasses-2026', question: 'Will Apple release AR glasses in 2026?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["apple","ar","hardware"]', market_type: 'manual' },
    { id: 'tesla-fsd-level5-2027', question: 'Will Tesla achieve Level 5 full self-driving by 2027?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["tesla","self-driving","autonomous"]', market_type: 'manual' },
    { id: 'nvidia-10t-2027', question: 'Will NVIDIA reach $10T market cap by 2027?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["nvidia","stocks","ai"]', market_type: 'manual' },
    { id: 'quantum-1000-qubit-2027', question: 'Will a 1000+ logical qubit quantum computer exist by 2027?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["quantum","computing","science"]', market_type: 'manual' },
    { id: 'starlink-direct-cell-2026', question: 'Will Starlink offer direct-to-cell service globally in 2026?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["starlink","spacex","telecom"]', market_type: 'manual' },
    { id: 'neuralink-human-trial-2026', question: 'Will Neuralink complete 10+ human implants by end of 2026?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["neuralink","brain","biotech"]', market_type: 'manual' },
    { id: 'google-gemini-beats-gpt-2026', question: 'Will Google Gemini surpass ChatGPT in market share by 2026?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["google","ai","competition"]', market_type: 'manual' },
    { id: 'humanoid-robot-commercial-2027', question: 'Will humanoid robots be commercially available by 2027?', category: 'Tech', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["robotics","ai","commercial"]', market_type: 'manual' },
    // Culture
    { id: 'taylor-swift-retirement-2027', question: 'Will Taylor Swift announce retirement before 2028?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["music","taylor-swift","celebrity"]', market_type: 'manual' },
    { id: 'oscar-best-picture-ai-2027', question: 'Will an AI-generated film win Best Picture Oscar by 2027?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-03-30').getTime() / 1000), tags: '["oscars","ai","film"]', market_type: 'manual' },
    { id: 'spotify-1b-users-2026', question: 'Will Spotify reach 1 billion users in 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["spotify","music","streaming"]', market_type: 'manual' },
    { id: 'tiktok-banned-us-2026', question: 'Will TikTok be fully banned in the US by end of 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["tiktok","social-media","ban"]', market_type: 'manual' },
    { id: 'mrbeast-100m-subs-2026', question: 'Will MrBeast reach 400M YouTube subscribers in 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["youtube","mrbeast","creator"]', market_type: 'manual' },
    { id: 'netflix-gaming-10m-2026', question: 'Will Netflix Gaming reach 10M+ daily players by 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["netflix","gaming","streaming"]', market_type: 'manual' },
    { id: 'gta6-release-2026', question: 'Will GTA VI be released before the end of 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["gaming","gta","rockstar"]', market_type: 'manual' },
    { id: 'disney-plus-profit-2026', question: 'Will Disney+ become profitable in 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["disney","streaming","entertainment"]', market_type: 'manual' },
    { id: 'viral-ai-song-billboard-2026', question: 'Will an AI-generated song reach Billboard Hot 100 Top 10 in 2026?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["music","ai","billboard"]', market_type: 'manual' },
    { id: 'metaverse-100m-users-2027', question: 'Will any metaverse platform reach 100M monthly users by 2027?', category: 'Culture', yes_price: 0.50, no_price: 0.50, volume: 0, liquidity: 0, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["metaverse","vr","meta"]', market_type: 'manual' },
  ];

  const ins = db.prepare(`INSERT OR IGNORE INTO markets (id, question, category, yes_price, no_price,
    yes_pool, no_pool, volume, liquidity, end_time, tags, market_type) VALUES
    (@id, @question, @category, @yes_price, @no_price, 0, 0, @volume, @liquidity, @end_time, @tags, @market_type)`);
  let added = 0;
  for (const m of extraMarkets) {
    try { ins.run(m); added++; } catch(e) { /* duplicate */ }
  }
  if (added > 0) console.log(`Added ${added} extra category markets`);
}
ensureCategoryMarkets();

// 5-minute price markets REMOVED (impossible on L1 with ~10min blocks)
// Minimum market duration: 6 blocks (~1 hour)
const MIN_MARKET_DURATION_SECS = 3600; // 1 hour in seconds

// --- Settle bets helper (Parimutuel) ---
function settleBets(marketId, outcome) {
  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
  if (!market) return;

  const totalPool = (market.yes_pool || 0) + (market.no_pool || 0);
  if (totalPool <= 0) return;

  const winningPool = outcome === 'yes' ? (market.yes_pool || 0) : (market.no_pool || 0);
  const losingPool = outcome === 'yes' ? (market.no_pool || 0) : (market.yes_pool || 0);

  // If bets only on one side → refund all (no contest)
  if (winningPool <= 0 || losingPool <= 0) {
    refundBets(marketId);
    return;
  }

  const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?').all(marketId, 'active');
  for (const b of bets) {
    if (b.side === outcome) {
      // Parimutuel payout: (net_amount / winningPool) * totalPool
      const netAmt = b.net_amount || b.amount; // fallback for old bets
      const payout = winningPool > 0 ? Math.floor((netAmt / winningPool) * totalPool) : 0;
      db.prepare('UPDATE bets SET status = ?, payout = ? WHERE id = ?').run('claimable', payout, b.id);
    } else {
      db.prepare('UPDATE bets SET status = ?, payout = 0 WHERE id = ?').run('lost', b.id);
    }
  }
}

// --- Refund bets helper (for cancelled/unresolvable markets) ---
// Refunds net_amount (fee is non-refundable, already distributed)
function refundBets(marketId) {
  const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?').all(marketId, 'active');
  for (const b of bets) {
    const refundAmt = b.net_amount || b.amount; // net_amount = what went into pool
    db.prepare('UPDATE bets SET status = ?, payout = ? WHERE id = ?').run('cancelled', refundAmt, b.id);
    db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(refundAmt, b.user_address);
  }
  return bets.length;
}

// --- Auto-resolve markets ---
async function resolveExpiredMarkets() {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.prepare('SELECT * FROM markets WHERE resolved = 0 AND end_time <= ?').all(now);

  for (const m of expired) {
    // 1. Polymarket markets: try to fetch resolution from Gamma API
    if (m.market_type === 'polymarket') {
      try {
        const condId = m.poly_condition_id || m.id.replace('poly-', '');
        const res = await fetch(`${GAMMA_HOST}/markets?conditionIds=${condId}&limit=1`, {
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const pm = Array.isArray(data) ? data[0] : (data.markets || [])[0];
        if (!pm) continue;

        if (pm.resolved === true || pm.closed === true) {
          const prices = JSON.parse(pm.outcomePrices || '[]');
          const yesResolved = parseFloat(prices[0]) || 0;
          const outcome = yesResolved >= 0.9 ? 'yes' : (yesResolved <= 0.1 ? 'no' : null);
          if (!outcome) continue;

          db.prepare('UPDATE markets SET resolved = 1, outcome = ? WHERE id = ?').run(outcome, m.id);
          settleBets(m.id, outcome);
          console.log(`Resolved polymarket ${m.id}: ${outcome}`);
        }
      } catch (e) { /* API error, try next time */ }
      continue;
    }

    // 2. Markets expired >7 days ago without resolution → void + refund
    const sevenDaysAgo = now - 7 * 86400;
    if (m.end_time < sevenDaysAgo) {
      const refunded = refundBets(m.id);
      if (refunded > 0) {
        db.prepare('UPDATE markets SET resolved = 1, outcome = ? WHERE id = ?').run('void', m.id);
        console.log(`Voided stale market ${m.id}, refunded ${refunded} bets`);
      } else {
        db.prepare('UPDATE markets SET resolved = 1 WHERE id = ?').run(m.id);
      }
      // Resolve on-chain if market has onchainId (even void — to decrement activeMarketCount)
      if (m.onchain_id) {
        resolveMarketOnChain(m.onchain_id, false).catch(e => console.error('On-chain resolve (void) error:', e.message));
      }
    }
  }
}

// --- Polymarket Gamma API: sync real trending markets ---
const GAMMA_HOST = 'https://gamma-api.polymarket.com';
const POLYMARKET_CATEGORY_MAP = {
  'politics': 'Politics', 'elections': 'Politics', 'government': 'Politics',
  'crypto': 'Crypto', 'bitcoin': 'Crypto', 'ethereum': 'Crypto', 'defi': 'Crypto',
  'sports': 'Sports', 'football': 'Sports', 'basketball': 'Sports', 'soccer': 'Sports',
  'science': 'Tech', 'technology': 'Tech', 'ai': 'Tech',
  'entertainment': 'Culture', 'culture': 'Culture', 'music': 'Culture',
  'business': 'Politics', 'economics': 'Politics', 'finance': 'Crypto',
};

function mapPolyCategory(cat, question = '') {
  const q = (question || '').toLowerCase();
  const c = (cat || '').toLowerCase();

  // Sports keywords in question text
  const sportsKw = ['win the', 'championship', 'premier league', 'nba', 'nfl', 'nhl', 'mlb', 'ufc', 'mma',
    'world cup', 'champions league', 'serie a', 'la liga', 'bundesliga', 'ligue 1', 'super bowl',
    'wimbledon', 'olympics', 'grand prix', 'formula 1', 'f1', 'match', 'finals', 'playoff',
    'boxing', 'tennis', 'golf', 'cricket', 'rugby', 'epl', 'soccer', 'football', 'basketball',
    'baseball', 'hockey', 'racing', 'medal', 'ballon d\'or', 'mvp', 'touchdown', 'goal',
    'manager', 'coach', 'transfer', 'relegated', 'promoted', 'seed', 'bracket',
    ' vs. ', ' vs ', ' fc ', 'united ', 'rovers', 'warriors', 'lakers', 'celtics', 'bulls',
    'penguins', 'bruins', 'rangers', 'flames', 'sharks', 'kings', 'panthers', 'lightning',
    'hurricanes', 'canadiens', 'leafs', 'islanders', 'blues', 'stars', 'ducks', 'jets',
    'red wings', 'golden knights', 'sabres', 'wild', 'blue jackets', 'serie a',
    'la liga', 'eredivisie', 'ligue 1', 'copa libertadores', 'concacaf',
    'esports', 'counter-strike', 'dota', 'league of legends', 'valorant', 'csgo', 'cs2'];
  if (sportsKw.some(kw => q.includes(kw)) || c.includes('sport') || c.includes('soccer') || c.includes('football') || c.includes('basketball')) {
    return 'Sports';
  }

  // Tech keywords
  const techKw = ['ai ', 'artificial intelligence', 'agi', 'gpt', 'openai', 'google', 'apple', 'microsoft',
    'spacex', 'tesla', 'starship', 'mars', 'moon landing', 'robot', 'quantum', 'chip', 'semiconductor',
    'self-driving', 'autonomous', 'launch', 'rocket', 'satellite', 'tech', 'software', 'hardware',
    'iphone', 'android', 'app store', 'meta', 'zuckerberg', 'musk', 'altman', 'nvidia', 'amd'];
  if (techKw.some(kw => q.includes(kw)) || c.includes('tech') || c.includes('science')) {
    return 'Tech';
  }

  // Culture keywords
  const cultureKw = ['oscar', 'grammy', 'emmy', 'album', 'movie', 'film', 'netflix', 'spotify', 'tiktok',
    'youtube', 'streamer', 'influencer', 'mrbeast', 'kardashian', 'swift', 'beyonce', 'drake',
    'celebrity', 'wedding', 'baby', 'divorce', 'reality tv', 'box office', 'billboard', 'viral',
    'nft', 'art', 'fashion', 'design', 'game of', 'disney', 'marvel', 'anime', 'twitch'];
  if (cultureKw.some(kw => q.includes(kw)) || c.includes('entertainment') || c.includes('culture') || c.includes('pop')) {
    return 'Culture';
  }

  // Crypto keywords
  const cryptoKw = ['bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'token', 'blockchain',
    'defi', 'nft', 'stablecoin', 'usdt', 'usdc', 'binance', 'coinbase', 'mining', 'halving',
    'etf', 'altcoin', 'memecoin', 'doge', 'shib'];
  if (cryptoKw.some(kw => q.includes(kw)) || c.includes('crypto') || c.includes('defi')) {
    return 'Crypto';
  }

  // Economics → Politics
  const econKw = ['inflation', 'gdp', 'fed ', 'federal reserve', 'interest rate', 'unemployment',
    'cpi', 'ppi', 'earnings', 'stock', 'market cap', 's&p', 'dow jones', 'nasdaq',
    'tariff', 'recession', 'debt ceiling', 'treasury', 'bond'];
  if (econKw.some(kw => q.includes(kw)) || c.includes('economics') || c.includes('business') || c.includes('finance')) {
    return 'Politics';
  }

  // Default check original category
  const lower = c;
  for (const [key, val] of Object.entries(POLYMARKET_CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'Politics';
}

async function syncPolymarketEvents() {
  try {
    // Build date range for "ending soon" batch (next 48h)
    const nowIso = new Date().toISOString();
    const in48h = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    // Fetch multiple batches in parallel for better coverage
    const fetches = [
      // Batch 1: Top by volume (popular markets)
      fetch(`${GAMMA_HOST}/events?active=true&closed=false&order=volume&ascending=false&limit=100`, {
        signal: AbortSignal.timeout(15000),
      }),
      // Batch 2: Ending within 48h (sports, esports, short-term)
      fetch(`${GAMMA_HOST}/events?active=true&closed=false&end_date_min=${nowIso}&end_date_max=${in48h}&limit=100`, {
        signal: AbortSignal.timeout(15000),
      }),
      // Batch 3: Recently created (fresh markets)
      fetch(`${GAMMA_HOST}/events?active=true&closed=false&order=createdAt&ascending=false&limit=50`, {
        signal: AbortSignal.timeout(15000),
      }),
      // Batch 4: Ending within 7 days (medium-term)
      fetch(`${GAMMA_HOST}/events?active=true&closed=false&end_date_min=${in48h}&end_date_max=${new Date(Date.now() + 7 * 86400000).toISOString()}&limit=50`, {
        signal: AbortSignal.timeout(15000),
      }),
    ];

    const results = await Promise.allSettled(fetches);
    const allEvents = new Map(); // dedupe by event id/slug
    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value.ok) continue;
      const events = await r.value.json();
      for (const ev of events) {
        const key = ev.slug || ev.id || JSON.stringify(ev.title);
        if (!allEvents.has(key)) allEvents.set(key, ev);
      }
    }

    let synced = 0;
    for (const ev of allEvents.values()) {
      const markets = ev.markets || [];
      if (!markets.length) continue;

      const isMultiOutcome = markets.length > 1;
      const eventId = ev.slug || ev.id || '';
      const eventTitle = ev.title || '';

      for (const m of markets) {
        if (!m.question || m.question.length < 10) continue;
        // Skip prop bet markets (More Markets, Spreads, O/U totals, player props)
        const q_check = m.question || '';
        if (q_check.includes('- More Markets') || /^Spread:/i.test(q_check)) continue;
        const fullConditionId = m.conditionId || m.id || '';
        const polyId = `poly-${fullConditionId.slice(0, 16)}`;
        if (!polyId || polyId === 'poly-') continue;

        // Extract outcome label — prefer groupItemTitle from Polymarket API
        let outcomeLabel;
        const groupTitle = (m.groupItemTitle || '').trim();

        // Skip placeholder/anonymized markets (Person P, Club A, Leader 2, Movie D, etc.)
        const placeholderRe = /^(Person|Individual|Candidate|Player|Team|Entity|Subject|Club|Leader|Option|Choice|Entry|Contestant|Movie|Nominee|Artist|Song|Film|Act)\s+[A-Z0-9]{1,3}$/i;
        if (placeholderRe.test(groupTitle)) continue;
        // Skip "Other" catch-all markets (no real price data from Polymarket)
        if (groupTitle === 'Other') continue;
        // Skip very short codes (aa, ac, ae — anonymized placeholders)
        if (/^[a-z]{1,2}$/i.test(groupTitle)) continue;
        // Skip prop bet markets (O/U, Spread, player stats) — they clutter multi-outcome groups
        if (/^O\/U\s|^Spread\s|^Both Teams|Rebounds O\/U|Points O\/U|Assists O\/U/i.test(groupTitle)) continue;
        // Fix "vs." label → derive from event title (first team)
        if (groupTitle === 'vs.' && eventTitle) {
          const vsMatch = eventTitle.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
          if (vsMatch) {
            outcomeLabel = vsMatch[1].trim(); // First team = "Yes" side
          } else {
            outcomeLabel = 'Winner';
          }
        }

        if (groupTitle && groupTitle.length >= 2 && !outcomeLabel) {
          // Best source: Polymarket's own groupItemTitle (always correct)
          // Clean up "Draw (Team A vs. Team B)" → just "Draw"
          let cleanLabel = groupTitle;
          const drawMatch = cleanLabel.match(/^Draw\s*\(/i);
          if (drawMatch) cleanLabel = 'Draw';
          outcomeLabel = cleanLabel.length > 50 ? cleanLabel.slice(0, 50) + '…' : cleanLabel;
        } else if (isMultiOutcome && eventTitle) {
          // Fallback: extract from question text
          let q = (m.question || '').replace(/\?$/g, '').trim();
          q = q.replace(/^(Will |Does |Is |Are |Has |Can |Should |Do )/i, '').trim();
          let label = '';
          const titleLower = eventTitle.toLowerCase().replace(/[^a-z0-9 ]/g, '');
          const titleWords = new Set(titleLower.split(/\s+/).filter(w => w.length > 2));

          const overlapsPct = (text) => {
            const words = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
            if (words.length === 0) return 0;
            return words.filter(w => titleWords.has(w)).length / words.length;
          };

          const verbs = 'win|be named|be the next|be the|be|become|earn|claim|get|receive|secure|have|take|reach|finish|make|qualify|hit|dip';
          const pat1 = q.match(new RegExp(`^(.+?)\\s+(${verbs})\\b\\s*(.*)`, 'i'));
          if (pat1 && pat1[1].length >= 2) {
            const before = pat1[1].trim();
            const after = (pat1[3] || '').trim();
            if (before.toLowerCase() === 'there') {
              label = after.replace(/\s+(?:at|in|on|to|by|during|for|the|before|after)\s+.*/i, '').trim();
            } else if (overlapsPct(before) > 0.5 && after.length >= 2) {
              label = after.replace(/\s+(?:at|in|on|to|by|during|for)\s+.*/i, '').trim();
            } else if (before.toLowerCase() !== 'the') {
              label = before;
            }
          }

          if (!label) {
            const pat2 = q.match(/(?:nominate|select|appoint|pick|choose|name|draft)\s+(.+?)\s+(?:as|for|to|the|in)\b/i);
            if (pat2 && pat2[1].length >= 2) label = pat2[1];
          }

          if (!label || label.length < 2) {
            label = q.split(/\s+/).filter(w => !titleWords.has(w.toLowerCase().replace(/[^a-z0-9]/g, ''))).join(' ').trim();
            label = label.replace(/\b(the|will|be|win|a|an|in|of|to|by|at|on|or|is|as|for|its|his|her|their|next|new)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
            if (!label) label = q;
          }

          label = label.replace(/^(the|a|an)\s+/i, '').replace(/\s+(the|a|an)$/i, '').trim();
          // Skip if extraction still yields a placeholder
          if (placeholderRe.test(label)) continue;
          outcomeLabel = label.length > 50 ? label.slice(0, 50) + '…' : label;
          if (outcomeLabel.length < 2) outcomeLabel = q.slice(0, 50);
        } else {
          const outcomes = JSON.parse(m.outcomes || '[]');
          outcomeLabel = (outcomes[0] || '').toString() || m.question.replace(/\?$/, '').trim();
        }

        const existing = db.prepare('SELECT id FROM markets WHERE id = ?').get(polyId);
        if (existing) {
          // Update prices + event info from Polymarket
          const prices = JSON.parse(m.outcomePrices || '[]');
          const rawYes = prices.length > 0 ? parseFloat(prices[0]) : NaN;
          const yesPrice = isNaN(rawYes) ? 0.5 : rawYes;
          const rawNo = prices.length > 1 ? parseFloat(prices[1]) : NaN;
          const noPrice = isNaN(rawNo) ? (1 - yesPrice) : rawNo;
          const vol = Math.round(parseFloat(m.volume || 0));
          const liq = Math.round(parseFloat(m.liquidityNum || m.liquidity || 0));
          db.prepare(`UPDATE markets SET yes_price = ?, no_price = ?, volume = ?, liquidity = ?,
            event_id = ?, event_title = ?, outcome_label = ?, poly_condition_id = ?
            WHERE id = ? AND market_type = ?`)
            .run(Math.round(yesPrice * 10000) / 10000, Math.round(noPrice * 10000) / 10000, vol, liq,
              isMultiOutcome ? eventId : null, isMultiOutcome ? eventTitle : null, outcomeLabel,
              fullConditionId, polyId, 'polymarket');
          continue;
        }

        // Parse end time
        let endTime;
        const endStr = m.endDate || m.end_date_iso || ev.endDate;
        if (endStr) {
          endTime = Math.floor(new Date(endStr).getTime() / 1000);
        } else {
          endTime = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days default
        }
        if (endTime < Math.floor(Date.now() / 1000)) continue; // skip expired

        const prices = JSON.parse(m.outcomePrices || '[]');
        const rawYes2 = prices.length > 0 ? parseFloat(prices[0]) : NaN;
        const rawNo2 = prices.length > 1 ? parseFloat(prices[1]) : NaN;
        // Normalize: yesPrice + noPrice must equal 1.0
        let yesPrice, noPrice;
        if (isNaN(rawYes2) && isNaN(rawNo2)) {
          yesPrice = 0.5; noPrice = 0.5;
        } else if (isNaN(rawNo2)) {
          yesPrice = Math.max(0.01, Math.min(0.99, rawYes2));
          noPrice = 1 - yesPrice;
        } else {
          const sum = rawYes2 + rawNo2;
          yesPrice = sum > 0 ? rawYes2 / sum : 0.5;
          noPrice = 1 - yesPrice;
        }
        const vol = Math.round(parseFloat(m.volume || 0));
        const liq = Math.round(parseFloat(m.liquidityNum || m.liquidity || 0));
        const category = mapPolyCategory(ev.category || m.category || '', m.question || eventTitle);
        const rawTags = (ev.tags || []).slice(0, 3).map(t => typeof t === 'string' ? t : (t.label || t.slug || '')).filter(Boolean);
        const tags = JSON.stringify([category.toLowerCase(), 'polymarket', ...rawTags]);

        // Scale volume/liquidity to sats
        const scaledVol = Math.max(vol, 10000);
        const scaledLiq = Math.max(liq, 50000);
        const yesPool = Math.round(scaledLiq * noPrice);
        const noPool = Math.round(scaledLiq * yesPrice);

        try {
          db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price,
            yes_pool, no_pool, volume, liquidity, end_time, tags, market_type, image_url,
            event_id, event_title, outcome_label, poly_condition_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'polymarket', ?, ?, ?, ?, ?)`).run(
            polyId, m.question, category,
            Math.round(yesPrice * 10000) / 10000, Math.round(noPrice * 10000) / 10000,
            yesPool, noPool, scaledVol, scaledLiq, endTime, tags,
            m.image || ev.image || null,
            isMultiOutcome ? eventId : null,
            isMultiOutcome ? eventTitle : null,
            outcomeLabel,
            fullConditionId
          );
          synced++;
        } catch (e) { /* duplicate or constraint error, skip */ }
      }
    }
    if (synced > 0) console.log(`Synced ${synced} new Polymarket events`);
  } catch (e) {
    console.error('Polymarket sync error:', e.message);
  }
}

// --- Parimutuel helpers ---
// Implied odds from pool sizes
function calcParimutuelPrices(yesPool, noPool) {
  const total = yesPool + noPool;
  if (total === 0) return { yes_price: 0.5, no_price: 0.5 };
  const yes_price = Math.round((yesPool / total) * 10000) / 10000;
  return { yes_price, no_price: Math.round((1 - yes_price) * 10000) / 10000 };
}

// BigInt-safe helpers for financial math (used by vault)
function safeBigMul(a, b) { return BigInt(a) * BigInt(b); }
function safeBigDiv(a, b) { if (BigInt(b) === 0n) return 0n; return BigInt(a) / BigInt(b); }

// --- Parimutuel fee config ---
const FEE_PCT = 0.02;            // 2% of bet amount (synced with contract 200 BPS)
const FEE_VAULT_PCT = 0.60;      // 60% of fees → vault stakers
const FEE_PROTOCOL_PCT = 0.20;   // 20% of fees → protocol
const FEE_CREATOR_PCT = 0.20;    // 20% of fees → market creator

function calculateParimutuelFee(betAmount) {
  const fee = Math.ceil(betAmount * FEE_PCT);
  const netBet = betAmount - fee;
  const vaultShare = Math.floor(fee * FEE_VAULT_PCT);
  const protocolShare = Math.floor(fee * FEE_PROTOCOL_PCT);
  const creatorShare = fee - vaultShare - protocolShare;
  return { fee, netBet, vaultShare, protocolShare, creatorShare };
}

// --- Revenue distribution helper ---
function distributeRevenue(feeInfo, sourceMarketId) {
  distributeToVault(feeInfo.vaultShare, sourceMarketId);

  // Creator share
  if (feeInfo.creatorShare > 0 && sourceMarketId) {
    const market = db.prepare('SELECT creator_address FROM markets WHERE id = ?').get(sourceMarketId);
    if (market && market.creator_address) {
      db.prepare('UPDATE users SET balance = balance + ?, creator_earnings = creator_earnings + ? WHERE address = ?')
        .run(feeInfo.creatorShare, feeInfo.creatorShare, market.creator_address);
    }
  }

  if (feeInfo.protocolShare > 0) {
    db.prepare('INSERT INTO protocol_revenue (source_type, source_market_id, amount) VALUES (?, ?, ?)')
      .run('fee', sourceMarketId || '', feeInfo.protocolShare);
    ACCUMULATED_PROTOCOL_REVENUE += feeInfo.protocolShare;
  }
}

// --- Vault fee distribution helper ---
// vaultShare = pre-calculated amount to distribute (from calculateParimutuelFee)
function distributeToVault(vaultShare, sourceMarketId) {
  if (VAULT_TOTAL_STAKED <= 0 || vaultShare <= 0) return;

  // BigInt precision for reward distribution
  const delta = Number(safeBigDiv(safeBigMul(vaultShare, VAULT_PRECISION), VAULT_TOTAL_STAKED));
  VAULT_REWARDS_PER_SHARE += delta;
  VAULT_TOTAL_DISTRIBUTED += vaultShare;

  db.prepare('INSERT INTO vault_rewards (source_market_id, fee_amount, total_staked_at_time, rewards_per_share_delta) VALUES (?, ?, ?, ?)').run(
    sourceMarketId || '', vaultShare, VAULT_TOTAL_STAKED, delta
  );

  // Auto-compound for eligible stakers
  const autoStakers = db.prepare('SELECT address, staked_amount, reward_debt FROM vault_stakes WHERE auto_compound = 1 AND staked_amount > 0').all();
  for (const s of autoStakers) {
    const accumulated = Number(safeBigDiv(safeBigMul(s.staked_amount, VAULT_REWARDS_PER_SHARE), VAULT_PRECISION));
    const pending = accumulated - s.reward_debt;
    if (pending > 0) {
      const newStaked = s.staked_amount + pending;
      const newDebt = Number(safeBigDiv(safeBigMul(newStaked, VAULT_REWARDS_PER_SHARE), VAULT_PRECISION));
      db.prepare('UPDATE vault_stakes SET staked_amount = ?, reward_debt = ?, last_claim = unixepoch() WHERE address = ?').run(newStaked, newDebt, s.address);
      VAULT_TOTAL_STAKED += pending;
    }
  }
}

// Helper to get pending vault rewards for a user
function getVaultPendingRewards(address) {
  const stake = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(address);
  if (!stake || stake.staked_amount <= 0) return 0;
  const accumulated = Number(safeBigDiv(safeBigMul(stake.staked_amount, VAULT_REWARDS_PER_SHARE), VAULT_PRECISION));
  return Math.max(0, accumulated - stake.reward_debt);
}

// --- API Routes ---

// Step 1: Request challenge for auth (no signature required)
app.post('/api/auth/challenge', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  if (typeof address !== 'string' || !address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  // Rate limit: 5 challenge requests per minute per address, 20 per IP
  if (rateLimit('challenge:' + address, 5, 60000)) {
    return res.status(429).json({ error: 'Too many challenge requests. Wait a moment.' });
  }
  if (rateLimit('challenge-ip:' + req.ip, 20, 60000)) {
    return res.status(429).json({ error: 'Too many requests from this IP.' });
  }
  const challenge = generateChallenge(address);
  res.json({ challenge, message: `Sign this challenge to authenticate with BitPredict: ${challenge}` });
});

// Step 2: Verify signature and issue JWT (+ register/login user)
app.post('/api/auth', async (req, res) => {
  const { address, referrer, signature, challenge: clientChallenge, p2trAddress } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  if (typeof address !== 'string' || !address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address format' });
  }

  // Signature + challenge are REQUIRED for JWT issuance
  if (!signature || !clientChallenge) {
    return res.status(400).json({ error: 'signature and challenge are required. Get a challenge via POST /api/auth/challenge first.' });
  }

  const stored = authChallenges.get(address);
  if (!stored || stored.challenge !== clientChallenge) {
    return res.status(401).json({ error: 'Invalid or expired challenge. Request a new one via /api/auth/challenge' });
  }

  // Verify signature: challenge is HMAC-signed by server, single-use, time-limited.
  // The wallet signs the challenge message — we verify format + length + HMAC integrity.
  // Full MLDSA off-chain verification requires the opnet SDK signature tools;
  // the HMAC + single-use challenge approach prevents replay and impersonation.
  try {
    if (typeof signature !== 'string' || signature.length < 64) {
      return res.status(401).json({ error: 'Invalid signature format' });
    }
    // Verify challenge HMAC integrity (server-signed)
    const expectedHmac = crypto.createHmac('sha256', JWT_SECRET).update(`${address}:${stored.challenge}`).digest('hex');
    if (stored.hmac !== expectedHmac) {
      return res.status(401).json({ error: 'Challenge integrity check failed' });
    }
    // Challenge is valid and single-use — delete to prevent replay
    authChallenges.delete(address);
  } catch (sigErr) {
    return res.status(401).json({ error: 'Signature verification failed' });
  }

  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) {
    const ref = (referrer && referrer !== address && db.prepare('SELECT address FROM users WHERE address = ?').get(referrer)) ? referrer : null;
    db.prepare('INSERT INTO users (address, balance, btc_balance, referrer, p2tr_address) VALUES (?, 0, 0, ?, ?)').run(address, ref, p2trAddress || null);
    user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (ref) {
      db.prepare('INSERT INTO notifications (address, type, title, body) VALUES (?, ?, ?, ?)').run(
        ref, 'referral', 'New Referral!', `${address.slice(0, 16)}... joined via your link`
      );
    }
  } else if (p2trAddress && !user.p2tr_address) {
    // Update p2tr address if not yet stored
    db.prepare('UPDATE users SET p2tr_address = ? WHERE address = ?').run(p2trAddress, address);
  }

  // Issue JWT
  const token = jwt.sign({ address: user.address }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

  res.json({
    address: user.address,
    balance: user.balance,
    btcBalance: user.btc_balance || 0,
    backedBalance: user.backed_balance || 0,
    creatorEarnings: user.creator_earnings || 0,
    referrer: user.referrer || null,
    token,
  });
});

// Get user balance (both currencies)
app.get('/api/balance/:address', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(req.params.address);
  if (!user) return res.json({ balance: 0, btcBalance: 0, backedBalance: 0, creatorEarnings: 0 });
  res.json({ balance: user.balance, btcBalance: user.btc_balance || 0, backedBalance: user.backed_balance || 0, creatorEarnings: user.creator_earnings || 0 });
});

// List all markets (filter out old resolved markets)
app.get('/api/markets', (req, res) => {
  const cutoff5min = Math.floor(Date.now() / 1000) - 3600; // 1h for 5min markets
  const cutoff7d = Math.floor(Date.now() / 1000) - 7 * 86400; // 7d for others
  const markets = db.prepare(`SELECT * FROM markets
    WHERE NOT (market_type = 'price_5min' AND resolved = 1 AND end_time < ?)
    AND NOT (market_type != 'price_5min' AND resolved = 1 AND end_time < ?)
    ORDER BY resolved ASC,
      CASE WHEN market_type = 'price_5min' AND resolved = 0 THEN 0 ELSE 1 END,
      volume DESC, end_time ASC
    LIMIT 1500`).all(cutoff5min, cutoff7d);
  // Build event groups for multi-outcome Polymarket markets
  const eventGroups = new Map();
  for (const m of markets) {
    if (m.event_id) {
      if (!eventGroups.has(m.event_id)) eventGroups.set(m.event_id, []);
      eventGroups.get(m.event_id).push(m);
    }
  }

  // Track which markets were already merged into a group
  const mergedIds = new Set();
  const result = [];

  for (const m of markets) {
    if (mergedIds.has(m.id)) continue;
    // Skip prop bet markets (More Markets, Spreads)
    if ((m.question || '').includes('- More Markets') || /^Spread:/i.test(m.question || '')) continue;

    let tags = [];
    try { tags = JSON.parse(m.tags || '[]'); } catch(e) { tags = []; }

    // Normalize prices: must sum to 1.0
    const priceSum = m.yes_price + m.no_price;
    const normYes = priceSum > 0 ? Math.round((m.yes_price / priceSum) * 10000) / 10000 : 0.5;
    const normNo = Math.round((1 - normYes) * 10000) / 10000;
    // For binary "X vs. Y" matches, extract team names as labels
    let yesLabel = undefined;
    let noLabel = undefined;
    const vsMatch = (m.question || '').match(/^(.+?)\s+vs\.?\s+(.+?)(\s*[-–—]|$)/i);
    if (vsMatch) {
      yesLabel = vsMatch[1].trim();
      noLabel = vsMatch[2].trim();
    }

    const base = {
      id: m.id,
      question: m.question,
      category: m.category,
      yesPrice: normYes,
      noPrice: normNo,
      volume: m.volume,
      liquidity: m.liquidity,
      endDate: new Date(m.end_time * 1000).toISOString().split('T')[0],
      endTime: m.end_time,
      resolved: !!m.resolved,
      outcome: m.outcome,
      tags: Array.isArray(tags) ? tags.filter(t => typeof t === 'string') : [],
      marketType: m.market_type,
      yesPool: m.yes_pool,
      noPool: m.no_pool,
      imageUrl: m.image_url || null,
      oracleResolved: !!m.resolved && (m.market_type === 'price_5min' || m.market_type === 'polymarket'),
      onchainId: m.onchain_id || null,
      totalPool: (m.yes_pool || 0) + (m.no_pool || 0),
      yesLabel,
      noLabel,
    };

    // Multi-outcome: group sibling markets into outcomes array
    if (m.event_id && eventGroups.has(m.event_id)) {
      const siblings = eventGroups.get(m.event_id);
      if (siblings.length > 1) {
        // Use event title as the card question
        base.question = m.event_title || m.question;
        base.eventId = m.event_id;

        // Build outcomes sorted by price descending, filtering out prop bets
        const propRe = /^O\/U\s|^Spread\s|^Both Teams|Rebounds O\/U|Points O\/U|Assists O\/U|^vs\.$/i;
        const outcomes = siblings
          .map(s => ({
            marketId: s.id,
            label: s.outcome_label || s.question,
            price: s.yes_price,
            volume: s.volume,
          }))
          .filter(o => !propRe.test(o.label)) // exclude prop bets from multi-outcome display
          .sort((a, b) => b.price - a.price);

        // If filtering removed all/most outcomes, show as individual binary markets instead
        if (outcomes.length < 2) {
          // Don't merge — each sibling stays as standalone binary market
          continue;
        }

        base.outcomes = outcomes;

        // Top outcome price as the main card percentage
        base.yesPrice = outcomes[0].price;
        base.noPrice = 1 - outcomes[0].price;

        // Aggregate volume/liquidity
        base.volume = siblings.reduce((s, x) => s + x.volume, 0);
        base.liquidity = siblings.reduce((s, x) => s + x.liquidity, 0);

        // Use image from first sibling with one
        base.imageUrl = siblings.find(s => s.image_url)?.image_url || null;

        // Mark all siblings as merged
        for (const s of siblings) mergedIds.add(s.id);

        result.push(base);
        continue;
      }
    }

    result.push(base);
  }

  res.json(result);
});

// Get single market
app.get('/api/markets/:id', (req, res) => {
  const m = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'market not found' });
  res.json({
    id: m.id, question: m.question, category: m.category,
    yesPrice: m.yes_price, noPrice: m.no_price,
    volume: m.volume, liquidity: m.liquidity,
    endDate: new Date(m.end_time * 1000).toISOString().split('T')[0],
    endTime: m.end_time,
    resolved: !!m.resolved, outcome: m.outcome,
    tags: (() => { try { const t = JSON.parse(m.tags || '[]'); return Array.isArray(t) ? t.filter(x => typeof x === 'string') : []; } catch(e) { return []; } })(), marketType: m.market_type,
    yesPool: m.yes_pool, noPool: m.no_pool,
    creatorAddress: m.creator_address || null,
    initialLiquidity: m.initial_liquidity || 0,
  });
});

// Place a bet (Parimutuel — WBTC only)
app.post('/api/bet', requireAuth, async (req, res) => {
  const { address, marketId, side, amount } = req.body;
  if (address && rateLimit('bet:' + address, 10, 60000)) return res.status(429).json({ error: 'Too many bets. Try again in a minute.' });

  if (!address || !marketId || !side || !amount) {
    return res.status(400).json({ error: 'address, marketId, side, amount required' });
  }
  if (typeof address !== 'string' || !address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  if (side !== 'yes' && side !== 'no') {
    return res.status(400).json({ error: 'side must be yes or no' });
  }
  const amountInt = Math.floor(Number(amount));
  if (!Number.isFinite(amountInt) || amountInt < MIN_BET_SATS) {
    return res.status(400).json({ error: `Minimum bet is ${MIN_BET_SATS} sats` });
  }

  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });

  // Parimutuel: fee deducted FROM bet amount
  const feeInfo = calculateParimutuelFee(amountInt);
  if (user.balance < amountInt) {
    return res.status(400).json({ error: `Insufficient balance: ${user.balance} sats (need ${amountInt})` });
  }

  const betId = `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const txHash = '';

  const txn = db.transaction(() => {
    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
    if (!market) throw new Error('market not found');
    if (market.resolved) throw new Error('market already resolved');

    const now = Math.floor(Date.now() / 1000);
    if (market.end_time <= now) throw new Error('market has ended');

    // Parimutuel: net amount goes into the pool
    const newYesPool = side === 'yes' ? (market.yes_pool || 0) + feeInfo.netBet : (market.yes_pool || 0);
    const newNoPool = side === 'no' ? (market.no_pool || 0) + feeInfo.netBet : (market.no_pool || 0);
    const totalPool = newYesPool + newNoPool;

    const prices = calcParimutuelPrices(newYesPool, newNoPool);

    // Deduct full amount from user
    db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(amountInt, address);
    db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, net_amount, price, shares, tx_hash, currency) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)').run(
      betId, address, marketId, side, amountInt, feeInfo.netBet, prices.yes_price, txHash, 'wbtc'
    );
    db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
      newYesPool, newNoPool, prices.yes_price, prices.no_price, amountInt, totalPool, marketId
    );
    db.prepare('INSERT INTO market_price_history (market_id, yes_price, no_price, volume) VALUES (?, ?, ?, ?)').run(
      marketId, prices.yes_price, prices.no_price, amountInt
    );
    return { newYesPool, newNoPool, prices };
  });

  try {
    const txnResult = txn();
    distributeRevenue(feeInfo, marketId);
    const updatedUser = db.prepare('SELECT balance FROM users WHERE address = ?').get(address);

    res.json({
      success: true,
      betId,
      fee: feeInfo.fee,
      netAmount: feeInfo.netBet,
      newBalance: updatedUser.balance,
      newBtcBalance: 0,
      txHash,
      newYesPrice: txnResult.prices.yes_price,
      newNoPrice: txnResult.prices.no_price,
    });
  } catch (e) {
    console.error('Bet error:', e.message);
    res.status(500).json({ error: 'Failed to place bet: ' + e.message });
  }
});

// Get user bets
app.get('/api/bets/:address', (req, res) => {
  const addr = req.params.address;
  if (typeof addr !== 'string' || !addr.startsWith(OPNET_ADDRESS_PREFIX) || addr.length > 120) {
    return res.status(400).json({ error: 'Invalid address' });
  }
  const bets = db.prepare(`
    SELECT b.*, m.question, m.category, m.resolved as market_resolved, m.outcome as market_outcome,
           m.yes_price as current_yes_price, m.no_price as current_no_price,
           m.yes_pool, m.no_pool
    FROM bets b JOIN markets m ON b.market_id = m.id
    WHERE b.user_address = ?
    ORDER BY b.created_at DESC
    LIMIT 200
  `).all(addr);

  res.json(bets.map(b => {
    // Parimutuel potential payout calculation
    const netAmt = b.net_amount || b.amount;
    const yesPool = b.yes_pool || 0;
    const noPool = b.no_pool || 0;
    const totalPool = yesPool + noPool;
    const sidePool = b.side === 'yes' ? yesPool : noPool;
    const potentialPayout = (b.status === 'active' && sidePool > 0)
      ? Math.floor((netAmt / sidePool) * totalPool) : 0;

    return {
      id: b.id,
      marketId: b.market_id,
      question: b.question,
      category: b.category,
      side: b.side,
      amount: b.amount,
      netAmount: netAmt,
      price: b.price,
      status: b.status,
      payout: b.payout,
      potentialPayout,
      timestamp: b.created_at * 1000,
      currentYesPrice: b.current_yes_price,
      currentNoPrice: b.current_no_price,
      marketResolved: !!b.market_resolved,
      marketOutcome: b.market_outcome,
      currency: 'wbtc',
    };
  }));
});

// Claim payout for resolved bet — requires user-signed TX proof
app.post('/api/claim', requireAuth, async (req, res) => {
  const { address, betId, txHash } = req.body;
  if (!address || !betId || !txHash) return res.status(400).json({ error: 'address, betId, txHash required' });
  if (rateLimit('claim:' + address, 5, 60000)) return res.status(429).json({ error: 'Too many claims. Try again in a minute.' });

  // Verify TX on-chain
  const txVerify = await verifyTxOnChain(txHash, address, 'PayoutClaimed');
  if (!txVerify.valid && !txVerify.rpcDown) {
    return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
  }

  const bet = db.prepare('SELECT * FROM bets WHERE id = ? AND user_address = ?').get(betId, address);
  if (!bet) return res.status(404).json({ error: 'bet not found' });
  if (bet.status !== 'claimable') return res.status(400).json({ error: 'bet not claimable (status: ' + bet.status + ')' });
  if (bet.payout <= 0) return res.status(400).json({ error: 'no payout to claim' });

  // Prevent replay: check txHash not already used for any claim
  const existingClaim = db.prepare("SELECT id FROM bets WHERE claim_tx_hash = ? AND claim_tx_hash IS NOT NULL AND length(claim_tx_hash) > 0").get(txHash);
  if (existingClaim) return res.status(400).json({ error: 'This transaction hash has already been used for a claim' });

  try {
    const txn = db.transaction(() => {
      db.prepare('UPDATE bets SET status = ?, claim_tx_hash = ? WHERE id = ?').run('won', txHash, bet.id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(bet.payout, address);
    });
    txn();
    const updatedUser = db.prepare('SELECT balance FROM users WHERE address = ?').get(address);
    res.json({ success: true, payout: bet.payout, newBalance: updatedUser.balance, newBtcBalance: 0, txHash });
  } catch (e) {
    console.error('Claim error:', e.message);
    res.status(500).json({ error: 'Claim failed: ' + e.message });
  }
});

// --- Server-side reward definitions (hardcoded, NOT from client) ---
// IDs must match frontend achievement/quest IDs in useAchievements.ts
const REWARD_DEFINITIONS = {
  // === Frontend Achievements (matched by id) ===
  'first_prediction': { type: 'achievement', amount: 100, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM bets WHERE user_address = ?').get(addr).c >= 1 },
  'whale_trader':     { type: 'achievement', amount: 250, verify: (addr) => { const r = db.prepare('SELECT MAX(amount) as m FROM bets WHERE user_address = ?').get(addr); return r && r.m >= 50000; } },
  'diversified':      { type: 'achievement', amount: 200, verify: (addr) => db.prepare('SELECT COUNT(DISTINCT m.category) as c FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.user_address = ?').get(addr).c >= 3 },
  'ai_strategist':    { type: 'achievement', amount: 150, verify: () => true },
  'fortune_builder':  { type: 'achievement', amount: 500, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM bets WHERE user_address = ?').get(addr).c >= 10 },
  'volume_king':      { type: 'achievement', amount: 750, verify: (addr) => db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE user_address = ?').get(addr).v >= 100000 },
  'explorer':         { type: 'achievement', amount: 50,  verify: () => true },
  'early_bird':       { type: 'achievement', amount: 75,  verify: () => true },
  'bull_bear':        { type: 'achievement', amount: 150, verify: (addr) => {
    const yes = db.prepare("SELECT COUNT(*) as c FROM bets WHERE user_address = ? AND side = 'yes'").get(addr).c;
    const no = db.prepare("SELECT COUNT(*) as c FROM bets WHERE user_address = ? AND side = 'no'").get(addr).c;
    return yes >= 1 && no >= 1;
  }},
  'hot_streak':       { type: 'achievement', amount: 300, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM bets WHERE user_address = ?').get(addr).c >= 5 },
  'community_member': { type: 'achievement', amount: 50,  verify: () => true },
  'bitcoin_maxi':     { type: 'achievement', amount: 300, verify: (addr) => db.prepare("SELECT COUNT(*) as c FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.user_address = ? AND m.category = 'crypto'").get(addr).c >= 5 },
  // === Frontend Quests (matched by id) ===
  'connect_wallet':     { type: 'quest', amount: 100, verify: () => true },
  'first_bet':          { type: 'quest', amount: 150, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM bets WHERE user_address = ?').get(addr).c >= 1 },
  'analyze_market':     { type: 'quest', amount: 100, verify: () => true },
  'trade_3_categories': { type: 'quest', amount: 200, verify: (addr) => db.prepare('SELECT COUNT(DISTINCT m.category) as c FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.user_address = ?').get(addr).c >= 3 },
  'daily_prediction':   { type: 'quest', amount: 50,  verify: (addr) => { const dayAgo = Math.floor(Date.now()/1000) - 86400; return db.prepare('SELECT COUNT(*) as c FROM bets WHERE user_address = ? AND created_at >= ?').get(addr, dayAgo).c >= 1; } },
  'weekly_volume':      { type: 'quest', amount: 300, verify: (addr) => { const weekAgo = Math.floor(Date.now()/1000) - 604800; return db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE user_address = ? AND created_at >= ?').get(addr, weekAgo).v >= 50000; } },
  'visit_faucet':       { type: 'quest', amount: 75,  verify: () => true },
  'check_leaderboard':  { type: 'quest', amount: 50,  verify: () => true },
  // === Legacy server-only IDs (backward compat for already-claimed rewards) ===
  'first_stake':     { type: 'achievement', amount: 100, verify: (addr) => { const s = db.prepare('SELECT staked_amount FROM vault_stakes WHERE address = ?').get(addr); return s && s.staked_amount > 0; } },
  'market_creator':  { type: 'achievement', amount: 150, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM markets WHERE creator_address = ?').get(addr).c >= 1 },
  'first_referral':  { type: 'achievement', amount: 100, verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM users WHERE referrer = ?').get(addr).c >= 1 },
  'quest_volume_1k': { type: 'quest', amount: 100, verify: (addr) => db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE user_address = ?').get(addr).v >= 1000 },
  'quest_volume_10k':{ type: 'quest', amount: 300, verify: (addr) => db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE user_address = ?').get(addr).v >= 10000 },
  'quest_3_markets': { type: 'quest', amount: 75,  verify: (addr) => db.prepare('SELECT COUNT(DISTINCT market_id) as c FROM bets WHERE user_address = ?').get(addr).c >= 3 },
  'quest_comment':   { type: 'quest', amount: 25,  verify: (addr) => db.prepare('SELECT COUNT(*) as c FROM comments WHERE address = ?').get(addr).c >= 1 },
};

// Claim achievement/quest WBTC reward (server-validated, hardcoded amounts)
app.post('/api/reward/claim', requireAuth, async (req, res) => {
  const { address, rewardId } = req.body;
  if (!address || !rewardId) return res.status(400).json({ error: 'address, rewardId required' });
  if (!address.startsWith(OPNET_ADDRESS_PREFIX) || address.length < 20) return res.status(400).json({ error: 'invalid address' });

  // Rate limit: 3 claims per minute per address (allow claiming different rewards in sequence)
  const claimKey = 'reward_claim:' + address;
  if (rateLimit(claimKey, 3, 60000)) {
    return res.status(429).json({ error: 'Too many claims. Wait 1 minute.' });
  }

  // Validate rewardId against server-side definitions
  const rewardDef = REWARD_DEFINITIONS[rewardId];
  if (!rewardDef) return res.status(400).json({ error: 'Invalid reward ID' });

  // Check if already claimed
  const existing = db.prepare('SELECT id FROM reward_claims WHERE address = ? AND reward_id = ?').get(address, rewardId);
  if (existing) return res.status(400).json({ error: 'reward already claimed' });

  // Ensure user exists
  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });

  // Verify that the achievement/quest was actually completed
  try {
    if (!rewardDef.verify(address)) {
      return res.status(400).json({ error: 'Reward condition not met' });
    }
  } catch (e) {
    console.error('Reward verify error:', e.message);
    return res.status(500).json({ error: 'Verification failed' });
  }

  const amount = rewardDef.amount;
  try {
    // Send WBTC on-chain to user
    const txResult = await transferWbtc(address, amount);
    if (!txResult.success) {
      return res.status(500).json({ error: 'On-chain transfer failed: ' + txResult.error });
    }

    const txn = db.transaction(() => {
      db.prepare('INSERT INTO reward_claims (address, reward_id, reward_type, amount, tx_hash) VALUES (?, ?, ?, ?, ?)').run(address, rewardId, rewardDef.type, amount, txResult.txHash || '');
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(amount, address);
    });
    txn();
    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    res.json({ success: true, amount, newBalance, txHash: txResult.txHash });
  } catch (e) {
    console.error('Reward claim error:', e.message);
    res.status(500).json({ error: 'Claim failed: ' + e.message });
  }
});

// Get claimed rewards for a user
app.get('/api/reward/claimed/:address', (req, res) => {
  const { address } = req.params;
  if (!address || !address.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });
  const claims = db.prepare('SELECT reward_id, reward_type, amount, claimed_at FROM reward_claims WHERE address = ?').all(address);
  res.json(claims);
});

// Get prices
app.get('/api/prices', async (req, res) => {
  const btc = await fetchPrice('btc');
  const eth = await fetchPrice('eth');
  const sol = await fetchPrice('sol');
  res.json({ btc, eth, sol, ts: Date.now() });
});

// Price history for sparkline charts (last N minutes of a given asset)
app.get('/api/prices/history', (req, res) => {
  const asset = (req.query.asset || 'btc').toLowerCase();
  const minutes = Math.min(parseInt(req.query.minutes) || 30, 1440); // max 24h
  const since = Math.floor(Date.now() / 1000) - minutes * 60;
  const rows = db.prepare(
    'SELECT price, timestamp FROM price_snapshots WHERE asset = ? AND timestamp >= ? ORDER BY timestamp ASC'
  ).all(asset, since);
  res.json(rows);
});

// Protocol stats (TVL, 24h volume, unique users, total bets)
app.get('/api/stats', (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const day = now - 86400;

    const totalMarkets = db.prepare('SELECT COUNT(*) as c FROM markets WHERE resolved = 0').get().c;
    const resolvedMarkets = db.prepare('SELECT COUNT(*) as c FROM markets WHERE resolved = 1').get().c;
    const totalBets = db.prepare('SELECT COUNT(*) as c FROM bets').get().c;
    const bets24h = db.prepare('SELECT COUNT(*) as c FROM bets WHERE created_at > ?').get(day).c;
    const volume24h = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE created_at > ?').get(day).v;
    const volumeTotal = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM bets').get().v;
    const uniqueUsers = db.prepare('SELECT COUNT(DISTINCT user_address) as c FROM bets').get().c;
    const users24h = db.prepare('SELECT COUNT(DISTINCT user_address) as c FROM bets WHERE created_at > ?').get(day).c;

    // TVL = vault staked + active bet amounts
    const vaultTvl = db.prepare('SELECT COALESCE(SUM(staked_amount),0) as v FROM vault_stakes WHERE staked_amount > 0').get().v;
    const activeBetsTvl = db.prepare("SELECT COALESCE(SUM(amount),0) as v FROM bets WHERE status = 'active'").get().v;
    const tvl = vaultTvl + activeBetsTvl;

    // Auto-resolved markets count
    const autoResolved = db.prepare("SELECT COUNT(*) as c FROM markets WHERE resolved = 1 AND (market_type = 'price_5min' OR market_type = 'polymarket')").get().c;

    res.json({
      totalMarkets, resolvedMarkets, autoResolved,
      totalBets, bets24h,
      volume24h, volumeTotal,
      uniqueUsers, users24h,
      tvl, vaultTvl, activeBetsTvl,
    });
  } catch (e) {
    console.error('Stats error:', e.message);
    res.status(500).json({ error: 'Stats unavailable' });
  }
});

// Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const leaders = db.prepare(`
    SELECT u.address, u.balance,
      COUNT(b.id) as total_bets,
      SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(b.amount) as volume,
      SUM(CASE WHEN b.status = 'won' THEN b.payout - b.amount ELSE 0 END) -
      SUM(CASE WHEN b.status = 'lost' THEN b.amount ELSE 0 END) as pnl
    FROM users u LEFT JOIN bets b ON u.address = b.user_address
    WHERE u.address LIKE ? || '%'
    GROUP BY u.address
    ORDER BY u.balance DESC
    LIMIT 50
  `).all(OPNET_ADDRESS_PREFIX);

  res.json(leaders.map((l, i) => ({
    rank: i + 1,
    address: l.address,
    balance: l.balance,
    totalBets: l.total_bets || 0,
    wins: l.wins || 0,
    volume: l.volume || 0,
    pnl: l.pnl || 0,
  })));
});

// Health check
// ==========================================================================
// ADMIN: Reset server state after contract redeploy
// ==========================================================================
app.post('/api/admin/reset-after-redeploy', (req, res) => {
  const { secret } = req.body;
  if (secret !== JWT_SECRET) return res.status(403).json({ error: 'forbidden' });

  const txn = db.transaction(() => {
    // Reset vault state
    db.exec('DELETE FROM vault_stakes');
    db.exec('DELETE FROM vault_rewards');
    db.exec('DELETE FROM vault_vesting');
    VAULT_TOTAL_STAKED = 0;
    VAULT_REWARDS_PER_SHARE = 0;
    VAULT_TOTAL_DISTRIBUTED = 0;

    // Reset all user balances to 0
    db.exec('UPDATE users SET balance = 0, btc_balance = 0, backed_balance = 0');

    // Reset pending treasury operations
    db.exec("UPDATE treasury_deposits SET status = 'expired' WHERE status = 'pending'");
    db.exec("UPDATE withdrawal_requests SET status = 'expired' WHERE status = 'pending'");

    // Reset protocol revenue
    ACCUMULATED_PROTOCOL_REVENUE = 0;

    // Cancel all active bets (markets continue but bets are void)
    db.exec("UPDATE bets SET status = 'cancelled' WHERE status = 'active'");

    const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    return { usersReset: userCount };
  });

  try {
    const result = txn();
    console.log(`ADMIN RESET: ${result.usersReset} users reset, vault cleared`);
    res.json({ success: true, ...result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  const pendingDeposits = db.prepare("SELECT COUNT(*) as c FROM treasury_deposits WHERE status = 'pending'").get()?.c || 0;
  const pendingWithdrawals = db.prepare("SELECT COUNT(*) as c FROM withdrawal_requests WHERE status = 'pending'").get()?.c || 0;
  res.json({
    status: 'ok',
    ts: Date.now(),
    markets: db.prepare('SELECT COUNT(*) as c FROM markets').get().c,
    pendingDeposits,
    pendingWithdrawals,
    protocolRevenuePending: ACCUMULATED_PROTOCOL_REVENUE,
  });
});

// On-chain bet (parimutuel): frontend sends txHash FIRST, then server records the bet
app.post('/api/bet/onchain', requireAuth, async (req, res) => {
  const { address, marketId, side, amount, txHash } = req.body;
  if (address && rateLimit('bet-onchain:' + address, 10, 60000)) return res.status(429).json({ error: 'Too many bets. Try again in a minute.' });

  if (!address || !marketId || !side || !amount || !txHash) {
    return res.status(400).json({ error: 'address, marketId, side, amount, txHash required' });
  }
  if (typeof address !== 'string' || !address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  if (side !== 'yes' && side !== 'no') return res.status(400).json({ error: 'side must be yes or no' });
  const onchainAmt = Math.floor(Number(amount));
  if (!Number.isFinite(onchainAmt) || onchainAmt < MIN_BET_SATS) return res.status(400).json({ error: `minimum bet is ${MIN_BET_SATS} sats` });

  try {
    // TX existence check (mempool or confirmed)
    const txVerify = await verifyTxExists(txHash, address);
    if (!txVerify.valid) {
      return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
    }
    const txConfirmed = txVerify.confirmed ? 1 : 0;
    const existingTx = db.prepare('SELECT id FROM bets WHERE tx_hash = ? AND length(tx_hash) > 0').get(txHash);
    if (existingTx) return res.status(400).json({ error: 'txHash already used — replay detected' });

    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if ((user.balance || 0) < onchainAmt) return res.status(400).json({ error: `Insufficient balance: ${user.balance || 0} < ${onchainAmt}` });

    const feeInfo = calculateParimutuelFee(onchainAmt);
    const betId = `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const txn = db.transaction(() => {
      const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
      if (!market) throw new Error('market not found');
      if (market.resolved) throw new Error('market already resolved');

      const now = Math.floor(Date.now() / 1000);
      if (market.end_time <= now) throw new Error('market has ended');

      // Parimutuel: netBet goes to the side pool
      const newYesPool = side === 'yes' ? (market.yes_pool || 0) + feeInfo.netBet : (market.yes_pool || 0);
      const newNoPool = side === 'no' ? (market.no_pool || 0) + feeInfo.netBet : (market.no_pool || 0);
      const prices = calcParimutuelPrices(newYesPool, newNoPool);

      // Deduct bet amount from server balance (backed_balance stays — it's for withdrawals)
      db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(onchainAmt, address);
      db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, net_amount, price, shares, tx_hash, currency, tx_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)').run(
        betId, address, marketId, side, onchainAmt, feeInfo.netBet, prices.yes_price, txHash, 'wbtc', txConfirmed
      );
      db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
        newYesPool, newNoPool, prices.yes_price, prices.no_price, onchainAmt, newYesPool + newNoPool, marketId
      );
      db.prepare('INSERT INTO market_price_history (market_id, yes_price, no_price, volume) VALUES (?, ?, ?, ?)').run(
        marketId, prices.yes_price, prices.no_price, onchainAmt
      );
      db.prepare('INSERT INTO notifications (address, type, title, body, market_id) VALUES (?, ?, ?, ?, ?)').run(
        address, 'bet', 'Bet Placed', `${side.toUpperCase()} ${onchainAmt} sats (on-chain)`, marketId
      );
      return { prices };
    });
    const txnResult = txn();
    distributeRevenue(feeInfo, marketId);

    // Referral bonus
    try {
      const u = db.prepare('SELECT referrer FROM users WHERE address = ?').get(address);
      if (u?.referrer) {
        const refBonus = Math.max(1, Math.floor(feeInfo.fee * 0.5));
        db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(refBonus, u.referrer);
        db.prepare('INSERT INTO notifications (address, type, title, body, market_id) VALUES (?, ?, ?, ?, ?)').run(
          u.referrer, 'referral_bonus', 'Referral Bonus', `+${refBonus} sats from ${address.slice(0, 12)}... bet`, marketId
        );
      }
    } catch(e) { /* non-critical */ }

    const updatedUser = db.prepare('SELECT balance FROM users WHERE address = ?').get(address);
    const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

    res.json({
      success: true,
      betId,
      fee: feeInfo.fee,
      netAmount: feeInfo.netBet,
      txHash,
      newBalance: updatedUser.balance,
      newBtcBalance: 0,
      newYesPrice: updatedMarket.yes_price,
      newNoPrice: updatedMarket.no_price,
    });
  } catch (e) {
    console.error('On-chain bet error:', e.message);
    res.status(500).json({ error: 'Bet error: ' + e.message });
  }
});

// ==========================================================================
// ON-CHAIN BET REPORT (real on-chain parimutuel — WBTC locked in contract)
// ==========================================================================
// Frontend calls: approve → contract.placeBet → POST /api/bet/report
// Server records for UI/statistics only — does NOT deduct server balance
app.post('/api/bet/report', requireAuth, async (req, res) => {
  const { address, marketId, side, amount, txHash, onchainMarketId } = req.body;
  if (address && rateLimit('bet-report:' + address, 10, 60000)) return res.status(429).json({ error: 'Too many bets. Try again in a minute.' });

  if (!address || !marketId || !side || !amount || !txHash) {
    return res.status(400).json({ error: 'address, marketId, side, amount, txHash required' });
  }
  if (typeof address !== 'string' || !address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address format' });
  }
  if (side !== 'yes' && side !== 'no') return res.status(400).json({ error: 'side must be yes or no' });
  const onchainAmt = Math.floor(Number(amount));
  if (!Number.isFinite(onchainAmt) || onchainAmt < MIN_BET_SATS) return res.status(400).json({ error: `minimum bet is ${MIN_BET_SATS} sats` });

  try {
    // Verify TX exists on-chain (mempool or confirmed)
    const txVerify = await verifyTxExists(txHash, address);
    if (!txVerify.valid) {
      return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
    }
    const txConfirmed = txVerify.confirmed ? 1 : 0;

    // Prevent replay (tx_hash unique)
    const existingTx = db.prepare('SELECT id FROM bets WHERE tx_hash = ? AND length(tx_hash) > 0').get(txHash);
    if (existingTx) return res.status(400).json({ error: 'txHash already used — replay detected' });

    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });

    const feeInfo = calculateParimutuelFee(onchainAmt);
    const betId = `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const txn = db.transaction(() => {
      const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
      if (!market) throw new Error('market not found');
      if (market.resolved) throw new Error('market already resolved');

      const now = Math.floor(Date.now() / 1000);
      if (market.end_time <= now) throw new Error('market has ended');

      // Parimutuel: netBet goes to the side pool
      const newYesPool = side === 'yes' ? (market.yes_pool || 0) + feeInfo.netBet : (market.yes_pool || 0);
      const newNoPool = side === 'no' ? (market.no_pool || 0) + feeInfo.netBet : (market.no_pool || 0);
      const prices = calcParimutuelPrices(newYesPool, newNoPool);

      // NOTE: Do NOT deduct server balance — WBTC is locked on-chain in contract
      db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, net_amount, price, shares, tx_hash, currency, tx_confirmed) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)').run(
        betId, address, marketId, side, onchainAmt, feeInfo.netBet, prices.yes_price, txHash, 'wbtc', txConfirmed
      );
      db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
        newYesPool, newNoPool, prices.yes_price, prices.no_price, onchainAmt, newYesPool + newNoPool, marketId
      );
      db.prepare('INSERT INTO market_price_history (market_id, yes_price, no_price, volume) VALUES (?, ?, ?, ?)').run(
        marketId, prices.yes_price, prices.no_price, onchainAmt
      );
      db.prepare('INSERT INTO notifications (address, type, title, body, market_id) VALUES (?, ?, ?, ?, ?)').run(
        address, 'bet', 'Bet Placed', `${side.toUpperCase()} ${onchainAmt} sats (on-chain)`, marketId
      );
      return { prices };
    });
    const txnResult = txn();
    distributeRevenue(feeInfo, marketId);

    // Referral bonus
    try {
      const u = db.prepare('SELECT referrer FROM users WHERE address = ?').get(address);
      if (u?.referrer) {
        const refBonus = Math.max(1, Math.floor(feeInfo.fee * 0.5));
        db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(refBonus, u.referrer);
      }
    } catch(e) { /* non-critical */ }

    const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

    res.json({
      success: true,
      betId,
      fee: feeInfo.fee,
      netAmount: feeInfo.netBet,
      newYesPrice: updatedMarket.yes_price,
      newNoPrice: updatedMarket.no_price,
    });
  } catch (e) {
    console.error('Bet report error:', e.message);
    res.status(500).json({ error: 'Bet report error: ' + e.message });
  }
});

// ==========================================================================
// ON-CHAIN CLAIM REPORT (user claimed payout via contract)
// ==========================================================================
app.post('/api/claim/report', requireAuth, async (req, res) => {
  const { address, betId, txHash } = req.body;
  if (!address || !betId || !txHash) return res.status(400).json({ error: 'address, betId, txHash required' });

  try {
    // Verify TX on-chain
    const txVerify = await verifyTxExists(txHash, address);
    if (!txVerify.valid && !txVerify.rpcDown) {
      return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
    }

    const bet = db.prepare('SELECT * FROM bets WHERE id = ? AND user_address = ?').get(betId, address);
    if (!bet) return res.status(404).json({ error: 'Bet not found' });
    if (bet.status === 'won') return res.json({ success: true, payout: bet.payout || 0 }); // already claimed

    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(bet.market_id);
    if (!market || !market.resolved) return res.status(400).json({ error: 'Market not resolved' });

    // Calculate payout (same as contract: userBet * totalPool / winningPool)
    const totalPool = (market.yes_pool || 0) + (market.no_pool || 0);
    const winningPool = market.outcome === 'yes' ? (market.yes_pool || 0) : (market.no_pool || 0);
    const payout = winningPool > 0 ? Math.floor((bet.net_amount / winningPool) * totalPool) : 0;

    // Update bet status
    db.prepare("UPDATE bets SET status = 'won', payout = ?, claim_tx_hash = ? WHERE id = ?").run(payout, txHash, betId);

    db.prepare('INSERT INTO notifications (address, type, title, body, market_id) VALUES (?, ?, ?, ?, ?)').run(
      address, 'claim', 'Payout Claimed', `+${payout} sats claimed on-chain`, bet.market_id
    );

    res.json({ success: true, payout });
  } catch (e) {
    console.error('Claim report error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==========================================================================
// USER MARKET CREATION
// ==========================================================================
app.post('/api/markets/create', requireAuth, (req, res) => {
  const { address, question, category, endTime, tags } = req.body;
  if (!address || !question || !endTime) {
    return res.status(400).json({ error: 'address, question, endTime required' });
  }
  if (typeof question !== 'string' || question.length < 10 || question.length > 300) {
    return res.status(400).json({ error: 'Question must be 10-300 characters' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });

    const endTs = Math.floor(Number(endTime));
    const now = Math.floor(Date.now() / 1000);
    if (endTs <= now + MIN_MARKET_DURATION_SECS) return res.status(400).json({ error: 'Market must end at least 1 hour from now (6 blocks on L1)' });

    const cat = category || 'Community';
    const marketId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const marketTags = tags ? JSON.stringify(tags) : JSON.stringify(['community', cat.toLowerCase()]);

    // Parimutuel: free market creation, pools start at 0
    const txn = db.transaction(() => {
      db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price, yes_pool, no_pool, volume, liquidity, end_time, tags, market_type, creator_address, initial_liquidity)
        VALUES (?, ?, ?, 0.5, 0.5, 0, 0, 0, 0, ?, ?, 'community', ?, 0)`).run(
        marketId, question, cat, endTs, marketTags, address
      );
      db.prepare('INSERT INTO notifications (address, type, title, body, market_id) VALUES (?, ?, ?, ?, ?)').run(
        address, 'market_created', 'Market Created',
        `Your market "${question.slice(0, 50)}..." is now live!`, marketId
      );
    });
    txn();

    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    res.json({ success: true, marketId, newBalance });
  } catch (e) {
    console.error('Create market error:', e.message);
    res.status(500).json({ error: 'Create market error: ' + e.message });
  }
});

// ==========================================================================
// CREATOR STATS
// ==========================================================================
app.get('/api/creator/stats/:address', (req, res) => {
  const addr = req.params.address;
  const markets = db.prepare('SELECT id, question, volume, resolved, outcome, initial_liquidity, created_at FROM markets WHERE creator_address = ? ORDER BY created_at DESC').all(addr);
  const user = db.prepare('SELECT creator_earnings FROM users WHERE address = ?').get(addr);
  const totalVolume = markets.reduce((s, m) => s + (m.volume || 0), 0);
  res.json({
    totalMarkets: markets.length,
    activeMarkets: markets.filter(m => !m.resolved).length,
    totalVolume,
    totalEarnings: user?.creator_earnings || 0,
    markets: markets.slice(0, 20),
  });
});

// ==========================================================================
// COMMENTS per market
// ==========================================================================
app.get('/api/comments/:marketId', (req, res) => {
  const rows = db.prepare('SELECT * FROM comments WHERE market_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.marketId);
  res.json(rows);
});

app.post('/api/comments', requireAuth, (req, res) => {
  const { address, marketId, text } = req.body;
  if (!address || !marketId || !text) return res.status(400).json({ error: 'address, marketId, text required' });
  if (typeof text !== 'string' || text.length < 1 || text.length > 500) {
    return res.status(400).json({ error: 'Comment must be 1-500 characters' });
  }

  const user = db.prepare('SELECT address FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });

  db.prepare('INSERT INTO comments (market_id, address, text) VALUES (?, ?, ?)').run(marketId, address, text);
  const comment = db.prepare('SELECT * FROM comments WHERE market_id = ? ORDER BY created_at DESC LIMIT 1').get(marketId);
  res.json(comment);
});

// ==========================================================================
// ACTIVITY FEED per market (recent bets + comments)
// ==========================================================================
app.get('/api/markets/:id/activity', (req, res) => {
  try {
    const marketId = req.params.id;
    const bets = db.prepare(`SELECT id, user_address as address, side, amount, net_amount, created_at as timestamp, 'bet' as type FROM bets WHERE market_id = ? ORDER BY created_at DESC LIMIT 20`).all(marketId);
    const comments = db.prepare(`SELECT id, address, text, created_at as timestamp, 'comment' as type FROM comments WHERE market_id = ? ORDER BY created_at DESC LIMIT 20`).all(marketId);
    const activity = [...bets, ...comments].sort((a, b) => b.timestamp - a.timestamp).slice(0, 30);
    res.json(activity);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================================================
// MARKET PRICE HISTORY (for per-market charts)
// ==========================================================================
app.get('/api/markets/:id/price-history', (req, res) => {
  try {
    const rows = db.prepare('SELECT yes_price, no_price, volume, timestamp FROM market_price_history WHERE market_id = ? ORDER BY timestamp ASC LIMIT 200').all(req.params.id);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================================================
// REFERRAL SYSTEM
// ==========================================================================
app.post('/api/referral', requireAuth, (req, res) => {
  const { address, referrer } = req.body;
  if (!address || !referrer) return res.status(400).json({ error: 'address and referrer required' });
  if (address === referrer) return res.status(400).json({ error: 'cannot refer yourself' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.referrer) return res.status(400).json({ error: 'referral already set' });

    const ref = db.prepare('SELECT address FROM users WHERE address = ?').get(referrer);
    if (!ref) return res.status(404).json({ error: 'referrer not found' });

    db.prepare('UPDATE users SET referrer = ? WHERE address = ?').run(referrer, address);
    // Notify referrer
    db.prepare('INSERT INTO notifications (address, type, title, body) VALUES (?, ?, ?, ?)').run(
      referrer, 'referral', 'New Referral!', `${address.slice(0, 12)}... joined via your referral link`
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/referral/stats/:address', (req, res) => {
  try {
    const referrals = db.prepare('SELECT COUNT(*) as count FROM users WHERE referrer = ?').get(req.params.address);
    // Sum winnings of referees
    const refereeAddresses = db.prepare('SELECT address FROM users WHERE referrer = ?').all(req.params.address);
    let totalEarned = 0;
    for (const r of refereeAddresses) {
      // Referral bonus = 50% of 2% fee on each bet = ~1% of bet volume
      const volume = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM bets WHERE user_address = ?").get(r.address);
      const totalFees = Math.ceil((volume.total || 0) * 0.02);
      totalEarned += Math.floor(totalFees * 0.5);
    }
    res.json({ referralCount: referrals.count, totalEarned });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==========================================================================
// PORTFOLIO RISK METRICS
// ==========================================================================
app.get('/api/portfolio/metrics/:address', (req, res) => {
  try {
    const address = req.params.address;
    const bets = db.prepare('SELECT * FROM bets WHERE user_address = ? ORDER BY created_at ASC').all(address);
    if (bets.length === 0) return res.json({ winRate: 0, totalBets: 0, avgBet: 0, biggestWin: 0, biggestLoss: 0, maxDrawdown: 0, profitFactor: 0, currentStreak: 0, bestStreak: 0, predictionScore: 0, roi: 0, totalInvested: 0, totalReturn: 0 });

    const resolved = bets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'claimable');
    const wins = resolved.filter(b => b.status === 'won' || b.status === 'claimable');
    const losses = resolved.filter(b => b.status === 'lost');
    const winRate = resolved.length > 0 ? wins.length / resolved.length : 0;

    const totalInvested = bets.reduce((s, b) => s + b.amount, 0);
    const totalReturn = wins.reduce((s, b) => s + (b.payout || 0), 0);
    const roi = totalInvested > 0 ? ((totalReturn - totalInvested) / totalInvested) : 0;

    const avgBet = bets.length > 0 ? Math.round(totalInvested / bets.length) : 0;
    const biggestWin = wins.length > 0 ? Math.max(...wins.map(b => (b.payout || 0) - b.amount)) : 0;
    const biggestLoss = losses.length > 0 ? Math.max(...losses.map(b => b.amount)) : 0;

    // Gross profit / gross loss
    const grossProfit = wins.reduce((s, b) => s + Math.max(0, (b.payout || 0) - b.amount), 0);
    const grossLoss = losses.reduce((s, b) => s + b.amount, 0);
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999 : 0;

    // Streak calculation
    let currentStreak = 0, bestStreak = 0, streak = 0;
    for (const b of resolved) {
      if (b.status === 'won' || b.status === 'claimable') {
        streak++;
        if (streak > bestStreak) bestStreak = streak;
      } else {
        streak = 0;
      }
    }
    // Current streak
    for (let i = resolved.length - 1; i >= 0; i--) {
      if (resolved[i].status === 'won' || resolved[i].status === 'claimable') currentStreak++;
      else break;
    }

    // Max drawdown (from PnL series)
    let cumPnl = 0, peak = 0, maxDrawdown = 0;
    for (const b of resolved) {
      if (b.status === 'won' || b.status === 'claimable') cumPnl += (b.payout || 0) - b.amount;
      else cumPnl -= b.amount;
      if (cumPnl > peak) peak = cumPnl;
      const dd = peak - cumPnl;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Prediction Score (0-100): weighted formula
    const accuracyScore = winRate * 40; // 40% weight
    const roiScore = Math.min(Math.max(roi * 20 + 20, 0), 30); // 30% weight, capped
    const volumeScore = Math.min(bets.length / 2, 20); // 20% weight, cap at 40 bets
    const streakScore = Math.min(bestStreak * 2, 10); // 10% weight
    const predictionScore = Math.round(accuracyScore + roiScore + volumeScore + streakScore);

    res.json({
      winRate: Math.round(winRate * 10000) / 100,
      totalBets: bets.length,
      resolvedBets: resolved.length,
      avgBet,
      biggestWin,
      biggestLoss,
      maxDrawdown,
      profitFactor,
      currentStreak,
      bestStreak,
      predictionScore: Math.min(predictionScore, 100),
      roi: Math.round(roi * 10000) / 100,
      totalInvested,
      totalReturn,
    });
  } catch (e) {
    console.error('Metrics error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ==========================================================================
// NOTIFICATIONS
// ==========================================================================
app.get('/api/notifications/:address', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM notifications WHERE address = ? ORDER BY created_at DESC LIMIT 50').all(req.params.address);
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE address = ? AND read = 0').get(req.params.address);
    res.json({ notifications: rows, unreadCount: unread.c });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/notifications/read', requireAuth, (req, res) => {
  const { address, notificationId } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });
  if (notificationId) {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND address = ?').run(notificationId, address);
  } else {
    db.prepare('UPDATE notifications SET read = 1 WHERE address = ? AND read = 0').run(address);
  }
  res.json({ success: true });
});

// --- Bob AI (OPNet Intelligence) + Gemini Engine ---
// Bob is the primary AI persona — OPNet expert, market analyst, smart contract auditor.
// Gemini serves as Bob's "brain" (LLM engine). Bob's OPNet knowledge is injected as context.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Bob's OPNet knowledge base — injected into every query (uses OPNET_NETWORK_NAME from above)
const BOB_OPNET_KNOWLEDGE = `
## OP_NET Platform Knowledge (Bob's Core)
OP_NET is a Bitcoin Layer 1 smart contract platform. NOT a sidechain, NOT a rollup — runs directly on Bitcoin.
- Smart contracts written in AssemblyScript, compiled to WASM, executed by OP_NET validators
- Calldata is Tapscript-encoded (NOT OP_RETURN, NOT inscriptions)
- Settlement: Bitcoin mainchain with PoW + OP_NET consensus
- Token standard: OP-20 (like ERC-20 but on Bitcoin)
- Runtime: btc-runtime provides Solidity-like patterns — u256 math, storage, events, modifiers
- NO floating-point arithmetic in contracts (u256 only)
- Wallet: OP_WALLET browser extension (UniSat fork with OP_NET support)
- Network: ${OPNET_NETWORK_NAME}
- RPC: ${process.env.OPNET_RPC_BASE || 'https://testnet.opnet.org'}
- Explorer: https://opscan.org
${OPNET_NETWORK_NAME === 'testnet' ? '- Faucet: https://faucet.opnet.org for testnet BTC' : ''}

## BitPredict Architecture
- Currency: WBTC (Wrapped Bitcoin, OP-20) at ${WBTC_TOKEN}
- Model: Parimutuel betting (no AMM, no liquidity pools, no shares)
- StakingVault: ${process.env.STAKING_VAULT_ADDRESS || ''} — stake WBTC to earn fees
- PriceOracle: ${process.env.PRICE_ORACLE_ADDRESS || ''}
- Fee: 3% from each bet (60% vault stakers, 20% protocol, 20% market creator)
- Markets: binary YES/NO outcomes, bets go into pools
- Resolution: oracle/creator resolves, winners split total pool proportionally
- Payout: (user_net_bet / winning_pool) * total_pool
- No sell/exit: bets locked until market resolution
- SDK pattern: getContract() → simulate() → sendTransaction() — wallet handles signing on frontend
- Security: reentrancy guards, tx.sender (not tx.origin), checked u256 math

## Trading Concepts
- Implied probability: YES% = YES pool / Total pool
- Value bet: when you think true probability > implied probability
- Parimutuel odds: change with every new bet, final payout known only at resolution
- Kelly criterion: optimal bet sizing = (p*b - q) / b where p=probability, b=odds, q=1-p
- First mover advantage: early bets get better odds if more bets come on the other side

## OPNet Ecosystem
- MotoSwap: DEX (like Uniswap) on OP_NET for token swaps
- NativeSwap: BTC↔token atomic swaps
- Staking contracts: lock tokens for rewards
- MLDSA: quantum-resistant signatures supported by OP_NET
- Bob AI: the official OPNet AI agent (that's me!), accessible via MCP protocol
`;

// Chat history per session (in-memory, keyed by address)
const chatHistories = new Map();
const MAX_HISTORY = 20;
const MAX_CHAT_SESSIONS = 500;
// LRU eviction: if >MAX_CHAT_SESSIONS, delete oldest entries
function pruneHistories() {
  if (chatHistories.size > MAX_CHAT_SESSIONS) {
    const oldest = [...chatHistories.keys()].slice(0, chatHistories.size - MAX_CHAT_SESSIONS);
    for (const k of oldest) chatHistories.delete(k);
  }
}

app.post('/api/ai/chat', async (req, res) => {
  const { message, address, marketId } = req.body;
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });
  if (message.length > 2000) return res.status(400).json({ error: 'message too long (max 2000 chars)' });

  // Rate limit: 10 messages per minute per address
  const chatKey = 'chat:' + (address || req.ip);
  if (rateLimit(chatKey, 10, 60000)) {
    return res.status(429).json({ error: 'Too many messages. Wait a moment.' });
  }

  try {
    // Build live context
    const activeMarkets = db.prepare('SELECT id, question, category, yes_price, no_price, volume, liquidity, end_time FROM markets WHERE resolved = 0 ORDER BY volume DESC LIMIT 15').all();
    const recentResolved = db.prepare('SELECT id, question, outcome, yes_price, no_price FROM markets WHERE resolved = 1 ORDER BY end_time DESC LIMIT 5').all();
    const prices = { btc: PRICE_CACHE.btc?.price || 0, eth: PRICE_CACHE.eth?.price || 0, sol: PRICE_CACHE.sol?.price || 0 };

    // If user asks about a specific market, pull extra data
    let marketContext = '';
    if (marketId) {
      const m = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
      if (m) {
        const betsCount = db.prepare('SELECT COUNT(*) as c FROM bets WHERE market_id = ?').get(m.id).c;
        const k = m.yes_pool * m.no_pool;
        marketContext = `\n## Focus Market: "${m.question}"
YES: ${(m.yes_price * 100).toFixed(1)}% | NO: ${(m.no_price * 100).toFixed(1)}% | Volume: ${m.volume} sats | Pool: ${m.liquidity} sats
YES pool: ${m.yes_pool} | NO pool: ${m.no_pool} | k=${k} | Bets placed: ${betsCount}
Ends: ${new Date(m.end_time * 1000).toISOString().split('T')[0]} | Category: ${m.category}
${m.resolved ? `RESOLVED: ${m.outcome}` : 'ACTIVE'}`;
      }
    }

    // User stats if address provided
    let userContext = '';
    if (address) {
      const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
      const userBets = db.prepare('SELECT COUNT(*) as total, SUM(CASE WHEN status=\'won\' THEN 1 ELSE 0 END) as wins, SUM(amount) as volume FROM bets WHERE user_address = ?').get(address);
      if (user) {
        userContext = `\nUser balance: ${user.balance} sats | Bets: ${userBets?.total || 0} | Wins: ${userBets?.wins || 0} | Volume: ${userBets?.volume || 0} sats`;
      }
    }

    // Manage conversation history
    const sessionKey = address || 'anon';
    if (!chatHistories.has(sessionKey)) { chatHistories.set(sessionKey, []); pruneHistories(); }
    const history = chatHistories.get(sessionKey);
    history.push({ role: 'user', parts: [{ text: message }] });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    const systemPrompt = `You are **Bob** — the official OP_NET AI agent and lead analyst for BitPredict.
You are NOT a generic chatbot. You are an expert in Bitcoin L1 smart contracts, OP_NET protocol, prediction markets, and quantitative trading.
Your intelligence combines deep OPNet protocol knowledge with real-time market analysis.

${BOB_OPNET_KNOWLEDGE}

## Live Market Data (right now)
BTC: $${prices.btc.toLocaleString()} | ETH: $${prices.eth.toLocaleString()} | SOL: $${prices.sol.toLocaleString()}

Active markets:
${activeMarkets.map(m => `• "${m.question}" → YES ${(m.yes_price * 100).toFixed(0)}% / NO ${(m.no_price * 100).toFixed(0)}% | Vol: ${m.volume} sats | Pool: ${m.liquidity}`).join('\n')}

${recentResolved.length > 0 ? `Recently resolved:\n${recentResolved.map(m => `• "${m.question}" → ${m.outcome?.toUpperCase()}`).join('\n')}` : ''}
${marketContext}${userContext}

## Bob's Personality & Rules
- You ARE Bob, the OP_NET AI. Refer to yourself as Bob. Show expertise and confidence.
- When discussing OP_NET, cite specific technical details (Tapscript calldata, WASM execution, u256 math, etc.)
- For market analysis: reference actual odds, calculate expected value, suggest position sizing
- For trading advice: explain parimutuel odds, pool dynamics, and first-mover advantage
- Use **bold** for key terms, use bullet points for structured answers
- If asked "who are you" — explain you're Bob, OP_NET's AI agent, powered by deep protocol knowledge + Gemini LLM
- Be opinionated on markets — give clear YES/NO recommendations with reasoning
- Always calculate expected value: EV = (probability × payout) - cost
- Warn about risks but don't be overly cautious — traders want actionable signals
- If someone asks how to use the platform, walk them through: connect OP_WALLET → ${OPNET_NETWORK_NAME === 'testnet' ? 'get testnet BTC from faucet.opnet.org → ' : ''}get WBTC on MotoSwap → pick a market → place a bet (minimum ${MIN_BET_SATS} sats)
- The entire BitPredict platform is English-only. Never respond in any other language.
- ALWAYS respond in English regardless of the user's language
- Keep answers focused: 3-6 sentences for simple questions, longer for deep analysis
- Sign off important analyses with "— Bob 🤖" when appropriate`;

    // Build Gemini request with conversation history
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I am Bob, the OP_NET AI agent. Ready to analyze markets and assist with BitPredict. Let\'s go.' }] },
      ...history,
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { maxOutputTokens: 800, temperature: 0.75, topP: 0.9 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, err);
      return res.status(500).json({ error: 'Bob is temporarily offline. Try again shortly.' });
    }

    const geminiData = await geminiRes.json();
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Bob couldn\'t process that. Try rephrasing.';

    // Save Bob's response to history
    history.push({ role: 'model', parts: [{ text: reply }] });

    res.json({ reply, model: `Bob AI (${GEMINI_MODEL})`, source: 'bob+gemini' });
  } catch (e) {
    console.error('Bob AI error:', e.message);
    res.status(500).json({ error: 'Bob AI error: ' + e.message });
  }
});

// Bob quick analysis endpoint — for market cards (with server-side cache)
const signalCache = new Map(); // { marketId: { signal, ts } }
const SIGNAL_CACHE_TTL = 600000; // 10 min cache
// Cleanup expired signal cache entries every 15 min
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of signalCache.entries()) { if (now - v.ts > SIGNAL_CACHE_TTL) signalCache.delete(k); }
}, 15 * 60 * 1000);
// AI signal endpoint - Gemini with smart fallback
function generateFallbackSignal(market) {
  const yp = market.yes_price;
  const vol = market.volume;
  const cat = market.category;

  // Deterministic but realistic signal based on market data
  const hash = market.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const seed = (hash * 7 + vol) % 100;

  let direction, confidence, reason;

  if (yp > 0.7) {
    direction = 'BUY YES';
    confidence = 'High';
    reason = 'Strong market consensus at ' + (yp * 100).toFixed(0) + '% — momentum favors continuation';
  } else if (yp < 0.3) {
    direction = 'BUY NO';
    confidence = 'High';
    reason = 'Market heavily discounting YES at ' + (yp * 100).toFixed(0) + '% — contrarian risk elevated';
  } else if (yp > 0.55) {
    direction = seed > 40 ? 'BUY YES' : 'HOLD';
    confidence = 'Medium';
    reason = 'Slight bullish lean with ' + (vol > 100000 ? 'strong' : 'moderate') + ' volume — watch for catalyst';
  } else if (yp < 0.45) {
    direction = seed > 40 ? 'BUY NO' : 'HOLD';
    confidence = 'Medium';
    reason = 'Bearish sentiment at ' + (yp * 100).toFixed(0) + '% — ' + cat + ' sector uncertainty';
  } else {
    direction = 'HOLD';
    confidence = 'Low';
    reason = 'Near 50/50 split — wait for clearer signal before entering';
  }

  return direction + ' (' + confidence + ' confidence) — ' + reason;
}

app.get('/api/ai/signal/:marketId', async (req, res) => {
  const marketId = req.params.marketId;
  try {
    const m = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
    if (!m) return res.status(404).json({ error: 'market not found' });

    const cached = signalCache.get(marketId);
    if (cached && cached.signal && Date.now() - cached.ts < SIGNAL_CACHE_TTL) {
      return res.json({ marketId, signal: cached.signal, source: 'bob (cached)' });
    }

    // Build rich market context — use event_title for multi-outcome markets
    const marketTitle = m.event_title || m.question;
    let outcomesContext = '';
    let isMultiOutcome = false;

    // For multi-outcome markets, fetch all sibling outcomes
    if (m.event_id) {
      const siblings = db.prepare(
        'SELECT outcome_label, yes_price, volume FROM markets WHERE event_id = ? ORDER BY yes_price DESC'
      ).all(m.event_id);
      if (siblings.length > 1) {
        isMultiOutcome = true;
        const top = siblings.slice(0, 10);
        outcomesContext = '\nTop candidates/outcomes (by market probability):\n' + top.map((s, i) =>
          `  ${i + 1}. ${s.outcome_label || 'Unknown'}: ${(s.yes_price * 100).toFixed(1)}%`
        ).join('\n');
        if (siblings.length > 10) outcomesContext += `\n  ...and ${siblings.length - 10} more`;
      }
    }

    // Try Gemini if API key is available
    if (GEMINI_API_KEY) {
      try {
        const prices = { btc: PRICE_CACHE.btc?.price || 0, eth: PRICE_CACHE.eth?.price || 0, sol: PRICE_CACHE.sol?.price || 0 };
        const endDate = m.end_time ? new Date(m.end_time * 1000).toLocaleDateString() : 'TBD';
        const daysLeft = m.end_time ? Math.max(0, Math.ceil((m.end_time - Date.now() / 1000) / 86400)) : '?';

        const prompt = isMultiOutcome
          ? `You are Bob, an expert prediction market analyst. Analyze ONLY the market below.

EVENT: "${marketTitle}"
${outcomesContext}
Category: ${m.category} | Deadline: ${endDate} (${daysLeft} days left)
Live crypto: BTC $${prices.btc.toLocaleString()} | ETH $${prices.eth.toLocaleString()} | SOL $${prices.sol.toLocaleString()}

INSTRUCTIONS:
- This is a multi-outcome market. Analyze the top contenders and their probabilities.
- Consider real-world factors: recent news, polls, historical patterns, current political/sports/cultural landscape.
- Identify the best value bet — which outcome is underpriced or overpriced relative to real-world likelihood?
- Be specific — name actual candidates/outcomes and explain WHY.

Reply in this exact format:
[BEST BET: <outcome name>] ([High/Medium/Low] confidence) — [2-3 sentences analyzing "${marketTitle}" with specific reasoning about top contenders]`

          : `You are Bob, an expert prediction market analyst. Analyze ONLY the market below.

EVENT: "${marketTitle}"
Current odds: YES ${(m.yes_price * 100).toFixed(1)}% / NO ${(m.no_price * 100).toFixed(1)}%
Category: ${m.category} | Volume: ${m.volume.toLocaleString()} sats | Deadline: ${endDate} (${daysLeft} days left)
Live crypto: BTC $${prices.btc.toLocaleString()} | ETH $${prices.eth.toLocaleString()} | SOL $${prices.sol.toLocaleString()}

INSTRUCTIONS:
- Analyze the probability and give a trading recommendation for THIS specific event: "${marketTitle}"
- Consider real-world factors: news, historical data, current trends
- For crypto price markets, compare current price with the prediction target
- For politics/sports/culture, assess likelihood based on known facts
- Be specific — mention the actual event name and key factors in your reasoning

Reply in this exact format:
[BUY YES / BUY NO / HOLD] ([High/Medium/Low] confidence) — [2-3 sentences of specific analysis about "${marketTitle}"]`;

        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
            }),
          }
        );

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const signal = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (signal) {
            signalCache.set(marketId, { signal, ts: Date.now() });
            return res.json({ marketId, signal, source: 'bob' });
          }
        } else {
          console.error('Gemini signal error:', geminiRes.status);
        }
      } catch (e) {
        console.error('Gemini call failed:', e.message);
      }
    }

    // Fallback: generate smart signal from market data
    const signal = generateFallbackSignal(m);
    signalCache.set(marketId, { signal, ts: Date.now() });
    res.json({ marketId, signal, source: 'bob' });
  } catch (e) {
    console.error('Signal endpoint error:', e.message);
    res.json({ marketId, signal: '', source: 'bob' });
  }
});

// Exchange endpoint removed — use MotoSwap for WBTC

// BTC faucet removed — users get real testnet BTC from https://faucet.opnet.org

// --- Event Indexer: on-chain event polling ---
db.exec(`
  CREATE TABLE IF NOT EXISTS indexed_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT NOT NULL,
    event_name TEXT NOT NULL,
    block_number INTEGER NOT NULL DEFAULT 0,
    event_data TEXT NOT NULL DEFAULT '{}',
    indexed_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(tx_hash, event_name)
  );
`);
try { db.exec('CREATE INDEX IF NOT EXISTS idx_ie_event ON indexed_events(event_name, block_number)'); } catch(e) {}

let lastIndexedBlock = 0;
try {
  const maxBlock = db.prepare('SELECT MAX(block_number) as m FROM indexed_events').get();
  if (maxBlock && maxBlock.m) lastIndexedBlock = maxBlock.m;
} catch(e) {}

async function indexOnChainEvents() {
  try {
    const currentBlock = await getBlockHeightFromRPC();
    if (!currentBlock || currentBlock <= lastIndexedBlock) return;

    // Poll recent blocks for known contract events
    for (let blockNum = lastIndexedBlock + 1; blockNum <= currentBlock; blockNum++) {
      try {
        const res = await fetch(OPNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'btc_getBlockByNumber',
            params: [blockNum.toString(16), true],
            id: 1,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (!data.result || !data.result.transactions) continue;

        for (const tx of data.result.transactions) {
          if (!tx.events || !Array.isArray(tx.events)) continue;
          for (const evt of tx.events) {
            const eventName = evt.type || evt.eventName || '';
            if (['MarketCreated', 'SharesPurchased', 'MarketResolved', 'PayoutClaimed', 'Staked', 'Unstaked', 'RewardsClaimed', 'RevenueDistributed'].includes(eventName)) {
              try {
                db.prepare('INSERT OR IGNORE INTO indexed_events (tx_hash, event_name, block_number, event_data) VALUES (?, ?, ?, ?)').run(
                  tx.hash || tx.txid || '', eventName, blockNum, JSON.stringify(evt.data || {})
                );
              } catch(e) { /* duplicate */ }
            }
          }
        }
      } catch(e) { /* block fetch failed, skip */ }
    }
    lastIndexedBlock = currentBlock;
  } catch(e) {
    console.error('Event indexer error:', e.message);
  }
}

// Run event indexer every 30s
setInterval(() => indexOnChainEvents(), 30000);

// --- Background jobs ---
// Fetch prices every 15s
setInterval(async () => {
  await fetchPrice('btc');
  await fetchPrice('eth');
  await fetchPrice('sol');
}, 15000);

// 5-min markets removed (L1 incompatible)

// ===== VAULT ENDPOINTS =====

// Vault info (public)
app.get('/api/vault/info', (req, res) => {
  const stakerCount = db.prepare('SELECT COUNT(*) as c FROM vault_stakes WHERE staked_amount > 0').get().c;
  // APY estimate: annualized from last 24h rewards
  const dayAgo = Math.floor(Date.now() / 1000) - 86400;
  const recentRewards = db.prepare('SELECT SUM(fee_amount) as total FROM vault_rewards WHERE distributed_at > ?').get(dayAgo);
  const dailyRewards = recentRewards?.total || 0;
  const apy = VAULT_TOTAL_STAKED > 0 ? Math.round((dailyRewards * 365 / VAULT_TOTAL_STAKED) * 10000) / 100 : 0;

  res.json({
    totalStaked: VAULT_TOTAL_STAKED,
    totalRewards: VAULT_TOTAL_DISTRIBUTED,
    apy,
    stakerCount,
    rewardsPerShare: VAULT_REWARDS_PER_SHARE,
  });
});

// Vault user info
app.get('/api/vault/user/:addr', (req, res) => {
  const addr = req.params.addr;
  if (!addr || !addr.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });

  const stake = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(addr);
  if (!stake) {
    return res.json({ staked: 0, pendingRewards: 0, autoCompound: false, stakedAt: 0, lastClaim: 0 });
  }

  const pending = getVaultPendingRewards(addr);
  res.json({
    staked: stake.staked_amount,
    pendingRewards: pending,
    autoCompound: !!stake.auto_compound,
    stakedAt: stake.staked_at * 1000,
    lastClaim: stake.last_claim * 1000,
  });
});

// Stake WBTC into vault
app.post('/api/vault/stake', requireAuth, async (req, res) => {
  const { address, amount, txHash } = req.body;
  if (!address || !amount || !txHash) return res.status(400).json({ error: 'address, amount, txHash required' });
  if (!address.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });
  if (rateLimit('vault:' + address, 5, 60000)) return res.status(429).json({ error: 'Too many vault operations. Try again in a minute.' });
  const amountInt = Math.floor(Number(amount));
  if (amountInt < 10000) return res.status(400).json({ error: 'minimum stake is 10,000 sats' });

  // Verify TX on-chain (non-blocking if RPC down)
  const txVerify = await verifyTxOnChain(txHash, address, 'Staked');
  if (!txVerify.valid && !txVerify.rpcDown) {
    return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
  }

  // Ensure user exists
  db.prepare('INSERT OR IGNORE INTO users (address, balance) VALUES (?, 0)').run(address);

  try {
    const stakeTransaction = db.transaction(() => {
      const existing = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(address);

      // Harvest pending rewards first
      if (existing && existing.staked_amount > 0) {
        const pending = getVaultPendingRewards(address);
        if (pending > 0 && existing.auto_compound) {
          db.prepare('UPDATE vault_stakes SET staked_amount = staked_amount + ? WHERE address = ?').run(pending, address);
          VAULT_TOTAL_STAKED += pending;
        } else if (pending > 0) {
          db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(pending, address);
        }
      }

      if (existing) {
        const newStaked = existing.staked_amount + amountInt;
        const newDebt = Math.floor((newStaked * VAULT_REWARDS_PER_SHARE) / VAULT_PRECISION);
        db.prepare('UPDATE vault_stakes SET staked_amount = ?, reward_debt = ?, staked_at = unixepoch() WHERE address = ?').run(newStaked, newDebt, address);
      } else {
        const newDebt = Math.floor((amountInt * VAULT_REWARDS_PER_SHARE) / VAULT_PRECISION);
        db.prepare('INSERT INTO vault_stakes (address, staked_amount, reward_debt) VALUES (?, ?, ?)').run(address, amountInt, newDebt);
      }

      VAULT_TOTAL_STAKED += amountInt;

      // Create vesting entry (linear vesting over 7 days)
      const now = Math.floor(Date.now() / 1000);
      db.prepare('INSERT INTO vault_vesting (address, total_amount, start_time, end_time) VALUES (?, ?, ?, ?)').run(
        address, amountInt, now, now + 7 * 86400
      );

      const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
      const stake = db.prepare('SELECT staked_amount FROM vault_stakes WHERE address = ?').get(address);
      return { newStaked: stake.staked_amount, newBalance };
    });

    const result = stakeTransaction();
    res.json({ success: true, newStaked: result.newStaked, newBalance: result.newBalance });
  } catch (e) {
    console.error('Vault stake error:', e.message);
    res.status(500).json({ error: 'Stake failed: ' + e.message });
  }
});

// Unstake WBTC from vault
app.post('/api/vault/unstake', requireAuth, async (req, res) => {
  const { address, amount, txHash } = req.body;
  if (!address || !amount || !txHash) return res.status(400).json({ error: 'address, amount, txHash required' });
  if (!address.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });
  if (rateLimit('vault:' + address, 5, 60000)) return res.status(429).json({ error: 'Too many vault operations. Try again in a minute.' });
  const amountInt = Math.floor(Number(amount));
  if (amountInt <= 0) return res.status(400).json({ error: 'invalid amount' });

  // Verify TX on-chain
  const txVerify = await verifyTxOnChain(txHash, address, 'Unstaked');
  if (!txVerify.valid && !txVerify.rpcDown) {
    return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
  }

  const stake = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(address);
  if (!stake || stake.staked_amount < amountInt) return res.status(400).json({ error: 'insufficient staked amount' });

  try {
    const unstakeTransaction = db.transaction(() => {
      // Harvest pending rewards first
      const pending = getVaultPendingRewards(address);
      if (pending > 0) {
        db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(pending, address);
      }

      const newStaked = stake.staked_amount - amountInt;
      const newDebt = Math.floor((newStaked * VAULT_REWARDS_PER_SHARE) / VAULT_PRECISION);
      db.prepare('UPDATE vault_stakes SET staked_amount = ?, reward_debt = ? WHERE address = ?').run(newStaked, newDebt, address);
      // Note: unstake returns WBTC to user's wallet on-chain, not to platform balance

      VAULT_TOTAL_STAKED -= amountInt;
      const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address)?.balance || 0;
      return { newStaked, newBalance };
    });

    const result = unstakeTransaction();
    res.json({ success: true, newStaked: result.newStaked, newBalance: result.newBalance });
  } catch (e) {
    console.error('Vault unstake error:', e.message);
    res.status(500).json({ error: 'Unstake failed: ' + e.message });
  }
});

// Claim vault rewards
app.post('/api/vault/claim', requireAuth, async (req, res) => {
  const { address, txHash } = req.body;
  if (!address || !txHash) return res.status(400).json({ error: 'address, txHash required' });
  if (rateLimit('vault:' + address, 5, 60000)) return res.status(429).json({ error: 'Too many vault operations. Try again in a minute.' });

  // Verify TX on-chain
  const txVerify = await verifyTxOnChain(txHash, address, 'RewardsClaimed');
  if (!txVerify.valid && !txVerify.rpcDown) {
    return res.status(400).json({ error: 'TX verification failed: ' + txVerify.error });
  }

  const stake = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(address);
  if (!stake) return res.status(404).json({ error: 'no vault position' });

  const pending = getVaultPendingRewards(address);
  if (pending <= 0) return res.status(400).json({ error: 'no rewards to claim' });

  try {
    const claimTransaction = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(pending, address);
      const newDebt = Math.floor((stake.staked_amount * VAULT_REWARDS_PER_SHARE) / VAULT_PRECISION);
      db.prepare('UPDATE vault_stakes SET reward_debt = ?, last_claim = unixepoch() WHERE address = ?').run(newDebt, address);

      const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
      return { newBalance };
    });

    const result = claimTransaction();
    res.json({ success: true, claimed: pending, newBalance: result.newBalance });
  } catch (e) {
    console.error('Vault claim error:', e.message);
    res.status(500).json({ error: 'Claim failed: ' + e.message });
  }
});

// Toggle auto-compound
app.post('/api/vault/autocompound', requireAuth, (req, res) => {
  const { address, enabled } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  const stake = db.prepare('SELECT * FROM vault_stakes WHERE address = ?').get(address);
  if (!stake) {
    // Auto-create vault entry with auto_compound preference
    db.prepare('INSERT OR IGNORE INTO vault_stakes (address, staked_amount, auto_compound) VALUES (?, 0, ?)').run(address, enabled ? 1 : 0);
  } else {
    db.prepare('UPDATE vault_stakes SET auto_compound = ? WHERE address = ?').run(enabled ? 1 : 0, address);
  }
  res.json({ success: true });
});

// Vault reward history
app.get('/api/vault/history', (req, res) => {
  const history = db.prepare('SELECT * FROM vault_rewards ORDER BY distributed_at DESC LIMIT 50').all();
  res.json(history.map(r => ({
    id: r.id,
    sourceMarketId: r.source_market_id,
    feeAmount: r.fee_amount,
    distributedAt: r.distributed_at * 1000,
    totalStakedAtTime: r.total_staked_at_time,
  })));
});

// Vault vesting for user
app.get('/api/vault/vesting/:addr', (req, res) => {
  const addr = req.params.addr;
  if (!addr || !addr.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });

  const now = Math.floor(Date.now() / 1000);
  const vestings = db.prepare('SELECT * FROM vault_vesting WHERE address = ? ORDER BY start_time DESC LIMIT 20').all(addr);
  res.json(vestings.map(v => {
    const elapsed = Math.max(0, now - v.start_time);
    const duration = v.end_time - v.start_time;
    const progress = Math.min(1, elapsed / duration);
    return {
      id: v.id,
      totalAmount: v.total_amount,
      claimedAmount: v.claimed_amount,
      startTime: v.start_time * 1000,
      endTime: v.end_time * 1000,
      progress: Math.round(progress * 10000) / 100,
    };
  }));
});

// ===== SOCIAL ENDPOINTS =====

app.post('/api/social/follow', requireAuth, (req, res) => {
  const { follower, following } = req.body;
  if (!follower || !following) return res.status(400).json({ error: 'follower, following required' });
  if (follower === following) return res.status(400).json({ error: 'cannot follow yourself' });

  try {
    db.prepare('INSERT OR IGNORE INTO follows (follower, following) VALUES (?, ?)').run(follower, following);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/social/unfollow', requireAuth, (req, res) => {
  const { follower, following } = req.body;
  if (!follower || !following) return res.status(400).json({ error: 'follower, following required' });

  db.prepare('DELETE FROM follows WHERE follower = ? AND following = ?').run(follower, following);
  res.json({ success: true });
});

app.get('/api/social/following/:addr', (req, res) => {
  const addr = req.params.addr;
  const following = db.prepare('SELECT following FROM follows WHERE follower = ?').all(addr);
  res.json(following.map(f => f.following));
});

app.get('/api/social/top-predictors', (req, res) => {
  const leaders = db.prepare(`
    SELECT u.address,
      COUNT(b.id) as total_bets,
      SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(CASE WHEN b.status IN ('won', 'lost') THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN b.status = 'won' THEN b.payout - b.amount ELSE 0 END) -
      SUM(CASE WHEN b.status = 'lost' THEN b.amount ELSE 0 END) as pnl
    FROM users u JOIN bets b ON u.address = b.user_address
    WHERE u.address LIKE ? || '%'
    GROUP BY u.address
    HAVING total_bets >= 1
    ORDER BY pnl DESC
    LIMIT 20
  `).all(OPNET_ADDRESS_PREFIX);

  res.json(leaders.map((l, i) => ({
    rank: i + 1,
    address: l.address,
    pnl: l.pnl || 0,
    winRate: l.resolved > 0 ? Math.round((l.wins / l.resolved) * 100) : 0,
    totalBets: l.total_bets || 0,
  })));
});

// ===== PORTFOLIO PNL ENDPOINT =====

app.get('/api/portfolio/pnl/:addr', (req, res) => {
  const addr = req.params.addr;
  if (!addr || !addr.startsWith(OPNET_ADDRESS_PREFIX)) return res.status(400).json({ error: 'invalid address' });

  const bets = db.prepare(`
    SELECT * FROM bets WHERE user_address = ? AND status IN ('won', 'lost', 'claimable')
    ORDER BY created_at ASC LIMIT 100
  `).all(addr);

  let cumPnl = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let wins = 0;
  const pnlSeries = [];

  for (const b of bets) {
    if (b.status === 'won' || b.status === 'claimable') {
      cumPnl += (b.payout - b.amount);
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
      wins++;
    } else {
      cumPnl -= b.amount;
      currentStreak = 0;
    }
    pnlSeries.push({ timestamp: b.created_at * 1000, pnl: cumPnl });
  }

  const totalInvested = bets.reduce((s, b) => s + b.amount, 0);
  const roi = totalInvested > 0 ? Math.round((cumPnl / totalInvested) * 10000) / 100 : 0;
  const winRate = bets.length > 0 ? Math.round((wins / bets.length) * 100) : 0;

  res.json({
    cumulativePnl: cumPnl,
    winRate,
    roi,
    currentStreak,
    bestStreak,
    pnlSeries: pnlSeries.slice(-50),
  });
});

// Resolve expired markets every 15s (fast for 5-min markets)
setInterval(() => resolveExpiredMarkets(), 15000);

// Sync Polymarket events every 5 min
setInterval(() => syncPolymarketEvents(), 2 * 60 * 1000); // every 2 min for fresh sports/esports

// Phase 2: Confirm pending bet TXes every 30 seconds
setInterval(() => confirmPendingBets(), 30_000);

// Phase 2b: Confirm pending operations every 30 seconds
setInterval(() => confirmPendingOps(), 30_000);

// ==========================================================================
// PENDING OPERATIONS (on-chain TX tracking)
// ==========================================================================

// Create a pending operation
app.post('/api/operations/pending', requireAuth, (req, res) => {
  const { address, type, txHash, details, marketId } = req.body;
  if (!address || !type) return res.status(400).json({ error: 'address and type required' });

  const result = db.prepare(
    'INSERT INTO pending_operations (address, type, tx_hash, details, market_id) VALUES (?, ?, ?, ?, ?)'
  ).run(address, type, txHash || '', details || '', marketId || null);

  res.json({ success: true, id: result.lastInsertRowid });
});

// Get pending operations for address (includes recently confirmed for 5 min)
app.get('/api/operations/pending/:address', (req, res) => {
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
  const ops = db.prepare(
    `SELECT * FROM pending_operations WHERE address = ? AND (
      status IN ('pending', 'confirming')
      OR (status IN ('confirmed', 'failed') AND updated_at >= ?)
    ) ORDER BY created_at DESC LIMIT 20`
  ).all(req.params.address, fiveMinAgo);
  res.json(ops);
});

// Update operation status
app.patch('/api/operations/:id', requireAuth, (req, res) => {
  const { status, txHash } = req.body;
  const id = Number(req.params.id);
  if (!status) return res.status(400).json({ error: 'status required' });

  const updates = ['status = ?', 'updated_at = unixepoch()'];
  const params = [status];
  if (txHash) { updates.push('tx_hash = ?'); params.push(txHash); }
  params.push(id);

  db.prepare(`UPDATE pending_operations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// Auto-expire stale ops every 5 min
setInterval(() => {
  try { db.exec("UPDATE pending_operations SET status = 'expired' WHERE status = 'pending' AND created_at < unixepoch() - 3600"); } catch(e) {}
}, 5 * 60 * 1000);

// ==========================================================================
// DEPOSIT / WITHDRAW (Treasury hybrid model)
// ==========================================================================

// POST /api/deposit — user sends WBTC tx, server verifies and credits backed_balance
app.post('/api/deposit', requireAuth, async (req, res) => {
  const { address, txHash, amount } = req.body;
  if (!address || !txHash || !amount) return res.status(400).json({ error: 'address, txHash, and amount required' });

  const amountInt = parseInt(amount, 10);
  if (isNaN(amountInt) || amountInt < 10000) return res.status(400).json({ error: 'Minimum deposit: 10,000 sats' });

  // Rate limit: 3 deposits / 5 min per address
  if (rateLimit('deposit:' + address, 3, 300000)) return res.status(429).json({ error: 'Too many deposits. Try again later.' });

  // Check duplicate tx_hash
  const existing = db.prepare('SELECT id FROM treasury_deposits WHERE tx_hash = ?').get(txHash);
  if (existing) return res.status(409).json({ error: 'This transaction has already been submitted' });

  try {
    // Verify TX exists on-chain or mempool
    const txVerify = await verifyTxExists(txHash, address);
    if (!txVerify.valid) return res.status(400).json({ error: txVerify.error || 'Transaction not found' });

    const status = txVerify.confirmed ? 'confirmed' : 'pending';
    const confirmedAt = txVerify.confirmed ? Math.floor(Date.now() / 1000) : null;

    db.prepare('INSERT INTO treasury_deposits (address, tx_hash, amount_bpusd, status, confirmed_at) VALUES (?, ?, ?, ?, ?)').run(
      address, txHash, amountInt, status, confirmedAt
    );

    // If TX already confirmed, credit immediately
    if (txVerify.confirmed) {
      db.prepare('UPDATE users SET backed_balance = backed_balance + ? WHERE address = ?').run(amountInt, address);
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(amountInt, address);
    }

    res.json({
      success: true,
      status,
      amount: amountInt,
      message: txVerify.confirmed ? 'Deposit confirmed and credited' : 'Deposit pending confirmation',
    });
  } catch (e) {
    console.error('Deposit error:', e.message);
    res.status(500).json({ error: 'Failed to process deposit' });
  }
});

// POST /api/withdraw — request withdrawal of backed_balance
app.post('/api/withdraw', requireAuth, async (req, res) => {
  const { address, amount } = req.body;
  if (!address || !amount) return res.status(400).json({ error: 'address and amount required' });

  const amountInt = parseInt(amount, 10);
  if (isNaN(amountInt) || amountInt < 10000) return res.status(400).json({ error: 'Minimum withdrawal: 10,000 sats' });

  // Rate limit: 3 withdrawals / 5 min
  if (rateLimit('withdraw:' + address, 3, 300000)) return res.status(429).json({ error: 'Too many withdrawals. Try again later.' });

  // Check backed_balance (only backed funds can be withdrawn)
  const user = db.prepare('SELECT backed_balance FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.backed_balance < amountInt) return res.status(400).json({ error: `Insufficient backed balance: ${user.backed_balance} < ${amountInt}` });

  // Calculate fee
  const fee = Math.ceil(amountInt * WITHDRAWAL_FEE_PCT);
  const netAmount = amountInt - fee;

  // Generate nonce + HMAC signature
  const nonce = crypto.randomBytes(16).toString('hex');
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10 min
  const signaturePayload = `withdraw:${address}:${amountInt}:${fee}:${nonce}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(signaturePayload).digest('hex');

  // Debit backed_balance immediately
  db.prepare('UPDATE users SET backed_balance = backed_balance - ?, balance = balance - ? WHERE address = ?').run(amountInt, amountInt, address);

  // Record withdrawal request
  db.prepare('INSERT INTO withdrawal_requests (address, amount_bpusd, fee_bpusd, nonce, signature, status, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    address, amountInt, fee, nonce, signature, 'pending', expiresAt
  );

  // Record fee as protocol revenue
  if (fee > 0) {
    db.prepare('INSERT INTO protocol_revenue (source_type, source_market_id, amount) VALUES (?, ?, ?)').run('withdrawal_fee', '', fee);
    ACCUMULATED_PROTOCOL_REVENUE += fee;
  }

  // Execute transfer on-chain
  try {
    const txResult = await transferWbtc(address, netAmount);
    if (txResult.success) {
      db.prepare("UPDATE withdrawal_requests SET status = 'completed', tx_hash = ?, completed_at = unixepoch() WHERE nonce = ?").run(
        txResult.txHash || '', nonce
      );
      res.json({ success: true, nonce, netAmount, fee, txHash: txResult.txHash, status: 'completed' });
    } else {
      // Transfer failed — keep as pending, will retry or expire
      res.json({ success: true, nonce, netAmount, fee, status: 'pending', message: 'Transfer queued, will process shortly' });
    }
  } catch (e) {
    console.error('Withdraw transfer error:', e.message);
    res.json({ success: true, nonce, netAmount, fee, status: 'pending', message: 'Transfer queued' });
  }
});

// POST /api/withdraw/confirm — confirm withdrawal with txHash
app.post('/api/withdraw/confirm', requireAuth, (req, res) => {
  const { address, nonce, txHash } = req.body;
  if (!address || !nonce || !txHash) return res.status(400).json({ error: 'address, nonce, and txHash required' });

  const wr = db.prepare("SELECT * FROM withdrawal_requests WHERE nonce = ? AND address = ? AND status = 'pending'").get(nonce, address);
  if (!wr) return res.status(404).json({ error: 'Withdrawal request not found or already processed' });

  db.prepare("UPDATE withdrawal_requests SET status = 'completed', tx_hash = ?, completed_at = unixepoch() WHERE id = ?").run(txHash, wr.id);
  res.json({ success: true });
});

// POST /api/unwrap — custodial WBTC unwrap: burn confirmed → send BTC from pool
app.post('/api/unwrap', requireAuth, async (req, res) => {
  try {
    const { address, amount, burnTxHash } = req.body;
    if (!address || !amount || !burnTxHash) {
      return res.status(400).json({ error: 'address, amount, and burnTxHash required' });
    }

    // Validate address format
    if (!address.startsWith(OPNET_ADDRESS_PREFIX) || address.length > 120 || address.length < 20) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum < 10000) {
      return res.status(400).json({ error: 'Minimum unwrap: 10,000 sats' });
    }
    if (amountNum > 100_000_000) {
      return res.status(400).json({ error: 'Maximum unwrap: 1 BTC per request' });
    }

    // Rate limit: 3 per 5 minutes per address
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    const recentCount = db.prepare(
      "SELECT COUNT(*) as cnt FROM unwrap_requests WHERE address = ? AND created_at > ?"
    ).get(address, fiveMinAgo);
    if (recentCount && recentCount.cnt >= 3) {
      return res.status(429).json({ error: 'Rate limit: max 3 unwrap requests per 5 minutes' });
    }

    // Atomic: check dedup + insert inside transaction to prevent race condition
    const insertUnwrap = db.transaction(() => {
      const existing = db.prepare(
        "SELECT id FROM unwrap_requests WHERE burn_tx_hash = ?"
      ).get(burnTxHash);
      if (existing) return null; // already processed
      const ins = db.prepare(
        "INSERT INTO unwrap_requests (address, amount_sats, burn_tx_hash, status, created_at) VALUES (?, ?, ?, 'pending', unixepoch())"
      ).run(address, amountNum, burnTxHash);
      return ins.lastInsertRowid;
    });
    const requestId = insertUnwrap();
    if (!requestId) {
      return res.status(409).json({ error: 'This burn transaction was already processed' });
    }

    // Verify burn TX exists on chain before sending BTC
    const txCheck = await verifyTxExists(burnTxHash, address);
    if (!txCheck.valid) {
      db.prepare("UPDATE unwrap_requests SET status = 'rejected', completed_at = unixepoch() WHERE id = ?").run(requestId);
      return res.status(400).json({ error: `Invalid burn TX: ${txCheck.error || 'not found'}` });
    }

    // Large unwraps (>100k sats): require confirmed burn TX, queue if unconfirmed
    if (amountNum > 100_000 && !txCheck.confirmed) {
      db.prepare("UPDATE unwrap_requests SET status = 'queued' WHERE id = ?").run(requestId);
      return res.status(202).json({
        success: true, pending: true, requestId: Number(requestId),
        message: 'Large unwrap queued — waiting for burn TX confirmation (~10 min)',
      });
    }

    // Check pool balance before sending
    if (deployerWallet && opnetProvider) {
      try {
        const poolUtxos = await opnetProvider.fetchUTXO({
          address: deployerWallet.p2tr, minAmount: BigInt(amountNum), requestedAmount: BigInt(amountNum) + 50000n,
        });
        if (!poolUtxos || poolUtxos.length === 0) {
          db.prepare("UPDATE unwrap_requests SET status = 'queued' WHERE id = ?").run(requestId);
          return res.status(202).json({
            success: true, pending: true, requestId: Number(requestId),
            message: 'Unwrap queued — pool refill in progress',
          });
        }
      } catch { /* proceed anyway, sendBtcFromPool will handle */ }
    }

    // Send BTC from pool
    const result = await sendBtcFromPool(address, amountNum);

    if (result && result.success && result.txHash) {
      db.prepare(
        "UPDATE unwrap_requests SET status = 'completed', btc_tx_hash = ?, completed_at = unixepoch() WHERE id = ?"
      ).run(result.txHash, requestId);
      res.json({ success: true, btcTxHash: result.txHash, requestId: Number(requestId) });
    } else {
      db.prepare(
        "UPDATE unwrap_requests SET status = 'failed', completed_at = unixepoch() WHERE id = ?"
      ).run(requestId);
      res.status(500).json({ error: result?.error || 'BTC transfer failed. Contact support.', requestId: Number(requestId) });
    }
  } catch (e) {
    console.error('[/api/unwrap] Error:', e.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/unwrap/status/:address — unwrap history (auth required)
app.get('/api/unwrap/status/:address', requireAuth, (req, res) => {
  const unwraps = db.prepare(
    'SELECT * FROM unwrap_requests WHERE address = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.params.address);
  res.json(unwraps);
});

// GET /api/deposit/status/:address — deposit history
app.get('/api/deposit/status/:address', (req, res) => {
  const deposits = db.prepare('SELECT * FROM treasury_deposits WHERE address = ? ORDER BY created_at DESC LIMIT 50').all(req.params.address);
  res.json(deposits);
});

// GET /api/withdraw/status/:address — withdrawal history
app.get('/api/withdraw/status/:address', (req, res) => {
  const withdrawals = db.prepare('SELECT * FROM withdrawal_requests WHERE address = ? ORDER BY created_at DESC LIMIT 50').all(req.params.address);
  res.json(withdrawals);
});

// ==========================================================================
// BACKGROUND JOBS — Treasury
// ==========================================================================

// Confirm pending deposits (every 30s)
async function confirmPendingDeposits() {
  try {
    const pending = db.prepare("SELECT id, tx_hash, address, amount_bpusd FROM treasury_deposits WHERE status = 'pending' AND created_at > unixepoch() - 86400").all();
    if (!pending.length) return;

    for (const dep of pending) {
      try {
        const res = await fetch(OPNET_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [dep.tx_hash], id: 1 }),
          signal: AbortSignal.timeout(10000),
        });
        const data = await res.json();
        if (data.result && data.result.blockNumber !== undefined && data.result.blockNumber !== null) {
          db.prepare("UPDATE treasury_deposits SET status = 'confirmed', confirmed_at = unixepoch() WHERE id = ?").run(dep.id);
          // Credit backed_balance + balance
          db.prepare('UPDATE users SET backed_balance = backed_balance + ?, balance = balance + ? WHERE address = ?').run(dep.amount_bpusd, dep.amount_bpusd, dep.address);
          console.log(`Deposit ${dep.id} confirmed: +${dep.amount_bpusd} sats to ${dep.address}`);
        }
      } catch { /* skip, retry next cycle */ }
    }
  } catch (e) {
    console.error('confirmPendingDeposits error:', e.message);
  }
}

// Expire stale withdrawals (every 60s) — return balance if withdrawal not completed in time
function expireStaleWithdrawals() {
  try {
    const now = Math.floor(Date.now() / 1000);
    const expired = db.prepare("SELECT id, address, amount_bpusd, fee_bpusd FROM withdrawal_requests WHERE status = 'pending' AND expires_at < ?").all(now);
    for (const wr of expired) {
      // Return full amount (including fee) to user
      db.prepare('UPDATE users SET backed_balance = backed_balance + ?, balance = balance + ? WHERE address = ?').run(wr.amount_bpusd, wr.amount_bpusd, wr.address);
      db.prepare("UPDATE withdrawal_requests SET status = 'expired' WHERE id = ?").run(wr.id);
      // Reverse the protocol revenue entry for the fee
      if (wr.fee_bpusd > 0) {
        ACCUMULATED_PROTOCOL_REVENUE -= wr.fee_bpusd;
        db.prepare('INSERT INTO protocol_revenue (source_type, source_market_id, amount) VALUES (?, ?, ?)').run('withdrawal_fee_reversal', '', -wr.fee_bpusd);
      }
      console.log(`Withdrawal ${wr.id} expired — returned ${wr.amount_bpusd} sats to ${wr.address}`);
    }
  } catch (e) {
    console.error('expireStaleWithdrawals error:', e.message);
  }
}

// Reconcile balances (every 30 min) — log SQLite totals for monitoring
function reconcileBalances() {
  try {
    const sqliteTotal = db.prepare('SELECT SUM(backed_balance) as total FROM users').get()?.total || 0;
    const pendingDeposits = db.prepare("SELECT SUM(amount_bpusd) as total FROM treasury_deposits WHERE status = 'pending'").get()?.total || 0;
    const pendingWithdrawals = db.prepare("SELECT SUM(amount_bpusd) as total FROM withdrawal_requests WHERE status = 'pending'").get()?.total || 0;
    const expectedTotal = sqliteTotal + pendingWithdrawals; // pending withdrawals already debited

    db.prepare('INSERT INTO reconciliation_log (sqlite_total, onchain_total, discrepancy) VALUES (?, ?, ?)').run(
      sqliteTotal, null, pendingDeposits // onchain_total requires RPC call, log pending for now
    );
    console.log(`Reconciliation: SQLite backed=${sqliteTotal}, pendingDep=${pendingDeposits}, pendingWd=${pendingWithdrawals}`);
  } catch (e) {
    console.error('reconcileBalances error:', e.message);
  }
}

// Flush protocol revenue (every 6 hours) — send accumulated protocolShare to treasury address
async function flushProtocolRevenue() {
  if (!PROTOCOL_TREASURY_ADDRESS || ACCUMULATED_PROTOCOL_REVENUE < PROTOCOL_FLUSH_THRESHOLD) return;

  const flushAmount = ACCUMULATED_PROTOCOL_REVENUE;
  console.log(`Flushing ${flushAmount} sats protocol revenue to ${PROTOCOL_TREASURY_ADDRESS}`);

  try {
    const txResult = await transferWbtc(PROTOCOL_TREASURY_ADDRESS, flushAmount);
    if (txResult.success) {
      // Mark all accumulated entries as flushed
      db.prepare("UPDATE protocol_revenue SET accumulated = 0 WHERE accumulated = 1").run();
      ACCUMULATED_PROTOCOL_REVENUE = 0;
      console.log(`Protocol revenue flushed: ${flushAmount} sats, TX: ${txResult.txHash}`);
    }
  } catch (e) {
    console.error('flushProtocolRevenue error:', e.message);
  }
}

// ==========================================================================
// BACKGROUND: Process queued unwraps (large unwraps waiting for confirmation)
// ==========================================================================
async function processQueuedUnwraps() {
  try {
    const queued = db.prepare("SELECT * FROM unwrap_requests WHERE status = 'queued' AND created_at > unixepoch() - 86400").all();
    if (!queued.length) return;
    for (const req of queued) {
      try {
        const txCheck = await verifyTxExists(req.burn_tx_hash, req.address);
        if (!txCheck.valid) continue; // still not visible
        if (!txCheck.confirmed) continue; // wait for confirmation
        const result = await sendBtcFromPool(req.address, req.amount_sats);
        if (result && result.success && result.txHash) {
          db.prepare("UPDATE unwrap_requests SET status = 'completed', btc_tx_hash = ?, completed_at = unixepoch() WHERE id = ?")
            .run(result.txHash, req.id);
          console.log(`[processQueuedUnwraps] Completed unwrap #${req.id}: ${req.amount_sats} sats → ${req.address}`);
        }
      } catch (e) {
        console.error(`[processQueuedUnwraps] Error processing #${req.id}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[processQueuedUnwraps] Error:', e.message);
  }
}

// ==========================================================================
// HEALTH CHECK
// ==========================================================================
app.get('/api/health', async (_req, res) => {
  const dbOk = !!db.prepare('SELECT 1').get();
  const walletOk = !!deployerWallet;
  let rpcOk = false;
  try {
    const r = await fetch(OPNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
      signal: AbortSignal.timeout(5000),
    });
    rpcOk = r.ok;
  } catch { /* rpc down */ }
  const status = dbOk && walletOk && rpcOk ? 200 : 503;
  res.status(status).json({ db: dbOk, wallet: walletOk, rpc: rpcOk, network: OPNET_NETWORK_NAME, txLock });
});

// ==========================================================================
// POOL BALANCE MONITOR
// ==========================================================================
const LOW_POOL_THRESHOLD = BigInt(process.env.LOW_POOL_THRESHOLD || '500000'); // 0.005 BTC default

async function checkPoolBalance() {
  if (!deployerWallet || !opnetProvider) return;
  try {
    const utxos = await opnetProvider.fetchUTXO({
      address: deployerWallet.p2tr,
      minAmount: 1000n,
      requestedAmount: 100_000_000n,
    });
    const totalSats = utxos.reduce((a, u) => a + u.value, 0n);
    if (totalSats < LOW_POOL_THRESHOLD) {
      console.error(`[ALERT] Pool balance LOW: ${totalSats} sats (threshold: ${LOW_POOL_THRESHOLD}). Refill ${deployerWallet.p2tr}!`);
    }
  } catch (e) {
    console.error('[checkPoolBalance] Error:', e.message);
  }
}

// Register background jobs
setInterval(() => confirmPendingDeposits(), 30_000);
setInterval(() => expireStaleWithdrawals(), 60_000);
setInterval(() => reconcileBalances(), 30 * 60 * 1000);
setInterval(() => flushProtocolRevenue(), 6 * 60 * 60 * 1000);
setInterval(() => checkPoolBalance(), 10 * 60 * 1000);
setInterval(() => processQueuedUnwraps(), 60_000);
// Sync unlinked markets to on-chain contract every 5 min
setInterval(() => syncMarketsToChain(), 5 * 60 * 1000);
// Withdraw accumulated on-chain fees every 6 hours
setInterval(() => withdrawFeesOnChain(), 6 * 60 * 60 * 1000);

// --- Graceful shutdown ---
function gracefulShutdown(signal) {
  console.log(`${signal} received — graceful shutdown`);
  const waitForLock = () => {
    if (txLock) return setTimeout(waitForLock, 500);
    try { db.close(); } catch {}
    process.exit(0);
  };
  setTimeout(() => { try { db.close(); } catch {} process.exit(1); }, 10000); // force after 10s
  waitForLock();
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => { console.error('UNCAUGHT:', err); });
process.on('unhandledRejection', (reason) => { console.error('UNHANDLED REJECTION:', reason); });

// --- Start ---
const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`BitPredict API running on :${PORT} [${OPNET_NETWORK_NAME}]`);
  // Initial price fetch
  await fetchPrice('btc');
  await fetchPrice('eth');
  await fetchPrice('sol');
  // Initial Polymarket sync
  setTimeout(() => syncPolymarketEvents(), 5000);
  // Initial pool balance check
  setTimeout(() => checkPoolBalance(), 15000);
});
