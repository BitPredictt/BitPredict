import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the createMarket function call.
 */
export type CreateMarket = CallResult<
    {
        marketId: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the buyShares function call.
 */
export type BuyShares = CallResult<
    {
        shares: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the resolveMarket function call.
 */
export type ResolveMarket = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the claimPayout function call.
 */
export type ClaimPayout = CallResult<
    {
        payout: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAdmin function call.
 */
export type SetAdmin = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getMarketInfo function call.
 */
export type GetMarketInfo = CallResult<
    {
        yesReserve: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserShares function call.
 */
export type GetUserShares = CallResult<
    {
        yesShares: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getPrice function call.
 */
export type GetPrice = CallResult<
    {
        yesPriceBps: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IPredictionMarket
// ------------------------------------------------------------------
export interface IPredictionMarket extends IOP_NETContract {
    createMarket(endBlock: bigint): Promise<CreateMarket>;
    buyShares(marketId: bigint, isYes: boolean, amount: bigint): Promise<BuyShares>;
    resolveMarket(marketId: bigint, outcome: boolean): Promise<ResolveMarket>;
    claimPayout(marketId: bigint): Promise<ClaimPayout>;
    setAdmin(newAdmin: Address): Promise<SetAdmin>;
    getMarketInfo(marketId: bigint): Promise<GetMarketInfo>;
    getUserShares(marketId: bigint, user: Address): Promise<GetUserShares>;
    getPrice(marketId: bigint): Promise<GetPrice>;
}
