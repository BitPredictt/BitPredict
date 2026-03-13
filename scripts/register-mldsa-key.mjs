/**
 * Register ML-DSA public key on OPNet testnet.
 * Sends a self-transfer transaction with revealMLDSAPublicKey + linkMLDSAPublicKeyToAddress flags.
 */
import { Mnemonic, TransactionFactory, OPNetLimitedProvider } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync } from 'fs';

const RPC_URL = 'https://testnet.opnet.org';

const phrase = readFileSync('.opnet_seed', 'utf8').trim();
const network = networks.opnetTestnet || networks.testnet;
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);

console.log('Wallet P2TR:', wallet.p2tr);
console.log('ML-DSA pubkey length:', wallet.mldsaKeypair._publicKey.length);
console.log('ML-DSA pubkey (first 16 bytes):', Buffer.from(wallet.mldsaKeypair._publicKey).subarray(0, 16).toString('hex'));

const provider = new OPNetLimitedProvider(RPC_URL);

// First check if ML-DSA key is already registered
console.log('\nChecking if ML-DSA key is already registered...');
try {
    const resp = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'btc_getPublicKeysInfo',
            params: [[wallet.p2tr]],
            id: 1,
        }),
    });
    const data = await resp.json();
    console.log('getPublicKeysInfo result:', JSON.stringify(data.result, null, 2));
} catch (e) {
    console.log('Could not check:', e.message);
}

// Fetch UTXOs
console.log('\nFetching UTXOs...');
const utxos = await provider.fetchUTXO({
    address: wallet.p2tr,
    minAmount: 10000n,
    requestedAmount: 100000n,
});
console.log('UTXOs found:', utxos.length, 'total:', utxos.reduce((sum, u) => sum + BigInt(u.value), 0n).toString(), 'sats');

if (utxos.length === 0) {
    console.error('No UTXOs available!');
    process.exit(1);
}

// Create self-transfer transaction with ML-DSA key registration
console.log('\nCreating ML-DSA key registration transaction...');
const factory = new TransactionFactory();

try {
    const result = await factory.createBTCTransfer({
        signer: wallet.keypair,
        mldsaSigner: wallet.mldsaKeypair,
        network,
        from: wallet.p2tr,
        to: wallet.p2tr,  // self-transfer
        amount: 546n,     // minimum dust
        utxos,
        feeRate: 2,
        priorityFee: 0n,
        gasSatFee: 0n,
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey: true,
    });

    console.log('Transaction created!');
    console.log('Estimated fees:', result.estimatedFees?.toString(), 'sats');
    console.log('TX hex length:', result.tx?.length);

    // Broadcast
    console.log('\nBroadcasting...');
    const broadcastResult = await provider.broadcastTransaction(result.tx, false);
    console.log('Broadcast result:', JSON.stringify(broadcastResult));

    console.log('\n✓ ML-DSA key registration transaction sent!');
    console.log('Wait for confirmation, then re-test signature verification.');
} catch (err) {
    console.error('Failed to create/send transaction:', err.message);
    console.error(err.stack);
}
