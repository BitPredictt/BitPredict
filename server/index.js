import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

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

// --- Price feed ---
const PRICE_CACHE = { btc: { price: 0, ts: 0 }, eth: { price: 0, ts: 0 } };

async function fetchPrice(asset) {
  const now = Date.now();
  const cached = PRICE_CACHE[asset];
  if (cached && now - cached.ts < 15000) return cached.price; // 15s cache

  try {
    const ids = asset === 'btc' ? 'bitcoin' : 'ethereum';
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    const data = await res.json();
    const price = data[ids]?.usd || 0;
    if (price > 0) {
      PRICE_CACHE[asset] = { price, ts: now };
      db.prepare('INSERT INTO price_snapshots (asset, price) VALUES (?, ?)').run(asset, price);
    }
    return price;
  } catch (e) {
    console.error('Price fetch error:', e.message);
    return cached?.price || 0;
  }
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

// Place a bet
app.post('/api/bet', (req, res) => {
  const { address, marketId, side, amount } = req.body;

  if (!address || !marketId || !side || !amount) {
    return res.status(400).json({ error: 'address, marketId, side, amount required' });
  }
  if (side !== 'yes' && side !== 'no') {
    return res.status(400).json({ error: 'side must be yes or no' });
  }
  if (amount < 100) {
    return res.status(400).json({ error: 'minimum bet is 100 PRED' });
  }

  const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
  if (!user) return res.status(404).json({ error: 'user not found' });
  if (user.balance < amount) {
    return res.status(400).json({ error: `Insufficient balance: ${user.balance} PRED (need ${amount})` });
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

  // Execute in transaction
  const txn = db.transaction(() => {
    db.prepare('UPDATE users SET balance = balance - ? WHERE address = ?').run(amount, address);
    db.prepare('INSERT INTO bets (id, user_address, market_id, side, amount, price, shares) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      betId, address, marketId, side, amount, price, shares
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
  if (amount < 100) return res.status(400).json({ error: 'minimum bet is 100 PRED' });

  try {
    const user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.balance < amount) return res.status(400).json({ error: `Insufficient balance: ${user.balance} PRED` });

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
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'REDACTED_KEY';
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
- PRED token: OP-20 token at opt1sqzc2a3tg6g9u04hlzu8afwwtdy87paeha5c3paph
- PredictionMarket contract: opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj
- AMM: constant-product (x·y=k), 2% protocol fee (200 bps), fee rounds UP to favor protocol
- Markets: binary YES/NO outcomes, shares priced 0–1 PRED
- Resolution: oracle/creator resolves, winning shares redeem 1:1 from pool
- On-chain flow: approve PRED → buyShares(marketId, isYes, amount) → claimPayout(marketId)
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
  if (!message) return res.status(400).json({ error: 'message required' });

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
YES: ${(m.yes_price * 100).toFixed(1)}% | NO: ${(m.no_price * 100).toFixed(1)}% | Volume: ${m.volume} PRED | Liquidity: ${m.liquidity} PRED
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
        userContext = `\nUser balance: ${user.balance} PRED | Bets: ${userBets?.total || 0} | Wins: ${userBets?.wins || 0} | Volume: ${userBets?.volume || 0} PRED`;
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
${activeMarkets.map(m => `• "${m.question}" → YES ${(m.yes_price * 100).toFixed(0)}% / NO ${(m.no_price * 100).toFixed(0)}% | Vol: ${m.volume} PRED | Liq: ${m.liquidity}`).join('\n')}

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
- If someone asks how to use the platform, walk them through: connect OP_WALLET → claim PRED from faucet → pick a market → place a bet
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

// Bob quick analysis endpoint — for market cards
app.get('/api/ai/signal/:marketId', async (req, res) => {
  const m = db.prepare('SELECT * FROM markets WHERE id = ?').get(req.params.marketId);
  if (!m) return res.status(404).json({ error: 'market not found' });

  try {
    const prices = { btc: PRICE_CACHE.btc?.price || 0, eth: PRICE_CACHE.eth?.price || 0 };
    const prompt = `You are Bob, OP_NET AI. Give a 1-2 sentence trading signal for this prediction market:
"${m.question}" — YES ${(m.yes_price * 100).toFixed(0)}% / NO ${(m.no_price * 100).toFixed(0)}%
Volume: ${m.volume} PRED | Category: ${m.category} | BTC=$${prices.btc.toLocaleString()}
Include: signal direction (BUY YES/BUY NO/HOLD), confidence (low/med/high), brief reason.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.6 },
        }),
      }
    );

    if (!geminiRes.ok) return res.status(500).json({ error: 'signal unavailable' });
    const data = await geminiRes.json();
    const signal = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ marketId: m.id, signal, source: 'bob' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Faucet: claim PRED tokens ---
// Rules: once per 24h, ONLY if balance = 0 (user lost all PRED)
const FAUCET_COOLDOWN = 86400; // 24 hours
const FAUCET_AMOUNT = 50000; // 50k PRED per claim

app.post('/api/faucet/claim', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  try {
    let user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    if (!user) {
      db.prepare('INSERT INTO users (address, balance) VALUES (?, 0)').run(address);
      user = db.prepare('SELECT * FROM users WHERE address = ?').get(address);
    }

    // Only allow claim if balance is 0
    if (user.balance > 0) {
      return res.status(400).json({ error: `You still have ${user.balance} PRED. Faucet is only available when your balance is 0.` });
    }

    const now = Math.floor(Date.now() / 1000);
    const lastClaim = db.prepare('SELECT MAX(claimed_at) as last FROM faucet_claims WHERE address = ?').get(address);
    if (lastClaim?.last && now - lastClaim.last < FAUCET_COOLDOWN) {
      const wait = FAUCET_COOLDOWN - (now - lastClaim.last);
      const hours = Math.floor(wait / 3600);
      const mins = Math.ceil((wait % 3600) / 60);
      return res.status(429).json({ error: `Faucet cooldown: ${hours}h ${mins}m remaining`, cooldown: wait });
    }

    db.prepare('UPDATE users SET balance = balance + ? WHERE address = ?').run(FAUCET_AMOUNT, address);
    db.prepare('INSERT INTO faucet_claims (address, amount) VALUES (?, ?)').run(address, FAUCET_AMOUNT);

    const newBalance = db.prepare('SELECT balance FROM users WHERE address = ?').get(address).balance;
    res.json({ success: true, claimed: FAUCET_AMOUNT, newBalance, message: `Claimed ${FAUCET_AMOUNT.toLocaleString()} PRED!` });
  } catch (e) {
    console.error('Faucet error:', e.message);
    res.status(500).json({ error: 'Faucet error: ' + e.message });
  }
});

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
