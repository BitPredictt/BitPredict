import { OPNetLimitedProvider } from '@btc-vision/transaction';
const p = new OPNetLimitedProvider('https://testnet.opnet.org');
const addr = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';
try {
  const u = await p.fetchUTXO({ address: addr, minAmount: 1n, requestedAmount: 1000000n });
  console.log('UTXOs:', u.length, 'total:', u.reduce((a,x) => a + x.value, 0n).toString(), 'sats');
} catch(e) {
  console.log('No UTXOs available:', e.message);
  // Try the BTC faucet
  console.log('\nAttempting to claim from OPNet faucet...');
  try {
    const res = await fetch('https://faucet.opnet.org/api/faucet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.text();
    console.log('Faucet response:', data);
  } catch(e2) {
    console.log('Faucet error:', e2.message);
    // Try alternative faucet endpoint
    try {
      const res2 = await fetch('https://faucet.opnet.org/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
        signal: AbortSignal.timeout(30000),
      });
      console.log('Faucet /claim response:', await res2.text());
    } catch(e3) {
      console.log('Alt faucet error:', e3.message);
    }
  }
}
