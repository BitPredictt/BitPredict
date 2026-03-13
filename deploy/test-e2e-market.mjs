/**
 * E2E test: createMarket → getMarketInfo → getPrice on deployed PredictionMarket
 */
import { Mnemonic } from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync } from 'fs';
import { getContract, ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI, JSONRpcProvider } from 'opnet';

const phrase = readFileSync('.opnet_seed', 'utf8').trim();
const network = networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

const CONTRACT = 'opt1sqzpqfn6cr5fjzp2crfemjyqg4p9w0fve5vp99r5r';
const RPC_URL = 'https://testnet.opnet.org';
const provider = new JSONRpcProvider({ url: RPC_URL, network });

const PredictionMarketAbi = [
  { name: 'createMarket', inputs: [{ name: 'endBlock', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'placeBet', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'isYes', type: ABIDataTypes.BOOL }, { name: 'amount', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'netAmount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'resolveMarket', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'outcome', type: ABIDataTypes.BOOL }], outputs: [], type: BitcoinAbiTypes.Function },
  { name: 'claimPayout', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'withdrawFees', inputs: [], outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPool', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getUserBets', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'user', type: ABIDataTypes.ADDRESS }], outputs: [{ name: 'yesBet', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getPrice', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPriceBps', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  ...OP_NET_ABI,
];

const contract = getContract(CONTRACT, PredictionMarketAbi, provider, network, wallet.address);

// Get current block
const blockRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
});
const blockData = await blockRes.json();
const currentBlock = parseInt(blockData.result, 16);
console.log('Current block:', currentBlock);

// ========== TEST 1: createMarket ==========
console.log('\n=== TEST 1: createMarket ===');
const endBlock = currentBlock + 100;
console.log('Creating market with endBlock:', endBlock);

const sim = await contract.createMarket(BigInt(endBlock));
if (sim.revert) { console.error('createMarket REVERTED:', sim.revert); process.exit(1); }
const marketId = sim.properties?.marketId;
console.log('createMarket simulation OK. marketId:', marketId?.toString());

const receipt = await sim.sendTransaction({
  signer: wallet.keypair,
  mldsaSigner: wallet.mldsaKeypair,
  refundTo: wallet.p2tr,
  maximumAllowedSatToSpend: 50000n,
  feeRate: 2,
  network,
});
const txHash = receipt?.transactionId || receipt?.txid || '';
console.log('createMarket TX:', txHash);

// Wait for confirmation (1 block ~10 min, but might be faster on testnet)
console.log('Waiting for block confirmation...');
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 10000)); // 10s
  const checkRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
  });
  const checkData = await checkRes.json();
  if (checkData.result?.blockNumber) {
    console.log('TX confirmed in block:', checkData.result.blockNumber);
    break;
  }
  if (i === 29) {
    console.log('TX not confirmed after 5 min — continuing with read tests anyway');
  }
}

// ========== TEST 2: getMarketInfo ==========
console.log('\n=== TEST 2: getMarketInfo(1) ===');
try {
  const info = await contract.getMarketInfo(1n);
  if (info.revert) { console.log('getMarketInfo REVERTED:', info.revert); }
  else {
    console.log('getMarketInfo result:', JSON.stringify(info.properties, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    console.log('  yesPool = 0?', info.properties?.yesPool?.toString() === '0' ? 'YES (correct)' : 'NO (unexpected)');
  }
} catch(e) { console.error('getMarketInfo error:', e.message); }

// ========== TEST 3: getPrice ==========
console.log('\n=== TEST 3: getPrice(1) ===');
try {
  const price = await contract.getPrice(1n);
  if (price.revert) { console.log('getPrice REVERTED:', price.revert); }
  else {
    console.log('getPrice result:', JSON.stringify(price.properties, (k, v) => typeof v === 'bigint' ? v.toString() : v));
    console.log('  yesPriceBps = 5000?', price.properties?.yesPriceBps?.toString() === '5000' ? 'YES (correct — 50/50)' : 'NO');
  }
} catch(e) { console.error('getPrice error:', e.message); }

console.log('\n=== E2E TESTS COMPLETE ===');
