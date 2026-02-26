import { JSONRpcProvider, getContract } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { Mnemonic, MLDSASecurityLevel, AddressTypes } from '@btc-vision/transaction';

const SEED = process.env.OPNET_SEED || (() => { console.error('Set OPNET_SEED env var'); process.exit(1); })();
const network = networks.opnetTestnet;
const RPC = 'https://testnet.opnet.org';
const CONTRACT = 'opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj';

const ABI = [
  { name: 'createMarket', inputs: [{ name: 'endBlock', type: 'UINT256' }], outputs: [{ name: 'marketId', type: 'UINT256' }], type: 'function' },
  { name: 'getMarketInfo', inputs: [{ name: 'marketId', type: 'UINT256' }], outputs: [{ name: 'yesReserve', type: 'UINT256' }], type: 'function' },
  { name: 'getPrice', inputs: [{ name: 'marketId', type: 'UINT256' }], outputs: [{ name: 'yesPriceBps', type: 'UINT256' }], type: 'function' },
];

const provider = new JSONRpcProvider({ url: RPC, network });
const m = new Mnemonic(SEED, '', network, MLDSASecurityLevel.LEVEL2);
const wallet = m.deriveOPWallet(AddressTypes.P2TR, 0);

console.log('=== Create First Market ===');
console.log('Wallet:', wallet.p2tr);

const bal = await provider.getBalance(wallet.p2tr);
console.log('Balance:', bal.toString(), 'sats');

const block = await provider.getBlockNumber();
console.log('Current block:', block.toString());

// First check if contract code exists
console.log('\nChecking contract code...');
try {
  const code = await provider.getCode(CONTRACT, true);
  console.log('Contract bytecode length:', code?.bytecode?.length || 'not found');
} catch (e) {
  console.log('Contract not indexed yet:', e.message);
  console.log('Deployment TXs may need more confirmations. Try again later.');
  m.zeroize();
  process.exit(1);
}

const endBlock = block + 1000n;
console.log('End block:', endBlock.toString());

// Use getContract() → simulate → sendTransaction per Bob's rules
console.log('\nCreating contract interface...');
const contract = getContract(CONTRACT, ABI, provider, network, wallet.address);

console.log('Simulating createMarket...');
const sim = await contract.createMarket(endBlock);

if (sim.revert) {
  console.log('Simulation reverted:', sim.revert);
  m.zeroize();
  process.exit(1);
}

console.log('Simulation OK, sending transaction...');
const tx = await sim.sendTransaction({
  signer: wallet.keypair,
  mldsaSigner: wallet.mldsaKeypair,
  refundTo: wallet.p2tr,
  maximumAllowedSatToSpend: 50000n,
  feeRate: 5,
  network: network,
});
console.log('TX result:', tx);
console.log('\n✅ Market created! Ending at block', endBlock.toString());

m.zeroize();
process.exit(0);
