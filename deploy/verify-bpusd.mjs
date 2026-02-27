const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: ['opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d', false], id: 1 }),
});
const data = await res.json();
if (data.result && data.result.bytecode) {
  const pubkey = Buffer.from(data.result.contractPublicKey, 'base64').toString('hex');
  console.log('BPUSD ON-CHAIN!');
  console.log('  Address:', data.result.contractAddress);
  console.log('  Pubkey:', pubkey);
  console.log('  Deploy TX:', data.result.deployedTransactionId);
} else {
  console.log('BPUSD NOT FOUND YET:', JSON.stringify(data.error || data));
  console.log('(May need a few more blocks to confirm)');
}
