import { Mnemonic, Address } from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync } from 'fs';
import { getContract, ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI, OP_20_ABI, JSONRpcProvider } from './node_modules/opnet/build/index.js';

const phrase = readFileSync('../.opnet_seed', 'utf8').trim();
const network = networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
const RPC_URL = 'https://testnet.opnet.org';
const provider = new JSONRpcProvider({ url: RPC_URL, network });

const WBTC_ADDRESS = 'opt1sqzymwwcv446449k8ntgzw3mw5qvv3e77mskm2ry2';
const MARKET_PUBKEY = '0x6e6e27cb689ad6c59c990cda1a3b88af04443158c5dbcee5e58eb94fac199f9d';

const PredictionMarketAbi = [
  { name: 'resolveMarket', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'outcome', type: ABIDataTypes.BOOL }], outputs: [], type: BitcoinAbiTypes.Function },
  { name: 'claimPayout', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'withdrawFees', inputs: [], outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPool', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  ...OP_NET_ABI,
];

const market = getContract(MARKET_PUBKEY, PredictionMarketAbi, provider, network, wallet.address);
const token = getContract(WBTC_ADDRESS, OP_20_ABI, provider, network, wallet.address);
const bigStr = (k, v) => typeof v === 'bigint' ? v.toString() : v;

const sendOpts = {
  signer: wallet.keypair,
  mldsaSigner: wallet.mldsaKeypair,
  refundTo: wallet.p2tr,
  maximumAllowedSatToSpend: 200000n,
  feeRate: 2,
  network,
};

async function waitTx(txHash, label) {
  console.log(`  Waiting for ${label}...`);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 15000));
    try {
      const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.result?.blockNumber) {
        console.log(`  ${label} confirmed at block ${data.result.blockNumber}`);
        return true;
      }
    } catch(e) {}
  }
  console.log(`  ${label} NOT confirmed after 7.5min`);
  return false;
}

// Check current block
const blockRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
});
const blockData = await blockRes.json();
const currentBlock = parseInt(blockData.result, 16);
console.log('Current block:', currentBlock);
console.log('Wallet:', wallet.p2tr);

// Check market 2 info first
console.log('\n=== Market 2 info ===');
const info = await market.getMarketInfo(2n);
console.log('info:', JSON.stringify(info.properties, bigStr));

// Initial balance
const bal0 = await token.balanceOf(wallet.address);
console.log('WBTC balance before:', bal0?.properties?.balance?.toString());

// Wait for block > endBlock (simulation may lag 1 block behind RPC)
const END_BLOCK = 4858;
if (currentBlock <= END_BLOCK + 1) {
  console.log(`\nWaiting for block > ${END_BLOCK + 1} (simulation lags)...`);
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 30000));
    const bres = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
    });
    const bd = await bres.json();
    const b = parseInt(bd.result, 16);
    process.stdout.write(`  block: ${b}\n`);
    if (b > END_BLOCK + 1) break;
  }
}

// ===== STEP 1: resolveMarket(2, YES) with retry =====
console.log('\n=== resolveMarket(2, YES) ===');
let resolveSim;
for (let attempt = 0; attempt < 5; attempt++) {
  try {
    resolveSim = await market.resolveMarket(2n, true);
    if (!resolveSim.revert) break;
    console.log(`  attempt ${attempt+1}: revert=${resolveSim.revert}, retrying in 30s...`);
  } catch(e) {
    console.log(`  attempt ${attempt+1}: error=${e.message}, retrying in 30s...`);
  }
  await new Promise(r => setTimeout(r, 30000));
}
if (!resolveSim || resolveSim.revert) { console.error('REVERT after retries:', resolveSim?.revert); process.exit(1); }
console.log('  resolve simulation OK');

const resolveReceipt = await resolveSim.sendTransaction(sendOpts);
const resolveTx = resolveReceipt?.transactionId || resolveReceipt?.txid || '';
console.log('  resolve TX:', resolveTx);
await waitTx(resolveTx, 'resolveMarket');

// ===== STEP 2: claimPayout(2) =====
console.log('\n=== claimPayout(2) ===');
const claimSim = await market.claimPayout(2n);
if (claimSim.revert) { console.error('REVERT:', claimSim.revert); process.exit(1); }
const payout = claimSim.properties?.payout;
console.log('  claim simulation OK, payout:', payout?.toString());

const claimReceipt = await claimSim.sendTransaction(sendOpts);
const claimTx = claimReceipt?.transactionId || claimReceipt?.txid || '';
console.log('  claim TX:', claimTx);
await waitTx(claimTx, 'claimPayout');

// ===== STEP 3: withdrawFees() =====
console.log('\n=== withdrawFees() ===');
const feesSim = await market.withdrawFees();
if (feesSim.revert) { console.error('REVERT:', feesSim.revert); process.exit(1); }
const feesAmount = feesSim.properties?.amount;
console.log('  withdrawFees simulation OK, amount:', feesAmount?.toString());

const feesReceipt = await feesSim.sendTransaction(sendOpts);
const feesTx = feesReceipt?.transactionId || feesReceipt?.txid || '';
console.log('  withdrawFees TX:', feesTx);
await waitTx(feesTx, 'withdrawFees');

// ===== FINAL STATE =====
console.log('\n=== FINAL STATE ===');
const bal1 = await token.balanceOf(wallet.address);
console.log('WBTC balance after:', bal1?.properties?.balance?.toString());

const info2 = await market.getMarketInfo(2n);
console.log('Market 2 info:', JSON.stringify(info2.properties, bigStr));

console.log('\n=== FULL E2E CYCLE COMPLETE ===');
console.log('resolveMarket: TX', resolveTx.slice(0,16));
console.log('claimPayout:   TX', claimTx.slice(0,16), '| payout:', payout?.toString());
console.log('withdrawFees:  TX', feesTx.slice(0,16), '| amount:', feesAmount?.toString());
