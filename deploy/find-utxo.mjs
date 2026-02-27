// Check for UTXOs via raw RPC with all options
const addr = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';

// Try btc_getUTXOs with various params
for (const params of [
  [addr],
  [addr, false],
  [addr, true],  // filterOrdinals
  [addr, false, true],  // mergePending
  [addr, true, true],
  [addr, false, false, true], // optimize
]) {
  try {
    const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getUTXOs', params, id: 1 }),
    });
    const data = await res.json();
    const utxos = data.result || [];
    const arr = Array.isArray(utxos) ? utxos : (utxos.utxos || []);
    if (arr.length > 0) {
      console.log(`params=${JSON.stringify(params)}: ${arr.length} UTXOs`);
      arr.forEach((u, i) => console.log(`  [${i}]:`, JSON.stringify(u).slice(0, 200)));
    } else {
      console.log(`params=${JSON.stringify(params)}: 0 UTXOs`);
    }
  } catch(e) {
    console.log(`params=${JSON.stringify(params)}: error ${e.message}`);
  }
}

// Also check balance
const res2 = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getBalance', params: [addr], id: 2 }),
});
const bal = await res2.json();
console.log('\nBalance:', bal.result ? parseInt(bal.result, 16) : 'unknown', 'sats');
