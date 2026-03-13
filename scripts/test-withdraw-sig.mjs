/**
 * Test Treasury withdraw signature verification.
 * Simulates the withdraw call to check if ML-DSA signature is valid.
 */
import { Mnemonic, OPNetLimitedProvider, Address, BinaryWriter } from '@btc-vision/transaction';
import { networks } from '@btc-vision/bitcoin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RPC_URL = 'https://testnet.opnet.org';
const TREASURY_ADDRESS = 'opt1sqph8we83jv6lyhmg5qdaqefduvzszcw8n5qgy6lu';

// Read mnemonic
let phrase = readFileSync(join(__dirname, '..', '.opnet_seed'), 'utf8').trim();
const network = networks.opnetTestnet || networks.testnet;
const mnemonic = new Mnemonic(phrase, '', network);
const wallet = mnemonic.deriveOPWallet(undefined, 0);
console.log('Wallet:', wallet.p2tr);

const provider = new OPNetLimitedProvider(RPC_URL);

// Import ML-DSA
const { ml_dsa44 } = await import('@btc-vision/post-quantum/ml-dsa.js');

// Get Treasury contract pubkey
let treasuryPubKey;
try {
    const codeRes = await fetch(`${RPC_URL}/api/v1/json-rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'btc_getCode', params: [TREASURY_ADDRESS, false], id: 1 }),
    });
    const codeData = await codeRes.json();
    treasuryPubKey = Buffer.from(codeData.result.contractPublicKey, 'base64').toString('hex');
} catch(e) {
    // Fallback: hardcode known pubkey for debug contract
    treasuryPubKey = '1c7bda67c17d7e288c23e9e67a7485d5c5664850ff6036167f3797ad7e772859';
}
console.log('Treasury pubkey:', treasuryPubKey);

// User = deployer for testing
// Use wallet.address directly (Address object from Mnemonic)
const userAddrObj = wallet.address;
const userAddrBytes = Buffer.from(userAddrObj.toBuffer());
console.log('User addr bytes:', userAddrBytes.toString('hex'));

const treasuryAddrBytes = Buffer.from(treasuryPubKey, 'hex');
console.log('Treasury addr bytes:', treasuryAddrBytes.toString('hex'));

// Build message hash (same as server)
function buildHash(userAddrBytes, amount, nonce, treasuryAddrBytes) {
    const typeHashWriter = new BinaryWriter();
    typeHashWriter.writeString('Withdraw(address user,uint256 amount,uint256 nonce)');
    const typeHash = createHash('sha256').update(Buffer.from(typeHashWriter.getBuffer())).digest();

    const domainTypeWriter = new BinaryWriter();
    domainTypeWriter.writeString('EIP712Domain(string name,string version,address verifyingContract)');
    const domainTypeHash = createHash('sha256').update(Buffer.from(domainTypeWriter.getBuffer())).digest();

    const nameWriter = new BinaryWriter();
    nameWriter.writeString('BitPredict Treasury');
    const nameHash = createHash('sha256').update(Buffer.from(nameWriter.getBuffer())).digest();

    const versionWriter = new BinaryWriter();
    versionWriter.writeString('1');
    const versionHash = createHash('sha256').update(Buffer.from(versionWriter.getBuffer())).digest();

    const domainWriter = new BinaryWriter();
    domainWriter.writeBytes(domainTypeHash);
    domainWriter.writeBytes(nameHash);
    domainWriter.writeBytes(versionHash);
    domainWriter.writeAddress(Address.fromString('0x' + treasuryAddrBytes.toString('hex')));
    const domainSeparator = createHash('sha256').update(Buffer.from(domainWriter.getBuffer())).digest();

    console.log('typeHash:', typeHash.toString('hex'));
    console.log('domainTypeHash:', domainTypeHash.toString('hex'));
    console.log('nameHash:', nameHash.toString('hex'));
    console.log('versionHash:', versionHash.toString('hex'));
    console.log('domainSeparator:', domainSeparator.toString('hex'));

    const structWriter = new BinaryWriter();
    structWriter.writeBytes(typeHash);
    structWriter.writeAddress(Address.fromString('0x' + userAddrBytes.toString('hex')));
    structWriter.writeU256(amount);
    structWriter.writeU256(nonce);
    const structHash = createHash('sha256').update(Buffer.from(structWriter.getBuffer())).digest();
    console.log('structHash:', structHash.toString('hex'));

    const finalWriter = new BinaryWriter();
    finalWriter.writeU8(0x19);
    finalWriter.writeU8(0x01);
    finalWriter.writeBytes(domainSeparator);
    finalWriter.writeBytes(structHash);
    const msgHash = createHash('sha256').update(Buffer.from(finalWriter.getBuffer())).digest();
    console.log('messageHash:', msgHash.toString('hex'));

    return msgHash;
}

const amount = 10000n; // 10k sats
const nonce = 0n; // first nonce
const messageHash = buildHash(userAddrBytes, amount, nonce, treasuryAddrBytes);

// Sign with ML-DSA — try BOTH approaches
const privateKey = wallet.mldsaKeypair._privateKey;
const publicKey = wallet.mldsaKeypair._publicKey;
const publicKeyGetter = wallet.mldsaKeypair.publicKey;
console.log('\npubkey len:', publicKey.length, 'privkey len:', privateKey.length);
console.log('publicKey getter len:', publicKeyGetter?.length);
console.log('pubkey === pubkeyGetter:', Buffer.from(publicKey).equals(Buffer.from(publicKeyGetter)));
console.log('pubkey first 8 bytes:', Buffer.from(publicKey).subarray(0, 8).toString('hex'));

// Approach 1: Raw ml_dsa44.sign (deterministic)
const sigRaw = ml_dsa44.sign(messageHash, privateKey);
console.log('\n--- Approach 1: raw ml_dsa44.sign (deterministic) ---');
console.log('sigRaw len:', sigRaw.length);
console.log('sigRaw first 8 bytes:', Buffer.from(sigRaw).subarray(0, 8).toString('hex'));

// Approach 2: mldsaKeypair.sign (hedged mode with extraEntropy)
const sigHedged = wallet.mldsaKeypair.sign(messageHash);
console.log('\n--- Approach 2: mldsaKeypair.sign (hedged) ---');
console.log('sigHedged len:', sigHedged.length);
console.log('sigHedged first 8 bytes:', Buffer.from(sigHedged).subarray(0, 8).toString('hex'));

// Local verification of both
try {
    const verifyRaw = ml_dsa44.verify(sigRaw, messageHash, publicKey);
    console.log('local verify (raw sig):', verifyRaw);
} catch(e) {
    console.log('local verify (raw sig) error:', e.message);
}
try {
    const verifyHedged = ml_dsa44.verify(sigHedged, messageHash, publicKey);
    console.log('local verify (hedged sig):', verifyHedged);
} catch(e) {
    console.log('local verify (hedged sig) error:', e.message);
}
// Also verify using mldsaKeypair.verify
try {
    const kpVerifyRaw = wallet.mldsaKeypair.verify(messageHash, sigRaw);
    console.log('keypair verify (raw sig):', kpVerifyRaw);
} catch(e) {
    console.log('keypair verify (raw sig) error:', e.message);
}
try {
    const kpVerifyHedged = wallet.mldsaKeypair.verify(messageHash, sigHedged);
    console.log('keypair verify (hedged sig):', kpVerifyHedged);
} catch(e) {
    console.log('keypair verify (hedged sig) error:', e.message);
}

// Now simulate contract call via opnet getContract
const opnet = await import('opnet');
const { getContract, ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } = opnet;

// Create proper opnet provider
const opnetProvider = new opnet.JSONRpcProvider({ url: RPC_URL, network });

const TreasuryAbi = [
    {
        name: 'withdraw',
        inputs: [
            { name: 'amount', type: ABIDataTypes.UINT256 },
            { name: 'nonce', type: ABIDataTypes.UINT256 },
            { name: 'serverPubKey', type: ABIDataTypes.BYTES },
            { name: 'signature', type: ABIDataTypes.BYTES },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    ...OP_NET_ABI,
];

const treasury = getContract(TREASURY_ADDRESS, TreasuryAbi, opnetProvider, network, userAddrObj);

// Test 1: Simulate with RAW signature
console.log('\n=== Test 1: Simulate with RAW (deterministic) signature ===');
try {
    const sim1 = await treasury.withdraw(amount, nonce, new Uint8Array(publicKey), new Uint8Array(sigRaw));
    if (sim1?.revert) {
        console.log('REVERT:', sim1.revert);
    } else {
        console.log('SUCCESS! Raw sig simulation passed');
        console.log('Result:', JSON.stringify(sim1?.properties || sim1?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

// Test 2: Simulate with HEDGED signature
console.log('\n=== Test 2: Simulate with HEDGED (mldsaKeypair.sign) signature ===');
try {
    const sim2 = await treasury.withdraw(amount, nonce, new Uint8Array(publicKey), new Uint8Array(sigHedged));
    if (sim2?.revert) {
        console.log('REVERT:', sim2.revert);
    } else {
        console.log('SUCCESS! Hedged sig simulation passed');
        console.log('Result:', JSON.stringify(sim2?.properties || sim2?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

// ===============================================
// testVerify: Check if ML-DSA verification works at all
// ===============================================

const TestVerifyAbi = [
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

const testContract = getContract(TREASURY_ADDRESS, TestVerifyAbi, opnetProvider, network, userAddrObj);

// Sign a simple message with mldsaKeypair.sign (hedged mode)
const testMsg = Buffer.from('Test ML-DSA verification on OPNet testnet');
const testHash = createHash('sha256').update(testMsg).digest();
const testSig = wallet.mldsaKeypair.sign(testHash);
console.log('\n=== testVerify: Simple ML-DSA verification test ===');
console.log('testHash:', testHash.toString('hex'));
console.log('testSig len:', testSig.length);

// Mode 0: verifyMLDSASignature with raw pubkey
console.log('\n--- Mode 0: verifyMLDSASignature (raw pubkey) ---');
try {
    const r0 = await testContract.testVerify(0n, new Uint8Array(testHash), new Uint8Array(testSig), new Uint8Array(publicKey));
    if (r0?.revert) {
        console.log('REVERT:', r0.revert);
    } else {
        console.log('Result:', JSON.stringify(r0?.properties || r0?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

// Mode 1: verifySignature with tx.origin (force ML-DSA)
console.log('\n--- Mode 1: verifySignature(tx.origin, forceMLDSA=true) ---');
try {
    const r1 = await testContract.testVerify(1n, new Uint8Array(testHash), new Uint8Array(testSig), new Uint8Array(publicKey));
    if (r1?.revert) {
        console.log('REVERT:', r1.revert);
    } else {
        console.log('Result:', JSON.stringify(r1?.properties || r1?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}

// Mode 2: verifySignature with tx.origin (consensus-aware)
console.log('\n--- Mode 2: verifySignature(tx.origin, forceMLDSA=false) ---');
try {
    const r2 = await testContract.testVerify(2n, new Uint8Array(testHash), new Uint8Array(testSig), new Uint8Array(publicKey));
    if (r2?.revert) {
        console.log('REVERT:', r2.revert);
    } else {
        console.log('Result:', JSON.stringify(r2?.properties || r2?.decoded));
    }
} catch (err) {
    console.log('ERROR:', err.message);
}
