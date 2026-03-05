import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the stake function call.
 */
export type Stake = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unstake function call.
 */
export type Unstake = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the claimRewards function call.
 */
export type ClaimRewards = CallResult<
    {
        claimed: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setAutoCompound function call.
 */
export type SetAutoCompound = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the distributeRevenue function call.
 */
export type DistributeRevenue = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the emergencyWithdraw function call.
 */
export type EmergencyWithdraw = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

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
 * @description Represents the result of the getVaultInfo function call.
 */
export type GetVaultInfo = CallResult<
    {
        totalStaked: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getUserInfo function call.
 */
export type GetUserInfo = CallResult<
    {
        staked: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// IStakingVault
// ------------------------------------------------------------------
export interface IStakingVault extends IOP_NETContract {
    stake(amount: bigint): Promise<Stake>;
    unstake(amount: bigint): Promise<Unstake>;
    claimRewards(): Promise<ClaimRewards>;
    setAutoCompound(enabled: boolean): Promise<SetAutoCompound>;
    distributeRevenue(amount: bigint): Promise<DistributeRevenue>;
    emergencyWithdraw(amount: bigint): Promise<EmergencyWithdraw>;
    setAdmin(newAdmin: Address): Promise<SetAdmin>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    getVaultInfo(): Promise<GetVaultInfo>;
    getUserInfo(user: Address): Promise<GetUserInfo>;
}
