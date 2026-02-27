import { OPNetLimitedProvider } from '@btc-vision/transaction';
const p = new OPNetLimitedProvider('https://testnet.opnet.org');
const addr = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';
const PUSD = 'opt1sqrtqma0n885v8z50df9ve6pv8ukkfwwgugfx42sp';

// 1. Check deployer UTXOs
console.log('=== Deployer UTXOs ===');
try {
  const u = await p.fetchUTXO({ address: addr, minAmount: 1n, requestedAmount: 1000000n });
  console.log(`${u.length} UTXOs, total: ${u.reduce((a,x) => a + x.value, 0n)} sats`);
  u.forEach((x,i) => console.log(`  [${i}]: ${x.value} sats, txid: ${x.transactionId}`));
} catch(e) {
  console.log('No UTXOs:', e.message);
}

// 2. Check if PUSD token exists on-chain
console.log('\n=== Check PUSD token ===');
try {
  const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [PUSD, false], id: 1 }),
  });
  const data = await res.json();
  if (data.result && data.result.bytecode) {
    console.log('PUSD EXISTS on-chain!');
    console.log('  Address:', data.result.contractAddress);
    console.log('  Pubkey:', Buffer.from(data.result.contractPublicKey, 'base64').toString('hex'));
    console.log('  Deployer:', data.result.deployerAddress);
    console.log('  Deploy TX:', data.result.deployedTransactionId);
  } else {
    console.log('PUSD NOT FOUND:', JSON.stringify(data.error || data));
  }
} catch(e) {
  console.log('Error checking PUSD:', e.message);
}

// 3. Check current block number
console.log('\n=== Current Block ===');
try {
  const res2 = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 2 }),
  });
  const data2 = await res2.json();
  console.log('Block:', parseInt(data2.result, 16));
} catch(e) {
  console.log('Error:', e.message);
}
