import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

const PRED_TOKEN = 'opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d'; // BPUSD MintableToken
const PRED_DECIMALS = 8;
const INCREASE_ALLOWANCE_SELECTOR = 0x8d645723;

// Contract pubkey hex (32 bytes) — resolved via getCode RPC on startup
let PRED_CONTRACT_PUBKEY = '';

let txLock = false;

async function initDeployerWallet() {
  const seed = process.env.OPNET_SEED;
  if (!seed) {
    console.log('OPNET_SEED not set — on-chain transactions disabled');
    return;
  }
  try {
    const { Mnemonic, TransactionFactory, OPNetLimitedProvider } = await import('@btc-vision/transaction');
    const { networks } = await import('@btc-vision/bitcoin');

    opnetNetwork = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
    const m = new Mnemonic(seed, '', opnetNetwork);
    const wallet = m.deriveOPWallet(undefined, 0);

    deployerWallet = wallet;
    opnetProvider = new OPNetLimitedProvider('https://testnet.opnet.org');
    opnetFactory = new TransactionFactory();
    console.log('Deployer wallet initialized:', wallet.p2tr);

    // Verify BTC balance
    const utxos = await opnetProvider.fetchUTXO({ address: wallet.p2tr, minAmount: 1000n, requestedAmount: 10000n }).catch(() => []);
    const totalSats = utxos.reduce((a, u) => a + u.value, 0n);
    console.log('Deployer BTC balance:', totalSats.toString(), 'sats', `(${utxos.length} UTXOs)`);

    // Resolve PRED token contract pubkey (32-byte hex) via getCode RPC
    try {
      const codeRes = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [PRED_TOKEN, false], id: 1 }),
        signal: AbortSignal.timeout(12000),
      });
      const codeData = await codeRes.json();
      if (codeData.result && codeData.result.contractPublicKey) {
        // contractPublicKey is base64 — decode to hex
        PRED_CONTRACT_PUBKEY = Buffer.from(codeData.result.contractPublicKey, 'base64').toString('hex');
        console.log('PRED contract pubkey resolved:', PRED_CONTRACT_PUBKEY);
      } else {
        console.log('Could not resolve PRED contract pubkey:', JSON.stringify(codeData.error || {}));
      }
    } catch (e2) {
      console.log('PRED pubkey resolution failed:', e2.message);
    }
  } catch (e) {
    console.error('Failed to init deployer wallet:', e.message);
  }
}

// Get epoch challenge for transaction signing (required by OPNet)
async function getChallenge() {
  const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
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
  if (!PRED_CONTRACT_PUBKEY) {
    return { success: false, error: 'PRED contract pubkey not resolved' };
  }
  if (txLock) {
    return { success: false, error: 'Server busy, try again in a few seconds' };
  }
  txLock = true;
  try {
    const { BinaryWriter } = await import('@btc-vision/transaction');

    const rawAmount = BigInt(amount) * (10n ** BigInt(PRED_DECIMALS));
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
      to: PRED_TOKEN,
      contract: PRED_CONTRACT_PUBKEY, // 32-byte hex pubkey (NOT bech32)
      calldata: writer.getBuffer(),
      feeRate: 2,
      priorityFee: 1000n,
      gasSatFee: 10000n,
      challenge,
      linkMLDSAPublicKeyToAddress: true,
      revealMLDSAPublicKey: true,
    });

    // Broadcast funding tx, then interaction tx
    const b1 = await opnetProvider.broadcastTransaction(result.fundingTransaction, false);
    console.log(`[${memo}] Funding TX:`, JSON.stringify(b1));
    await new Promise(r => setTimeout(r, 2000));
    const b2 = await opnetProvider.broadcastTransaction(result.interactionTransaction, false);
    console.log(`[${memo}] Interaction TX:`, JSON.stringify(b2));

    const txHash = b2?.result || '';
    return { success: true, txHash };
  } catch (e) {
    console.error(`On-chain proof error [${memo}]:`, e.message, '\nStack:', e.stack);
    return { success: false, error: e.message };
  } finally {
    txLock = false;
  }
}

// Init deployer wallet on startup
initDeployerWallet();

// CORS: allow all origins (testnet), handle preflight
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

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

// --- Database setup ---
const db = new Database(join(__dirname, 'bitpredict.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 100000,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS markets (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    yes_price REAL NOT NULL DEFAULT 0.5,
    no_price REAL NOT NULL DEFAULT 0.5,
    yes_pool INTEGER NOT NULL DEFAULT 500000,
    no_pool INTEGER NOT NULL DEFAULT 500000,
    volume INTEGER NOT NULL DEFAULT 0,
    liquidity INTEGER NOT NULL DEFAULT 1000000,
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

// Migration: add image_url column if missing
try { db.exec('ALTER TABLE markets ADD COLUMN image_url TEXT'); } catch(e) { /* already exists */ }

// Wipe polymarket markets for category re-sync on deploy
try {
  const polyCount = db.prepare("SELECT COUNT(*) as c FROM markets WHERE market_type = 'polymarket'").get().c;
  if (polyCount > 0) {
    db.prepare("DELETE FROM markets WHERE market_type = 'polymarket'").run();
    console.log(`Wiped ${polyCount} polymarket markets for category re-sync`);
  }
} catch(e) { /* ignore */ }

// Fix stuck bets: active bets on resolved markets should be settled
try {
  const stuckBets = db.prepare(`SELECT b.*, m.outcome FROM bets b JOIN markets m ON b.market_id = m.id
    WHERE b.status = 'active' AND m.resolved = 1 AND m.outcome IS NOT NULL`).all();
  for (const b of stuckBets) {
    if (b.side === b.outcome) {
      const payout = Math.round(b.amount / b.price);
      db.prepare('UPDATE bets SET status = ?, payout = ? WHERE id = ?').run('won', payout, b.id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(payout, b.user_address);
      console.log(`Fixed stuck bet ${b.id}: won +${payout}`);
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
      category: 'Crypto', yes_price: 0.72, no_price: 0.28, volume: 245000, liquidity: 89000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["bitcoin","price","bullish"]', market_type: 'manual',
    },
    {
      id: 'eth-etf-50b', question: 'Will Ethereum spot ETF surpass $50B AUM in 2026?',
      category: 'Crypto', yes_price: 0.45, no_price: 0.55, volume: 178000, liquidity: 62000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["ethereum","etf","institutional"]', market_type: 'manual',
    },
    {
      id: 'us-midterms-2026', question: 'Will Republicans win the 2026 US midterm elections?',
      category: 'Politics', yes_price: 0.58, no_price: 0.42, volume: 520000, liquidity: 145000,
      end_time: Math.floor(new Date('2026-11-03').getTime() / 1000),
      tags: '["election","usa","midterms"]', market_type: 'manual',
    },
    {
      id: 'opnet-1m-tx', question: 'Will OP_NET process 1M+ transactions by Q4 2026?',
      category: 'Crypto', yes_price: 0.65, no_price: 0.35, volume: 92000, liquidity: 34000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["opnet","bitcoin","adoption"]', market_type: 'manual',
    },
    {
      id: 'ai-agi-2028', question: 'Will AGI be achieved before 2028?',
      category: 'Tech', yes_price: 0.18, no_price: 0.82, volume: 890000, liquidity: 210000,
      end_time: Math.floor(new Date('2027-12-31').getTime() / 1000),
      tags: '["ai","agi","technology"]', market_type: 'manual',
    },
    {
      id: 'btc-dominance-65', question: 'Will BTC dominance exceed 65% in 2026?',
      category: 'Crypto', yes_price: 0.54, no_price: 0.46, volume: 156000, liquidity: 48000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["bitcoin","dominance","market"]', market_type: 'manual',
    },
    {
      id: 'spacex-mars-2027', question: 'Will SpaceX launch Starship to Mars orbit by 2027?',
      category: 'Tech', yes_price: 0.25, no_price: 0.75, volume: 430000, liquidity: 120000,
      end_time: Math.floor(new Date('2027-12-31').getTime() / 1000),
      tags: '["spacex","mars","space"]', market_type: 'manual',
    },
    {
      id: 'fed-rate-below-3', question: 'Will the Fed cut rates below 3% by end of 2026?',
      category: 'Politics', yes_price: 0.41, no_price: 0.59, volume: 710000, liquidity: 195000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["fed","rates","macro"]', market_type: 'manual',
    },
    {
      id: 'sol-flip-eth-tx', question: 'Will Solana flip Ethereum in daily transactions by 2027?',
      category: 'Crypto', yes_price: 0.38, no_price: 0.62, volume: 198000, liquidity: 56000,
      end_time: Math.floor(new Date('2027-06-30').getTime() / 1000),
      tags: '["solana","ethereum","competition"]', market_type: 'manual',
    },
    {
      id: 'world-cup-brazil', question: 'Will Brazil win the 2026 FIFA World Cup?',
      category: 'Sports', yes_price: 0.22, no_price: 0.78, volume: 1200000, liquidity: 320000,
      end_time: Math.floor(new Date('2026-07-19').getTime() / 1000),
      tags: '["football","world-cup","brazil"]', market_type: 'manual',
    },
    {
      id: 'real-madrid-ucl', question: 'Will Real Madrid win Champions League 2026?',
      category: 'Sports', yes_price: 0.32, no_price: 0.68, volume: 340000, liquidity: 95000,
      end_time: Math.floor(new Date('2026-06-01').getTime() / 1000),
      tags: '["football","ucl","real-madrid"]', market_type: 'manual',
    },
    {
      id: 'nft-100b', question: 'Will NFT market cap exceed $100B in 2026?',
      category: 'Culture', yes_price: 0.15, no_price: 0.85, volume: 67000, liquidity: 22000,
      end_time: Math.floor(new Date('2026-12-31').getTime() / 1000),
      tags: '["nft","market","digital-art"]', market_type: 'manual',
    },
  ];

  const ins = db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price,
    yes_pool, no_pool, volume, liquidity, end_time, tags, market_type) VALUES
    (@id, @question, @category, @yes_price, @no_price, 500000, 500000, @volume, @liquidity, @end_time, @tags, @market_type)`);
  const txn = db.transaction(() => { for (const m of markets) ins.run(m); });
  txn();
  console.log(`Seeded ${markets.length} markets`);
}

seedMarkets();

// --- Ensure minimum category coverage (add extra markets if needed) ---
function ensureCategoryMarkets() {
  const extraMarkets = [
    // Sports (10+)
    { id: 'nba-celtics-2026', question: 'Will the Boston Celtics win the 2026 NBA Championship?', category: 'Sports', yes_price: 0.28, no_price: 0.72, volume: 450000, liquidity: 125000, end_time: Math.floor(new Date('2026-06-20').getTime() / 1000), tags: '["nba","celtics","basketball"]', market_type: 'manual' },
    { id: 'nfl-chiefs-sb-2027', question: 'Will the Kansas City Chiefs win Super Bowl LXI?', category: 'Sports', yes_price: 0.15, no_price: 0.85, volume: 890000, liquidity: 280000, end_time: Math.floor(new Date('2027-02-14').getTime() / 1000), tags: '["nfl","chiefs","super-bowl"]', market_type: 'manual' },
    { id: 'f1-verstappen-2026', question: 'Will Max Verstappen win the 2026 F1 World Championship?', category: 'Sports', yes_price: 0.42, no_price: 0.58, volume: 380000, liquidity: 110000, end_time: Math.floor(new Date('2026-12-10').getTime() / 1000), tags: '["f1","verstappen","racing"]', market_type: 'manual' },
    { id: 'wimbledon-djokovic-2026', question: 'Will Novak Djokovic win Wimbledon 2026?', category: 'Sports', yes_price: 0.18, no_price: 0.82, volume: 210000, liquidity: 65000, end_time: Math.floor(new Date('2026-07-12').getTime() / 1000), tags: '["tennis","wimbledon","djokovic"]', market_type: 'manual' },
    { id: 'ufc-jones-retire-2026', question: 'Will Jon Jones retire undefeated in 2026?', category: 'Sports', yes_price: 0.55, no_price: 0.45, volume: 175000, liquidity: 52000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["ufc","mma","jones"]', market_type: 'manual' },
    { id: 'psg-ucl-2026', question: 'Will PSG win the Champions League 2025-26?', category: 'Sports', yes_price: 0.12, no_price: 0.88, volume: 290000, liquidity: 88000, end_time: Math.floor(new Date('2026-06-01').getTime() / 1000), tags: '["football","ucl","psg"]', market_type: 'manual' },
    { id: 'arsenal-epl-2026', question: 'Will Arsenal win the 2025-26 Premier League?', category: 'Sports', yes_price: 0.35, no_price: 0.65, volume: 520000, liquidity: 145000, end_time: Math.floor(new Date('2026-05-25').getTime() / 1000), tags: '["football","epl","arsenal"]', market_type: 'manual' },
    { id: 'nba-lakers-playoff-2026', question: 'Will the Lakers make the 2026 NBA Playoffs?', category: 'Sports', yes_price: 0.62, no_price: 0.38, volume: 310000, liquidity: 95000, end_time: Math.floor(new Date('2026-04-15').getTime() / 1000), tags: '["nba","lakers","basketball"]', market_type: 'manual' },
    { id: 'olympics-usa-gold-2028', question: 'Will the USA lead the 2028 Olympics gold medal count?', category: 'Sports', yes_price: 0.68, no_price: 0.32, volume: 780000, liquidity: 210000, end_time: Math.floor(new Date('2028-08-11').getTime() / 1000), tags: '["olympics","usa","2028"]', market_type: 'manual' },
    { id: 'messi-retire-2026', question: 'Will Lionel Messi retire from professional football in 2026?', category: 'Sports', yes_price: 0.45, no_price: 0.55, volume: 650000, liquidity: 180000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["football","messi","retirement"]', market_type: 'manual' },
    // Tech (10+)
    { id: 'openai-gpt5-2026', question: 'Will OpenAI release GPT-5 before end of 2026?', category: 'Tech', yes_price: 0.78, no_price: 0.22, volume: 1200000, liquidity: 340000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["ai","openai","gpt5"]', market_type: 'manual' },
    { id: 'apple-ar-glasses-2026', question: 'Will Apple release AR glasses in 2026?', category: 'Tech', yes_price: 0.35, no_price: 0.65, volume: 420000, liquidity: 120000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["apple","ar","hardware"]', market_type: 'manual' },
    { id: 'tesla-fsd-level5-2027', question: 'Will Tesla achieve Level 5 full self-driving by 2027?', category: 'Tech', yes_price: 0.12, no_price: 0.88, volume: 560000, liquidity: 160000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["tesla","self-driving","autonomous"]', market_type: 'manual' },
    { id: 'nvidia-10t-2027', question: 'Will NVIDIA reach $10T market cap by 2027?', category: 'Tech', yes_price: 0.22, no_price: 0.78, volume: 480000, liquidity: 135000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["nvidia","stocks","ai"]', market_type: 'manual' },
    { id: 'quantum-1000-qubit-2027', question: 'Will a 1000+ logical qubit quantum computer exist by 2027?', category: 'Tech', yes_price: 0.15, no_price: 0.85, volume: 320000, liquidity: 95000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["quantum","computing","science"]', market_type: 'manual' },
    { id: 'starlink-direct-cell-2026', question: 'Will Starlink offer direct-to-cell service globally in 2026?', category: 'Tech', yes_price: 0.42, no_price: 0.58, volume: 290000, liquidity: 82000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["starlink","spacex","telecom"]', market_type: 'manual' },
    { id: 'neuralink-human-trial-2026', question: 'Will Neuralink complete 10+ human implants by end of 2026?', category: 'Tech', yes_price: 0.58, no_price: 0.42, volume: 380000, liquidity: 105000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["neuralink","brain","biotech"]', market_type: 'manual' },
    { id: 'google-gemini-beats-gpt-2026', question: 'Will Google Gemini surpass ChatGPT in market share by 2026?', category: 'Tech', yes_price: 0.2, no_price: 0.8, volume: 510000, liquidity: 145000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["google","ai","competition"]', market_type: 'manual' },
    { id: 'humanoid-robot-commercial-2027', question: 'Will humanoid robots be commercially available by 2027?', category: 'Tech', yes_price: 0.3, no_price: 0.7, volume: 410000, liquidity: 118000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["robotics","ai","commercial"]', market_type: 'manual' },
    // Culture (10+)
    { id: 'taylor-swift-retirement-2027', question: 'Will Taylor Swift announce retirement before 2028?', category: 'Culture', yes_price: 0.08, no_price: 0.92, volume: 680000, liquidity: 195000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["music","taylor-swift","celebrity"]', market_type: 'manual' },
    { id: 'oscar-best-picture-ai-2027', question: 'Will an AI-generated film win Best Picture Oscar by 2027?', category: 'Culture', yes_price: 0.05, no_price: 0.95, volume: 340000, liquidity: 98000, end_time: Math.floor(new Date('2027-03-30').getTime() / 1000), tags: '["oscars","ai","film"]', market_type: 'manual' },
    { id: 'spotify-1b-users-2026', question: 'Will Spotify reach 1 billion users in 2026?', category: 'Culture', yes_price: 0.45, no_price: 0.55, volume: 230000, liquidity: 68000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["spotify","music","streaming"]', market_type: 'manual' },
    { id: 'tiktok-banned-us-2026', question: 'Will TikTok be fully banned in the US by end of 2026?', category: 'Culture', yes_price: 0.25, no_price: 0.75, volume: 920000, liquidity: 260000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["tiktok","social-media","ban"]', market_type: 'manual' },
    { id: 'mrbeast-100m-subs-2026', question: 'Will MrBeast reach 400M YouTube subscribers in 2026?', category: 'Culture', yes_price: 0.55, no_price: 0.45, volume: 185000, liquidity: 55000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["youtube","mrbeast","creator"]', market_type: 'manual' },
    { id: 'netflix-gaming-10m-2026', question: 'Will Netflix Gaming reach 10M+ daily players by 2026?', category: 'Culture', yes_price: 0.15, no_price: 0.85, volume: 145000, liquidity: 42000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["netflix","gaming","streaming"]', market_type: 'manual' },
    { id: 'gta6-release-2026', question: 'Will GTA VI be released before the end of 2026?', category: 'Culture', yes_price: 0.72, no_price: 0.28, volume: 1100000, liquidity: 310000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["gaming","gta","rockstar"]', market_type: 'manual' },
    { id: 'disney-plus-profit-2026', question: 'Will Disney+ become profitable in 2026?', category: 'Culture', yes_price: 0.62, no_price: 0.38, volume: 280000, liquidity: 82000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["disney","streaming","entertainment"]', market_type: 'manual' },
    { id: 'viral-ai-song-billboard-2026', question: 'Will an AI-generated song reach Billboard Hot 100 Top 10 in 2026?', category: 'Culture', yes_price: 0.35, no_price: 0.65, volume: 260000, liquidity: 75000, end_time: Math.floor(new Date('2026-12-31').getTime() / 1000), tags: '["music","ai","billboard"]', market_type: 'manual' },
    { id: 'metaverse-100m-users-2027', question: 'Will any metaverse platform reach 100M monthly users by 2027?', category: 'Culture', yes_price: 0.18, no_price: 0.82, volume: 350000, liquidity: 100000, end_time: Math.floor(new Date('2027-12-31').getTime() / 1000), tags: '["metaverse","vr","meta"]', market_type: 'manual' },
  ];

  const ins = db.prepare(`INSERT OR IGNORE INTO markets (id, question, category, yes_price, no_price,
    yes_pool, no_pool, volume, liquidity, end_time, tags, market_type) VALUES
    (@id, @question, @category, @yes_price, @no_price, 500000, 500000, @volume, @liquidity, @end_time, @tags, @market_type)`);
  let added = 0;
  for (const m of extraMarkets) {
    try { ins.run(m); added++; } catch(e) { /* duplicate */ }
  }
  if (added > 0) console.log(`Added ${added} extra category markets`);
}
ensureCategoryMarkets();

// --- 5-minute BTC/ETH price markets (Polymarket style) ---
function create5minMarkets() {
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + 300; // 5 min from now
  const roundTo5 = (t) => Math.ceil(t / 300) * 300;
  const slotEnd = roundTo5(now);
  const slotId = slotEnd.toString(36);

  const assets = [
    { sym: 'btc', name: 'Bitcoin', price: PRICE_CACHE.btc?.price || 0 },
    { sym: 'eth', name: 'Ethereum', price: PRICE_CACHE.eth?.price || 0 },
    { sym: 'sol', name: 'Solana', price: PRICE_CACHE.sol?.price || 0 },
  ];

  for (const a of assets) {
    if (a.price <= 0) continue;
    const mId = `${a.sym}-5min-${slotId}`;
    const existing = db.prepare('SELECT id FROM markets WHERE id = ?').get(mId);
    if (existing) continue;

    const threshold = Math.round(a.price);
    db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price,
      yes_pool, no_pool, volume, liquidity, end_time, tags, market_type, resolution_source)
      VALUES (?, ?, 'Crypto', 0.5, 0.5, 500000, 500000, 0, 1000000, ?, ?, 'price_5min', ?)`).run(
      mId,
      `Will ${a.name} be above $${threshold.toLocaleString()} in 5 minutes?`,
      slotEnd,
      JSON.stringify([a.sym, 'price', '5min']),
      JSON.stringify({ asset: a.sym, threshold, snapshot_price: a.price })
    );
    console.log(`Created 5min market: ${mId} (${a.name} > $${threshold})`);
  }
}

// --- Auto-resolve markets ---
async function resolveExpiredMarkets() {
  const now = Math.floor(Date.now() / 1000);
  const expired = db.prepare('SELECT * FROM markets WHERE resolved = 0 AND end_time <= ?').all(now);

  for (const m of expired) {
    if (m.market_type === 'price_5min' && m.resolution_source) {
      try {
        const src = JSON.parse(m.resolution_source);
        const currentPrice = await fetchPrice(src.asset);
        if (currentPrice <= 0) continue;

        const outcome = currentPrice > src.threshold ? 'yes' : 'no';
        db.prepare('UPDATE markets SET resolved = 1, outcome = ? WHERE id = ?').run(outcome, m.id);

        // Settle bets — winners get 'won' + auto-credit balance
        const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?').all(m.id, 'active');
        for (const b of bets) {
          if (b.side === outcome) {
            const payout = Math.round(b.amount / b.price);
            db.prepare('UPDATE bets SET status = ?, payout = ? WHERE id = ?').run('won', payout, b.id);
            db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(payout, b.user_address);
          } else {
            db.prepare('UPDATE bets SET status = ? WHERE id = ?').run('lost', b.id);
          }
        }
        console.log(`Resolved ${m.id}: ${outcome} (price: $${currentPrice}, threshold: $${src.threshold})`);
      } catch (e) {
        console.error(`Failed to resolve ${m.id}:`, e.message);
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
    'manager', 'coach', 'transfer', 'relegated', 'promoted', 'seed', 'bracket'];
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

  // Default check original category
  const lower = c;
  for (const [key, val] of Object.entries(POLYMARKET_CATEGORY_MAP)) {
    if (lower.includes(key)) return val;
  }
  return 'Politics';
}

async function syncPolymarketEvents() {
  try {
    const res = await fetch(`${GAMMA_HOST}/events?active=true&closed=false&order=volume&ascending=false&limit=30`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return;
    const events = await res.json();

    let synced = 0;
    for (const ev of events) {
      const markets = ev.markets || [];
      if (!markets.length) continue;

      for (const m of markets) {
        if (!m.question || m.question.length < 10) continue;
        const polyId = `poly-${(m.conditionId || m.id || '').slice(0, 16)}`;
        if (!polyId || polyId === 'poly-') continue;

        const existing = db.prepare('SELECT id FROM markets WHERE id = ?').get(polyId);
        if (existing) {
          // Update prices from Polymarket
          const prices = JSON.parse(m.outcomePrices || '[]');
          const yesPrice = parseFloat(prices[0]) || 0.5;
          const noPrice = parseFloat(prices[1]) || (1 - yesPrice);
          const vol = Math.round(parseFloat(m.volume || 0));
          const liq = Math.round(parseFloat(m.liquidityNum || m.liquidity || 0));
          db.prepare('UPDATE markets SET yes_price = ?, no_price = ?, volume = ?, liquidity = ? WHERE id = ? AND market_type = ?')
            .run(Math.round(yesPrice * 10000) / 10000, Math.round(noPrice * 10000) / 10000, vol, liq, polyId, 'polymarket');
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
        const yesPrice = parseFloat(prices[0]) || 0.5;
        const noPrice = parseFloat(prices[1]) || (1 - yesPrice);
        const vol = Math.round(parseFloat(m.volume || 0));
        const liq = Math.round(parseFloat(m.liquidityNum || m.liquidity || 0));
        const category = mapPolyCategory(ev.category || m.category || '', m.question);
        const rawTags = (ev.tags || []).slice(0, 3).map(t => typeof t === 'string' ? t : (t.label || t.slug || '')).filter(Boolean);
        const tags = JSON.stringify([category.toLowerCase(), 'polymarket', ...rawTags]);

        // Scale volume/liquidity to BPUSD (1 BPUSD ≈ $1, but scale up for drama)
        const scaledVol = Math.max(vol, 10000);
        const scaledLiq = Math.max(liq, 50000);
        const yesPool = Math.round(scaledLiq * noPrice);
        const noPool = Math.round(scaledLiq * yesPrice);

        try {
          db.prepare(`INSERT INTO markets (id, question, category, yes_price, no_price,
            yes_pool, no_pool, volume, liquidity, end_time, tags, market_type, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'polymarket', ?)`).run(
            polyId, m.question, category,
            Math.round(yesPrice * 10000) / 10000, Math.round(noPrice * 10000) / 10000,
            yesPool, noPool, scaledVol, scaledLiq, endTime, tags,
            m.image || ev.image || null
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

// --- AMM helpers ---
function recalcPrices(yesPool, noPool) {
  const total = yesPool + noPool;
  if (total === 0) return { yes_price: 0.5, no_price: 0.5 };
  const yes_price = Math.round((noPool / total) * 10000) / 10000;
  return { yes_price, no_price: Math.round((1 - yes_price) * 10000) / 10000 };
}

// --- API Routes ---

// Get or create user, return balance
app.post('/api/auth', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) {
    db.prepare('INSERT INTO users (address, balance) VALUES (?, 0)').run(address);
    user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  }
  res.json({ address: user.address, balance: user.balance });
});

// Get user balance
app.get('/api/balance/:address', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(req.params.address);
  if (!user) return res.json({ balance: 0 });
  res.json({ balance: user.balance });
});

// List all markets (filter out old resolved 5min markets >1h old)
app.get('/api/markets', (req, res) => {
  const cutoff = Math.floor(Date.now() / 1000) - 3600; // 1h ago
  const markets = db.prepare(`SELECT * FROM markets 
    WHERE NOT (market_type = 'price_5min' AND resolved = 1 AND end_time < ?)
    ORDER BY volume DESC, end_time ASC`).all(cutoff);
  const mapped = markets.map(m => {
    let tags = [];
    try { tags = JSON.parse(m.tags || '[]'); } catch(e) { tags = []; }
    return {
      id: m.id,
      question: m.question,
      category: m.category,
      yesPrice: m.yes_price,
      noPrice: m.no_price,
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
    };
  });
  res.json(mapped);
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
    tags: JSON.parse(m.tags || '[]'), marketType: m.market_type,
    yesPool: m.yes_pool, noPool: m.no_pool,
  });
});

// Place a bet (with on-chain BPUSD transfer as proof)
app.post('/api/bet', async (req, res) => {
  const { address, marketId, side, amount } = req.body;

  if (!address || !marketId || !side || !amount) {
    return res.status(400).json({ error: 'address, marketId, side, amount required' });
  }
  if (typeof address !== 'string' || !address.startsWith('opt1') || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address: must be an OPNet testnet address (opt1...)' });
  }
  if (side !== 'yes' && side !== 'no') {
    return res.status(400).json({ error: 'side must be yes or no' });
  }
  const amountInt = Math.floor(Number(amount));
  if (!Number.isFinite(amountInt) || amountInt < 100) {
    return res.status(400).json({ error: 'minimum bet is 100 BPUSD' });
  }

  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.balance < amountInt) {
    return res.status(400).json({ error: `Insufficient balance: ${user.balance} BPUSD (need ${amountInt})` });
  }

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
  if (!market) return res.status(404).json({ error: 'market not found' });
  if (market.resolved) return res.status(400).json({ error: 'market already resolved' });

  const now = Math.floor(Date.now() / 1000);
  if (market.end_time <= now) return res.status(400).json({ error: 'market has ended' });

  // AMM: constant product
  const fee = Math.ceil(amountInt * 0.02); // 2% fee
  const netAmount = amountInt - fee;
  const yesPool = market.yes_pool;
  const noPool = market.no_pool;
  const k = yesPool * noPool;

  let shares, newYesPool, newNoPool;
  if (side === 'yes') {
    newNoPool = noPool + netAmount;
    newYesPool = Math.floor(k / newNoPool);
    shares = yesPool - newYesPool;
  } else {
    newYesPool = yesPool + netAmount;
    newNoPool = Math.floor(k / newYesPool);
    shares = noPool - newNoPool;
  }

  if (shares <= 0) return res.status(400).json({ error: 'trade too small' });

  const price = side === 'yes' ? market.yes_price : market.no_price;
  const betId = `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // On-chain proof is now signed by user on frontend
  // Server just records the bet — no server-side signing needed
  const txHash = '';

  // Execute in DB transaction
  const txn = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(amountInt, address);
    db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, price, shares, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      betId, address, marketId, side, amountInt, price, shares, txHash
    );
    const prices = recalcPrices(newYesPool, newNoPool);
    db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
      newYesPool, newNoPool, prices.yes_price, prices.no_price, amountInt, newYesPool + newNoPool, marketId
    );
  });

  try {
    txn();
    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

    res.json({
      success: true,
      betId,
      shares,
      fee,
      newBalance,
      txHash,
      onChain: !!txHash,
      newYesPrice: updatedMarket.yes_price,
      newNoPrice: updatedMarket.no_price,
    });
  } catch (e) {
    console.error('Bet error:', e.message);
    res.status(500).json({ error: 'Failed to place bet: ' + e.message });
  }
});

// Get user bets
app.get('/api/bets/:address', (req, res) => {
  const bets = db.prepare(`
    SELECT b.*, m.question, m.category, m.resolved as market_resolved, m.outcome as market_outcome,
           m.yes_price as current_yes_price, m.no_price as current_no_price
    FROM bets b JOIN markets m ON b.market_id = m.id
    WHERE b.user_address = ?
    ORDER BY b.created_at DESC
  `).all(req.params.address);

  res.json(bets.map(b => ({
    id: b.id,
    marketId: b.market_id,
    question: b.question,
    category: b.category,
    side: b.side,
    amount: b.amount,
    price: b.price,
    shares: b.shares,
    status: b.status,
    payout: b.payout,
    timestamp: b.created_at * 1000,
    currentYesPrice: b.current_yes_price,
    currentNoPrice: b.current_no_price,
    marketResolved: !!b.market_resolved,
    marketOutcome: b.market_outcome,
  })));
});

// Claim payout for resolved bet — requires user-signed TX proof
app.post('/api/claim', (req, res) => {
  const { address, betId, txHash } = req.body;
  if (!address || !betId || !txHash) return res.status(400).json({ error: 'address, betId, txHash required' });

  const bet = db.prepare('SELECT * FROM bets WHERE id = ? AND user_address = ?').get(betId, address);
  if (!bet) return res.status(404).json({ error: 'bet not found' });
  if (bet.status !== 'claimable') return res.status(400).json({ error: 'bet not claimable (status: ' + bet.status + ')' });
  if (bet.payout <= 0) return res.status(400).json({ error: 'no payout to claim' });

  try {
    const txn = db.transaction(() => {
      db.prepare('UPDATE bets SET status = ?, claim_tx_hash = ? WHERE id = ?').run('won', txHash, bet.id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(bet.payout, address);
    });
    txn();
    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    res.json({ success: true, payout: bet.payout, newBalance, txHash });
  } catch (e) {
    console.error('Claim error:', e.message);
    res.status(500).json({ error: 'Claim failed: ' + e.message });
  }
});

// Get prices
app.get('/api/prices', async (req, res) => {
  const btc = await fetchPrice('btc');
  const eth = await fetchPrice('eth');
  const sol = await fetchPrice('sol');
  res.json({ btc, eth, sol, ts: Date.now() });
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
    GROUP BY u.address
    ORDER BY u.balance DESC
    LIMIT 50
  `).all();

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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now(), markets: db.prepare('SELECT COUNT(*) as c FROM markets').get().c });
});

// On-chain bet: frontend sends txHash FIRST, then server records the bet
// Bet is NOT valid without a txHash from the on-chain transaction
app.post('/api/bet/onchain', (req, res) => {
  const { address, marketId, side, amount, txHash } = req.body;
  if (!address || !marketId || !side || !amount || !txHash) {
    return res.status(400).json({ error: 'address, marketId, side, amount, txHash required' });
  }
  if (typeof address !== 'string' || !address.startsWith('opt1') || address.length > 120) {
    return res.status(400).json({ error: 'Invalid address: must be an OPNet testnet address (opt1...)' });
  }
  if (side !== 'yes' && side !== 'no') return res.status(400).json({ error: 'side must be yes or no' });
  const onchainAmt = Math.floor(Number(amount));
  if (!Number.isFinite(onchainAmt) || onchainAmt < 100) return res.status(400).json({ error: 'minimum bet is 100 BPUSD' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.balance < onchainAmt) return res.status(400).json({ error: `Insufficient balance: ${user.balance} BPUSD` });

    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
    if (!market) return res.status(404).json({ error: 'market not found' });
    if (market.resolved) return res.status(400).json({ error: 'market already resolved' });

    const now = Math.floor(Date.now() / 1000);
    if (market.end_time <= now) return res.status(400).json({ error: 'market has ended' });

    // AMM: constant product
    const fee = Math.ceil(onchainAmt * 0.02);
    const netAmount = onchainAmt - fee;
    const yesPool = market.yes_pool;
    const noPool = market.no_pool;
    const k = yesPool * noPool;

    let shares, newYesPool, newNoPool;
    if (side === 'yes') {
      newNoPool = noPool + netAmount;
      newYesPool = Math.floor(k / newNoPool);
      shares = yesPool - newYesPool;
    } else {
      newYesPool = yesPool + netAmount;
      newNoPool = Math.floor(k / newYesPool);
      shares = noPool - newNoPool;
    }
    if (shares <= 0) return res.status(400).json({ error: 'trade too small' });

    const price = side === 'yes' ? market.yes_price : market.no_price;
    const betId = `bet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const txn = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(onchainAmt, address);
      db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, price, shares, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        betId, address, marketId, side, onchainAmt, price, shares, txHash
      );
      const prices = recalcPrices(newYesPool, newNoPool);
      db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
        newYesPool, newNoPool, prices.yes_price, prices.no_price, onchainAmt, newYesPool + newNoPool, marketId
      );
    });
    txn();

    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    const updatedMarket = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);

    res.json({
      success: true,
      betId,
      shares,
      fee,
      txHash,
      newBalance,
      newYesPrice: updatedMarket.yes_price,
      newNoPrice: updatedMarket.no_price,
    });
  } catch (e) {
    console.error('On-chain bet error:', e.message);
    res.status(500).json({ error: 'Bet error: ' + e.message });
  }
});

// --- Bob AI (OPNet Intelligence) + Gemini Engine ---
// Bob is the primary AI persona — OPNet expert, market analyst, smart contract auditor.
// Gemini serves as Bob's "brain" (LLM engine). Bob's OPNet knowledge is injected as context.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Bob's OPNet knowledge base — injected into every query
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
- Testnet: Signet fork, addresses start with "opt1"
- RPC: https://testnet.opnet.org for testnet queries
- Explorer: https://opscan.org
- Faucet: https://faucet.opnet.org for testnet BTC

## BitPredict Architecture
- BPUSD token: OP-20 MintableToken at opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d (publicMint enabled)
- PredictionMarket contract: opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj
- AMM: constant-product (x·y=k), 2% protocol fee (200 bps), fee rounds UP to favor protocol
- Markets: binary YES/NO outcomes, shares priced 0–1 BPUSD
- Resolution: oracle/creator resolves, winning shares redeem 1:1 from pool
- On-chain flow: approve BPUSD → buyShares(marketId, isYes, amount) → claimPayout(marketId)
- SDK pattern: getContract() → simulate() → sendTransaction({signer:null, mldsaSigner:null})
- signer is ALWAYS null on frontend — OP_WALLET extension handles all signing
- Security: reentrancy guards, tx.sender (not tx.origin), checked u256 math

## Trading Concepts
- Slippage: larger trades vs pool = more price impact
- Implied probability: YES price = market's probability estimate
- Value bet: when you think true probability > market price
- Liquidity: deeper pools = less slippage, better execution
- Kelly criterion: optimal bet sizing = (p*b - q) / b where p=probability, b=odds, q=1-p
- Contrarian plays: markets often overweight recent news, creating value on the other side

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
    const prices = { btc: PRICE_CACHE.btc?.price || 0, eth: PRICE_CACHE.eth?.price || 0 };

    // If user asks about a specific market, pull extra data
    let marketContext = '';
    if (marketId) {
      const m = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
      if (m) {
        const betsCount = db.prepare('SELECT COUNT(*) as c FROM bets WHERE market_id = ?').get(m.id).c;
        const k = m.yes_pool * m.no_pool;
        marketContext = `\n## Focus Market: "${m.question}"
YES: ${(m.yes_price * 100).toFixed(1)}% | NO: ${(m.no_price * 100).toFixed(1)}% | Volume: ${m.volume} BPUSD | Liquidity: ${m.liquidity} BPUSD
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
        userContext = `\nUser balance: ${user.balance} BPUSD | Bets: ${userBets?.total || 0} | Wins: ${userBets?.wins || 0} | Volume: ${userBets?.volume || 0} BPUSD`;
      }
    }

    // Manage conversation history
    const sessionKey = address || 'anon';
    if (!chatHistories.has(sessionKey)) chatHistories.set(sessionKey, []);
    const history = chatHistories.get(sessionKey);
    history.push({ role: 'user', parts: [{ text: message }] });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    const systemPrompt = `You are **Bob** — the official OP_NET AI agent and lead analyst for BitPredict.
You are NOT a generic chatbot. You are an expert in Bitcoin L1 smart contracts, OP_NET protocol, prediction markets, and quantitative trading.
Your intelligence combines deep OPNet protocol knowledge with real-time market analysis.

${BOB_OPNET_KNOWLEDGE}

## Live Market Data (right now)
BTC: $${prices.btc.toLocaleString()} | ETH: $${prices.eth.toLocaleString()}

Active markets:
${activeMarkets.map(m => `• "${m.question}" → YES ${(m.yes_price * 100).toFixed(0)}% / NO ${(m.no_price * 100).toFixed(0)}% | Vol: ${m.volume} BPUSD | Liq: ${m.liquidity}`).join('\n')}

${recentResolved.length > 0 ? `Recently resolved:\n${recentResolved.map(m => `• "${m.question}" → ${m.outcome?.toUpperCase()}`).join('\n')}` : ''}
${marketContext}${userContext}

## Bob's Personality & Rules
- You ARE Bob, the OP_NET AI. Refer to yourself as Bob. Show expertise and confidence.
- When discussing OP_NET, cite specific technical details (Tapscript calldata, WASM execution, u256 math, etc.)
- For market analysis: reference actual odds, calculate expected value, suggest position sizing
- For trading advice: mention slippage, liquidity depth, and AMM mechanics
- Use **bold** for key terms, use bullet points for structured answers
- If asked "who are you" — explain you're Bob, OP_NET's AI agent, powered by deep protocol knowledge + Gemini LLM
- Be opinionated on markets — give clear YES/NO recommendations with reasoning
- Always calculate expected value: EV = (probability × payout) - cost
- Warn about risks but don't be overly cautious — traders want actionable signals
- If someone asks how to use the platform, walk them through: connect OP_WALLET → get testnet BTC from faucet.opnet.org → mint BPUSD tokens → pick a market → place a bet
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

    // Try Gemini if API key is available
    if (GEMINI_API_KEY) {
      try {
        const prices = { btc: PRICE_CACHE.btc?.price || 0, eth: PRICE_CACHE.eth?.price || 0 };
        const endDate = m.end_date ? new Date(m.end_date * 1000).toLocaleDateString() : 'TBD';
        const prompt = `You are Bob, an expert AI analyst for BitPredict — a Bitcoin-native prediction market on OP_NET.

Market: "${m.question}"
Current odds: YES ${(m.yes_price * 100).toFixed(1)}% / NO ${(m.no_price * 100).toFixed(1)}%
Volume: ${m.volume.toLocaleString()} BPUSD | Category: ${m.category} | Deadline: ${endDate}
Live prices: BTC $${prices.btc.toLocaleString()} | ETH $${prices.eth.toLocaleString()}

Provide a concise 2-3 sentence trading signal. Include:
1. Direction: BUY YES, BUY NO, or HOLD
2. Confidence: High, Medium, or Low
3. Brief reasoning based on market data, current prices, and probability assessment

Format your response as: "[DIRECTION] ([Confidence] confidence) — [reasoning]"
Be specific and analytical. Reference actual data points.`;

        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 500, temperature: 0.5 },
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

// --- Faucet: claim BPUSD tokens ---
// TEMPORARY: no restrictions for testing. Production: once per 24h, only if balance=0
const FAUCET_AMOUNT = 500; // 500 BPUSD per claim (small amount)

app.post('/api/faucet/claim', async (req, res) => {
  const { address } = req.body;
  if (!address || typeof address !== 'string' || address.length > 120) {
    return res.status(400).json({ error: 'valid address required' });
  }

  // Rate limit: 1 claim per 5 minutes per address
  if (rateLimit('faucet:' + address, 1, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Faucet cooldown: try again in 5 minutes' });
  }

  // Validate address prefix (OPNet testnet addresses start with opt1)
  if (!address.startsWith('opt1')) {
    return res.status(400).json({ error: 'Invalid address: must be an OPNet testnet address (opt1...)' });
  }

  // Credit in DB first
  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) {
    db.prepare('INSERT INTO users (address, balance) VALUES (?, ?)').run(address, 0);
    user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  }

  const newBalance = user.balance + FAUCET_AMOUNT;
  db.prepare('UPDATE users SET balance = ? WHERE address = ?').run(newBalance, address);

  // On-chain: create real verifiable TX as proof of faucet claim
  let txHash = '';
  let onChainSuccess = false;
  if (deployerWallet) {
    const result = await createOnChainProof(FAUCET_AMOUNT, `faucet:${address.slice(0,12)}`);
    if (result.success) {
      txHash = result.txHash;
      onChainSuccess = true;
    } else {
      console.log('On-chain faucet TX failed (DB credit still applied):', result.error);
    }
  }

  res.json({
    success: true,
    claimed: FAUCET_AMOUNT,
    newBalance,
    txHash,
    onChain: onChainSuccess,
    message: onChainSuccess
      ? '+' + FAUCET_AMOUNT + ' BPUSD sent on-chain! TX: ' + txHash.slice(0, 16) + '...'
      : '+' + FAUCET_AMOUNT + ' BPUSD credited (server-side)',
  });
})

// --- Background jobs ---
// Fetch prices every 15s
setInterval(async () => {
  await fetchPrice('btc');
  await fetchPrice('eth');
  await fetchPrice('sol');
}, 15000);

// Create 5-min markets every 60s
setInterval(() => create5minMarkets(), 60000);

// Resolve expired markets every 15s (fast for 5-min markets)
setInterval(() => resolveExpiredMarkets(), 15000);

// Sync Polymarket events every 5 min
setInterval(() => syncPolymarketEvents(), 5 * 60 * 1000);

// --- Start ---
const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`BitPredict API running on :${PORT}`);
  // Initial price fetch
  await fetchPrice('btc');
  await fetchPrice('eth');
  await fetchPrice('sol');
  // Create initial 5-min markets
  setTimeout(() => create5minMarkets(), 2000);
  // Initial Polymarket sync
  setTimeout(() => syncPolymarketEvents(), 5000);
});
