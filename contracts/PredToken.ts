/**
 * $PRED — BitPredict Governance Token (OP-20)
 *
 * Native token for the BitPredict prediction market ecosystem.
 * - Max supply: 100,000,000 PRED (8 decimals)
 * - Deployer can mint (for airdrops, liquidity incentives)
 * - Pausable + burnable
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
    SafeMath,
} from '@btc-vision/btc-runtime/runtime';

@final
export class PredToken extends OP20 {
    private _paused: StoredBoolean;

    public constructor() {
        super();
        this._paused = new StoredBoolean(Blockchain.nextPointer, false);
    }

    public override onDeployment(calldata: Calldata): void {
        const maxSupply: u256 = calldata.readU256();
        const decimals: u8 = calldata.readU8();
        const name: string = calldata.readStringWithLength();
        const symbol: string = calldata.readStringWithLength();

        this.instantiate(new OP20InitParameters(maxSupply, decimals, name, symbol));

        // Mint initial supply to deployer (50% of max for distribution)
        const initialMint: u256 = SafeMath.div(maxSupply, u256.fromU64(2));
        this._mint(Blockchain.tx.origin, initialMint);
    }

    public override transfer(calldata: Calldata): BytesWriter {
        this.whenNotPaused();
        return super.transfer(calldata);
    }

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

    private whenNotPaused(): void {
        if (this._paused.value) {
            throw new Revert('Token is paused');
        }
    }
}
