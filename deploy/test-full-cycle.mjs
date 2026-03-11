/**
 * Full cycle: createMarket(short endBlock) → placeBet → wait → resolveMarket → claimPayout → withdrawFees
 */
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
  { name: 'createMarket', inputs: [{ name: 'endBlock', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'placeBet', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'isYes', type: ABIDataTypes.BOOL }, { name: 'amount', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'netAmount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'resolveMarket', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'outcome', type: ABIDataTypes.BOOL }], outputs: [], type: BitcoinAbiTypes.Function },
  { name: 'claimPayout', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'withdrawFees', inputs: [], outputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [
    { name: 'yesPool', type: ABIDataTypes.UINT256 },
    { name: 'noPool', type: ABIDataTypes.UINT256 },
    { name: 'totalPool', type: ABIDataTypes.UINT256 },
    { name: 'endBlock', type: ABIDataTypes.UINT256 },
    { name: 'resolved', type: ABIDataTypes.BOOL },
    { name: 'outcome', type: ABIDataTypes.BOOL },
  ], type: BitcoinAbiTypes.Function },
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
  console.log(`  Waiting for ${label} (TX ${txHash.slice(0,16)})...`);
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 15000));
    try {
      const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (data.result?.blockNumber) {
        console.log(`  ${label} confirmed at block ${data.result.blockNumber} (${parseInt(data.result.blockNumber, 16)})`);
        return parseInt(data.result.blockNumber, 16);
      }
    } catch(e) {}
  }
  console.log(`  ${label} NOT confirmed after 10min`);
  return 0;
}

async function getBlock() {
  const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_blockNumber', params: [], id: 1 }),
  });
  const data = await res.json();
  return parseInt(data.result, 16);
}

console.log('Wallet:', wallet.p2tr);
const curBlock = await getBlock();
console.log('Current block:', curBlock);

const bal0 = await token.balanceOf(wallet.address);
console.log('WBTC balance:', bal0?.properties?.balance?.toString());

// ===== STEP 1: createMarket with endBlock = current + 3 =====
const endBlock = BigInt(curBlock + 7);
console.log(`\n=== STEP 1: createMarket(endBlock=${endBlock}) ===`);

const createSim = await market.createMarket(endBlock);
if (createSim.revert) { console.error('REVERT:', createSim.revert); process.exit(1); }
const marketId = createSim.properties?.marketId;
console.log('  simulation OK, marketId:', marketId?.toString());

const createReceipt = await createSim.sendTransaction(sendOpts);
const createTx = createReceipt?.transactionId || createReceipt?.txid || '';
console.log('  TX:', createTx);
const createBlock = await waitTx(createTx, 'createMarket');

// Check market info
const info0 = await market.getMarketInfo(marketId);
console.log('  Market info:', JSON.stringify(info0.properties, bigStr));

// ===== STEP 2: approve + placeBet =====
console.log('\n=== STEP 2: approve + placeBet ===');
const spenderAddr = Address.fromString(MARKET_PUBKEY);
const approveSim = await token.increaseAllowance(spenderAddr, 15000n);
if (approveSim.revert) { console.error('approve REVERT:', approveSim.revert); process.exit(1); }
console.log('  approve simulation OK');

const approveReceipt = await approveSim.sendTransaction(sendOpts);
const approveTx = approveReceipt?.transactionId || approveReceipt?.txid || '';
await waitTx(approveTx, 'approve');

// placeBet
const betSim = await market.placeBet(marketId, true, 15000n);
if (betSim.revert) { console.error('placeBet REVERT:', betSim.revert); process.exit(1); }
const netAmount = betSim.properties?.netAmount;
console.log('  placeBet simulation OK, netAmount:', netAmount?.toString());

const betReceipt = await betSim.sendTransaction(sendOpts);
const betTx = betReceipt?.transactionId || betReceipt?.txid || '';
await waitTx(betTx, 'placeBet');

// Market info after bet
const info1 = await market.getMarketInfo(marketId);
console.log('  After bet:', JSON.stringify(info1.properties, bigStr));

// ===== STEP 3: Wait for endBlock =====
const targetEndBlock = Number(endBlock);
console.log(`\n=== STEP 3: Waiting for block > ${targetEndBlock} ===`);
for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 30000));
  const b = await getBlock();
  process.stdout.write(`  block: ${b}\n`);
  // Need block AFTER endBlock for simulation to see it
  if (b > targetEndBlock + 1) break;
}

// ===== STEP 4: resolveMarket =====
console.log('\n=== STEP 4: resolveMarket(YES) ===');
let resolveSim;
for (let attempt = 0; attempt < 10; attempt++) {
  try {
    resolveSim = await market.resolveMarket(marketId, true);
    if (resolveSim && !resolveSim.revert) {
      console.log('  resolve simulation OK');
      break;
    }
    console.log(`  attempt ${attempt+1}: revert=${resolveSim?.revert}, retrying in 60s...`);
  } catch(e) {
    console.log(`  attempt ${attempt+1}: ${e.message}, retrying in 60s...`);
  }
  await new Promise(r => setTimeout(r, 60000));
}
if (!resolveSim || resolveSim.revert) { console.error('resolveMarket FAILED after retries'); process.exit(1); }

const resolveReceipt = await resolveSim.sendTransaction(sendOpts);
const resolveTx = resolveReceipt?.transactionId || resolveReceipt?.txid || '';
await waitTx(resolveTx, 'resolveMarket');

// ===== STEP 5: claimPayout =====
console.log('\n=== STEP 5: claimPayout ===');
const claimSim = await market.claimPayout(marketId);
if (claimSim.revert) { console.error('REVERT:', claimSim.revert); process.exit(1); }
const payout = claimSim.properties?.payout;
console.log('  claim simulation OK, payout:', payout?.toString());

const claimReceipt = await claimSim.sendTransaction(sendOpts);
const claimTx = claimReceipt?.transactionId || claimReceipt?.txid || '';
await waitTx(claimTx, 'claimPayout');

// ===== STEP 6: withdrawFees =====
console.log('\n=== STEP 6: withdrawFees ===');
const feesSim = await market.withdrawFees();
if (feesSim.revert) { console.error('REVERT:', feesSim.revert); process.exit(1); }
const feesAmount = feesSim.properties?.amount;
console.log('  withdrawFees simulation OK, amount:', feesAmount?.toString());

const feesReceipt = await feesSim.sendTransaction(sendOpts);
const feesTx = feesReceipt?.transactionId || feesReceipt?.txid || '';
await waitTx(feesTx, 'withdrawFees');

// ===== FINAL STATE =====
console.log('\n=== FINAL STATE ===');
const bal1 = await token.balanceOf(wallet.address);
console.log('WBTC balance after:', bal1?.properties?.balance?.toString());

const info2 = await market.getMarketInfo(marketId);
console.log('Market info:', JSON.stringify(info2.properties, bigStr));

console.log('\n════════════════════════════════════════════');
console.log('=== FULL E2E CYCLE COMPLETE ===');
console.log(`Market #${marketId}: endBlock=${endBlock}`);
console.log(`placeBet:      net=${netAmount?.toString()}`);
console.log(`resolveMarket: TX ${resolveTx.slice(0,16)}`);
console.log(`claimPayout:   TX ${claimTx.slice(0,16)} | payout=${payout?.toString()}`);
console.log(`withdrawFees:  TX ${feesTx.slice(0,16)} | amount=${feesAmount?.toString()}`);
console.log('════════════════════════════════════════════');
