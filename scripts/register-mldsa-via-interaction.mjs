/**
 * Register ML-DSA key via a contract interaction (sendTransaction).
 * Calls isPaused() on Treasury with ML-DSA key registration flags.
 */
import { Mnemonic, OPNetLimitedProvider } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync } from 'fs';

const RPC_URL = 'https://testnet.opnet.org';
const TREASURY_ADDRESS = 'opt1sqpxgrh5dfksugffzkuh9fxq8hnevjg0hnyxlcpqy';

const phrase = readFileSync('.opnet_seed', 'utf8').trim();
const network = networks.opnetTestnet || networks.testnet;
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

const opnet = await import('opnet');
const { getContract, ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } = opnet;
const opnetProvider = new opnet.JSONRpcProvider({ url: RPC_URL, network });
const userAddrObj = wallet.address;

const TreasuryAbi = [
    {
        name: 'isPaused',
        inputs: [],
        outputs: [{ name: 'paused', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];

const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, opnetProvider, network, userAddrObj);

// Step 1: Simulate isPaused()
console.log('\nSimulating isPaused()...');
const sim = await treasury.isPaused();
console.log('Simulation result:', JSON.stringify(sim?.properties || sim?.decoded));
console.log('Estimated gas:', sim?.estimatedGas?.toString());

// Step 2: Send the transaction with ML-DSA key registration flags
console.log('\nSending transaction with ML-DSA key registration...');
try {
    const receipt = await sim.sendTransaction({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        refundTo: wallet.p2tr,
        maximumAllowedSatToSpend: 100000n,
        network,
        feeRate: 2,
        priorityFee: 0n,
        // ML-DSA key registration flags:
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey: true,
    });

    console.log('Transaction sent!');
    console.log('TX ID:', receipt?.transactionId || receipt?.txid);
    console.log('Receipt:', JSON.stringify(receipt, null, 2).slice(0, 500));
} catch (err) {
    console.error('Send failed:', err.message);
    // Try to extract more info
    if (err.response) {
        console.error('Response:', JSON.stringify(err.response));
    }
}
