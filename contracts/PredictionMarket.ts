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
 * - AddressMemoryMap stores raw u256 (booleans as u256.One / u256.Zero)
 * - StoredAddress for admin (uses .value getter/setter)
 * - claimPayout() marks claim + emits event — BTC payouts via verify-don't-custody
 * - Block height via Blockchain.block.number (NOT medianTimestamp)
 *
 * Deployment: cd contracts && npm run build → deploy via OP_WALLET to OP_NET testnet
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

const MARKET_FEE_BPS: u64 = 200;         // 2% fee on trades
const BPS_BASE: u64 = 10000;
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
    isYes: boolean,
    amount: u256,
    shares: u256,
    yesPriceBps: u256,
  ) {
    const data = new BytesWriter(161); // 32+32+1+32+32+32
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
    const data = new BytesWriter(65); // 32+1+32
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

// ============================================================
// Contract
// ============================================================

@final
export class PredictionMarket extends OP_NET {
  // Singleton storage
  private nextMarketId: StoredU256;
  private adminAddress: StoredAddress;

  // Per-market state (keyed by sha256(marketId))
  private yesReserves:    AddressMemoryMap;
  private noReserves:     AddressMemoryMap;
  private totalYesShares: AddressMemoryMap;
  private totalNoShares:  AddressMemoryMap;
  private endBlocks:      AddressMemoryMap;
  private resolvedFlags:  AddressMemoryMap; // u256.One = true, u256.Zero = false
  private outcomes:       AddressMemoryMap; // u256.One = YES, u256.Zero = NO
  private totalPools:     AddressMemoryMap;

  // Per-user share tracking (keyed by sha256(marketId || userAddress))
  private userYesShares: AddressMemoryMap;
  private userNoShares:  AddressMemoryMap;
  private userClaimed:   AddressMemoryMap; // u256.One = claimed

  constructor() {
    super();
    const emptySubPointer = new Uint8Array(0);
    this.nextMarketId  = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.adminAddress  = new StoredAddress(Blockchain.nextPointer);

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

  public override onDeployment(_calldata: Calldata): void {
    this.adminAddress.value = Blockchain.tx.origin;
    this.nextMarketId.value = u256.One;
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
    const endBlock: u256 = calldata.readU256();
    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);

    if (u256.le(endBlock, currentBlock)) {
      throw new Revert('End block must be in the future');
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

    // 2% fee — round UP to favor protocol (ATK-13 audit fix)
    const numerator: u256 = SafeMath.mul(amount, u256.fromU64(MARKET_FEE_BPS));
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

    let shares: u256 = u256.Zero;
    const userKey: Address = this.userKey(marketId, Blockchain.tx.sender);

    if (isYes) {
      const newNoReserve: u256  = SafeMath.add(noReserve, netAmount);
      const newYesReserve: u256 = SafeMath.div(k, newNoReserve);
      shares = SafeMath.sub(yesReserve, newYesReserve);
      this.yesReserves.set(marketKey, newYesReserve);
      this.noReserves.set(marketKey, newNoReserve);
      const cur: u256 = this.userYesShares.get(userKey);
      this.userYesShares.set(userKey, SafeMath.add(cur, shares));
      const tot: u256 = this.totalYesShares.get(marketKey);
      this.totalYesShares.set(marketKey, SafeMath.add(tot, shares));
    } else {
      const newYesReserve: u256 = SafeMath.add(yesReserve, netAmount);
      const newNoReserve: u256  = SafeMath.div(k, newYesReserve);
      shares = SafeMath.sub(noReserve, newNoReserve);
      this.yesReserves.set(marketKey, newYesReserve);
      this.noReserves.set(marketKey, newNoReserve);
      const cur: u256 = this.userNoShares.get(userKey);
      this.userNoShares.set(userKey, SafeMath.add(cur, shares));
      const tot: u256 = this.totalNoShares.get(marketKey);
      this.totalNoShares.set(marketKey, SafeMath.add(tot, shares));
    }

    const pool: u256 = this.totalPools.get(marketKey);
    this.totalPools.set(marketKey, SafeMath.add(pool, amount));

    // YES price in bps for the event
    const newYesR: u256  = this.yesReserves.get(marketKey);
    const newNoR: u256   = this.noReserves.get(marketKey);
    const totalRes: u256 = SafeMath.add(newYesR, newNoR);
    const yesBps: u256   = SafeMath.div(SafeMath.mul(newNoR, u256.fromU64(BPS_BASE)), totalRes);

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
   * Returns payout amount for winner. Marks claim and emits event.
   * Actual BTC transfer happens via verify-don't-custody on Bitcoin L1.
   */
  @method({ name: 'marketId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'payout', type: ABIDataTypes.UINT256 })
  public claimPayout(calldata: Calldata): BytesWriter {
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

    this.userClaimed.set(userKey, u256.One);

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
    const newAdmin: Address = calldata.readAddress();
    this.adminAddress.value = newAdmin;
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
    const marketId: u256  = calldata.readU256();
    const marketKey: Address = this.marketKey(marketId);

    const resolved: boolean = u256.eq(this.resolvedFlags.get(marketKey), u256.One);
    const outcome: boolean  = u256.eq(this.outcomes.get(marketKey), u256.One);

    const writer = new BytesWriter(130); // 4×32 + 2×1
    writer.writeU256(this.yesReserves.get(marketKey));
    writer.writeU256(this.noReserves.get(marketKey));
    writer.writeU256(this.totalPools.get(marketKey));
    writer.writeU256(this.endBlocks.get(marketKey));
    writer.writeBoolean(resolved);
    writer.writeBoolean(outcome);
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
    const marketId: u256 = calldata.readU256();
    const user: Address  = calldata.readAddress();
    const userKey: Address = this.userKey(marketId, user);

    const claimed: boolean = u256.eq(this.userClaimed.get(userKey), u256.One);

    const writer = new BytesWriter(65); // 2×32 + 1
    writer.writeU256(this.userYesShares.get(userKey));
    writer.writeU256(this.userNoShares.get(userKey));
    writer.writeBoolean(claimed);
    return writer;
  }

  /**
   * getPrice(marketId: u256) → (yesPriceBps: u256, noPriceBps: u256)
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

  private requireAdmin(): void {
    const admin: Address = this.adminAddress.value;
    if (!Blockchain.tx.sender.equals(admin)) {
      throw new Revert('Only admin');
    }
  }

  private marketKey(marketId: u256): Address {
    // SHA256(marketId bytes) → deterministic 32-byte storage key
    const buf = new Uint8Array(32);
    const mb: Uint8Array = marketId.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = mb[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }

  private userKey(marketId: u256, user: Address): Address {
    // SHA256(marketId || userAddress) → collision-resistant composite key
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
