/**
 * BitPredict — Prediction Market Smart Contract for OP_NET (Bitcoin L1)
 *
 * Production-ready version with:
 * - Real BPUSD token transfers via Blockchain.call() (transferFrom/transfer)
 * - ReentrancyGuard (STANDARD level) on all write methods
 * - Pausable pattern (_paused + whenNotPaused)
 * - Governance fee (StoredU256, admin-adjustable up to 5%)
 * - MIN_MARKET_DURATION enforcement (6 blocks ≈ 1 hour)
 * - Increased MIN_TRADE_AMOUNT (50,000 sats ≈ $50)
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

const BPS_BASE: u64 = 10000;
const MAX_FEE_BPS: u64 = 500;           // max 5% fee
const MIN_TRADE_AMOUNT: u256 = u256.fromU64(50_000); // 50,000 sats minimum (~$50)
const INITIAL_LIQUIDITY: u256 = u256.fromU64(1_000_000); // 1M sats initial virtual liquidity
const MIN_MARKET_DURATION: u64 = 6;      // 6 blocks ≈ 1 hour

// Cross-contract call selectors (OP-20 standard)
const TRANSFER_FROM_SELECTOR: u32 = 0x4b6685e7; // transferFrom — OPNet SHA-256 selector
const TRANSFER_SELECTOR: u32 = 0x3b88ef57;      // transfer — OPNet SHA-256 selector

// ============================================================
// Events
// ============================================================

class MarketCreatedEvent extends NetEvent {
  constructor(marketId: u256, endBlock: u256, creator: Address) {
    const data = new BytesWriter(96);
    data.writeU256(marketId);
    data.writeU256(endBlock);
    data.writeAddress(creator);
    super('MarketCreated', data);
  }
}

class SharesPurchasedEvent extends NetEvent {
  constructor(
    marketId: u256,
    buyer: Address,
    isYes: boolean,
    amount: u256,
    shares: u256,
    yesPriceBps: u256,
  ) {
    const data = new BytesWriter(161);
    data.writeU256(marketId);
    data.writeAddress(buyer);
    data.writeBoolean(isYes);
    data.writeU256(amount);
    data.writeU256(shares);
    data.writeU256(yesPriceBps);
    super('SharesPurchased', data);
  }
}

class MarketResolvedEvent extends NetEvent {
  constructor(marketId: u256, outcome: boolean, resolver: Address) {
    const data = new BytesWriter(65);
    data.writeU256(marketId);
    data.writeBoolean(outcome);
    data.writeAddress(resolver);
    super('MarketResolved', data);
  }
}

class PayoutClaimedEvent extends NetEvent {
  constructor(marketId: u256, claimer: Address, amount: u256) {
    const data = new BytesWriter(96);
    data.writeU256(marketId);
    data.writeAddress(claimer);
    data.writeU256(amount);
    super('PayoutClaimed', data);
  }
}

class PausedEvent extends NetEvent {
  constructor(admin: Address) {
    const data = new BytesWriter(32);
    data.writeAddress(admin);
    super('Paused', data);
  }
}

class UnpausedEvent extends NetEvent {
  constructor(admin: Address) {
    const data = new BytesWriter(32);
    data.writeAddress(admin);
    super('Unpaused', data);
  }
}

// ============================================================
// Contract
// ============================================================

@final
export class PredictionMarket extends ReentrancyGuard {
  protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

  // Singleton storage
  private nextMarketId: StoredU256;
  private adminAddress: StoredAddress;
  private tokenAddress: StoredAddress;  // BPUSD token contract
  private _paused: StoredBoolean;
  private marketFeeBps: StoredU256;     // governance-adjustable fee (in BPS)
  private accumulatedFees: StoredU256;  // total fees accumulated (withdrawable by admin)
  private feeRecipient: StoredAddress;  // address to receive withdrawn fees

  // Per-market state (keyed by sha256(marketId))
  private yesReserves:    AddressMemoryMap;
  private noReserves:     AddressMemoryMap;
  private totalYesShares: AddressMemoryMap;
  private totalNoShares:  AddressMemoryMap;
  private endBlocks:      AddressMemoryMap;
  private resolvedFlags:  AddressMemoryMap;
  private outcomes:       AddressMemoryMap;
  private totalPools:     AddressMemoryMap;

  // Per-user share tracking (keyed by sha256(marketId || userAddress))
  private userYesShares: AddressMemoryMap;
  private userNoShares:  AddressMemoryMap;
  private userClaimed:   AddressMemoryMap;

  constructor() {
    super();
    const emptySubPointer = new Uint8Array(0);
    this.nextMarketId  = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.adminAddress  = new StoredAddress(Blockchain.nextPointer);
    this.tokenAddress  = new StoredAddress(Blockchain.nextPointer);
    this._paused       = new StoredBoolean(Blockchain.nextPointer, false);
    this.marketFeeBps  = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.accumulatedFees = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.feeRecipient  = new StoredAddress(Blockchain.nextPointer);

    this.yesReserves    = new AddressMemoryMap(Blockchain.nextPointer);
    this.noReserves     = new AddressMemoryMap(Blockchain.nextPointer);
    this.totalYesShares = new AddressMemoryMap(Blockchain.nextPointer);
    this.totalNoShares  = new AddressMemoryMap(Blockchain.nextPointer);
    this.endBlocks      = new AddressMemoryMap(Blockchain.nextPointer);
    this.resolvedFlags  = new AddressMemoryMap(Blockchain.nextPointer);
    this.outcomes       = new AddressMemoryMap(Blockchain.nextPointer);
    this.totalPools     = new AddressMemoryMap(Blockchain.nextPointer);

    this.userYesShares = new AddressMemoryMap(Blockchain.nextPointer);
    this.userNoShares  = new AddressMemoryMap(Blockchain.nextPointer);
    this.userClaimed   = new AddressMemoryMap(Blockchain.nextPointer);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(calldata: Calldata): void {
    // calldata: tokenAddress (Address)
    const token: Address = calldata.readAddress();
    this.tokenAddress.value = token;
    this.adminAddress.value = Blockchain.tx.sender;
    this.nextMarketId.value = u256.One;
    this.marketFeeBps.value = u256.fromU64(200); // default 2%
    this.accumulatedFees.value = u256.Zero;
    this.feeRecipient.value = Blockchain.tx.sender; // admin is default fee recipient
  }

  // ============================================================
  // Write Methods
  // ============================================================

  /**
   * createMarket(endBlock: u256) → marketId: u256
   */
  @method({ name: 'endBlock', type: ABIDataTypes.UINT256 })
  @returns({ name: 'marketId', type: ABIDataTypes.UINT256 })
  public createMarket(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const endBlock: u256 = calldata.readU256();
    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);

    if (u256.le(endBlock, currentBlock)) {
      throw new Revert('End block must be in the future');
    }

    // Enforce minimum market duration (6 blocks ≈ 1 hour)
    const minEndBlock: u256 = SafeMath.add(currentBlock, u256.fromU64(MIN_MARKET_DURATION));
    if (u256.lt(endBlock, minEndBlock)) {
      throw new Revert('Market duration too short (min 6 blocks)');
    }

    const marketId: u256 = this.nextMarketId.value;
    const marketKey: Address = this.marketKey(marketId);

    this.yesReserves.set(marketKey, INITIAL_LIQUIDITY);
    this.noReserves.set(marketKey, INITIAL_LIQUIDITY);
    this.totalYesShares.set(marketKey, u256.Zero);
    this.totalNoShares.set(marketKey, u256.Zero);
    this.endBlocks.set(marketKey, endBlock);
    this.resolvedFlags.set(marketKey, u256.Zero);
    this.outcomes.set(marketKey, u256.Zero);
    this.totalPools.set(marketKey, u256.Zero);

    this.nextMarketId.value = SafeMath.add(marketId, u256.One);

    this.emitEvent(new MarketCreatedEvent(marketId, endBlock, Blockchain.tx.sender));

    const writer = new BytesWriter(32);
    writer.writeU256(marketId);
    return writer;
  }

  /**
   * buyShares(marketId: u256, isYes: bool, amount: u256) → shares: u256
   * Performs real transferFrom of BPUSD tokens from buyer to contract.
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'isYes',    type: ABIDataTypes.BOOL },
    { name: 'amount',   type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'shares', type: ABIDataTypes.UINT256 })
  public buyShares(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const marketId: u256 = calldata.readU256();
    const isYes: boolean = calldata.readBoolean();
    const amount: u256   = calldata.readU256();

    if (u256.lt(amount, MIN_TRADE_AMOUNT)) {
      throw new Revert('Amount below minimum');
    }

    const marketKey: Address = this.marketKey(marketId);

    const endBlock: u256 = this.endBlocks.get(marketKey);
    if (u256.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
    if (u256.ge(currentBlock, endBlock)) {
      throw new Revert('Market has ended');
    }

    if (u256.eq(this.resolvedFlags.get(marketKey), u256.One)) {
      throw new Revert('Market already resolved');
    }

    // 2% fee — round UP to favor protocol
    const feeBps: u256 = this.marketFeeBps.value;
    const numerator: u256 = SafeMath.mul(amount, feeBps);
    const base: u256 = u256.fromU64(BPS_BASE);
    const remainder: u256 = SafeMath.mod(numerator, base);
    let fee: u256 = SafeMath.div(numerator, base);
    if (!u256.eq(remainder, u256.Zero)) {
      fee = SafeMath.add(fee, u256.One);
    }
    const netAmount: u256 = SafeMath.sub(amount, fee);

    const yesReserve: u256 = this.yesReserves.get(marketKey);
    const noReserve: u256  = this.noReserves.get(marketKey);
    const k: u256          = SafeMath.mul(yesReserve, noReserve);

    const userKey: Address = this.userKey(marketId, Blockchain.tx.sender);

    // Calculate shares BEFORE state mutations (M-1 fix)
    let shares: u256 = u256.Zero;
    let newYesReserve: u256 = u256.Zero;
    let newNoReserve: u256 = u256.Zero;

    if (isYes) {
      newNoReserve = SafeMath.add(noReserve, netAmount);
      newYesReserve = SafeMath.div(k, newNoReserve);
      shares = SafeMath.sub(yesReserve, newYesReserve);
    } else {
      newYesReserve = SafeMath.add(yesReserve, netAmount);
      newNoReserve = SafeMath.div(k, newYesReserve);
      shares = SafeMath.sub(noReserve, newNoReserve);
    }

    // Check BEFORE any state mutations (M-1 fix)
    if (u256.eq(shares, u256.Zero)) {
      throw new Revert('Slippage: zero shares');
    }

    // === EFFECTS (state updates BEFORE external calls) ===
    this.yesReserves.set(marketKey, newYesReserve);
    this.noReserves.set(marketKey, newNoReserve);

    if (isYes) {
      const cur: u256 = this.userYesShares.get(userKey);
      this.userYesShares.set(userKey, SafeMath.add(cur, shares));
      const tot: u256 = this.totalYesShares.get(marketKey);
      this.totalYesShares.set(marketKey, SafeMath.add(tot, shares));
    } else {
      const cur: u256 = this.userNoShares.get(userKey);
      this.userNoShares.set(userKey, SafeMath.add(cur, shares));
      const tot: u256 = this.totalNoShares.get(marketKey);
      this.totalNoShares.set(marketKey, SafeMath.add(tot, shares));
    }

    // Track fees (M-3 fix)
    this.accumulatedFees.value = SafeMath.add(this.accumulatedFees.value, fee);

    // Pool tracks netAmount only (M-4 fix: was 'amount' which included fees)
    const pool: u256 = this.totalPools.get(marketKey);
    this.totalPools.set(marketKey, SafeMath.add(pool, netAmount));

    // YES price in bps for the event
    const newYesR: u256  = this.yesReserves.get(marketKey);
    const newNoR: u256   = this.noReserves.get(marketKey);
    const totalRes: u256 = SafeMath.add(newYesR, newNoR);
    const yesBps: u256   = SafeMath.div(SafeMath.mul(newNoR, u256.fromU64(BPS_BASE)), totalRes);

    // === INTERACTIONS (external calls AFTER state updates) ===
    // transferFrom: pull BPUSD tokens from buyer to contract
    this._transferFromToken(Blockchain.tx.sender, Blockchain.contract.address, amount);

    this.emitEvent(new SharesPurchasedEvent(
      marketId, Blockchain.tx.sender, isYes, amount, shares, yesBps,
    ));

    const writer = new BytesWriter(32);
    writer.writeU256(shares);
    return writer;
  }

  /**
   * resolveMarket(marketId: u256, outcome: bool) → void
   * Admin resolves market after endBlock.
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'outcome',  type: ABIDataTypes.BOOL },
  )
  public resolveMarket(calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const marketId: u256  = calldata.readU256();
    const outcome: boolean = calldata.readBoolean();
    const marketKey: Address = this.marketKey(marketId);

    const endBlock: u256 = this.endBlocks.get(marketKey);
    if (u256.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    if (u256.eq(this.resolvedFlags.get(marketKey), u256.One)) {
      throw new Revert('Already resolved');
    }

    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
    if (u256.lt(currentBlock, endBlock)) {
      throw new Revert('Market has not ended yet');
    }

    this.resolvedFlags.set(marketKey, u256.One);
    this.outcomes.set(marketKey, outcome ? u256.One : u256.Zero);

    this.emitEvent(new MarketResolvedEvent(marketId, outcome, Blockchain.tx.sender));

    return new BytesWriter(0);
  }

  /**
   * claimPayout(marketId: u256) → payout: u256
   * Transfers BPUSD tokens to winner.
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'payout', type: ABIDataTypes.UINT256 })
  public claimPayout(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);
    const userKey: Address   = this.userKey(marketId, Blockchain.tx.sender);

    if (!u256.eq(this.resolvedFlags.get(marketKey), u256.One)) {
      throw new Revert('Market not resolved');
    }

    if (u256.eq(this.userClaimed.get(userKey), u256.One)) {
      throw new Revert('Already claimed');
    }

    const outcomeIsYes: boolean = u256.eq(this.outcomes.get(marketKey), u256.One);
    const totalPool: u256       = this.totalPools.get(marketKey);

    let userShares: u256 = u256.Zero;
    let totalWinningShares: u256 = u256.Zero;

    if (outcomeIsYes) {
      userShares         = this.userYesShares.get(userKey);
      totalWinningShares = this.totalYesShares.get(marketKey);
    } else {
      userShares         = this.userNoShares.get(userKey);
      totalWinningShares = this.totalNoShares.get(marketKey);
    }

    if (u256.eq(userShares, u256.Zero)) {
      throw new Revert('No winning shares');
    }

    if (u256.eq(totalWinningShares, u256.Zero)) {
      throw new Revert('No winning shares in pool');
    }

    // payout = (userShares * totalPool) / totalWinningShares
    const payout: u256 = SafeMath.div(
      SafeMath.mul(userShares, totalPool),
      totalWinningShares,
    );

    if (u256.eq(payout, u256.Zero)) {
      throw new Revert('Nothing to claim');
    }

    // Mark claimed BEFORE external call (checks-effects-interactions)
    this.userClaimed.set(userKey, u256.One);

    // *** REAL TOKEN TRANSFER: transfer(claimer, payout) ***
    this._transferToken(Blockchain.tx.sender, payout);

    this.emitEvent(new PayoutClaimedEvent(marketId, Blockchain.tx.sender, payout));

    const writer = new BytesWriter(32);
    writer.writeU256(payout);
    return writer;
  }

  /**
   * sellShares(marketId: u256, isYes: bool, shares: u256) → payout: u256
   * Reverse AMM operation: sell shares back to the pool for BPUSD.
   * Only possible on open (unresolved, not ended) markets.
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'isYes',    type: ABIDataTypes.BOOL },
    { name: 'shares',   type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'payout', type: ABIDataTypes.UINT256 })
  public sellShares(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const marketId: u256 = calldata.readU256();
    const isYes: boolean = calldata.readBoolean();
    const shares: u256   = calldata.readU256();

    if (u256.eq(shares, u256.Zero)) {
      throw new Revert('Shares must be > 0');
    }

    const marketKey: Address = this.marketKey(marketId);

    const endBlock: u256 = this.endBlocks.get(marketKey);
    if (u256.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
    if (u256.ge(currentBlock, endBlock)) {
      throw new Revert('Market has ended');
    }

    if (u256.eq(this.resolvedFlags.get(marketKey), u256.One)) {
      throw new Revert('Market already resolved');
    }

    const userKey: Address = this.userKey(marketId, Blockchain.tx.sender);

    // Check user has enough shares
    let userShareBalance: u256;
    if (isYes) {
      userShareBalance = this.userYesShares.get(userKey);
    } else {
      userShareBalance = this.userNoShares.get(userKey);
    }

    if (u256.lt(userShareBalance, shares)) {
      throw new Revert('Insufficient shares');
    }

    // Reverse AMM: selling shares increases that reserve, other reserve decreases
    const yesReserve: u256 = this.yesReserves.get(marketKey);
    const noReserve: u256  = this.noReserves.get(marketKey);
    const k: u256          = SafeMath.mul(yesReserve, noReserve);

    let grossPayout: u256 = u256.Zero;

    // === EFFECTS (state updates before external calls) ===
    if (isYes) {
      // Selling YES shares: add shares back to yesReserve, noReserve decreases
      const newYesReserve: u256 = SafeMath.add(yesReserve, shares);
      // Ceiling division to preserve k-invariant: newNo = ceil(k / newYes)
      const newNoReserve: u256  = SafeMath.div(SafeMath.add(k, SafeMath.sub(newYesReserve, u256.One)), newYesReserve);
      grossPayout = SafeMath.sub(noReserve, newNoReserve);
      this.yesReserves.set(marketKey, newYesReserve);
      this.noReserves.set(marketKey, newNoReserve);
      this.userYesShares.set(userKey, SafeMath.sub(userShareBalance, shares));
      const tot: u256 = this.totalYesShares.get(marketKey);
      this.totalYesShares.set(marketKey, SafeMath.sub(tot, shares));
    } else {
      // Selling NO shares: add shares back to noReserve, yesReserve decreases
      const newNoReserve: u256  = SafeMath.add(noReserve, shares);
      // Ceiling division to preserve k-invariant: newYes = ceil(k / newNo)
      const newYesReserve: u256 = SafeMath.div(SafeMath.add(k, SafeMath.sub(newNoReserve, u256.One)), newNoReserve);
      grossPayout = SafeMath.sub(yesReserve, newYesReserve);
      this.yesReserves.set(marketKey, newYesReserve);
      this.noReserves.set(marketKey, newNoReserve);
      this.userNoShares.set(userKey, SafeMath.sub(userShareBalance, shares));
      const tot: u256 = this.totalNoShares.get(marketKey);
      this.totalNoShares.set(marketKey, SafeMath.sub(tot, shares));
    }

    // Apply fee (same as buy — round UP to favor protocol)
    const feeBps: u256 = this.marketFeeBps.value;
    const feeNumerator: u256 = SafeMath.mul(grossPayout, feeBps);
    const base: u256 = u256.fromU64(BPS_BASE);
    const feeRemainder: u256 = SafeMath.mod(feeNumerator, base);
    let fee: u256 = SafeMath.div(feeNumerator, base);
    if (!u256.eq(feeRemainder, u256.Zero)) {
      fee = SafeMath.add(fee, u256.One);
    }
    const netPayout: u256 = SafeMath.sub(grossPayout, fee);

    if (u256.eq(netPayout, u256.Zero)) {
      throw new Revert('Payout too small after fee');
    }

    // Track fees (M-3 fix)
    this.accumulatedFees.value = SafeMath.add(this.accumulatedFees.value, fee);

    // Decrease pool tracking (M-4 fix: netPayout instead of grossPayout)
    const pool: u256 = this.totalPools.get(marketKey);
    if (u256.gt(netPayout, pool)) {
      this.totalPools.set(marketKey, u256.Zero);
    } else {
      this.totalPools.set(marketKey, SafeMath.sub(pool, netPayout));
    }

    // === INTERACTIONS (external call after state) ===
    this._transferToken(Blockchain.tx.sender, netPayout);

    const writer = new BytesWriter(32);
    writer.writeU256(netPayout);
    return writer;
  }

  /**
   * setAdmin(newAdmin: Address) → void
   */
  @method({ name: 'newAdmin', type: ABIDataTypes.ADDRESS })
  public setAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newAdmin: Address = calldata.readAddress();
    this.adminAddress.value = newAdmin;
    return new BytesWriter(0);
  }

  /**
   * setFee(newFeeBps: u256) → void
   * Admin can adjust fee up to MAX_FEE_BPS (5%).
   */
  @method({ name: 'newFeeBps', type: ABIDataTypes.UINT256 })
  public setFee(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newFeeBps: u256 = calldata.readU256();
    if (u256.gt(newFeeBps, u256.fromU64(MAX_FEE_BPS))) {
      throw new Revert('Fee exceeds maximum (5%)');
    }
    this.marketFeeBps.value = newFeeBps;
    return new BytesWriter(0);
  }

  /**
   * withdrawFees() — Admin withdraws accumulated protocol fees.
   */
  @method()
  @returns({ name: 'amount', type: ABIDataTypes.UINT256 })
  public withdrawFees(_calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const fees: u256 = this.accumulatedFees.value;
    if (u256.eq(fees, u256.Zero)) {
      throw new Revert('No fees to withdraw');
    }

    // EFFECTS first
    this.accumulatedFees.value = u256.Zero;

    // INTERACTIONS
    this._transferToken(this.feeRecipient.value, fees);

    const writer = new BytesWriter(32);
    writer.writeU256(fees);
    return writer;
  }

  /**
   * setFeeRecipient(recipient: Address) — Admin sets fee recipient.
   */
  @method({ name: 'recipient', type: ABIDataTypes.ADDRESS })
  public setFeeRecipient(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const recipient: Address = calldata.readAddress();
    this.feeRecipient.value = recipient;
    return new BytesWriter(0);
  }

  /**
   * pause() — Admin pauses all write operations.
   */
  @method()
  public pause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = true;
    this.emitEvent(new PausedEvent(Blockchain.tx.sender));
    return new BytesWriter(0);
  }

  /**
   * unpause() — Admin resumes operations.
   */
  @method()
  public unpause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = false;
    this.emitEvent(new UnpausedEvent(Blockchain.tx.sender));
    return new BytesWriter(0);
  }

  // ============================================================
  // Read-Only Methods
  // ============================================================

  /**
   * getMarketInfo(marketId: u256)
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesReserve', type: ABIDataTypes.UINT256 })
  public getMarketInfo(calldata: Calldata): BytesWriter {
    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);

    const resolved: boolean = u256.eq(this.resolvedFlags.get(marketKey), u256.One);
    const outcome: boolean  = u256.eq(this.outcomes.get(marketKey), u256.One);

    const writer = new BytesWriter(130);
    writer.writeU256(this.yesReserves.get(marketKey));
    writer.writeU256(this.noReserves.get(marketKey));
    writer.writeU256(this.totalPools.get(marketKey));
    writer.writeU256(this.endBlocks.get(marketKey));
    writer.writeBoolean(resolved);
    writer.writeBoolean(outcome);
    return writer;
  }

  /**
   * getUserShares(marketId: u256, user: Address)
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'user',     type: ABIDataTypes.ADDRESS },
  )
  @returns({ name: 'yesShares', type: ABIDataTypes.UINT256 })
  public getUserShares(calldata: Calldata): BytesWriter {
    const marketId: u256 = calldata.readU256();
    const user: Address  = calldata.readAddress();
    const userKey: Address = this.userKey(marketId, user);

    const claimed: boolean = u256.eq(this.userClaimed.get(userKey), u256.One);

    const writer = new BytesWriter(65);
    writer.writeU256(this.userYesShares.get(userKey));
    writer.writeU256(this.userNoShares.get(userKey));
    writer.writeBoolean(claimed);
    return writer;
  }

  /**
   * getPrice(marketId: u256)
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesPriceBps', type: ABIDataTypes.UINT256 })
  public getPrice(calldata: Calldata): BytesWriter {
    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);

    const yesReserve: u256 = this.yesReserves.get(marketKey);
    const noReserve: u256  = this.noReserves.get(marketKey);
    const total: u256      = SafeMath.add(yesReserve, noReserve);

    const yesBps: u256 = SafeMath.div(SafeMath.mul(noReserve, u256.fromU64(BPS_BASE)), total);
    const noBps: u256  = SafeMath.sub(u256.fromU64(BPS_BASE), yesBps);

    const writer = new BytesWriter(64);
    writer.writeU256(yesBps);
    writer.writeU256(noBps);
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

  /**
   * transferFrom: pull BPUSD tokens from sender to contract via cross-contract call.
   * User must have approved this contract beforehand.
   */
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

  /**
   * transfer: send BPUSD tokens from contract to recipient via cross-contract call.
   */
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

  private marketKey(marketId: u256): Address {
    const buf = new Uint8Array(32);
    const mb: Uint8Array = marketId.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = mb[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }

  private userKey(marketId: u256, user: Address): Address {
    const buf = new Uint8Array(64);
    const mb: Uint8Array = marketId.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = mb[i];
    for (let i: i32 = 0; i < 32; i++) buf[32 + i] = user[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }
}
