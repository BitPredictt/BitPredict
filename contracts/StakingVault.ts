/**
 * BitPredict — Staking Vault Smart Contract for OP_NET (Bitcoin L1)
 *
 * Production-ready version with:
 * - Real BPUSD token transfers via Blockchain.call() (transferFrom/transfer)
 * - ReentrancyGuard (STANDARD level)
 * - Pausable pattern
 * - CSV timelocks: minimum lock period of 144 blocks (~1 day) for unstake
 * - MasterChef-style reward distribution
 *
 * Deployment: cd contracts && npm run build → deploy via OP_WALLET
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
  Revert,
  SafeMath,
  StoredU256,
  StoredAddress,
  StoredBoolean,
  AddressMemoryMap,
  ReentrancyGuard,
  ReentrancyLevel,
} from '@btc-vision/btc-runtime/runtime';

// ============================================================
// Constants
// ============================================================

const PRECISION: u256 = u256.fromU64(1_000_000_000_000); // 1e12 for reward math
const MIN_STAKE: u256 = u256.fromU64(100); // 100 BPUSD minimum
const MIN_LOCK_BLOCKS: u64 = 144; // ~1 day at 10min blocks (CSV timelock)

// Cross-contract call selectors (OP-20 standard)
const TRANSFER_FROM_SELECTOR: u32 = 0x23b872dd; // transferFrom(address,address,uint256)
const TRANSFER_SELECTOR: u32 = 0xa9059cbb;      // transfer(address,uint256)

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
export class StakingVault extends ReentrancyGuard {
  protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

  // Global state
  private adminAddress: StoredAddress;
  private tokenAddress: StoredAddress;  // BPUSD token contract
  private _paused: StoredBoolean;
  private totalStaked: StoredU256;
  private rewardsPerShare: StoredU256;
  private totalDistributed: StoredU256;
  private stakerCount: StoredU256;

  // Per-user state (keyed by user address)
  private userStakes: AddressMemoryMap;
  private userRewardDebt: AddressMemoryMap;
  private userAutoCompound: AddressMemoryMap;
  private userStakeBlock: AddressMemoryMap; // block height when staked (for CSV timelock)

  constructor() {
    super();
    const emptySubPointer = new Uint8Array(0);
    this.adminAddress      = new StoredAddress(Blockchain.nextPointer);
    this.tokenAddress      = new StoredAddress(Blockchain.nextPointer);
    this._paused           = new StoredBoolean(Blockchain.nextPointer, false);
    this.totalStaked        = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.rewardsPerShare    = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.totalDistributed   = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.stakerCount        = new StoredU256(Blockchain.nextPointer, emptySubPointer);

    this.userStakes         = new AddressMemoryMap(Blockchain.nextPointer);
    this.userRewardDebt     = new AddressMemoryMap(Blockchain.nextPointer);
    this.userAutoCompound   = new AddressMemoryMap(Blockchain.nextPointer);
    this.userStakeBlock     = new AddressMemoryMap(Blockchain.nextPointer);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(calldata: Calldata): void {
    const token: Address = calldata.readAddress();
    this.tokenAddress.value = token;
    this.adminAddress.value = Blockchain.tx.sender;
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
   * Performs real transferFrom of BPUSD tokens.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public stake(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const amount: u256 = calldata.readU256();
    if (u256.lt(amount, MIN_STAKE)) {
      throw new Revert('Amount below minimum stake');
    }

    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);

    // === EFFECTS: update all state BEFORE external calls ===

    // Calculate pending rewards (will be handled after state update)
    const pendingRewards: u256 = this._pendingRewards(user, currentStake);

    // Update stake
    const newStake: u256 = SafeMath.add(currentStake, amount);
    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);

    // If auto-compounding, add pending rewards to new stake
    let finalStake: u256 = newStake;
    if (!u256.eq(pendingRewards, u256.Zero) && autoCompound) {
      finalStake = SafeMath.add(newStake, pendingRewards);
      this.totalStaked.value = SafeMath.add(this.totalStaked.value, SafeMath.add(amount, pendingRewards));
    } else {
      this.totalStaked.value = SafeMath.add(this.totalStaked.value, amount);
    }

    this.userStakes.set(user, finalStake);

    // Update reward debt
    this.userRewardDebt.set(user, SafeMath.div(
      SafeMath.mul(finalStake, this.rewardsPerShare.value),
      PRECISION
    ));

    // Record stake block for CSV timelock — only if first-time staker
    if (u256.eq(currentStake, u256.Zero)) {
      this.userStakeBlock.set(user, u256.fromU64(Blockchain.block.number));
      this.stakerCount.value = SafeMath.add(this.stakerCount.value, u256.One);
    }

    // === INTERACTIONS: external calls AFTER state updates ===

    // Transfer pending rewards to user (if not auto-compounding)
    if (!u256.eq(pendingRewards, u256.Zero) && !autoCompound) {
      this._transferToken(user, pendingRewards);
      this.emitEvent(new RewardsClaimedEvent(user, pendingRewards));
    }

    // Transfer staked tokens from user to vault
    this._transferFromToken(user, Blockchain.contract.address, amount);

    this.emitEvent(new StakedEvent(user, amount, this.totalStaked.value));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * unstake(amount: u256) — Withdraw BPUSD from the vault.
   * Enforces CSV timelock: must wait MIN_LOCK_BLOCKS after staking.
   * Performs real transfer of BPUSD tokens back to user.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public unstake(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const amount: u256 = calldata.readU256();
    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);

    if (u256.lt(currentStake, amount)) {
      throw new Revert('Insufficient staked amount');
    }

    // CSV timelock check
    const stakeBlock: u256 = this.userStakeBlock.get(user);
    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
    const unlockBlock: u256 = SafeMath.add(stakeBlock, u256.fromU64(MIN_LOCK_BLOCKS));
    if (u256.lt(currentBlock, unlockBlock)) {
      throw new Revert('Stake is locked (minimum 144 blocks ~1 day)');
    }

    // === EFFECTS: all state updates BEFORE external calls ===

    // Calculate pending rewards
    const pendingRewards: u256 = this._pendingRewards(user, currentStake);
    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);

    // Update stake (subtract unstaked amount)
    let newStake: u256 = SafeMath.sub(currentStake, amount);
    let newTotal: u256 = SafeMath.sub(this.totalStaked.value, amount);

    // Handle pending rewards (state updates only — no external calls)
    if (!u256.eq(pendingRewards, u256.Zero) && autoCompound) {
      // Auto-compound: add rewards to remaining stake
      newStake = SafeMath.add(newStake, pendingRewards);
      newTotal = SafeMath.add(newTotal, pendingRewards);
    }

    this.userStakes.set(user, newStake);
    this.totalStaked.value = newTotal;

    // Update reward debt based on final stake
    this.userRewardDebt.set(user, SafeMath.div(
      SafeMath.mul(newStake, this.rewardsPerShare.value),
      PRECISION
    ));

    // Decrement staker count if fully unstaked
    if (u256.eq(newStake, u256.Zero)) {
      this.stakerCount.value = SafeMath.sub(this.stakerCount.value, u256.One);
    }

    // === INTERACTIONS: external calls AFTER state updates ===

    // Transfer pending rewards to user (only if not auto-compounding)
    if (!u256.eq(pendingRewards, u256.Zero)) {
      if (!autoCompound) {
        this._transferToken(user, pendingRewards);
      }
      this.emitEvent(new RewardsClaimedEvent(user, pendingRewards));
    }

    // Transfer unstaked amount back to user
    this._transferToken(user, amount);

    this.emitEvent(new UnstakedEvent(user, amount, this.totalStaked.value));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * claimRewards() — Claim or auto-compound pending rewards.
   * Performs real transfer of BPUSD tokens if not auto-compounding.
   */
  @returns({ name: 'claimed', type: ABIDataTypes.UINT256 })
  public claimRewards(_calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const user: Address = Blockchain.tx.sender;
    const currentStake: u256 = this.userStakes.get(user);
    const pending: u256 = this._pendingRewards(user, currentStake);

    if (u256.eq(pending, u256.Zero)) {
      throw new Revert('No rewards to claim');
    }

    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);

    // === EFFECTS ===
    if (autoCompound) {
      const newStake: u256 = SafeMath.add(currentStake, pending);
      this.userStakes.set(user, newStake);
      this.totalStaked.value = SafeMath.add(this.totalStaked.value, pending);
      this.userRewardDebt.set(user, SafeMath.div(
        SafeMath.mul(newStake, this.rewardsPerShare.value),
        PRECISION
      ));
    } else {
      this.userRewardDebt.set(user, SafeMath.div(
        SafeMath.mul(currentStake, this.rewardsPerShare.value),
        PRECISION
      ));
    }

    // === INTERACTIONS ===
    if (!autoCompound) {
      this._transferToken(user, pending);
    }

    this.emitEvent(new RewardsClaimedEvent(user, pending));

    const writer = new BytesWriter(32);
    writer.writeU256(pending);
    return writer;
  }

  /**
   * setAutoCompound(enabled: bool)
   */
  @method({ name: 'enabled', type: ABIDataTypes.BOOL })
  public setAutoCompound(calldata: Calldata): BytesWriter {
    this.whenNotPaused();
    const enabled: boolean = calldata.readBoolean();
    const user: Address = Blockchain.tx.sender;
    this.userAutoCompound.set(user, enabled ? u256.One : u256.Zero);
    return new BytesWriter(0);
  }

  /**
   * distributeRevenue(amount: u256) — Distribute fee revenue to vault.
   * Performs real transferFrom of BPUSD from sender to vault.
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  public distributeRevenue(calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const amount: u256 = calldata.readU256();
    const total: u256 = this.totalStaked.value;

    if (u256.eq(total, u256.Zero)) {
      throw new Revert('No stakers in vault');
    }

    // === EFFECTS: state updates BEFORE external call ===
    // rewardsPerShare += (amount * 1e12) / totalStaked
    const delta: u256 = SafeMath.div(SafeMath.mul(amount, PRECISION), total);
    this.rewardsPerShare.value = SafeMath.add(this.rewardsPerShare.value, delta);
    this.totalDistributed.value = SafeMath.add(this.totalDistributed.value, amount);

    // === INTERACTIONS: external call AFTER state ===
    this._transferFromToken(Blockchain.tx.sender, Blockchain.contract.address, amount);

    this.emitEvent(new RevenueDistributedEvent(amount, this.rewardsPerShare.value, total));

    return new BytesWriter(0);
  }

  /**
   * pause() — Admin pauses all write operations.
   */
  @method()
  public pause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = true;
    return new BytesWriter(0);
  }

  /**
   * unpause() — Admin resumes operations.
   */
  @method()
  public unpause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = false;
    return new BytesWriter(0);
  }

  // ============================================================
  // Read-Only Methods
  // ============================================================

  @returns({ name: 'totalStaked', type: ABIDataTypes.UINT256 })
  public getVaultInfo(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(128);
    writer.writeU256(this.totalStaked.value);
    writer.writeU256(this.rewardsPerShare.value);
    writer.writeU256(this.totalDistributed.value);
    writer.writeU256(this.stakerCount.value);
    return writer;
  }

  @method({ name: 'user', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'staked', type: ABIDataTypes.UINT256 })
  public getUserInfo(calldata: Calldata): BytesWriter {
    const user: Address = calldata.readAddress();
    const staked: u256 = this.userStakes.get(user);
    const pending: u256 = this._pendingRewards(user, staked);
    const autoCompound: boolean = u256.eq(this.userAutoCompound.get(user), u256.One);
    const stakeBlock: u256 = this.userStakeBlock.get(user);

    const writer = new BytesWriter(97); // 32 + 32 + 1 + 32
    writer.writeU256(staked);
    writer.writeU256(pending);
    writer.writeBoolean(autoCompound);
    writer.writeU256(stakeBlock);
    return writer;
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  private whenNotPaused(): void {
    if (this._paused.value) {
      throw new Revert('Contract is paused');
    }
  }

  private requireAdmin(): void {
    const admin: Address = this.adminAddress.value;
    if (!Blockchain.tx.sender.equals(admin)) {
      throw new Revert('Only admin');
    }
  }

  private _transferFromToken(from: Address, to: Address, amount: u256): void {
    const writer = new BytesWriter(100);
    writer.writeSelector(TRANSFER_FROM_SELECTOR);
    writer.writeAddress(from);
    writer.writeAddress(to);
    writer.writeU256(amount);

    const result = Blockchain.call(this.tokenAddress.value, writer, true);

    if (result.data.byteLength > 0) {
      if (!result.data.readBoolean()) {
        throw new Revert('TransferFrom failed');
      }
    }
  }

  private _transferToken(to: Address, amount: u256): void {
    const writer = new BytesWriter(68);
    writer.writeSelector(TRANSFER_SELECTOR);
    writer.writeAddress(to);
    writer.writeU256(amount);

    const result = Blockchain.call(this.tokenAddress.value, writer, true);

    if (result.data.byteLength > 0) {
      if (!result.data.readBoolean()) {
        throw new Revert('Transfer failed');
      }
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

}
