import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the deposit function call.
 */
export type Deposit = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the adminWithdraw function call.
 */
export type AdminWithdraw = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the requestEmergencyWithdraw function call.
 */
export type RequestEmergencyWithdraw = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the executeEmergencyWithdraw function call.
 */
export type ExecuteEmergencyWithdraw = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the cancelEmergencyWithdraw function call.
 */
export type CancelEmergencyWithdraw = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the setServerSigner function call.
 */
export type SetServerSigner = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the pause function call.
 */
export type Pause = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the unpause function call.
 */
export type Unpause = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the transferAdmin function call.
 */
export type TransferAdmin = CallResult<
    {
        success: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getBalance function call.
 */
export type GetBalance = CallResult<
    {
        balance: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getNonce function call.
 */
export type GetNonce = CallResult<
    {
        nonce: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getTotalDeposits function call.
 */
export type GetTotalDeposits = CallResult<
    {
        total: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the getEmergencyInfo function call.
 */
export type GetEmergencyInfo = CallResult<
    {
        amount: bigint;
        unlockBlock: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the isPaused function call.
 */
export type IsPaused = CallResult<
    {
        paused: boolean;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// ITreasury
// ------------------------------------------------------------------
export interface ITreasury extends IOP_NETContract {
    deposit(amount: bigint): Promise<Deposit>;
    adminWithdraw(user: Address, amount: bigint): Promise<AdminWithdraw>;
    requestEmergencyWithdraw(amount: bigint): Promise<RequestEmergencyWithdraw>;
    executeEmergencyWithdraw(): Promise<ExecuteEmergencyWithdraw>;
    cancelEmergencyWithdraw(): Promise<CancelEmergencyWithdraw>;
    setServerSigner(newSignerHash: bigint): Promise<SetServerSigner>;
    pause(): Promise<Pause>;
    unpause(): Promise<Unpause>;
    transferAdmin(newAdmin: Address): Promise<TransferAdmin>;
    getBalance(user: Address): Promise<GetBalance>;
    getNonce(user: Address): Promise<GetNonce>;
    getTotalDeposits(): Promise<GetTotalDeposits>;
    getEmergencyInfo(user: Address): Promise<GetEmergencyInfo>;
    isPaused(): Promise<IsPaused>;
}
