/**
 * Test placeBet after approve is confirmed.
 * Uses ONLY deploy/node_modules for SDK consistency.
 */
import { Mnemonic, Address } from './node_modules/@btc-vision/transaction/build/index.js';
import { networks } from './node_modules/@btc-vision/bitcoin/build/index.js';
import { readFileSync } from 'fs';
import { getContract, ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI, OP_20_ABI, JSONRpcProvider } from './node_modules/opnet/build/index.js';

const phrase = readFileSync('.opnet_seed', 'utf8').trim();
const network = networks.opnetTestnet || { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
const RPC_URL = 'https://testnet.opnet.org';
const provider = new JSONRpcProvider({ url: RPC_URL, network });

const WBTC_ADDRESS = 'opt1sqzymwwcv446449k8ntgzw3mw5qvv3e77mskm2ry2';
const MARKET_ADDRESS = 'opt1sqpygvu6f4jmpcztx24e70v820fpaevf94gxcpauv';
const MARKET_PUBKEY = '0x6e6e27cb689ad6c59c990cda1a3b88af04443158c5dbcee5e58eb94fac199f9d';

console.log('Wallet:', wallet.p2tr);

const PredictionMarketAbi = [
  { name: 'placeBet', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'isYes', type: ABIDataTypes.BOOL }, { name: 'amount', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'netAmount', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPool', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getUserBets', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'user', type: ABIDataTypes.ADDRESS }], outputs: [{ name: 'yesBet', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  { name: 'getPrice', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'yesPriceBps', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
  ...OP_NET_ABI,
];

const token = getContract(WBTC_ADDRESS, OP_20_ABI, provider, network, wallet.address);
const market = getContract(MARKET_ADDRESS, PredictionMarketAbi, provider, network, wallet.address);

const bigStr = (k, v) => typeof v === 'bigint' ? v.toString() : v;

// Pre-checks
console.log('\n=== Pre-checks ===');
const bal = await token.balanceOf(wallet.address);
console.log('WBTC balance:', bal?.properties?.balance?.toString());

const spenderAddr = Address.fromString(MARKET_PUBKEY);
const allow = await token.allowance(wallet.address, spenderAddr);
console.log('Allowance for market:', allow?.properties?.allowance?.toString());

const info0 = await market.getMarketInfo(1n);
console.log('Market 1 info:', JSON.stringify(info0.properties, bigStr));

// placeBet
console.log('\n=== placeBet(marketId=1, YES, 20000 sats) ===');
try {
  const sim = await market.placeBet(1n, true, 20000n);
  if (sim.revert) { console.error('REVERT:', sim.revert); process.exit(1); }

  const netAmount = sim.properties?.netAmount;
  console.log('Simulation OK! netAmount:', netAmount?.toString());
  console.log('Expected: 2% fee of 20000 = 400, net = 19600');

  const receipt = await sim.sendTransaction({
    signer: wallet.keypair,
    mldsaSigner: wallet.mldsaKeypair,
    refundTo: wallet.p2tr,
    maximumAllowedSatToSpend: 100000n,
    feeRate: 2,
    network,
  });
  const txHash = receipt?.transactionId || receipt?.txid || '';
  console.log('TX:', txHash);

  // Wait for confirmation
  console.log('Waiting for confirmation...');
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 30000));
    const res = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getTransactionByHash', params: [txHash], id: 1 }),
    });
    const data = await res.json();
    if (data.result?.blockNumber) {
      console.log('CONFIRMED at block', data.result.blockNumber);
      break;
    }
    if (i === 29) console.log('Timed out');
  }

  // Post-bet state
  console.log('\n=== Post-bet state ===');
  const info1 = await market.getMarketInfo(1n);
  console.log('getMarketInfo(1):', JSON.stringify(info1.properties, bigStr));

  const price1 = await market.getPrice(1n);
  console.log('getPrice(1):', JSON.stringify(price1.properties, bigStr));

  const userBets = await market.getUserBets(1n, wallet.address);
  console.log('getUserBets(1):', JSON.stringify(userBets.properties, bigStr));

  const bal2 = await token.balanceOf(wallet.address);
  console.log('WBTC balance after:', bal2?.properties?.balance?.toString());

  console.log('\n=== placeBet E2E PASSED ===');
} catch(e) {
  console.error('Error:', e.message);
}
