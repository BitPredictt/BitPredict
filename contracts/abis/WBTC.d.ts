import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the wrap function call.
 */
export type Wrap = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unwrap function call.
 */
export type Unwrap = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the approve function call.
 */
export type Approve = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setPoolAddress function call.
 */
export type SetPoolAddress = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getTotalWrapped function call.
 */
export type GetTotalWrapped = CallResult<
    {
        totalWrapped: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPoolAddress function call.
 */
export type GetPoolAddress = CallResult<
    {
        poolAddress: string;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IWBTC
// ------------------------------------------------------------------
export interface IWBTC extends IOP_NETContract {
    wrap(amount: bigint): Promise<Wrap>;
    unwrap(amount: bigint, recipientBtcAddress: string): Promise<Unwrap>;
    approve(): Promise<Approve>;
    setPoolAddress(newPool: string): Promise<SetPoolAddress>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getTotalWrapped(): Promise<GetTotalWrapped>;
    getPoolAddress(): Promise<GetPoolAddress>;
}
