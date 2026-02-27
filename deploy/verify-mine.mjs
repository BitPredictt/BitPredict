// Verify MINE token exists on-chain and supports publicMint
const MINE = 'opt1sqry48kzm2glqu7heyyygw5lwnlvadpqxdujpntpa';
const VIBE = 'opt1sqrctjfhdku23shnqje26f4n5gne45zylwvm9f802';

for (const [name, addr] of [['MINE', MINE], ['VIBE', VIBE]]) {
  try {
    const res = await fetch('https://testnet.opnet.org/api/v1/json-rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [addr, false], id: 1 }),
    });
    const data = await res.json();
    if (data.result && data.result.bytecode) {
      const pubkey = Buffer.from(data.result.contractPublicKey, 'base64').toString('hex');
      console.log(`${name} EXISTS on-chain!`);
      console.log(`  Address: ${data.result.contractAddress}`);
      console.log(`  Pubkey:  ${pubkey}`);
      console.log(`  Deploy TX: ${data.result.deployedTransactionId}`);
    } else {
      console.log(`${name} NOT FOUND:`, JSON.stringify(data.error || data));
    }
  } catch(e) {
    console.log(`${name} error:`, e.message);
  }
}
