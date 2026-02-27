const BASE = 'http://localhost:3456';
const ADDR = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';
let pass = 0, fail = 0;

function check(name, ok, detail) {
  if (ok) { pass++; console.log('PASS', name, detail || ''); }
  else { fail++; console.log('FAIL', name, detail || ''); }
}

async function post(path, body) {
  const r = await fetch(BASE + path, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  return r.json();
}

// 1. Health
const h = await fetch(BASE + '/api/health').then(r=>r.json());
check('Health', h.status === 'ok', h.status);

// 2. Markets
const markets = await fetch(BASE + '/api/markets').then(r=>r.json());
check('Markets load', markets.length > 0, 'count=' + markets.length);
const active = markets.find(m => !m.resolved && m.endTime > Date.now()/1000);
check('Active market exists', !!active, active?.id);

// 3. Auth
const auth = await post('/api/auth', {address: ADDR});
check('Auth', auth.address === ADDR);

// 4. Faucet with on-chain TX
const f = await post('/api/faucet/claim', {address: ADDR});
check('Faucet success', f.success === true);
check('Faucet on-chain', f.onChain === true, 'txHash=' + (f.txHash || 'NONE'));
check('Faucet txHash 64 chars', (f.txHash || '').length === 64);

// 5. Bet with on-chain TX
if (active) {
  const b = await post('/api/bet', {address: ADDR, marketId: active.id, side: 'yes', amount: 200});
  check('Bet success', b.success === true);
  check('Bet on-chain', b.onChain === true, 'txHash=' + (b.txHash || 'NONE'));
  check('Bet txHash 64 chars', (b.txHash || '').length === 64);
  check('Bet shares > 0', b.shares > 0, 'shares=' + b.shares);
}

// 6. AI signal
if (active) {
  const sig = await fetch(BASE + '/api/ai/signal/' + active.id + '?address=' + ADDR).then(r=>r.json());
  check('AI signal', !!sig.signal, (sig.signal || '').slice(0,50));
}

// 7. Leaderboard
const lb = await fetch(BASE + '/api/leaderboard').then(r=>r.json());
check('Leaderboard', Array.isArray(lb), 'count=' + lb.length);

// 8. User bets
const ub = await fetch(BASE + '/api/bets/' + ADDR).then(r=>r.json());
check('User bets', Array.isArray(ub), 'count=' + ub.length);

// 9. Check PUSD not PRED in server responses
check('No PRED in faucet msg', !(f.message || '').includes('PRED'), f.message);

console.log('\n===== RESULTS =====');
console.log('PASS:', pass, '| FAIL:', fail);
process.exit(fail > 0 ? 1 : 0);
