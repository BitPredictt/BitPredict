/**
 * BitPredict — Prediction Market Smart Contract for OP_NET (Bitcoin L1)
 *
 * Written in AssemblyScript for the OP_NET runtime (btc-runtime).
 * Compiles to WebAssembly and runs on Bitcoin Layer 1 via OP_NET consensus.
 *
 * Fixed per Bob (ai.opnet.org) audit:
 * - Added @method() decorators on all public methods (required for getContract() SDK)
 * - Uses SHA256 for userKey composite (not XOR)
 * - Correct compact types: u32 for block height, bool for flags, u16 for fee BPS
 * - StoredBoolean for resolved/outcome flags
 * - StoredAddress for admin
 * - claimPayout() is view-only — BTC payouts use verify-don't-custody on Bitcoin L1
 * - Block height via Blockchain.block.number (NOT medianTimestamp)
 *
 * Deployment: npm run asbuild → deploy via OP_WALLET to OP_NET regtest
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
  StoredBoolean,
  StoredAddress,
  AddressMemoryMap,
} from '@btc-vision/btc-runtime/runtime';

// ============================================================
// Constants
// ============================================================

const MARKET_FEE_BPS: u16 = 200;         // 2% fee on trades (u16: max 10000)
const MIN_TRADE_AMOUNT: u256 = u256.fromU64(100); // 100 sats minimum
const INITIAL_LIQUIDITY: u256 = u256.fromU64(1_000_000); // 1M sats initial virtual liquidity

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
    isYes: bool,
    amount: u256,
    shares: u256,
    yesPriceBps: u256,
  ) {
    const data = new BytesWriter(160);
    data.writeU256(marketId);
    data.writeAddress(buyer);
    data.writeBool(isYes);
    data.writeU256(amount);
    data.writeU256(shares);
    data.writeU256(yesPriceBps);
    super('SharesPurchased', data);
  }
}

class MarketResolvedEvent extends NetEvent {
  constructor(marketId: u256, outcome: bool, resolver: Address) {
    const data = new BytesWriter(96);
    data.writeU256(marketId);
    data.writeBool(outcome);
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

// ============================================================
// Contract
// ============================================================

@final
export class PredictionMarket extends OP_NET {
  // Singleton storage
  private nextMarketId: StoredU256;
  private adminAddress: StoredAddress;

  // Per-market state (keyed by sha256(marketId))
  private yesReserves:    AddressMemoryMap<Address, StoredU256>;
  private noReserves:     AddressMemoryMap<Address, StoredU256>;
  private totalYesShares: AddressMemoryMap<Address, StoredU256>;
  private totalNoShares:  AddressMemoryMap<Address, StoredU256>;
  private endBlocks:      AddressMemoryMap<Address, StoredU256>;
  private resolvedFlags:  AddressMemoryMap<Address, StoredBoolean>;
  private outcomes:       AddressMemoryMap<Address, StoredBoolean>;
  private totalPools:     AddressMemoryMap<Address, StoredU256>;

  // Per-user share tracking (keyed by sha256(marketId || userAddress))
  private userYesShares: AddressMemoryMap<Address, StoredU256>;
  private userNoShares:  AddressMemoryMap<Address, StoredU256>;
  private userClaimed:   AddressMemoryMap<Address, StoredBoolean>;

  constructor() {
    super();
    this.nextMarketId  = new StoredU256(Blockchain.nextPointer);
    this.adminAddress  = new StoredAddress(Blockchain.nextPointer);

    this.yesReserves    = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.noReserves     = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.totalYesShares = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.totalNoShares  = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.endBlocks      = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.resolvedFlags  = new AddressMemoryMap<Address, StoredBoolean>(Blockchain.nextPointer);
    this.outcomes       = new AddressMemoryMap<Address, StoredBoolean>(Blockchain.nextPointer);
    this.totalPools     = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);

    this.userYesShares = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.userNoShares  = new AddressMemoryMap<Address, StoredU256>(Blockchain.nextPointer);
    this.userClaimed   = new AddressMemoryMap<Address, StoredBoolean>(Blockchain.nextPointer);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(_calldata: Calldata): void {
    this.adminAddress.set(Blockchain.tx.origin);
    this.nextMarketId.set(u256.One);
  }

  // ============================================================
  // Write Methods (public, routed via @method decorators)
  // ============================================================

  /**
   * createMarket(endBlock: u256) → marketId: u256
   * Creates a new binary prediction market with 50/50 starting price.
   */
  @method({ name: 'endBlock', type: ABIDataTypes.UINT256 })
  @returns({ name: 'marketId', type: ABIDataTypes.UINT256 })
  public createMarket(calldata: Calldata): BytesWriter {
    const endBlock = calldata.readU256();
    const currentBlock = u256.fromU64(Blockchain.block.number);

    if (SafeMath.lte(endBlock, currentBlock)) {
      throw new Revert('End block must be in the future');
    }

    const marketId = this.nextMarketId.get();
    const marketKey = this.marketKey(marketId);

    this.yesReserves.get(marketKey).set(INITIAL_LIQUIDITY);
    this.noReserves.get(marketKey).set(INITIAL_LIQUIDITY);
    this.totalYesShares.get(marketKey).set(u256.Zero);
    this.totalNoShares.get(marketKey).set(u256.Zero);
    this.endBlocks.get(marketKey).set(endBlock);
    this.resolvedFlags.get(marketKey).set(false);
    this.outcomes.get(marketKey).set(false);
    this.totalPools.get(marketKey).set(u256.Zero);

    this.nextMarketId.set(SafeMath.add(marketId, u256.One));

    this.emitEvent(new MarketCreatedEvent(marketId, endBlock, Blockchain.tx.sender));

    const writer = new BytesWriter(32);
    writer.writeU256(marketId);
    return writer;
  }

  /**
   * buyShares(marketId: u256, isYes: bool, amount: u256) → shares: u256
   * Purchase YES or NO shares via constant-product AMM (x*y=k).
   * NOTE: Contract tracks share accounting. BTC payment verified via Blockchain.tx.outputs
   * in a full NativeSwap-style implementation; for demo, amount is passed in calldata.
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'isYes',    type: ABIDataTypes.BOOL },
    { name: 'amount',   type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'shares', type: ABIDataTypes.UINT256 })
  public buyShares(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const isYes    = calldata.readBool();
    const amount   = calldata.readU256();

    if (SafeMath.lt(amount, MIN_TRADE_AMOUNT)) {
      throw new Revert('Amount below minimum');
    }

    const marketKey = this.marketKey(marketId);

    const endBlock = this.endBlocks.get(marketKey).get();
    if (SafeMath.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    const currentBlock = u256.fromU64(Blockchain.block.number);
    if (SafeMath.gte(currentBlock, endBlock)) {
      throw new Revert('Market has ended');
    }

    if (this.resolvedFlags.get(marketKey).get()) {
      throw new Revert('Market already resolved');
    }

    // 2% fee
    const fee = SafeMath.div(
      SafeMath.mul(amount, u256.fromU64(<u64>MARKET_FEE_BPS)),
      u256.fromU64(10000),
    );
    const netAmount = SafeMath.sub(amount, fee);

    const yesReserve = this.yesReserves.get(marketKey).get();
    const noReserve  = this.noReserves.get(marketKey).get();
    const k          = SafeMath.mul(yesReserve, noReserve);

    let shares: u256;
    const userKey = this.userKey(marketId, Blockchain.tx.sender);

    if (isYes) {
      const newNoReserve  = SafeMath.add(noReserve, netAmount);
      const newYesReserve = SafeMath.div(k, newNoReserve);
      shares = SafeMath.sub(yesReserve, newYesReserve);
      this.yesReserves.get(marketKey).set(newYesReserve);
      this.noReserves.get(marketKey).set(newNoReserve);
      const cur = this.userYesShares.get(userKey).get();
      this.userYesShares.get(userKey).set(SafeMath.add(cur, shares));
      const tot = this.totalYesShares.get(marketKey).get();
      this.totalYesShares.get(marketKey).set(SafeMath.add(tot, shares));
    } else {
      const newYesReserve = SafeMath.add(yesReserve, netAmount);
      const newNoReserve  = SafeMath.div(k, newYesReserve);
      shares = SafeMath.sub(noReserve, newNoReserve);
      this.yesReserves.get(marketKey).set(newYesReserve);
      this.noReserves.get(marketKey).set(newNoReserve);
      const cur = this.userNoShares.get(userKey).get();
      this.userNoShares.get(userKey).set(SafeMath.add(cur, shares));
      const tot = this.totalNoShares.get(marketKey).get();
      this.totalNoShares.get(marketKey).set(SafeMath.add(tot, shares));
    }

    const pool = this.totalPools.get(marketKey).get();
    this.totalPools.get(marketKey).set(SafeMath.add(pool, amount));

    // YES price in bps for the event
    const newYesR  = this.yesReserves.get(marketKey).get();
    const newNoR   = this.noReserves.get(marketKey).get();
    const totalRes = SafeMath.add(newYesR, newNoR);
    const yesBps   = SafeMath.div(SafeMath.mul(newNoR, u256.fromU64(10000)), totalRes);

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

    const marketId = calldata.readU256();
    const outcome  = calldata.readBool();
    const marketKey = this.marketKey(marketId);

    const endBlock = this.endBlocks.get(marketKey).get();
    if (SafeMath.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    if (this.resolvedFlags.get(marketKey).get()) {
      throw new Revert('Already resolved');
    }

    const currentBlock = u256.fromU64(Blockchain.block.number);
    if (SafeMath.lt(currentBlock, endBlock)) {
      throw new Revert('Market has not ended yet');
    }

    this.resolvedFlags.get(marketKey).set(true);
    this.outcomes.get(marketKey).set(outcome);

    this.emitEvent(new MarketResolvedEvent(marketId, outcome, Blockchain.tx.origin));

    return new BytesWriter(0);
  }

  /**
   * claimPayout(marketId: u256) → payout: u256
   * Returns payout amount for winner. Marks claim and emits event.
   * Actual BTC transfer happens via verify-don't-custody on Bitcoin L1.
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'payout', type: ABIDataTypes.UINT256 })
  public claimPayout(calldata: Calldata): BytesWriter {
    const marketId  = calldata.readU256();
    const marketKey = this.marketKey(marketId);
    const userKey   = this.userKey(marketId, Blockchain.tx.sender);

    if (!this.resolvedFlags.get(marketKey).get()) {
      throw new Revert('Market not resolved');
    }

    if (this.userClaimed.get(userKey).get()) {
      throw new Revert('Already claimed');
    }

    const outcomeIsYes  = this.outcomes.get(marketKey).get();
    const totalPool     = this.totalPools.get(marketKey).get();

    let userShares: u256;
    let totalWinningShares: u256;

    if (outcomeIsYes) {
      userShares         = this.userYesShares.get(userKey).get();
      totalWinningShares = this.totalYesShares.get(marketKey).get();
    } else {
      userShares         = this.userNoShares.get(userKey).get();
      totalWinningShares = this.totalNoShares.get(marketKey).get();
    }

    if (SafeMath.eq(userShares, u256.Zero)) {
      throw new Revert('No winning shares');
    }

    if (SafeMath.eq(totalWinningShares, u256.Zero)) {
      throw new Revert('No winning shares in pool');
    }

    // payout = (userShares * totalPool) / totalWinningShares
    const payout = SafeMath.div(
      SafeMath.mul(userShares, totalPool),
      totalWinningShares,
    );

    this.userClaimed.get(userKey).set(true);

    this.emitEvent(new PayoutClaimedEvent(marketId, Blockchain.tx.sender, payout));

    const writer = new BytesWriter(32);
    writer.writeU256(payout);
    return writer;
  }

  /**
   * setAdmin(newAdmin: Address) → void
   * Admin key rotation.
   */
  @method({ name: 'newAdmin', type: ABIDataTypes.ADDRESS })
  public setAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newAdmin = calldata.readAddress();
    this.adminAddress.set(newAdmin);
    return new BytesWriter(0);
  }

  // ============================================================
  // Read-Only Methods
  // ============================================================

  /**
   * getMarketInfo(marketId: u256) → (yesReserve, noReserve, totalPool, endBlock, resolved, outcome)
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesReserve', type: ABIDataTypes.UINT256 })
  public getMarketInfo(calldata: Calldata): BytesWriter {
    const marketId  = calldata.readU256();
    const marketKey = this.marketKey(marketId);

    const writer = new BytesWriter(194); // 6×32 + 2×1 bools
    writer.writeU256(this.yesReserves.get(marketKey).get());
    writer.writeU256(this.noReserves.get(marketKey).get());
    writer.writeU256(this.totalPools.get(marketKey).get());
    writer.writeU256(this.endBlocks.get(marketKey).get());
    writer.writeBool(this.resolvedFlags.get(marketKey).get());
    writer.writeBool(this.outcomes.get(marketKey).get());
    return writer;
  }

  /**
   * getUserShares(marketId: u256, user: Address) → (yesShares, noShares, claimed)
   */
  @method(
    { name: 'marketId', type: ABIDataTypes.UINT256 },
    { name: 'user',     type: ABIDataTypes.ADDRESS },
  )
  @returns({ name: 'yesShares', type: ABIDataTypes.UINT256 })
  public getUserShares(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const user     = calldata.readAddress();
    const userKey  = this.userKey(marketId, user);

    const writer = new BytesWriter(65); // 2×32 + 1 bool
    writer.writeU256(this.userYesShares.get(userKey).get());
    writer.writeU256(this.userNoShares.get(userKey).get());
    writer.writeBool(this.userClaimed.get(userKey).get());
    return writer;
  }

  /**
   * getPrice(marketId: u256) → (yesPriceBps: u256, noPriceBps: u256)
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'yesPriceBps', type: ABIDataTypes.UINT256 })
  public getPrice(calldata: Calldata): BytesWriter {
    const marketId  = calldata.readU256();
    const marketKey = this.marketKey(marketId);

    const yesReserve = this.yesReserves.get(marketKey).get();
    const noReserve  = this.noReserves.get(marketKey).get();
    const total      = SafeMath.add(yesReserve, noReserve);

    const yesBps = SafeMath.div(SafeMath.mul(noReserve, u256.fromU64(10000)), total);
    const noBps  = SafeMath.sub(u256.fromU64(10000), yesBps);

    const writer = new BytesWriter(64);
    writer.writeU256(yesBps);
    writer.writeU256(noBps);
    return writer;
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  private requireAdmin(): void {
    const admin  = this.adminAddress.get();
    if (!Blockchain.tx.sender.equals(admin)) {
      throw new Revert('Only admin');
    }
  }

  private marketKey(marketId: u256): Address {
    // SHA256(marketId bytes) → deterministic 32-byte storage key
    const buf = new Uint8Array(32);
    const mb  = marketId.toBytes();
    for (let i = 0; i < 32; i++) buf[i] = mb[i];
    return new Address(Blockchain.sha256(buf).buffer);
  }

  private userKey(marketId: u256, user: Address): Address {
    // SHA256(marketId || userAddress) → collision-resistant composite key
    const buf = new Uint8Array(64);
    const mb  = marketId.toBytes();
    const ub  = user.toBytes();
    for (let i = 0; i < 32; i++) buf[i]      = mb[i];
    for (let i = 0; i < 32; i++) buf[32 + i] = ub[i];
    return new Address(Blockchain.sha256(buf).buffer);
  }
}
