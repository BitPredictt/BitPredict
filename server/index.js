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
`);

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
    db.prepare('INSERT INTO users (address, balance) VALUES (?, 100000)').run(address);
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
