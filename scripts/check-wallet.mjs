import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, MLDSASecurityLevel, OPNetLimitedProvider, TransactionFactory } from '@btc-vision/transaction';
import * as fs from 'fs';

const SEED = process.env.OPNET_SEED || (() => { console.error('Set OPNET_SEED env var'); process.exit(1); })();
const network = networks.opnetTestnet;
const RPC = 'https://testnet.opnet.org';

const provider = new JSONRpcProvider({ url: RPC, network });
const m = new Mnemonic(SEED, '', network, MLDSASecurityLevel.LEVEL2);
const wallet = m.derive(0);

console.log('=== Wallet ===');
console.log('P2TR:  ', wallet.p2tr);
console.log('P2WPKH:', wallet.p2wpkh);
console.log('OPNet: ', wallet.address.toHex());

const bal = await provider.getBalance(wallet.p2tr);
console.log('Balance:', bal.toString(), 'sats');

const block = await provider.getBlockNumber();
console.log('Block:  ', block.toString());

if (bal < 50000n) {
  console.log('\n⚠️  Not enough balance to deploy. Need at least 50,000 sats.');
  console.log('    Send testnet BTC to:', wallet.p2tr);
  console.log('    Faucet: https://faucet.opnet.org');
  process.exit(1);
}

// If we have balance, attempt deployment
console.log('\n=== Deploying PredictionMarket ===');

const limitedProvider = new OPNetLimitedProvider(RPC);
const utxos = await limitedProvider.fetchUTXO({
  address: wallet.p2tr,
  minAmount: 10000n,
  requestedAmount: bal,
});
console.log('UTXOs found:', utxos.length);

// Check if WASM bytecode exists
const wasmPath = './contracts/build/PredictionMarket.wasm';
if (!fs.existsSync(wasmPath)) {
  console.log('\n⚠️  WASM not found at', wasmPath);
  console.log('    Compile with: npm run asbuild');
  process.exit(1);
}

const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
console.log('Bytecode size:', bytecode.length, 'bytes');

// NOTE: Full deployment requires a ChallengeSolution from the OPNet network
// This requires fetching the current epoch challenge and solving it
console.log('\n✅ Wallet funded, bytecode ready. Deployment requires ChallengeSolution.');
console.log('   Use OP_WALLET browser extension to deploy, or implement challenge solver.');

m.zeroize();
