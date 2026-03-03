/**
 * BitPredict — Staking Vault Smart Contract for OP_NET (Bitcoin L1)
 *
 * Users stake BPUSD tokens and earn a share of 2% trading fees from
 * all prediction market trades. Supports auto-compound of rewards.
 *
 * Written in AssemblyScript for the OP_NET runtime (btc-runtime).
 * Pattern from PredictionMarket.ts.
 */

import {
  u256,
} from '@btc-vision/as-bignum/assembly';

import {
  Address,
  Blockchain,
  BytesWriter,
  Calldata,
  NetEvent,
  OP_NET,
  Revert,
  SafeMath,
  StoredU256,
  StoredAddress,
  AddressMemoryMap,
} from '@btc-vision/btc-runtime/runtime';

// ============================================================
// Constants
// ============================================================

const PRECISION: u256 = u256.fromU64(1_000_000_000_000); // 1e12 for reward math
const MIN_STAKE: u256 = u256.fromU64(100); // 100 BPUSD minimum

// ============================================================
// Events
// ============================================================

class StakedEvent extends NetEvent {
  constructor(user: Address, amount: u256, totalStaked: u256) {
    const data = new BytesWriter(96);
    data.writeAddress(user);
    data.writeU256(amount);
    data.writeU256(totalStaked);
    super('Staked', data);
  }
}

class UnstakedEvent extends NetEvent {
  constructor(user: Address, amount: u256, totalStaked: u256) {
    const data = new BytesWriter(96);
    data.writeAddress(user);
    data.writeU256(amount);
    data.writeU256(totalStaked);
    super('Unstaked', data);
  }
}

class RewardsClaimedEvent extends NetEvent {
  constructor(user: Address, amount: u256) {
    const data = new BytesWriter(64);
    data.writeAddress(user);
    data.writeU256(amount);
    super('RewardsClaimed', data);
  }
}

class RevenueDistributedEvent extends NetEvent {
  constructor(amount: u256, newRewardsPerShare: u256, totalStaked: u256) {
    const data = new BytesWriter(96);
    data.writeU256(amount);
    data.writeU256(newRewardsPerShare);
    data.writeU256(totalStaked);
    super('RevenueDistributed', data);
  }
}

// ============================================================
// Contract
// ============================================================

@final
export class StakingVault extends OP_NET {
  // Global state
  private adminAddress: StoredAddress;
  private totalStaked: StoredU256;
  private rewardsPerShare: StoredU256;   // accumulated rewards per share (scaled by 1e12)
  private totalDistributed: StoredU256;
  private stakerCount: StoredU256;

  // Per-user state (keyed by user address)
  private userStakes: AddressMemoryMap;       // staked amount
  private userRewardDebt: AddressMemoryMap;   // reward debt for MasterChef math
  private userAutoCompound: AddressMemoryMap; // u256.One = enabled

  constructor() {
    super();
    const emptySubPointer = new Uint8Array(0);
    this.adminAddress      = new StoredAddress(Blockchain.nextPointer);
    this.totalStaked        = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.rewardsPerShare    = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.totalDistributed   = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.stakerCount        = new StoredU256(Blockchain.nextPointer, emptySubPointer);

    this.userStakes         = new AddressMemoryMap(Blockchain.nextPointer);
    this.userRewardDebt     = new AddressMemoryMap(Blockchain.nextPointer);
    this.userAutoCompound   = new AddressMemoryMap(Blockchain.nextPointer);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(_calldata: Calldata): void {
    this.adminAddress.value = Blockchain.tx.origin;
    this.totalStaked.value = u256.Zero;
    this.rewardsPerShare.value = u256.Zero;
    this.totalDistributed.value = u256.Zero;
    this.stakerCount.value = u256.Zero;
  }

  // ============================================================
  // Write Methods
  // ============================================================

  /**
   * stake(amount: u256) — Stake BPUSD into the vault.
   * Harvests any pending rewards first (or auto-compounds).
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public stake(calldata: Calldata): BytesWriter {
    const amount: u256 = calldata.readU256();
    if (u256.lt(amount, MIN_STAKE)) {
      throw new Revert('Amount below minimum stake');
    }

    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);

    // Harvest pending rewards first
    if (!u256.eq(currentStake, u256.Zero)) {
      this._harvestRewards(user, currentStake);
    }

    // Update stake
    const newStake: u256 = SafeMath.add(currentStake, amount);
    this.userStakes.set(user, newStake);

    // Update reward debt
    this.userRewardDebt.set(user, SafeMath.div(
      SafeMath.mul(newStake, this.rewardsPerShare.value),
      PRECISION
    ));

    // Update global state
    const newTotal: u256 = SafeMath.add(this.totalStaked.value, amount);
    this.totalStaked.value = newTotal;

    // Increment staker count if new staker
    if (u256.eq(currentStake, u256.Zero)) {
      this.stakerCount.value = SafeMath.add(this.stakerCount.value, u256.One);
    }

    this.emitEvent(new StakedEvent(user, amount, newTotal));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * unstake(amount: u256) — Withdraw BPUSD from the vault.
   * Harvests pending rewards first.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public unstake(calldata: Calldata): BytesWriter {
    const amount: u256 = calldata.readU256();
    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);

    if (u256.lt(currentStake, amount)) {
      throw new Revert('Insufficient staked amount');
    }

    // Harvest first
    this._harvestRewards(user, currentStake);

    // Update stake
    const newStake: u256 = SafeMath.sub(currentStake, amount);
    this.userStakes.set(user, newStake);

    // Update reward debt
    this.userRewardDebt.set(user, SafeMath.div(
      SafeMath.mul(newStake, this.rewardsPerShare.value),
      PRECISION
    ));

    // Update global state
    const newTotal: u256 = SafeMath.sub(this.totalStaked.value, amount);
    this.totalStaked.value = newTotal;

    // Decrement staker count if fully unstaked
    if (u256.eq(newStake, u256.Zero)) {
      this.stakerCount.value = SafeMath.sub(this.stakerCount.value, u256.One);
    }

    this.emitEvent(new UnstakedEvent(user, amount, newTotal));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * claimRewards() — Claim or auto-compound pending rewards.
   */
  @returns({ name: 'claimed', type: ABIDataTypes.UINT256 })
  public claimRewards(_calldata: Calldata): BytesWriter {
    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);

    const claimed: u256 = this._harvestRewards(user, currentStake);

    // Update reward debt
    this.userRewardDebt.set(user, SafeMath.div(
      SafeMath.mul(this.userStakes.get(user), this.rewardsPerShare.value),
      PRECISION
    ));

    const writer = new BytesWriter(32);
    writer.writeU256(claimed);
    return writer;
  }

  /**
   * setAutoCompound(enabled: bool) — Toggle auto-compound for caller.
   */
  @method({ name: 'enabled', type: ABIDataTypes.BOOL })
  public setAutoCompound(calldata: Calldata): BytesWriter {
    const enabled: boolean = calldata.readBoolean();
    const user: Address = Blockchain.tx.sender;
    this.userAutoCompound.set(user, enabled ? u256.One : u256.Zero);
    return new BytesWriter(0);
  }

  /**
   * distributeRevenue(amount: u256) — Admin distributes fee revenue to vault.
   * Called when bet fees are collected.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  public distributeRevenue(calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const amount: u256 = calldata.readU256();
    const total: u256 = this.totalStaked.value;

    if (u256.eq(total, u256.Zero)) {
      throw new Revert('No stakers in vault');
    }

    // rewardsPerShare += (amount * 1e12) / totalStaked
    const delta: u256 = SafeMath.div(SafeMath.mul(amount, PRECISION), total);
    this.rewardsPerShare.value = SafeMath.add(this.rewardsPerShare.value, delta);
    this.totalDistributed.value = SafeMath.add(this.totalDistributed.value, amount);

    this.emitEvent(new RevenueDistributedEvent(amount, this.rewardsPerShare.value, total));

    return new BytesWriter(0);
  }

  // ============================================================
  // Read-Only Methods
  // ============================================================

  /**
   * getVaultInfo() → (totalStaked, rewardsPerShare, totalDistributed, stakerCount)
   */
  @returns({ name: 'totalStaked', type: ABIDataTypes.UINT256 })
  public getVaultInfo(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(128);
    writer.writeU256(this.totalStaked.value);
    writer.writeU256(this.rewardsPerShare.value);
    writer.writeU256(this.totalDistributed.value);
    writer.writeU256(this.stakerCount.value);
    return writer;
  }

  /**
   * getUserInfo(user: Address) → (staked, pendingRewards, autoCompound)
   */
  @method({ name: 'user', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'staked', type: ABIDataTypes.UINT256 })
  public getUserInfo(calldata: Calldata): BytesWriter {
    const user: Address = calldata.readAddress();
    const staked: u256 = this.userStakes.get(user);
    const pending: u256 = this._pendingRewards(user, staked);
    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);

    const writer = new BytesWriter(65); // 32 + 32 + 1
    writer.writeU256(staked);
    writer.writeU256(pending);
    writer.writeBoolean(autoCompound);
    return writer;
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  private requireAdmin(): void {
    const admin: Address = this.adminAddress.value;
    if (!Blockchain.tx.sender.equals(admin)) {
      throw new Revert('Only admin');
    }
  }

  private _pendingRewards(user: Address, staked: u256): u256 {
    if (u256.eq(staked, u256.Zero)) return u256.Zero;
    const accumulated: u256 = SafeMath.div(
      SafeMath.mul(staked, this.rewardsPerShare.value),
      PRECISION
    );
    const debt: u256 = this.userRewardDebt.get(user);
    if (u256.le(accumulated, debt)) return u256.Zero;
    return SafeMath.sub(accumulated, debt);
  }

  private _harvestRewards(user: Address, staked: u256): u256 {
    const pending: u256 = this._pendingRewards(user, staked);
    if (u256.eq(pending, u256.Zero)) return u256.Zero;

    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);

    if (autoCompound) {
      // Auto-compound: add rewards to stake
      const newStake: u256 = SafeMath.add(staked, pending);
      this.userStakes.set(user, newStake);
      this.totalStaked.value = SafeMath.add(this.totalStaked.value, pending);
    }

    this.emitEvent(new RewardsClaimedEvent(user, pending));
    return pending;
  }
}
