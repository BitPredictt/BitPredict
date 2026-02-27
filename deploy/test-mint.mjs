/**
 * Test publicMint on BPUSD from server-side (deployer wallet).
 * This verifies the contract is functional before users try from frontend.
 */
import {
  Mnemonic, TransactionFactory, ChallengeSolution,
  OPNetLimitedProvider, BinaryWriter,
} from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';

const RPC_URL = 'https://testnet.opnet.org';
const BPUSD = 'opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d';
const PUBLIC_MINT_SELECTOR = 0xd1b2f8a2; // publicMint selector — need to verify

const phrase = process.env.OPNET_MNEMONIC;
if (!phrase) { console.error('Set OPNET_MNEMONIC'); process.exit(1); }

const network = { ...networks.testnet, bech32: networks.testnet.bech32Opnet };
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

const provider = new OPNetLimitedProvider(RPC_URL);

// Resolve contract pubkey
const codeRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [BPUSD, false], id: 1 }),
});
const codeData = await codeRes.json();
const contractPubkey = Buffer.from(codeData.result.contractPublicKey, 'base64').toString('hex');
console.log('Contract pubkey:', contractPubkey);

// Get challenge
const epochRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_latestEpoch', params: [], id: 1 }),
});
const { result: e } = await epochRes.json();
const challenge = new ChallengeSolution({
  epochNumber: e.epochNumber,
  mldsaPublicKey: e.proposer.mldsaPublicKey,
  legacyPublicKey: e.proposer.legacyPublicKey,
  solution: e.proposer.solution,
  salt: e.proposer.salt,
  graffiti: e.proposer.graffiti,
  difficulty: Number(e.difficultyScaled),
  verification: {
    epochHash: e.epochHash, epochRoot: e.epochRoot,
    targetHash: e.targetHash, targetChecksum: e.targetHash,
    startBlock: e.startBlock, endBlock: e.endBlock,
    proofs: e.proofs,
  },
});

// Fetch UTXOs
const utxos = await provider.fetchUTXO({
  address: wallet.p2tr,
  minAmount: 5000n,
  requestedAmount: 50000n,
});
console.log('UTXOs:', utxos.length, 'total:', utxos.reduce((a, u) => a + u.value, 0n).toString(), 'sats');

// Build publicMint calldata: publicMint(amount)
// Amount: 1000 BPUSD = 1000 * 10^8 = 100000000000
const writer = new BinaryWriter();
writer.writeSelector(PUBLIC_MINT_SELECTOR);
writer.writeU256(100000000000n); // 1000 BPUSD

const factory = new TransactionFactory();
const result = await factory.signInteraction({
  signer: wallet.keypair,
  mldsaSigner: wallet.mldsaKeypair,
  network,
  utxos,
  from: wallet.p2tr,
  to: BPUSD,
  contract: contractPubkey,
  calldata: writer.getBuffer(),
  feeRate: 2,
  priorityFee: 1000n,
  gasSatFee: 10000n,
  challenge,
  linkMLDSAPublicKeyToAddress: true,
  revealMLDSAPublicKey: true,
});

console.log('\nBroadcasting funding TX...');
const b1 = await provider.broadcastTransaction(result.fundingTransaction, false);
console.log('Funding:', JSON.stringify(b1));

await new Promise(r => setTimeout(r, 2000));

console.log('Broadcasting mint TX...');
const b2 = await provider.broadcastTransaction(result.interactionTransaction, false);
console.log('Mint:', JSON.stringify(b2));

console.log('\n=== BPUSD MINT TEST ===');
console.log('Funding TX:', b1?.result || 'unknown');
console.log('Mint TX:   ', b2?.result || 'unknown');
console.log('Explorer:  ', `https://opscan.org/transactions/${b2?.result}?network=op_testnet`);
