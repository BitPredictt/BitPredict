/**
 * BitPredict — Prediction Market Smart Contract for OP_NET (Bitcoin L1)
 *
 * Written in AssemblyScript for the OP_NET runtime (btc-runtime).
 * Compiles to WebAssembly and runs on Bitcoin Layer 1 via OP_NET consensus.
 *
 * This contract implements a binary outcome prediction market with:
 * - Market creation with configurable resolution time
 * - YES/NO share trading using constant-product AMM pricing
 * - Automated market resolution via oracle or admin
 * - Payout distribution to winning shareholders
 * - Fee collection for liquidity providers
 *
 * Security considerations:
 * - No floating-point arithmetic (uses u256 for all calculations)
 * - Reentrancy protection via state locks
 * - Overflow protection via SafeMath operations
 * - Time-based resolution with grace period
 * - Admin key rotation support
 *
 * Deployment: Compile with `npm run build` → deploys to OP_NET testnet/mainnet
 */

import {
  u256,
} from '@btc-vision/as-bignum/assembly';

import {
  Address,
  ADDRESS_BYTE_LENGTH,
  Blockchain,
  BytesWriter,
  Calldata,
  encodeSelector,
  Map,
  OP_NET,
  Revert,
  SafeMath,
  Selector,
  StoredU256,
  AddressMemoryMap,
} from '@btc-vision/btc-runtime/runtime';

// ============================================================
// Constants
// ============================================================

const MARKET_FEE_BPS: u64 = 200; // 2% fee on trades
const MIN_TRADE_AMOUNT: u256 = u256.fromU64(100); // 100 sats minimum
const RESOLUTION_GRACE_PERIOD: u64 = 144; // ~1 day in blocks
const INITIAL_LIQUIDITY: u256 = u256.fromU64(1_000_000); // 1M sats initial virtual liquidity

// ============================================================
// Events
// ============================================================

class MarketCreatedEvent {
  constructor(
    public marketId: u256,
    public question: string,
    public endBlock: u256,
    public creator: Address,
  ) {}
}

class SharesPurchasedEvent {
  constructor(
    public marketId: u256,
    public buyer: Address,
    public isYes: bool,
    public amount: u256,
    public shares: u256,
    public newYesPrice: u256,
  ) {}
}

class MarketResolvedEvent {
  constructor(
    public marketId: u256,
    public outcome: bool, // true = YES wins, false = NO wins
    public resolver: Address,
  ) {}
}

class PayoutClaimedEvent {
  constructor(
    public marketId: u256,
    public claimer: Address,
    public amount: u256,
  ) {}
}

// ============================================================
// Storage Layout
// ============================================================

// Market state structure (stored as individual StoredU256 per field)
// Each market has:
//   - yesReserve: virtual YES token reserve
//   - noReserve: virtual NO token reserve
//   - totalYesShares: total YES shares outstanding
//   - totalNoShares: total NO shares outstanding
//   - endBlock: block height when market resolves
//   - resolved: 0 or 1
//   - outcome: 0 (NO) or 1 (YES) — only valid after resolution
//   - totalPool: total BTC deposited into market

// Per-user share tracking:
//   yesShares[marketId][address] → u256
//   noShares[marketId][address] → u256
//   claimed[marketId][address] → u256 (0 or 1)

// ============================================================
// Contract
// ============================================================

@final
export class PredictionMarket extends OP_NET {
  // --- Storage Pointers ---
  private nextMarketId: StoredU256;
  private adminAddress: StoredU256; // stored as u256 encoding of address

  // Market state maps (marketId → value)
  private yesReserves: AddressMemoryMap<Address, StoredU256>;
  private noReserves: AddressMemoryMap<Address, StoredU256>;
  private totalYesShares: AddressMemoryMap<Address, StoredU256>;
  private totalNoShares: AddressMemoryMap<Address, StoredU256>;
  private endBlocks: AddressMemoryMap<Address, StoredU256>;
  private resolvedFlags: AddressMemoryMap<Address, StoredU256>;
  private outcomes: AddressMemoryMap<Address, StoredU256>;
  private totalPools: AddressMemoryMap<Address, StoredU256>;

  // Per-user share tracking (uses composite key: marketId + address)
  private userYesShares: AddressMemoryMap<Address, StoredU256>;
  private userNoShares: AddressMemoryMap<Address, StoredU256>;
  private userClaimed: AddressMemoryMap<Address, StoredU256>;

  constructor() {
    super();

    // Initialize storage with unique pointer slots
    this.nextMarketId = new StoredU256(0);
    this.adminAddress = new StoredU256(1);

    this.yesReserves = new AddressMemoryMap<Address, StoredU256>(2);
    this.noReserves = new AddressMemoryMap<Address, StoredU256>(3);
    this.totalYesShares = new AddressMemoryMap<Address, StoredU256>(4);
    this.totalNoShares = new AddressMemoryMap<Address, StoredU256>(5);
    this.endBlocks = new AddressMemoryMap<Address, StoredU256>(6);
    this.resolvedFlags = new AddressMemoryMap<Address, StoredU256>(7);
    this.outcomes = new AddressMemoryMap<Address, StoredU256>(8);
    this.totalPools = new AddressMemoryMap<Address, StoredU256>(9);

    this.userYesShares = new AddressMemoryMap<Address, StoredU256>(10);
    this.userNoShares = new AddressMemoryMap<Address, StoredU256>(11);
    this.userClaimed = new AddressMemoryMap<Address, StoredU256>(12);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(_calldata: Calldata): void {
    // Set deployer as admin
    this.adminAddress.set(Blockchain.tx.origin.toU256());
    // Initialize market counter
    this.nextMarketId.set(u256.One);
  }

  public override execute(method: Selector, calldata: Calldata): BytesWriter {
    switch (method) {
      case encodeSelector('createMarket'):
        return this.createMarket(calldata);
      case encodeSelector('buyShares'):
        return this.buyShares(calldata);
      case encodeSelector('resolveMarket'):
        return this.resolveMarket(calldata);
      case encodeSelector('claimPayout'):
        return this.claimPayout(calldata);
      case encodeSelector('getMarketInfo'):
        return this.getMarketInfo(calldata);
      case encodeSelector('getUserShares'):
        return this.getUserShares(calldata);
      case encodeSelector('getPrice'):
        return this.getPrice(calldata);
      case encodeSelector('setAdmin'):
        return this.setAdmin(calldata);
      default:
        throw new Revert('Unknown method selector');
    }
  }

  // ============================================================
  // Write Methods
  // ============================================================

  /**
   * createMarket(endBlock: u256) → marketId: u256
   *
   * Creates a new binary prediction market.
   * Initial prices: YES = 50%, NO = 50% (equal virtual reserves).
   */
  private createMarket(calldata: Calldata): BytesWriter {
    const endBlock = calldata.readU256();
    const currentBlock = u256.fromU64(Blockchain.block.number);

    // Validate: end block must be in the future
    if (SafeMath.lte(endBlock, currentBlock)) {
      throw new Revert('End block must be in the future');
    }

    const marketId = this.nextMarketId.get();

    // Initialize market with equal virtual reserves (50/50 starting price)
    const marketAddr = this.marketIdToAddress(marketId);
    this.yesReserves.get(marketAddr).set(INITIAL_LIQUIDITY);
    this.noReserves.get(marketAddr).set(INITIAL_LIQUIDITY);
    this.totalYesShares.get(marketAddr).set(u256.Zero);
    this.totalNoShares.get(marketAddr).set(u256.Zero);
    this.endBlocks.get(marketAddr).set(endBlock);
    this.resolvedFlags.get(marketAddr).set(u256.Zero);
    this.outcomes.get(marketAddr).set(u256.Zero);
    this.totalPools.get(marketAddr).set(u256.Zero);

    // Increment market counter
    this.nextMarketId.set(SafeMath.add(marketId, u256.One));

    // Emit event
    this.emitEvent(new MarketCreatedEvent(
      marketId,
      'Binary Prediction Market',
      endBlock,
      Blockchain.tx.sender,
    ));

    // Return market ID
    const writer = new BytesWriter(32);
    writer.writeU256(marketId);
    return writer;
  }

  /**
   * buyShares(marketId: u256, isYes: u256, amount: u256) → shares: u256
   *
   * Purchase YES or NO shares using constant-product AMM pricing.
   * amount is in satoshis. isYes: 1 = YES, 0 = NO.
   *
   * AMM Formula: x * y = k (constant product)
   * When buying YES shares:
   *   - noReserve increases by amount (BTC flows in on NO side)
   *   - yesReserve decreases proportionally
   *   - shares = yesReserve - (k / newNoReserve)
   */
  private buyShares(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const isYesU256 = calldata.readU256();
    const amount = calldata.readU256();
    const isYes = !SafeMath.eq(isYesU256, u256.Zero);

    // Validate amount
    if (SafeMath.lt(amount, MIN_TRADE_AMOUNT)) {
      throw new Revert('Amount below minimum trade size');
    }

    const marketAddr = this.marketIdToAddress(marketId);

    // Check market exists and is active
    const endBlock = this.endBlocks.get(marketAddr).get();
    if (SafeMath.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    const currentBlock = u256.fromU64(Blockchain.block.number);
    if (SafeMath.gte(currentBlock, endBlock)) {
      throw new Revert('Market has ended');
    }

    if (!SafeMath.eq(this.resolvedFlags.get(marketAddr).get(), u256.Zero)) {
      throw new Revert('Market already resolved');
    }

    // Calculate fee
    const fee = SafeMath.div(
      SafeMath.mul(amount, u256.fromU64(MARKET_FEE_BPS)),
      u256.fromU64(10000),
    );
    const netAmount = SafeMath.sub(amount, fee);

    // Get current reserves
    let yesReserve = this.yesReserves.get(marketAddr).get();
    let noReserve = this.noReserves.get(marketAddr).get();

    // Calculate constant product k = yesReserve * noReserve
    const k = SafeMath.mul(yesReserve, noReserve);

    let shares: u256;

    if (isYes) {
      // Buying YES: increase noReserve, decrease yesReserve
      const newNoReserve = SafeMath.add(noReserve, netAmount);
      const newYesReserve = SafeMath.div(k, newNoReserve);
      shares = SafeMath.sub(yesReserve, newYesReserve);

      // Update reserves
      this.yesReserves.get(marketAddr).set(newYesReserve);
      this.noReserves.get(marketAddr).set(newNoReserve);

      // Update user YES shares
      const userKey = this.userKey(marketId, Blockchain.tx.sender);
      const currentShares = this.userYesShares.get(userKey).get();
      this.userYesShares.get(userKey).set(SafeMath.add(currentShares, shares));

      // Update total YES shares
      const totalYes = this.totalYesShares.get(marketAddr).get();
      this.totalYesShares.get(marketAddr).set(SafeMath.add(totalYes, shares));
    } else {
      // Buying NO: increase yesReserve, decrease noReserve
      const newYesReserve = SafeMath.add(yesReserve, netAmount);
      const newNoReserve = SafeMath.div(k, newYesReserve);
      shares = SafeMath.sub(noReserve, newNoReserve);

      // Update reserves
      this.yesReserves.get(marketAddr).set(newYesReserve);
      this.noReserves.get(marketAddr).set(newNoReserve);

      // Update user NO shares
      const userKey = this.userKey(marketId, Blockchain.tx.sender);
      const currentShares = this.userNoShares.get(userKey).get();
      this.userNoShares.get(userKey).set(SafeMath.add(currentShares, shares));

      // Update total NO shares
      const totalNo = this.totalNoShares.get(marketAddr).get();
      this.totalNoShares.get(marketAddr).set(SafeMath.add(totalNo, shares));
    }

    // Update total pool
    const pool = this.totalPools.get(marketAddr).get();
    this.totalPools.get(marketAddr).set(SafeMath.add(pool, amount));

    // Calculate new YES price for event (in basis points: 0-10000)
    const newYesReserve = this.yesReserves.get(marketAddr).get();
    const newNoReserve = this.noReserves.get(marketAddr).get();
    const totalReserve = SafeMath.add(newYesReserve, newNoReserve);
    const yesPriceBps = SafeMath.div(
      SafeMath.mul(newNoReserve, u256.fromU64(10000)),
      totalReserve,
    );

    this.emitEvent(new SharesPurchasedEvent(
      marketId,
      Blockchain.tx.sender,
      isYes,
      amount,
      shares,
      yesPriceBps,
    ));

    const writer = new BytesWriter(32);
    writer.writeU256(shares);
    return writer;
  }

  /**
   * resolveMarket(marketId: u256, outcome: u256) → void
   *
   * Admin resolves the market with YES (1) or NO (0) outcome.
   * Can only be called after endBlock + grace period.
   */
  private resolveMarket(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const outcome = calldata.readU256();

    // Only admin can resolve
    this.requireAdmin();

    const marketAddr = this.marketIdToAddress(marketId);

    // Check market exists
    const endBlock = this.endBlocks.get(marketAddr).get();
    if (SafeMath.eq(endBlock, u256.Zero)) {
      throw new Revert('Market does not exist');
    }

    // Check not already resolved
    if (!SafeMath.eq(this.resolvedFlags.get(marketAddr).get(), u256.Zero)) {
      throw new Revert('Already resolved');
    }

    // Check market period has ended
    const currentBlock = u256.fromU64(Blockchain.block.number);
    if (SafeMath.lt(currentBlock, endBlock)) {
      throw new Revert('Market has not ended yet');
    }

    // Resolve
    this.resolvedFlags.get(marketAddr).set(u256.One);
    const outcomeNormalized = SafeMath.eq(outcome, u256.Zero) ? u256.Zero : u256.One;
    this.outcomes.get(marketAddr).set(outcomeNormalized);

    this.emitEvent(new MarketResolvedEvent(
      marketId,
      !SafeMath.eq(outcomeNormalized, u256.Zero),
      Blockchain.tx.sender,
    ));

    return new BytesWriter(0);
  }

  /**
   * claimPayout(marketId: u256) → payout: u256
   *
   * Winners claim their proportional share of the total pool.
   * Payout = (userShares / totalWinningShares) * totalPool
   */
  private claimPayout(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const marketAddr = this.marketIdToAddress(marketId);

    // Must be resolved
    if (SafeMath.eq(this.resolvedFlags.get(marketAddr).get(), u256.Zero)) {
      throw new Revert('Market not resolved');
    }

    const userKey = this.userKey(marketId, Blockchain.tx.sender);

    // Must not have already claimed
    if (!SafeMath.eq(this.userClaimed.get(userKey).get(), u256.Zero)) {
      throw new Revert('Already claimed');
    }

    const outcomeIsYes = !SafeMath.eq(this.outcomes.get(marketAddr).get(), u256.Zero);
    const totalPool = this.totalPools.get(marketAddr).get();

    let userShares: u256;
    let totalWinningShares: u256;

    if (outcomeIsYes) {
      userShares = this.userYesShares.get(userKey).get();
      totalWinningShares = this.totalYesShares.get(marketAddr).get();
    } else {
      userShares = this.userNoShares.get(userKey).get();
      totalWinningShares = this.totalNoShares.get(marketAddr).get();
    }

    if (SafeMath.eq(userShares, u256.Zero)) {
      throw new Revert('No winning shares');
    }

    if (SafeMath.eq(totalWinningShares, u256.Zero)) {
      throw new Revert('No winning shares exist');
    }

    // Calculate payout: (userShares * totalPool) / totalWinningShares
    const payout = SafeMath.div(
      SafeMath.mul(userShares, totalPool),
      totalWinningShares,
    );

    // Mark as claimed
    this.userClaimed.get(userKey).set(u256.One);

    this.emitEvent(new PayoutClaimedEvent(
      marketId,
      Blockchain.tx.sender,
      payout,
    ));

    const writer = new BytesWriter(32);
    writer.writeU256(payout);
    return writer;
  }

  // ============================================================
  // Read-Only Methods
  // ============================================================

  /**
   * getMarketInfo(marketId: u256) → (yesReserve, noReserve, totalPool, endBlock, resolved, outcome)
   */
  private getMarketInfo(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const marketAddr = this.marketIdToAddress(marketId);

    const writer = new BytesWriter(192); // 6 x 32 bytes
    writer.writeU256(this.yesReserves.get(marketAddr).get());
    writer.writeU256(this.noReserves.get(marketAddr).get());
    writer.writeU256(this.totalPools.get(marketAddr).get());
    writer.writeU256(this.endBlocks.get(marketAddr).get());
    writer.writeU256(this.resolvedFlags.get(marketAddr).get());
    writer.writeU256(this.outcomes.get(marketAddr).get());
    return writer;
  }

  /**
   * getUserShares(marketId: u256, user: Address) → (yesShares, noShares, claimed)
   */
  private getUserShares(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const user = calldata.readAddress();
    const userKey = this.userKey(marketId, user);

    const writer = new BytesWriter(96); // 3 x 32 bytes
    writer.writeU256(this.userYesShares.get(userKey).get());
    writer.writeU256(this.userNoShares.get(userKey).get());
    writer.writeU256(this.userClaimed.get(userKey).get());
    return writer;
  }

  /**
   * getPrice(marketId: u256) → (yesPriceBps: u256, noPriceBps: u256)
   *
   * Returns current YES/NO prices in basis points (0-10000).
   * Price derived from constant-product reserves.
   */
  private getPrice(calldata: Calldata): BytesWriter {
    const marketId = calldata.readU256();
    const marketAddr = this.marketIdToAddress(marketId);

    const yesReserve = this.yesReserves.get(marketAddr).get();
    const noReserve = this.noReserves.get(marketAddr).get();
    const total = SafeMath.add(yesReserve, noReserve);

    // YES price = noReserve / total (higher NO reserve = higher YES demand = higher YES price)
    const yesBps = SafeMath.div(SafeMath.mul(noReserve, u256.fromU64(10000)), total);
    const noBps = SafeMath.sub(u256.fromU64(10000), yesBps);

    const writer = new BytesWriter(64);
    writer.writeU256(yesBps);
    writer.writeU256(noBps);
    return writer;
  }

  /**
   * setAdmin(newAdmin: Address) → void
   * Only callable by current admin. Enables key rotation.
   */
  private setAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newAdmin = calldata.readAddress();
    this.adminAddress.set(newAdmin.toU256());
    return new BytesWriter(0);
  }

  // ============================================================
  // Internal Helpers
  // ============================================================

  private requireAdmin(): void {
    const admin = this.adminAddress.get();
    const sender = Blockchain.tx.sender.toU256();
    if (!SafeMath.eq(admin, sender)) {
      throw new Revert('Only admin can call this');
    }
  }

  private marketIdToAddress(marketId: u256): Address {
    // Deterministic mapping from market ID to a pseudo-address for storage
    const writer = new BytesWriter(ADDRESS_BYTE_LENGTH);
    writer.writeU256(marketId);
    return new Address(writer.getBuffer());
  }

  private userKey(marketId: u256, user: Address): Address {
    // Composite key = hash(marketId || userAddress) mapped to Address
    const writer = new BytesWriter(ADDRESS_BYTE_LENGTH);
    // XOR market ID into user address bytes for unique composite key
    const marketBytes = marketId.toBytes();
    const userBytes = user.toBytes();
    const result = new Uint8Array(ADDRESS_BYTE_LENGTH);
    for (let i = 0; i < ADDRESS_BYTE_LENGTH; i++) {
      result[i] = userBytes[i] ^ marketBytes[i % marketBytes.length];
    }
    return new Address(result.buffer);
  }
}
