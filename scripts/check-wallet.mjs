import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, MLDSASecurityLevel, AddressTypes, TransactionFactory } from '@btc-vision/transaction';
import * as fs from 'fs';

const SEED = process.env.OPNET_SEED || (() => { console.error('Set OPNET_SEED env var'); process.exit(1); })();
const network = networks.opnetTestnet;
const RPC = 'https://testnet.opnet.org';

const provider = new JSONRpcProvider({ url: RPC, network });
const m = new Mnemonic(SEED, '', network, MLDSASecurityLevel.LEVEL2);
const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);

console.log('=== BitPredict Deployment ===');
console.log('P2TR:', wallet.p2tr);

const bal = await provider.getBalance(wallet.p2tr);
console.log('Balance:', bal.toString(), 'sats');

if (bal < 50000n) {
  console.log('\n⚠️  Need at least 50,000 sats. Fund:', wallet.p2tr);
  process.exit(1);
}

const wasmPath = './contracts/build/PredictionMarket.wasm';
if (!fs.existsSync(wasmPath)) {
  console.log('⚠️  WASM not found. Run: cd contracts && npm run build');
  process.exit(1);
}

const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
console.log('Bytecode:', bytecode.length, 'bytes');

// Get UTXOs
console.log('\nFetching UTXOs...');
const utxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr });
console.log('UTXOs:', utxos.length);

if (utxos.length === 0) {
  console.log('⚠️  No UTXOs found');
  process.exit(1);
}

// Get challenge
console.log('Fetching challenge...');
const challenge = await provider.getChallenge();
console.log('Challenge received');

// Deploy
console.log('\nSigning deployment...');
const factory = new TransactionFactory();
const deployment = await factory.signDeployment({
  from: wallet.p2tr,
  utxos: utxos,
  signer: wallet.keypair,
  mldsaSigner: wallet.mldsaKeypair,
  network: network,
  feeRate: 5,
  priorityFee: 0n,
  gasSatFee: 10000n,
  bytecode: bytecode,
  challenge: challenge,
  linkMLDSAPublicKeyToAddress: true,
  revealMLDSAPublicKey: true,
});

console.log('\n✅ Contract address:', deployment.contractAddress);
console.log('Funding TX hex length:', deployment.transaction[0].length);
console.log('Reveal TX hex length:', deployment.transaction[1].length);

// Broadcast
console.log('\nBroadcasting funding TX...');
const fundResult = await provider.sendRawTransaction(deployment.transaction[0]);
console.log('Funding TX ID:', fundResult);

console.log('Broadcasting reveal TX...');
const revealResult = await provider.sendRawTransaction(deployment.transaction[1]);
console.log('Reveal TX ID:', revealResult);

console.log('\n🎉 Contract deployed at:', deployment.contractAddress);
console.log('Explorer: https://opscan.org/address/' + deployment.contractAddress);

m.zeroize();
process.exit(0);
