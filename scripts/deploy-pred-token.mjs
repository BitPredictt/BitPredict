import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, MLDSASecurityLevel, AddressTypes, TransactionFactory, BinaryWriter } from '@btc-vision/transaction';
import * as fs from 'fs';

const SEED = process.env.OPNET_SEED || (() => { console.error('Set OPNET_SEED env var'); process.exit(1); })();
const network = networks.opnetTestnet;
const RPC = 'https://testnet.opnet.org';

const provider = new JSONRpcProvider({ url: RPC, network });
const m = new Mnemonic(SEED, '', network, MLDSASecurityLevel.LEVEL2);
const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);

console.log('=== Deploy $PRED Token ===');
console.log('P2TR:', wallet.p2tr);

const bal = await provider.getBalance(wallet.p2tr);
console.log('Balance:', bal.toString(), 'sats');

if (bal < 10000n) {
  console.log('Not enough balance');
  process.exit(1);
}

const wasmPath = './contracts/build/PredToken.wasm';
const bytecode = new Uint8Array(fs.readFileSync(wasmPath));
console.log('Bytecode:', bytecode.length, 'bytes');

// Encode constructor calldata: maxSupply(u256) + decimals(u8) + name(string) + symbol(string)
const writer = new BinaryWriter();
writer.writeU256(100_000_000_00000000n); // 100M with 8 decimals
writer.writeU8(8);
writer.writeStringWithLength('BitPredict');
writer.writeStringWithLength('PRED');
const calldata = writer.getBuffer();
console.log('Calldata:', calldata.length, 'bytes');

const utxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr });
console.log('UTXOs:', utxos.length);

const challenge = await provider.getChallenge();
console.log('Challenge received');

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
  calldata: calldata,
  challenge: challenge,
  linkMLDSAPublicKeyToAddress: true,
  revealMLDSAPublicKey: true,
});

console.log('\nContract address:', deployment.contractAddress);

const fundResult = await provider.sendRawTransaction(deployment.transaction[0]);
console.log('Funding TX:', fundResult);

const revealResult = await provider.sendRawTransaction(deployment.transaction[1]);
console.log('Reveal TX:', revealResult);

console.log('\n🎉 $PRED token deployed at:', deployment.contractAddress);

m.zeroize();
process.exit(0);
