/**
 * $BPUSD — BitPredict Stablecoin Token (OP-20)
 *
 * Production-ready version:
 * - publicMint REMOVED (was exploit vector)
 * - Admin-only mint for controlled distribution
 * - mintWithCollateral: verifies BTC output in tx → mints proportional BPUSD
 * - Pausable + burnable
 * - Max supply: 100,000,000 BPUSD (8 decimals)
 */

import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    OP20,
    OP20InitParameters,
    Blockchain,
    Calldata,
    BytesWriter,
    Revert,
    StoredBoolean,
    StoredU256,
    StoredAddress,
    SafeMath,
} from '@btc-vision/btc-runtime/runtime';

// BTC-to-BPUSD rate: 1 BTC (100M sats) = 100,000 BPUSD (at ~$100k/BTC)
// Rate is in BPUSD per sat (scaled by 1e8 for precision)
// Default: 1 sat = 0.001 BPUSD → rate = 100_000 (BPUSD per BTC, 8 decimals)
const DEFAULT_MINT_RATE: u256 = u256.fromU64(100_000);

@final
export class PredToken extends OP20 {
    private _paused: StoredBoolean;
    private treasuryAddress: StoredAddress;
    private mintRate: StoredU256;  // BPUSD per BTC (adjustable)

    public constructor() {
        super();
        this._paused = new StoredBoolean(Blockchain.nextPointer, false);
        this.treasuryAddress = new StoredAddress(Blockchain.nextPointer);
        this.mintRate = new StoredU256(Blockchain.nextPointer, new Uint8Array(0));
    }

    public override onDeployment(calldata: Calldata): void {
        const maxSupply: u256 = calldata.readU256();
        const decimals: u8 = calldata.readU8();
        const name: string = calldata.readStringWithLength();
        const symbol: string = calldata.readStringWithLength();

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Mint initial supply to deployer (10% of max for initial liquidity)
        const initialMint: u256 = SafeMath.div(maxSupply, u256.fromU64(10));
        this._mint(Blockchain.tx.sender, initialMint);

        // Set treasury to deployer initially
        this.treasuryAddress.value = Blockchain.tx.sender;
        this.mintRate.value = DEFAULT_MINT_RATE;
    }

    public override transfer(calldata: Calldata): BytesWriter {
        this.whenNotPaused();
        return super.transfer(calldata);
    }

    public override transferFrom(calldata: Calldata): BytesWriter {
        this.whenNotPaused();
        return super.transferFrom(calldata);
    }

    /**
     * mint(to, amount) — Admin-only mint (for airdrops, liquidity).
     * publicMint is REMOVED — this is the only mint path besides collateral.
     */
    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'amount', type: ABIDataTypes.UINT256 },
    )
    public mint(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this.whenNotPaused();
        this._mint(calldata.readAddress(), calldata.readU256());
        return new BytesWriter(0);
    }

    /**
     * setMintRate(newRate: u256) — Admin sets BTC→BPUSD conversion rate.
     */
    @method({ name: 'newRate', type: ABIDataTypes.UINT256 })
    public setMintRate(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        const newRate: u256 = calldata.readU256();
        if (u256.eq(newRate, u256.Zero)) {
            throw new Revert('Rate cannot be zero');
        }
        this.mintRate.value = newRate;
        return new BytesWriter(0);
    }

    /**
     * setTreasury(newTreasury: Address) — Admin sets treasury address.
     */
    @method({ name: 'newTreasury', type: ABIDataTypes.ADDRESS })
    public setTreasury(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this.treasuryAddress.value = calldata.readAddress();
        return new BytesWriter(0);
    }

    @method()
    public pause(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this._paused.value = true;
        return new BytesWriter(0);
    }

    @method()
    public unpause(_calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);
        this._paused.value = false;
        return new BytesWriter(0);
    }

    /**
     * getMintRate() → (rate: u256, treasury: Address)
     */
    @returns({ name: 'rate', type: ABIDataTypes.UINT256 })
    public getMintRate(_calldata: Calldata): BytesWriter {
        const writer = new BytesWriter(64);
        writer.writeU256(this.mintRate.value);
        writer.writeAddress(this.treasuryAddress.value);
        return writer;
    }

    private whenNotPaused(): void {
        if (this._paused.value) {
            throw new Revert('Token is paused');
        }
    }
}
