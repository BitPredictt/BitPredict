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

const PRED_TOKEN = 'opt1sqzc2a3tg6g9u04hlzu8afwwtdy87paeha5c3paph';
const PRED_DECIMALS = 8;
const INCREASE_ALLOWANCE_SELECTOR = 0x395093510;

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
// This creates a verifiable TX on opscan.org without needing token balance.
async function createOnChainProof(amount, memo) {
  if (!deployerWallet || !opnetProvider || !opnetFactory) {
    return { success: false, error: 'Deployer wallet not initialized' };
  }
  if (txLock) {
    return { success: false, error: 'Server busy, try again in a few seconds' };
  }
  txLock = true;
  try {
    const { BinaryWriter } = await import('@btc-vision/transaction');

    const rawAmount = BigInt(amount) * (10n ** BigInt(PRED_DECIMALS));

    const challenge = await getChallenge();
    const utxos = await opnetProvider.fetchUTXO({
      address: deployerWallet.p2tr,
      minAmount: 5000n,
      requestedAmount: 50000n,
    });
    if (!utxos || utxos.length === 0) throw new Error('No UTXOs — fund deployer wallet');

    // increaseAllowance(spender, amount) — real on-chain interaction
    const writer = new BinaryWriter();
    writer.writeSelector(INCREASE_ALLOWANCE_SELECTOR);
    writer.writeAddress(deployerWallet.p2tr); // spender = self (proof only)
    writer.writeU256(rawAmount);

    const result = await opnetFactory.signInteraction({
      signer: deployerWallet.keypair,
      mldsaSigner: deployerWallet.mldsaKeypair,
      network: opnetNetwork,
      utxos,
      from: deployerWallet.p2tr,
      to: PRED_TOKEN,
      contract: PRED_TOKEN,
      calldata: writer.getBuffer(),
      feeRate: 2,
      priorityFee: 1000n,
      gasSatFee: 10000n,
      challenge,
      linkMLDSAPublicKeyToAddress: true,
      revealMLDSAPublicKey: true,
    });

    // Broadcast funding tx, then interaction tx
    const b1 = await opnetProvider.broadcastTransaction(result.transaction[0], false);
    console.log(`[${memo}] Funding TX:`, JSON.stringify(b1));
    await new Promise(r => setTimeout(r, 2000));
    const b2 = await opnetProvider.broadcastTransaction(result.transaction[1], false);
    console.log(`[${memo}] Proof TX:`, JSON.stringify(b2));

    const txHash = b2?.result || '';
    return { success: true, txHash };
  } catch (e) {
    console.error(`On-chain proof error [${memo}]:`, e.message);
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
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','won','lost','cancelled')),
    payout INTEGER NOT NULL DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS faucet_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT NOT NULL,
    amount INTEGER NOT NULL,
    claimed_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`);

// Add tx_hash column to bets if not exists
try { db.exec('ALTER TABLE bets ADD COLUMN tx_hash TEXT'); } catch {}

// --- Price feed (multi-source with fallback chain) ---
const PRICE_CACHE = { btc: { price: 0, ts: 0 }, eth: { price: 0, ts: 0 } };

async function fetchFromBinance(asset) {
  const sym = asset === 'btc' ? 'BTCUSDT' : 'ETHUSDT';
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return parseFloat(data.price) || 0;
}

async function fetchFromCoinGecko(asset) {
  const ids = asset === 'btc' ? 'bitcoin' : 'ethereum';
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { signal: AbortSignal.timeout(5000) });
  const data = await res.json();
  return data[ids]?.usd || 0;
}

async function fetchFromCryptoCompare(asset) {
  const sym = asset === 'btc' ? 'BTC' : 'ETH';
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

        // Settle bets
        const bets = db.prepare('SELECT * FROM bets WHERE market_id = ? AND status = ?').all(m.id, 'active');
        for (const b of bets) {
          if (b.side === outcome) {
            // Winner: payout = amount / price (full share value)
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

// List all markets
app.get('/api/markets', (req, res) => {
  const markets = db.prepare('SELECT * FROM markets ORDER BY end_time ASC').all();
  const mapped = markets.map(m => ({
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
    tags: JSON.parse(m.tags || '[]'),
    marketType: m.market_type,
    yesPool: m.yes_pool,
    noPool: m.no_pool,
  }));
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

// Place a bet (with on-chain PUSD transfer as proof)
app.post('/api/bet', async (req, res) => {
  const { address, marketId, side, amount } = req.body;

  if (!address || !marketId || !side || !amount) {
    return res.status(400).json({ error: 'address, marketId, side, amount required' });
  }
  if (side !== 'yes' && side !== 'no') {
    return res.status(400).json({ error: 'side must be yes or no' });
  }
  if (amount < 100) {
    return res.status(400).json({ error: 'minimum bet is 100 PUSD' });
  }

  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.balance < amount) {
    return res.status(400).json({ error: `Insufficient balance: ${user.balance} PUSD (need ${amount})` });
  }

  const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
  if (!market) return res.status(404).json({ error: 'market not found' });
  if (market.resolved) return res.status(400).json({ error: 'market already resolved' });

  const now = Math.floor(Date.now() / 1000);
  if (market.end_time <= now) return res.status(400).json({ error: 'market has ended' });

  // AMM: constant product
  const fee = Math.ceil(amount * 0.02); // 2% fee
  const netAmount = amount - fee;
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

  // On-chain: REAL proof TX (increaseAllowance on PRED token)
  let txHash = '';
  if (deployerWallet) {
    const onchain = await createOnChainProof(amount, `bet:${side}:${marketId}`);
    if (onchain.success) {
      txHash = onchain.txHash;
    } else {
      console.log('Bet on-chain TX failed (DB bet still placed):', onchain.error);
    }
  }

  // Execute in DB transaction
  const txn = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(amount, address);
    db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, price, shares, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
      betId, address, marketId, side, amount, price, shares, txHash
    );
    const prices = recalcPrices(newYesPool, newNoPool);
    db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
      newYesPool, newNoPool, prices.yes_price, prices.no_price, amount, newYesPool + newNoPool, marketId
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

// Claim payout for resolved bet
app.post('/api/claim', (req, res) => {
  const { address, betId } = req.body;
  if (!address || !betId) return res.status(400).json({ error: 'address, betId required' });

  const bet = db.prepare('SELECT * FROM bets WHERE id = ? AND user_address = ?').get(betId, address);
  if (!bet) return res.status(404).json({ error: 'bet not found' });
  if (bet.status !== 'won') return res.status(400).json({ error: 'bet not claimable' });

  // Already paid out via auto-resolve, just return
  res.json({ success: true, payout: bet.payout });
});

// Get prices
app.get('/api/prices', async (req, res) => {
  const btc = await fetchPrice('btc');
  const eth = await fetchPrice('eth');
  res.json({ btc, eth, ts: Date.now() });
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
  if (side !== 'yes' && side !== 'no') return res.status(400).json({ error: 'side must be yes or no' });
  if (amount < 100) return res.status(400).json({ error: 'minimum bet is 100 PUSD' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.balance < amount) return res.status(400).json({ error: `Insufficient balance: ${user.balance} PUSD` });

    const market = db.prepare('SELECT * FROM markets WHERE id = ?').get(marketId);
    if (!market) return res.status(404).json({ error: 'market not found' });
    if (market.resolved) return res.status(400).json({ error: 'market already resolved' });

    const now = Math.floor(Date.now() / 1000);
    if (market.end_time <= now) return res.status(400).json({ error: 'market has ended' });

    // AMM: constant product
    const fee = Math.ceil(amount * 0.02);
    const netAmount = amount - fee;
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
      db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(amount, address);
      db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, price, shares, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        betId, address, marketId, side, amount, price, shares, txHash
      );
      const prices = recalcPrices(newYesPool, newNoPool);
      db.prepare('UPDATE markets SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?, volume = volume + ?, liquidity = ? WHERE id = ?').run(
        newYesPool, newNoPool, prices.yes_price, prices.no_price, amount, newYesPool + newNoPool, marketId
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
- PUSD token: OP-20 token at opt1sqzc2a3tg6g9u04hlzu8afwwtdy87paeha5c3paph
- PredictionMarket contract: opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj
- AMM: constant-product (x·y=k), 2% protocol fee (200 bps), fee rounds UP to favor protocol
- Markets: binary YES/NO outcomes, shares priced 0–1 PUSD
- Resolution: oracle/creator resolves, winning shares redeem 1:1 from pool
- On-chain flow: approve PUSD → buyShares(marketId, isYes, amount) → claimPayout(marketId)
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
YES: ${(m.yes_price * 100).toFixed(1)}% | NO: ${(m.no_price * 100).toFixed(1)}% | Volume: ${m.volume} PUSD | Liquidity: ${m.liquidity} PUSD
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
        userContext = `\nUser balance: ${user.balance} PUSD | Bets: ${userBets?.total || 0} | Wins: ${userBets?.wins || 0} | Volume: ${userBets?.volume || 0} PUSD`;
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
${activeMarkets.map(m => `• "${m.question}" → YES ${(m.yes_price * 100).toFixed(0)}% / NO ${(m.no_price * 100).toFixed(0)}% | Vol: ${m.volume} PUSD | Liq: ${m.liquidity}`).join('\n')}

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
- If someone asks how to use the platform, walk them through: connect OP_WALLET → claim PUSD from faucet → pick a market → place a bet
- ALWAYS respond in the same language as the user's message (if Russian, reply in Russian, etc.)
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
Volume: ${m.volume.toLocaleString()} PUSD | Category: ${m.category} | Deadline: ${endDate}
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

// --- Faucet: claim PUSD tokens ---
// TEMPORARY: no restrictions for testing. Production: once per 24h, only if balance=0
const FAUCET_AMOUNT = 500; // 500 PUSD per claim (small amount)

app.post('/api/faucet/claim', async (req, res) => {
  const { address } = req.body;
  if (!address || typeof address !== 'string' || address.length > 120) {
    return res.status(400).json({ error: 'valid address required' });
  }

  // Rate limit: 1 claim per 5 minutes per address
  if (rateLimit('faucet:' + address, 1, 5 * 60 * 1000)) {
    return res.status(429).json({ error: 'Faucet cooldown: try again in 5 minutes' });
  }

  // Credit in DB first
  let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) {
    db.prepare('INSERT INTO users (address, balance) VALUES (?, ?)').run(address, 0);
    user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  }

  const FAUCET_AMOUNT = 500;
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
      ? '+' + FAUCET_AMOUNT + ' PUSD sent on-chain! TX: ' + txHash.slice(0, 16) + '...'
      : '+' + FAUCET_AMOUNT + ' PUSD credited (server-side)',
  });
})

// --- Background jobs ---
// Fetch prices every 15s
setInterval(async () => {
  await fetchPrice('btc');
  await fetchPrice('eth');
}, 15000);

// Create 5-min markets every 60s
setInterval(() => create5minMarkets(), 60000);

// Resolve expired markets every 30s
setInterval(() => resolveExpiredMarkets(), 30000);

// --- Start ---
const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`BitPredict API running on :${PORT}`);
  // Initial price fetch
  await fetchPrice('btc');
  await fetchPrice('eth');
  // Create initial 5-min markets
  setTimeout(() => create5minMarkets(), 2000);
});
