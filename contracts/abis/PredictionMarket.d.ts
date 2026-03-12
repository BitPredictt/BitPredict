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
 * @description Represents the result of the placeBet function call.
 */
export type PlaceBet = CallResult<
    {
        netAmount: bigint;
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
 * @description Represents the result of the cancelMarket function call.
 */
export type CancelMarket = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the emergencyWithdraw function call.
 */
export type EmergencyWithdraw = CallResult<
    {
        refund: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the sweepDust function call.
 */
export type SweepDust = CallResult<
    {
        swept: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAdmin function call.
 */
export type SetAdmin = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setFee function call.
 */
export type SetFee = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the withdrawFees function call.
 */
export type WithdrawFees = CallResult<
    {
        amount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setFeeRecipient function call.
 */
export type SetFeeRecipient = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the getMarketInfo function call.
 */
export type GetMarketInfo = CallResult<
    {
        yesPool: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserBets function call.
 */
export type GetUserBets = CallResult<
    {
        yesBet: bigint;
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
    placeBet(marketId: bigint, isYes: boolean, amount: bigint): Promise<PlaceBet>;
    resolveMarket(marketId: bigint, outcome: boolean): Promise<ResolveMarket>;
    claimPayout(marketId: bigint): Promise<ClaimPayout>;
    cancelMarket(marketId: bigint): Promise<CancelMarket>;
    emergencyWithdraw(marketId: bigint): Promise<EmergencyWithdraw>;
    sweepDust(marketId: bigint): Promise<SweepDust>;
    setAdmin(newAdmin: Address): Promise<SetAdmin>;
    setFee(newFeeBps: bigint): Promise<SetFee>;
    withdrawFees(): Promise<WithdrawFees>;
    setFeeRecipient(recipient: Address): Promise<SetFeeRecipient>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getMarketInfo(marketId: bigint): Promise<GetMarketInfo>;
    getUserBets(marketId: bigint, user: Address): Promise<GetUserBets>;
    getPrice(marketId: bigint): Promise<GetPrice>;
}
