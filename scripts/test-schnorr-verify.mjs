/**
 * Test Schnorr verification on OPNet testnet via testVerify method.
 * Mode 0 = verifyMLDSASignature (raw pubkey)
 * Mode 1 = verifySignature(tx.origin, forceMLDSA=true)
 * Mode 2 = verifySignature(tx.origin, consensus=false)
 * Mode 3 = raw Schnorr verifySignature with 32-byte key
 */
import { Mnemonic, Address, BinaryWriter } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';

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

const TestAbi = [
    {
        name: 'testVerify',
        inputs: [
            { name: 'mode', type: ABIDataTypes.UINT256 },
            { name: 'hash', type: ABIDataTypes.BYTES },
            { name: 'signature', type: ABIDataTypes.BYTES },
            { name: 'rawPubKey', type: ABIDataTypes.BYTES },
        ],
        outputs: [{ name: 'result', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];

const contract = getContract(TREASURY_ADDRESS, TestAbi, opnetProvider, network, userAddrObj);

// Sign a simple message with Schnorr
const testMsg = createHash('sha256').update(Buffer.from('Test Schnorr verification on OPNet')).digest();
console.log('testHash:', testMsg.toString('hex'));

const kp = wallet.keypair;
const schnorrSig = kp.signSchnorr(testMsg);
console.log('schnorrSig len:', schnorrSig.length);
console.log('schnorrSig hex:', Buffer.from(schnorrSig).toString('hex').slice(0, 32) + '...');

// Get x-only public key (32 bytes)
const xOnlyPubKey = Buffer.from(kp.publicKey).slice(1); // Remove 02/03 prefix
console.log('xOnlyPubKey len:', xOnlyPubKey.length);
console.log('xOnlyPubKey hex:', xOnlyPubKey.toString('hex'));

// Local Schnorr verify
const localVerify = kp.verifySchnorr(testMsg, schnorrSig);
console.log('local schnorr verify:', localVerify);

// Also get ML-DSA pubkey for modes 0/1
const mldsaPubKey = wallet.mldsaKeypair._publicKey;

// === Mode 3: Raw Schnorr verification (32-byte key) ===
console.log('\n=== Mode 3: Raw Schnorr verification ===');
try {
    const r3 = await contract.testVerify(
        3n,
        new Uint8Array(testMsg),
        new Uint8Array(schnorrSig),
        new Uint8Array(xOnlyPubKey),
    );
    if (r3?.revert) {
        console.log('REVERT:', r3.revert);
    } else {
        console.log('Result:', JSON.stringify(r3?.properties || r3?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

// === Mode 0: ML-DSA with raw pubkey (for comparison) ===
console.log('\n=== Mode 0: ML-DSA raw pubkey (expected: false) ===');
const mldsaSig = wallet.mldsaKeypair.sign(testMsg);
try {
    const r0 = await contract.testVerify(
        0n,
        new Uint8Array(testMsg),
        new Uint8Array(mldsaSig),
        new Uint8Array(mldsaPubKey),
    );
    if (r0?.revert) {
        console.log('REVERT:', r0.revert);
    } else {
        console.log('Result:', JSON.stringify(r0?.properties || r0?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

console.log('\nDone.');
