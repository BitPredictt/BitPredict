/**
 * BitPredict — Prediction Market Smart Contract for OP_NET (Bitcoin L1)
 *
 * Parimutuel betting model:
 * - Users bet YES or NO with WBTC tokens
 * - All bets go into a shared pool (minus fee)
 * - Winners split the entire pool proportional to their bet size
 * - No AMM, no liquidity providers, no sell-back
 *
 * Features:
 * - Real WBTC token transfers via Blockchain.call() (transferFrom/transfer)
 * - ReentrancyGuard (STANDARD level) on all write methods
 * - Pausable pattern (_paused + whenNotPaused)
 * - Governance fee (StoredU256, admin-adjustable up to 5%)
 * - MIN_MARKET_DURATION enforcement (6 blocks ≈ 1 hour)
 * - MIN_TRADE_AMOUNT (10,000 sats)
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

/** Constants */

const BPS_BASE: u64 = 10000;
const MAX_FEE_BPS: u64 = 500;           // max 5% fee
const MIN_TRADE_AMOUNT: u256 = u256.fromU64(10_000); // 10,000 sats minimum
const MIN_MARKET_DURATION: u64 = 6;      // 6 blocks ≈ 1 hour

// Cross-contract call selectors (OP-20 standard)
const TRANSFER_FROM_SELECTOR: u32 = 0x4b6685e7; // transferFrom — OPNet SHA-256 selector
const TRANSFER_SELECTOR: u32 = 0x3b88ef57;      // transfer — OPNet SHA-256 selector

/** Events */

class MarketCreatedEvent extends NetEvent {
  constructor(marketId: u256, endBlock: u256, creator: Address) {
    const data = new BytesWriter(96);
    data.writeU256(marketId);
    data.writeU256(endBlock);
    data.writeAddress(creator);
    super('MarketCreated', data);
  }
}

class BetPlacedEvent extends NetEvent {
  constructor(
    marketId: u256,
    bettor: Address,
    isYes: boolean,
    amount: u256,
    netAmount: u256,
    newYesPool: u256,
    newNoPool: u256,
  ) {
    const data = new BytesWriter(193);
    data.writeU256(marketId);
    data.writeAddress(bettor);
    data.writeBoolean(isYes);
    data.writeU256(amount);
    data.writeU256(netAmount);
    data.writeU256(newYesPool);
    data.writeU256(newNoPool);
    super('BetPlaced', data);
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

class AdminChangedEvent extends NetEvent {
  constructor(oldAdmin: Address, newAdmin: Address) {
    const data = new BytesWriter(64);
    data.writeAddress(oldAdmin);
    data.writeAddress(newAdmin);
    super('AdminChanged', data);
  }
}

class FeeChangedEvent extends NetEvent {
  constructor(oldFeeBps: u256, newFeeBps: u256) {
    const data = new BytesWriter(64);
    data.writeU256(oldFeeBps);
    data.writeU256(newFeeBps);
    super('FeeChanged', data);
  }
}

class FeeRecipientChangedEvent extends NetEvent {
  constructor(newRecipient: Address) {
    const data = new BytesWriter(32);
    data.writeAddress(newRecipient);
    super('FeeRecipientChanged', data);
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

/** Contract */

@final
export class PredictionMarket extends ReentrancyGuard {
  protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

  // Singleton storage (pointers 0-7)
  private nextMarketId: StoredU256;
  private adminAddress: StoredAddress;
  private tokenAddress: StoredAddress;  // WBTC token contract
  private _paused: StoredBoolean;
  private marketFeeBps: StoredU256;     // governance-adjustable fee (in BPS)
  private accumulatedFees: StoredU256;  // total fees accumulated (withdrawable by admin)
  private feeRecipient: StoredAddress;  // address to receive withdrawn fees
  private activeMarketCount: StoredU256; // number of unresolved markets

  // Per-market state (pointers 8-13, keyed by sha256(marketId))
  // NOTE: pointers 8-9 were yesReserves/noReserves in AMM version — now unused but kept
  // for storage layout compatibility. New deployments skip them.
  private _reserved8: AddressMemoryMap;  // was yesReserves
  private _reserved9: AddressMemoryMap;  // was noReserves
  private totalYesShares: AddressMemoryMap;  // pointer 10: total YES pool in sats
  private totalNoShares:  AddressMemoryMap;  // pointer 11: total NO pool in sats
  private endBlocks:      AddressMemoryMap;  // pointer 12
  private resolvedFlags:  AddressMemoryMap;  // pointer 13
  private outcomes:       AddressMemoryMap;  // pointer 14
  private totalPools:     AddressMemoryMap;  // pointer 15

  // Per-user share tracking (pointers 16-18, keyed by sha256(marketId || userAddress))
  private userYesShares: AddressMemoryMap;  // pointer 16
  private userNoShares:  AddressMemoryMap;  // pointer 17
  private userClaimed:   AddressMemoryMap;  // pointer 18

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
    this.activeMarketCount = new StoredU256(Blockchain.nextPointer, emptySubPointer);

    // Pointers 8-9: reserved (was AMM reserves) — must allocate to keep layout
    this._reserved8     = new AddressMemoryMap(Blockchain.nextPointer);
    this._reserved9     = new AddressMemoryMap(Blockchain.nextPointer);
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

  /** Lifecycle */

  public override onDeployment(calldata: Calldata): void {
    // calldata: tokenAddress (Address)
    const token: Address = calldata.readAddress();
    this.tokenAddress.value = token;
    this.adminAddress.value = Blockchain.tx.sender;
    this.nextMarketId.value = u256.One;
    this.marketFeeBps.value = u256.fromU64(200); // default 2%
    this.accumulatedFees.value = u256.Zero;
    this.feeRecipient.value = Blockchain.tx.sender; // admin is default fee recipient
    this.activeMarketCount.value = u256.Zero;
  }

  /** Write Methods */

  /**
   * createMarket(endBlock: u256) → marketId: u256
   */
  @method({ name: 'endBlock', type: ABIDataTypes.UINT256 })
  @returns({ name: 'marketId', type: ABIDataTypes.UINT256 })
  public createMarket(calldata: Calldata): BytesWriter {
    this.requireAdmin();
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

    // Parimutuel: no reserves, just empty pools
    this.totalYesShares.set(marketKey, u256.Zero);
    this.totalNoShares.set(marketKey, u256.Zero);
    this.endBlocks.set(marketKey, endBlock);
    this.resolvedFlags.set(marketKey, u256.Zero);
    this.outcomes.set(marketKey, u256.Zero);
    this.totalPools.set(marketKey, u256.Zero);

    this.nextMarketId.value = SafeMath.add(marketId, u256.One);
    this.activeMarketCount.value = SafeMath.add(this.activeMarketCount.value, u256.One);

    this.emitEvent(new MarketCreatedEvent(marketId, endBlock, Blockchain.tx.sender));

    const writer = new BytesWriter(32);
    writer.writeU256(marketId);
    return writer;
  }

  /**
   * placeBet(marketId: u256, isYes: bool, amount: u256) → netAmount: u256
   * Parimutuel bet: user's WBTC goes into the YES or NO pool.
   * Contract performs transferFrom to pull tokens from user.
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'isYes',    type: ABIDataTypes.BOOL },
    { name: 'amount',   type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'netAmount', type: ABIDataTypes.UINT256 })
  public placeBet(calldata: Calldata): BytesWriter {
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

    // Fee: ceil(amount * feeBps / 10000)
    const feeBps: u256 = this.marketFeeBps.value;
    const numerator: u256 = SafeMath.mul(amount, feeBps);
    const base: u256 = u256.fromU64(BPS_BASE);
    const remainder: u256 = SafeMath.mod(numerator, base);
    let fee: u256 = SafeMath.div(numerator, base);
    if (!u256.eq(remainder, u256.Zero)) {
      fee = SafeMath.add(fee, u256.One);
    }
    const netAmount: u256 = SafeMath.sub(amount, fee);

    const userKey: Address = this.userKey(marketId, Blockchain.tx.sender);

    // === EFFECTS (state updates BEFORE external calls — CEI pattern) ===
    if (isYes) {
      const cur: u256 = this.userYesShares.get(userKey);
      this.userYesShares.set(userKey, SafeMath.add(cur, netAmount));
      const tot: u256 = this.totalYesShares.get(marketKey);
      this.totalYesShares.set(marketKey, SafeMath.add(tot, netAmount));
    } else {
      const cur: u256 = this.userNoShares.get(userKey);
      this.userNoShares.set(userKey, SafeMath.add(cur, netAmount));
      const tot: u256 = this.totalNoShares.get(marketKey);
      this.totalNoShares.set(marketKey, SafeMath.add(tot, netAmount));
    }

    // Track fees
    this.accumulatedFees.value = SafeMath.add(this.accumulatedFees.value, fee);

    // Pool tracks netAmount only
    const pool: u256 = this.totalPools.get(marketKey);
    this.totalPools.set(marketKey, SafeMath.add(pool, netAmount));

    // Read new pool values for event
    const newYesPool: u256 = this.totalYesShares.get(marketKey);
    const newNoPool: u256  = this.totalNoShares.get(marketKey);

    // === INTERACTIONS (external calls AFTER state updates) ===
    // transferFrom: pull WBTC tokens from bettor to contract
    this._transferFromToken(Blockchain.tx.sender, Blockchain.contract.address, amount);

    this.emitEvent(new BetPlacedEvent(
      marketId, Blockchain.tx.sender, isYes, amount, netAmount, newYesPool, newNoPool,
    ));

    const writer = new BytesWriter(32);
    writer.writeU256(netAmount);
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
    this.activeMarketCount.value = SafeMath.sub(this.activeMarketCount.value, u256.One);

    this.emitEvent(new MarketResolvedEvent(marketId, outcome, Blockchain.tx.sender));

    return new BytesWriter(0);
  }

  /**
   * claimPayout(marketId: u256) → payout: u256
   * Transfers WBTC tokens to winner.
   * Payout = (userShares * totalPool) / totalWinningShares
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

    // Transfer WBTC to winner
    this._transferToken(Blockchain.tx.sender, payout);

    this.emitEvent(new PayoutClaimedEvent(marketId, Blockchain.tx.sender, payout));

    const writer = new BytesWriter(32);
    writer.writeU256(payout);
    return writer;
  }

  /**
   * setAdmin(newAdmin: Address) → void
   */
  @method({ name: 'newAdmin', type: ABIDataTypes.ADDRESS })
  public setAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newAdmin: Address = calldata.readAddress();
    if (newAdmin.equals(Blockchain.tx.sender)) {
      throw new Revert('Admin unchanged');
    }
    // Prevent locking admin to zero address
    const zeroAddr = new Address(new Array<u8>(32).fill(0));
    if (newAdmin.equals(zeroAddr)) {
      throw new Revert('New admin cannot be zero address');
    }
    const oldAdmin: Address = this.adminAddress.value;
    this.adminAddress.value = newAdmin;
    this.emitEvent(new AdminChangedEvent(oldAdmin, newAdmin));
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
    const oldFeeBps: u256 = this.marketFeeBps.value;
    this.marketFeeBps.value = newFeeBps;
    this.emitEvent(new FeeChangedEvent(oldFeeBps, newFeeBps));
    return new BytesWriter(0);
  }

  /**
   * withdrawFees() — Admin withdraws accumulated protocol fees.
   * No restriction on active markets — server can withdraw periodically.
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
    this.emitEvent(new FeeRecipientChangedEvent(recipient));
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

  /** Read-Only Methods */

  /**
   * getMarketInfo(marketId: u256)
   * Returns: yesPool, noPool, totalPool, endBlock, resolved, outcome
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesPool', type: ABIDataTypes.UINT256 })
  public getMarketInfo(calldata: Calldata): BytesWriter {
    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);

    const resolved: boolean = u256.eq(this.resolvedFlags.get(marketKey), u256.One);
    const outcome: boolean  = u256.eq(this.outcomes.get(marketKey), u256.One);

    const writer = new BytesWriter(130);
    writer.writeU256(this.totalYesShares.get(marketKey));  // yesPool
    writer.writeU256(this.totalNoShares.get(marketKey));   // noPool
    writer.writeU256(this.totalPools.get(marketKey));      // totalPool
    writer.writeU256(this.endBlocks.get(marketKey));
    writer.writeBoolean(resolved);
    writer.writeBoolean(outcome);
    return writer;
  }

  /**
   * getUserBets(marketId: u256, user: Address)
   * Returns: yesBet, noBet, claimed, yesPool, noPool, totalPool
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'user',     type: ABIDataTypes.ADDRESS },
  )
  @returns({ name: 'yesBet', type: ABIDataTypes.UINT256 })
  public getUserBets(calldata: Calldata): BytesWriter {
    const marketId: u256 = calldata.readU256();
    const user: Address  = calldata.readAddress();
    const userKey: Address = this.userKey(marketId, user);
    const marketKey: Address = this.marketKey(marketId);

    const claimed: boolean = u256.eq(this.userClaimed.get(userKey), u256.One);

    const writer = new BytesWriter(161);
    writer.writeU256(this.userYesShares.get(userKey));     // yesBet
    writer.writeU256(this.userNoShares.get(userKey));      // noBet
    writer.writeBoolean(claimed);
    writer.writeU256(this.totalYesShares.get(marketKey));  // yesPool
    writer.writeU256(this.totalNoShares.get(marketKey));   // noPool
    writer.writeU256(this.totalPools.get(marketKey));      // totalPool
    return writer;
  }

  /**
   * getPrice(marketId: u256)
   * Parimutuel price = pool proportion.
   * yesProb = yesPool / (yesPool + noPool) * 10000 BPS
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesPriceBps', type: ABIDataTypes.UINT256 })
  public getPrice(calldata: Calldata): BytesWriter {
    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);

    const yesPool: u256 = this.totalYesShares.get(marketKey);
    const noPool: u256  = this.totalNoShares.get(marketKey);
    const total: u256   = SafeMath.add(yesPool, noPool);

    // Empty pools — return 50/50
    if (u256.eq(total, u256.Zero)) {
      const half: u256 = u256.fromU64(BPS_BASE / 2);
      const writer = new BytesWriter(64);
      writer.writeU256(half);
      writer.writeU256(half);
      return writer;
    }

    const yesBps: u256 = SafeMath.div(SafeMath.mul(yesPool, u256.fromU64(BPS_BASE)), total);
    const noBps: u256  = SafeMath.sub(u256.fromU64(BPS_BASE), yesBps);

    const writer = new BytesWriter(64);
    writer.writeU256(yesBps);
    writer.writeU256(noBps);
    return writer;
  }

  /** Internal Helpers */

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
   * transferFrom: pull WBTC tokens from sender to contract via cross-contract call.
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
   * transfer: send WBTC tokens from contract to recipient via cross-contract call.
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
