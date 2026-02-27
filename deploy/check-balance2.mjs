import { OPNetLimitedProvider } from '@btc-vision/transaction';
const p = new OPNetLimitedProvider('https://testnet.opnet.org');
const addr = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';

// Try with very low minimum
for (const min of [1n, 100n, 330n, 546n, 1000n]) {
  try {
    const u = await p.fetchUTXO({ address: addr, minAmount: min, requestedAmount: 1000000n });
    console.log(`minAmount=${min}: ${u.length} UTXOs, total=${u.reduce((a,x) => a + x.value, 0n)} sats`);
    if (u.length) u.forEach((x,i) => console.log(`  UTXO[${i}]: ${x.value} sats`));
    break;
  } catch(e) {
    console.log(`minAmount=${min}: no UTXOs`);
  }
}

// Also check via raw RPC for pending/unconfirmed
try {
  const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getUTXOs', params: [addr, false, true], id: 1 }),
  });
  const data = await res.json();
  if (data.result) {
    const utxos = Array.isArray(data.result) ? data.result : data.result.utxos || [];
    console.log('\nRPC getUTXOs:', utxos.length, 'UTXOs');
    utxos.slice(0,5).forEach((u,i) => console.log(`  [${i}]:`, u.value || u.amount, 'sats'));
  } else {
    console.log('RPC getUTXOs error:', JSON.stringify(data.error || data));
  }
} catch(e) {
  console.log('RPC error:', e.message);
}

// Check balance via RPC
try {
  const res2 = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getBalance', params: [addr, true], id: 2 }),
  });
  const data2 = await res2.json();
  console.log('\nRPC getBalance:', JSON.stringify(data2.result || data2.error));
} catch(e) {
  console.log('Balance error:', e.message);
}
