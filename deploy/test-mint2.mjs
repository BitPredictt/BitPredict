/**
 * Test publicMint on BPUSD using opnet SDK (getContract + ABI pattern).
 * Same approach as the frontend — SDK handles selector computation.
 */
import { JSONRpcProvider, getContract, ABIDataTypes, BitcoinAbiTypes, BitcoinUtils } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const NETWORK = networks.testnet;
const RPC_URL = 'https://testnet.opnet.org/api/v1/json-rpc';
const BPUSD = 'opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d';

const MINTABLE_ABI = [
  {
    name: 'publicMint',
    inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
    outputs: [],
    type: BitcoinAbiTypes.Function,
  },
];

console.log('Connecting to OPNet testnet...');
const provider = new JSONRpcProvider(RPC_URL, NETWORK);

// Use a dummy sender address for simulation (deployer wallet)
const senderAddr = 'opt1pjg7vu2qts5p7ls3hh9qpxmwnkmsy9yyqyxv66vxduu9kuq2l689s8vz2m2';

console.log('Creating contract instance...');
const contract = getContract(BPUSD, MINTABLE_ABI, provider, NETWORK);

const rawAmount = BitcoinUtils.expandToDecimals(1000, 8); // 1000 BPUSD
console.log('Simulating publicMint(', rawAmount.toString(), ')...');

try {
  const sim = await contract.publicMint(rawAmount);
  console.log('Simulation result:', JSON.stringify({
    revert: sim?.revert || null,
    gasUsed: sim?.gasUsed?.toString() || '0',
    events: sim?.events?.length || 0,
  }));
  
  if (sim?.revert) {
    console.log('REVERT:', sim.revert);
  } else {
    console.log('SUCCESS: publicMint simulation passed!');
    console.log('The contract accepts publicMint calls.');
    console.log('Frontend mint via OP_WALLET should work.');
  }
} catch (e) {
  console.error('Error:', e.message);
  if (e.message.includes('selector')) {
    console.log('Selector issue — check ABI definition');
  }
}
