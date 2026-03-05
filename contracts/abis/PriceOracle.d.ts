import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the addOracle function call.
 */
export type AddOracle = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the removeOracle function call.
 */
export type RemoveOracle = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the submitPrice function call.
 */
export type SubmitPrice = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setAdmin function call.
 */
export type SetAdmin = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getPrice function call.
 */
export type GetPrice = CallResult<
    {
        price: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getSubmission function call.
 */
export type GetSubmission = CallResult<
    {
        price: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getOracleInfo function call.
 */
export type GetOracleInfo = CallResult<
    {
        authorized: boolean;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IPriceOracle
// ------------------------------------------------------------------
export interface IPriceOracle extends IOP_NETContract {
    addOracle(oracle: Address): Promise<AddOracle>;
    removeOracle(oracle: Address): Promise<RemoveOracle>;
    submitPrice(assetId: bigint, price: bigint): Promise<SubmitPrice>;
    setAdmin(newAdmin: Address): Promise<SetAdmin>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getPrice(assetId: bigint): Promise<GetPrice>;
    getSubmission(assetId: bigint, slot: bigint): Promise<GetSubmission>;
    getOracleInfo(oracle: Address): Promise<GetOracleInfo>;
}
