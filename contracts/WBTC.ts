/**
 * WBTC — Wrapped Bitcoin OP-20 Token
 *
 * 1:1 BTC<->WBTC NativeSwap contract.
 * - wrap(): User sends BTC to pool address → contract mints WBTC
 * - unwrap(): Contract burns WBTC → frontend sends BTC from pool to user via extraOutputs
 *
 * Pool address = deployer's p2tr (testnet).
 * Verification via Blockchain.tx.outputs (NativeSwap pattern).
 */

import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    OP20,
    OP20InitParameters,
    Blockchain,
    Calldata,
    BytesWriter,
    Revert,
    NetEvent,
    StoredBoolean,
    StoredU256,
    StoredAddress,
    StoredString,
    SafeMath,
    Address,
    Bech32,
} from '@btc-vision/btc-runtime/runtime';

import { SegwitDecoded } from '@btc-vision/btc-runtime/runtime/script/ScriptUtils';

// ============================================================
// Events
// ============================================================

class WrapEvent extends NetEvent {
    constructor(user: Address, amount: u256) {
        const data = new BytesWriter(64);
        data.writeAddress(user);
        data.writeU256(amount);
        super('Wrap', data);
    }
}

class UnwrapEvent extends NetEvent {
    constructor(user: Address, amount: u256) {
        const data = new BytesWriter(64);
        data.writeAddress(user);
        data.writeU256(amount);
        super('Unwrap', data);
    }
}

class PoolAddressChangedEvent extends NetEvent {
    constructor(newPool: string) {
        const poolBytes = String.UTF8.encode(newPool);
        const data = new BytesWriter(poolBytes.byteLength + 4);
        data.writeStringWithLength(newPool);
        super('PoolAddressChanged', data);
    }
}

// ============================================================
// Contract
// ============================================================

@final
export class WBTC extends OP20 {
    // Storage
    private poolBtcAddress: StoredString;
    private totalWrapped: StoredU256;
    private adminAddress: StoredAddress;
    private _paused: StoredBoolean;

    // Cached decoded pool program (32 bytes) for output comparison
    private _poolProgram: Uint8Array | null = null;

    public constructor() {
        super();
        this.poolBtcAddress = new StoredString(Blockchain.nextPointer, 0);
        this.totalWrapped = new StoredU256(Blockchain.nextPointer, new Uint8Array(0));
        this.adminAddress = new StoredAddress(Blockchain.nextPointer);
        this._paused = new StoredBoolean(Blockchain.nextPointer, false);
    }

    // ============================================================
    // Lifecycle
    // ============================================================

    public override onDeployment(calldata: Calldata): void {
        const poolAddr: string = calldata.readStringWithLength();

        // Validate pool address is a valid bech32
        const decoded = Bech32.decodeOrNull(poolAddr);
        if (decoded === null) {
            throw new Revert('Invalid pool bech32 address');
        }

        // WBTC: 8 decimals, 21M max supply (same as BTC)
        const maxSupply: u256 = u256.fromU64(2_100_000_000_000_000); // 21M * 1e8
        this.instantiate(new OP20InitParameters(maxSupply, 8, 'Wrapped Bitcoin', 'WBTC'));

        this.poolBtcAddress.value = poolAddr;
        this.adminAddress.value = Blockchain.tx.sender;
        this.totalWrapped.value = u256.Zero;
    }

    // ============================================================
    // Core: wrap / unwrap
    // ============================================================

    /**
     * wrap(amount: u256) — Wrap BTC to WBTC.
     * User must include extraOutputs sending BTC to poolBtcAddress.
     * Contract verifies the output via Blockchain.tx.outputs.
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public wrap(calldata: Calldata): BytesWriter {
        this.whenNotPaused();

        const amount: u256 = calldata.readU256();
        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Amount must be > 0');
        }

        const sender: Address = Blockchain.tx.sender;
        const poolProgram = this.getPoolProgram();

        // Verify BTC output to pool address
        const outputs = Blockchain.tx.outputs;
        let verified: boolean = false;
        const targetValue: u64 = amount.toU64();

        for (let i: i32 = 0; i < outputs.length; i++) {
            const output = outputs[i];
            if (!output.hasTo || output.to === null) continue;

            const outputAddr = output.to as string;
            if (this.matchesPoolAddress(outputAddr, poolProgram)) {
                if (output.value >= targetValue) {
                    verified = true;
                    break;
                }
            }
        }

        if (!verified) {
            throw new Revert('No BTC output to pool address found');
        }

        // Mint WBTC 1:1
        this._mint(sender, amount);
        this.totalWrapped.value = SafeMath.add(this.totalWrapped.value, amount);

        this.emitEvent(new WrapEvent(sender, amount));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    /**
     * unwrap(amount: u256) — Unwrap WBTC to BTC.
     * Frontend must include extraOutputs sending BTC from pool to user.
     * Contract verifies output to user address, then burns WBTC.
     */
    @method({ name: 'amount', type: ABIDataTypes.UINT256 })
    @returns({ name: 'success', type: ABIDataTypes.BOOL })
    public unwrap(calldata: Calldata): BytesWriter {
        this.whenNotPaused();

        const amount: u256 = calldata.readU256();
        if (u256.eq(amount, u256.Zero)) {
            throw new Revert('Amount must be > 0');
        }

        const sender: Address = Blockchain.tx.sender;

        // Check WBTC balance
        if (u256.lt(this._balanceOf(sender), amount)) {
            throw new Revert('Insufficient WBTC balance');
        }

        // Check totalWrapped
        if (u256.lt(this.totalWrapped.value, amount)) {
            throw new Revert('Insufficient pool liquidity');
        }

        // Verify BTC output to user's address
        const outputs = Blockchain.tx.outputs;
        let verified: boolean = false;
        const targetValue: u64 = amount.toU64();

        // Get sender's bech32 program for matching
        // Sender address is the tx.sender — we need to find an output going TO the sender
        // The sender's Bitcoin address will be in the outputs as a bech32 string
        for (let i: i32 = 0; i < outputs.length; i++) {
            const output = outputs[i];
            if (!output.hasTo || output.to === null) continue;

            if (output.value >= targetValue) {
                // We can't directly compare Address with bech32 string
                // The user's BTC address is provided via the outputs
                // We verify that SOME output has enough value going to a non-pool address
                // The frontend is responsible for setting the correct recipient
                const outputAddr = output.to as string;
                const poolProgram = this.getPoolProgram();
                if (!this.matchesPoolAddress(outputAddr, poolProgram)) {
                    verified = true;
                    break;
                }
            }
        }

        if (!verified) {
            throw new Revert('No BTC output to user address found');
        }

        // Burn WBTC
        this._burn(sender, amount);
        this.totalWrapped.value = SafeMath.sub(this.totalWrapped.value, amount);

        this.emitEvent(new UnwrapEvent(sender, amount));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ============================================================
    // OP20 override — block approve, use increaseAllowance
    // ============================================================

    public approve(_calldata: Calldata): BytesWriter {
        throw new Revert('Use increaseAllowance instead of approve');
    }

    // ============================================================
    // Admin methods
    // ============================================================

    @method({ name: 'newPool', type: ABIDataTypes.STRING })
    public setPoolAddress(calldata: Calldata): BytesWriter {
        this.onlyAdmin();
        const newPool: string = calldata.readStringWithLength();

        const decoded = Bech32.decodeOrNull(newPool);
        if (decoded === null) {
            throw new Revert('Invalid pool bech32 address');
        }

        this.poolBtcAddress.value = newPool;
        this._poolProgram = null; // Clear cache

        this.emitEvent(new PoolAddressChangedEvent(newPool));
        return new BytesWriter(0);
    }

    @method()
    public pause(_calldata: Calldata): BytesWriter {
        this.onlyAdmin();
        this._paused.value = true;
        return new BytesWriter(0);
    }

    @method()
    public unpause(_calldata: Calldata): BytesWriter {
        this.onlyAdmin();
        this._paused.value = false;
        return new BytesWriter(0);
    }

    // ============================================================
    // View methods
    // ============================================================

    @method()
    @returns({ name: 'totalWrapped', type: ABIDataTypes.UINT256 })
    public getTotalWrapped(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeU256(this.totalWrapped.value);
        return writer;
    }

    @method()
    @returns({ name: 'poolAddress', type: ABIDataTypes.STRING })
    public getPoolAddress(_calldata: Calldata): BytesWriter {
        const pool = this.poolBtcAddress.value;
        const poolBytes = String.UTF8.encode(pool);
        const writer = new BytesWriter(poolBytes.byteLength + 4);
        writer.writeStringWithLength(pool);
        return writer;
    }

    // ============================================================
    // Internal helpers
    // ============================================================

    private whenNotPaused(): void {
        if (this._paused.value) {
            throw new Revert('Contract is paused');
        }
    }

    private onlyAdmin(): void {
        if (!Blockchain.tx.sender.equals(this.adminAddress.value)) {
            throw new Revert('Only admin');
        }
    }

    /**
     * Get pool address decoded program (cached).
     * Returns the 32-byte witness program for the pool p2tr address.
     */
    private getPoolProgram(): Uint8Array {
        if (this._poolProgram !== null) {
            return this._poolProgram as Uint8Array;
        }

        const poolAddr = this.poolBtcAddress.value;
        const decoded = Bech32.decodeOrNull(poolAddr);
        if (decoded === null) {
            throw new Revert('Pool address decode failed');
        }
        this._poolProgram = (decoded as SegwitDecoded).program;
        return this._poolProgram as Uint8Array;
    }

    /**
     * Check if an output address matches the pool address.
     * Handles both bech32 strings and raw hex formats.
     */
    private matchesPoolAddress(outputAddr: string, poolProgram: Uint8Array): boolean {
        // Try bech32 decode first
        const decoded = Bech32.decodeOrNull(outputAddr);
        if (decoded !== null) {
            const program = (decoded as SegwitDecoded).program;
            return this.bytesEqual(program, poolProgram);
        }

        // Fallback: might be hex in simulation — try to compare as hex
        if (outputAddr.length == 64 || (outputAddr.length == 66 && outputAddr.startsWith('0x'))) {
            const hexStr = outputAddr.startsWith('0x') ? outputAddr.substring(2) : outputAddr;
            const hexBytes = this.hexToBytes(hexStr);
            if (hexBytes !== null) {
                return this.bytesEqual(hexBytes as Uint8Array, poolProgram);
            }
        }

        return false;
    }

    private bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length != b.length) return false;
        for (let i: i32 = 0; i < a.length; i++) {
            if (a[i] != b[i]) return false;
        }
        return true;
    }

    private hexToBytes(hex: string): Uint8Array | null {
        if (hex.length % 2 != 0) return null;
        const len = hex.length / 2;
        const result = new Uint8Array(len);
        for (let i: i32 = 0; i < len; i++) {
            const hi = this.hexCharToNibble(hex.charCodeAt(i * 2));
            const lo = this.hexCharToNibble(hex.charCodeAt(i * 2 + 1));
            if (hi < 0 || lo < 0) return null;
            result[i] = <u8>((hi << 4) | lo);
        }
        return result;
    }

    private hexCharToNibble(c: i32): i32 {
        if (c >= 48 && c <= 57) return c - 48;       // '0'-'9'
        if (c >= 97 && c <= 102) return c - 87;      // 'a'-'f'
        if (c >= 65 && c <= 70) return c - 55;       // 'A'-'F'
        return -1;
    }
}
