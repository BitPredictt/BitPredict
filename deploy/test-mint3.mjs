/**
 * Test publicMint on BPUSD via raw btc_call RPC.
 * Uses deployer wallet address as the caller.
 * Verifies the function exists and can be called.
 */
import { Mnemonic } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { createHash } from 'crypto';

const RPC_URL = 'https://testnet.opnet.org/api/v1/json-rpc';
const BPUSD = 'opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d';

const phrase = process.env.OPNET_MNEMONIC;
if (!phrase) { console.error('Set OPNET_MNEMONIC'); process.exit(1); }

const network = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('From:', wallet.p2tr);

// Compute selector from deployer wallet's perspective
// The opnet SDK uses a different hash scheme than raw SHA256 — it uses the
// function name + ABI-encoded types and hashes with SHA256 then takes first 4 bytes
// per OPNet's ABI coder.

// Build calldata for publicMint(1000 * 1e8)
// Selector: sha256("publicMint(uint256)")[0:4]
const sel = createHash('sha256').update('publicMint').digest();
const selector = sel.subarray(0, 4);
console.log('Selector:', selector.toString('hex'));

// Encode amount: 1000 BPUSD = 1000_0000_0000 in 32-byte big-endian u256
const amount = 100000000000n; // 1000 * 10^8
const amountBuf = Buffer.alloc(32);
let tmp = amount;
for (let i = 31; i >= 0; i--) {
  amountBuf[i] = Number(tmp & 0xffn);
  tmp >>= 8n;
}

const calldata = Buffer.concat([selector, amountBuf]);
console.log('Calldata:', calldata.toString('hex'));

const res = await fetch(RPC_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'btc_call',
    params: [
      {
        to: BPUSD,
        from: wallet.p2tr,
        calldata: '0x' + calldata.toString('hex'),
      }
    ],
    id: 1,
  }),
});
const data = await res.json();
if (data.error) {
  console.log('RPC error:', JSON.stringify(data.error));
} else {
  const r = data.result;
  if (r?.revert) {
    console.log('Call reverted:', r.revert);
    // "No public mint" means contract exists but may not allow server wallet
    // "Invalid receiver" means from address isn't recognized
  } else {
    console.log('SUCCESS:', JSON.stringify({ gasUsed: r?.gasUsed, events: r?.events?.length }));
  }
}
