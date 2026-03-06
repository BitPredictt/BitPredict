import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the mint function call.
 */
export type Mint = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the publicMint function call.
 */
export type PublicMint = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setMintRate function call.
 */
export type SetMintRate = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setTreasury function call.
 */
export type SetTreasury = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getMintRate function call.
 */
export type GetMintRate = CallResult<
    {
        rate: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IPredToken
// ------------------------------------------------------------------
export interface IPredToken extends IOP_NETContract {
    mint(to: Address, amount: bigint): Promise<Mint>;
    publicMint(amount: bigint): Promise<PublicMint>;
    setMintRate(newRate: bigint): Promise<SetMintRate>;
    setTreasury(newTreasury: Address): Promise<SetTreasury>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getMintRate(): Promise<GetMintRate>;
}
