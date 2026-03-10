/**
 * BitPredict — Price Oracle Smart Contract for OP_NET (Bitcoin L1)
 *
 * Multi-sig oracle: 3-of-5 authorized nodes submit prices.
 * Aggregated price = median of fresh submissions (within MAX_STALENESS blocks).
 * Only updates aggregated price when QUORUM (3) fresh submissions exist.
 *
 * Oracle slots: fixed array of 5 slots (indices 0-4).
 * Each oracle gets an index on addOracle, stored per-asset submissions.
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

const MAX_ORACLES: i32 = 5;
const QUORUM: i32 = 3;            // 3-of-5 required for aggregation
const MAX_STALENESS: u64 = 50;    // max 50 blocks stale (~8 hours at 10 min/block)

/** Events */

class PriceSubmittedEvent extends NetEvent {
  constructor(oracle: Address, assetId: u256, price: u256, blockNumber: u256) {
    const data = new BytesWriter(128);
    data.writeAddress(oracle);
    data.writeU256(assetId);
    data.writeU256(price);
    data.writeU256(blockNumber);
    super('PriceSubmitted', data);
  }
}

class PriceAggregatedEvent extends NetEvent {
  constructor(assetId: u256, medianPrice: u256, freshCount: u256, blockNumber: u256) {
    const data = new BytesWriter(128);
    data.writeU256(assetId);
    data.writeU256(medianPrice);
    data.writeU256(freshCount);
    data.writeU256(blockNumber);
    super('PriceAggregated', data);
  }
}

class OracleAddedEvent extends NetEvent {
  constructor(oracle: Address) {
    const data = new BytesWriter(32);
    data.writeAddress(oracle);
    super('OracleAdded', data);
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

class OracleRemovedEvent extends NetEvent {
  constructor(oracle: Address) {
    const data = new BytesWriter(32);
    data.writeAddress(oracle);
    super('OracleRemoved', data);
  }
}

/** Contract */

@final
export class PriceOracle extends ReentrancyGuard {
  protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

  private adminAddress: StoredAddress;
  private _paused: StoredBoolean;
  private oracleCount: StoredU256;

  // Oracle authorization: oracle address -> u256.One if authorized
  private authorizedOracles: AddressMemoryMap;
  // Oracle index: oracle address -> slot index (1-based, 0=not assigned)
  private oracleIndex: AddressMemoryMap;
  // Free slot tracking: slot index -> u256.One if freed
  private freeSlots: AddressMemoryMap;

  // Per-asset per-oracle submissions: key(assetId, slotIndex) -> price
  private priceSubmissions: AddressMemoryMap;
  // Per-asset per-oracle submission blocks: key(assetId, slotIndex) -> block
  private submissionBlocks: AddressMemoryMap;

  // Aggregated prices: key(assetId) -> median price
  private aggregatedPrices: AddressMemoryMap;
  private aggregatedBlocks: AddressMemoryMap;

  constructor() {
    super();
    this.adminAddress = new StoredAddress(Blockchain.nextPointer);
    this._paused = new StoredBoolean(Blockchain.nextPointer, false);
    this.oracleCount = new StoredU256(Blockchain.nextPointer, new Uint8Array(0));

    this.authorizedOracles = new AddressMemoryMap(Blockchain.nextPointer);
    this.oracleIndex = new AddressMemoryMap(Blockchain.nextPointer);
    this.freeSlots = new AddressMemoryMap(Blockchain.nextPointer);
    this.priceSubmissions = new AddressMemoryMap(Blockchain.nextPointer);
    this.submissionBlocks = new AddressMemoryMap(Blockchain.nextPointer);
    this.aggregatedPrices = new AddressMemoryMap(Blockchain.nextPointer);
    this.aggregatedBlocks = new AddressMemoryMap(Blockchain.nextPointer);
  }

  public override onDeployment(_calldata: Calldata): void {
    this.adminAddress.value = Blockchain.tx.sender;
    this.oracleCount.value = u256.Zero;
  }

  /** Write Methods */

  /**
   * addOracle(oracle: Address) — Admin adds an authorized oracle node.
   * Assigns next available slot index (1-5).
   */
  @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
  public addOracle(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const oracle: Address = calldata.readAddress();

    if (u256.eq(this.authorizedOracles.get(oracle), u256.One)) {
      throw new Revert('Oracle already authorized');
    }

    // Check if oracle already has a slot (was previously removed) — recycle it
    const existingSlot: u256 = this.oracleIndex.get(oracle);
    if (!u256.eq(existingSlot, u256.Zero)) {
      // Re-authorize with existing slot (slot recycling)
      this.authorizedOracles.set(oracle, u256.One);
      this.emitEvent(new OracleAddedEvent(oracle));
      return new BytesWriter(0);
    }

    // New oracle — try to recycle a free slot first
    const maxSlots: u64 = this.oracleCount.value.toU64();
    let recycledSlot: u256 = u256.Zero;
    for (let s: u64 = 1; s <= maxSlots && s <= <u64>MAX_ORACLES; s++) {
      const sU: u256 = u256.fromU64(s);
      const slotKey: Address = this.slotKey(sU);
      if (u256.eq(this.freeSlots.get(slotKey), u256.One)) {
        recycledSlot = sU;
        this.freeSlots.set(slotKey, u256.Zero); // claim slot
        break;
      }
    }

    if (!u256.eq(recycledSlot, u256.Zero)) {
      // Reuse recycled slot
      this.authorizedOracles.set(oracle, u256.One);
      this.oracleIndex.set(oracle, recycledSlot);
    } else {
      // Allocate new slot
      const count: u256 = this.oracleCount.value;
      if (u256.ge(count, u256.fromU64(<u64>MAX_ORACLES))) {
        throw new Revert('Max oracles reached');
      }
      this.authorizedOracles.set(oracle, u256.One);
      const slot: u256 = SafeMath.add(count, u256.One);
      this.oracleIndex.set(oracle, slot);
      this.oracleCount.value = slot;
    }

    this.emitEvent(new OracleAddedEvent(oracle));
    return new BytesWriter(0);
  }

  /**
   * removeOracle(oracle: Address) — Admin removes an oracle node.
   * Note: slot is not recycled (simple approach, max 5 oracles).
   */
  @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
  public removeOracle(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const oracle: Address = calldata.readAddress();

    if (!u256.eq(this.authorizedOracles.get(oracle), u256.One)) {
      throw new Revert('Oracle not authorized');
    }

    this.authorizedOracles.set(oracle, u256.Zero);
    // Mark slot as free for recycling
    const slot: u256 = this.oracleIndex.get(oracle);
    if (!u256.eq(slot, u256.Zero)) {
      const slotKey: Address = this.slotKey(slot);
      this.freeSlots.set(slotKey, u256.One);
    }
    this.emitEvent(new OracleRemovedEvent(oracle));
    return new BytesWriter(0);
  }

  /**
   * submitPrice(assetId: u256, price: u256) — Oracle submits a price update.
   * After storing the submission, attempts to aggregate if quorum is met.
   */
  @method(
    { name: 'assetId', type: ABIDataTypes.UINT256 },
    { name: 'price',   type: ABIDataTypes.UINT256 },
  )
  public submitPrice(calldata: Calldata): BytesWriter {
    if (this._paused.value) throw new Revert('Oracle is paused');

    const assetId: u256 = calldata.readU256();
    const price: u256 = calldata.readU256();
    const sender: Address = Blockchain.tx.sender;

    if (!u256.eq(this.authorizedOracles.get(sender), u256.One)) {
      throw new Revert('Not authorized oracle');
    }

    if (u256.eq(price, u256.Zero)) {
      throw new Revert('Price cannot be zero');
    }

    // Get oracle's slot index
    const slot: u256 = this.oracleIndex.get(sender);
    if (u256.eq(slot, u256.Zero)) {
      throw new Revert('Oracle has no assigned slot');
    }

    // Store submission keyed by (assetId, slotIndex)
    const subKey: Address = this.assetSlotKey(assetId, slot);
    this.priceSubmissions.set(subKey, price);
    this.submissionBlocks.set(subKey, u256.fromU64(Blockchain.block.number));

    this.emitEvent(new PriceSubmittedEvent(sender, assetId, price, u256.fromU64(Blockchain.block.number)));

    // Attempt aggregation (median of fresh submissions)
    // Pass current slot + price explicitly because get() may not see set() from same TX
    this._tryAggregate(assetId, slot, price);

    return new BytesWriter(0);
  }

  /**
   * setAdmin(newAdmin: Address) — Transfer admin role.
   */
  @method({ name: 'newAdmin', type: ABIDataTypes.ADDRESS })
  public setAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    const newAdmin: Address = calldata.readAddress();
    if (newAdmin.equals(Blockchain.tx.sender)) {
      throw new Revert('Admin unchanged');
    }
    const zeroAddr = new Address(new Array<u8>(32).fill(0));
    if (newAdmin.equals(zeroAddr)) {
      throw new Revert('New admin cannot be zero address');
    }
    const oldAdmin: Address = this.adminAddress.value;
    this.adminAddress.value = newAdmin;
    this.emitEvent(new AdminChangedEvent(oldAdmin, newAdmin));
    return new BytesWriter(0);
  }

  @method()
  public pause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = true;
    return new BytesWriter(0);
  }

  @method()
  public unpause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = false;
    return new BytesWriter(0);
  }

  /** Read-Only Methods */

  /**
   * getPrice(assetId: u256) → (price: u256, blockNumber: u256, stale: bool)
   *
   * Returns aggregated median price for the given asset.
   * stale=true means price was not updated within MAX_STALENESS blocks.
   * price=0 means no aggregation has occurred yet (less than QUORUM submissions).
   */
  @method({ name: 'assetId', type: ABIDataTypes.UINT256 })
  @returns({ name: 'price', type: ABIDataTypes.UINT256 })
  public getPrice(calldata: Calldata): BytesWriter {
    const assetId: u256 = calldata.readU256();
    const aKey: Address = this.assetKey(assetId);

    const price: u256 = this.aggregatedPrices.get(aKey);
    const priceBlock: u256 = this.aggregatedBlocks.get(aKey);
    const currentBlockU256: u256 = u256.fromU64(Blockchain.block.number);

    let stale: boolean = true;
    if (!u256.eq(priceBlock, u256.Zero)) {
      // Use u256 subtraction to avoid underflow; if priceBlock > currentBlock treat as fresh
      let ageU256: u256 = u256.Zero;
      if (u256.gt(currentBlockU256, priceBlock)) {
        ageU256 = SafeMath.sub(currentBlockU256, priceBlock);
      }
      stale = u256.gt(ageU256, u256.fromU64(MAX_STALENESS));
    }

    const writer = new BytesWriter(65);
    writer.writeU256(price);
    writer.writeU256(priceBlock);
    writer.writeBoolean(stale);
    return writer;
  }

  /**
   * getSubmission(assetId: u256, slot: u256) → (price: u256, blockNumber: u256)
   *
   * Diagnostic method: read the raw submission for a specific oracle slot.
   * Useful for debugging why aggregation is not happening.
   * slot is 1-based (1 to oracleCount).
   */
  @method(
    { name: 'assetId', type: ABIDataTypes.UINT256 },
    { name: 'slot',    type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'price', type: ABIDataTypes.UINT256 })
  public getSubmission(calldata: Calldata): BytesWriter {
    const assetId: u256 = calldata.readU256();
    const slot: u256 = calldata.readU256();
    const subKey: Address = this.assetSlotKey(assetId, slot);

    const price: u256 = this.priceSubmissions.get(subKey);
    const blockNum: u256 = this.submissionBlocks.get(subKey);

    const writer = new BytesWriter(64);
    writer.writeU256(price);
    writer.writeU256(blockNum);
    return writer;
  }

  /**
   * getOracleInfo(oracle: Address) → (authorized: bool, slot: u256)
   *
   * Diagnostic method: check oracle authorization and slot assignment.
   */
  @method({ name: 'oracle', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'authorized', type: ABIDataTypes.BOOL })
  public getOracleInfo(calldata: Calldata): BytesWriter {
    const oracle: Address = calldata.readAddress();
    const authorized: bool = u256.eq(this.authorizedOracles.get(oracle), u256.One);
    const slot: u256 = this.oracleIndex.get(oracle);

    const writer = new BytesWriter(33);
    writer.writeBoolean(authorized);
    writer.writeU256(slot);
    return writer;
  }

  /** Internal: Median Aggregation */

  /**
   * Collect fresh (non-stale) submissions from all slots.
   * If >= QUORUM fresh prices exist, compute median and update aggregated price.
   *
   * IMPORTANT: staleness check uses u256 arithmetic to avoid u64 underflow
   * when subBlock > currentBlock (should not happen, but defensive coding).
   */
  private _tryAggregate(assetId: u256, currentSlot: u256, currentPrice: u256): void {
    const currentBlock: u64 = Blockchain.block.number;
    const currentBlockU256: u256 = u256.fromU64(currentBlock);
    const maxStalenessU256: u256 = u256.fromU64(MAX_STALENESS);
    const maxSlots: u64 = this.oracleCount.value.toU64();

    // Collect fresh prices into a fixed-size array
    const prices: u256[] = [];

    // Always include current submission explicitly (get() may not see set() from same TX)
    prices.push(currentPrice);

    for (let slot: u64 = 1; slot <= maxSlots && slot <= <u64>MAX_ORACLES; slot++) {
      const slotU256: u256 = u256.fromU64(slot);

      // Skip current oracle's slot — already included above
      if (u256.eq(slotU256, currentSlot)) continue;

      const subKey: Address = this.assetSlotKey(assetId, slotU256);
      const subBlock: u256 = this.submissionBlocks.get(subKey);

      if (u256.eq(subBlock, u256.Zero)) continue;

      // Staleness check using u256 to avoid u64 underflow
      let ageU256: u256 = u256.Zero;
      if (u256.gt(currentBlockU256, subBlock)) {
        ageU256 = SafeMath.sub(currentBlockU256, subBlock);
      }
      if (u256.gt(ageU256, maxStalenessU256)) continue;

      const subPrice: u256 = this.priceSubmissions.get(subKey);
      if (u256.eq(subPrice, u256.Zero)) continue;

      prices.push(subPrice);
    }

    // Need QUORUM fresh submissions
    if (prices.length < QUORUM) return;

    // Sort prices (insertion sort, max MAX_ORACLES elements — no while loops)
    for (let i: i32 = 1; i < prices.length; i++) {
      const key: u256 = prices[i];
      let j: i32 = i - 1;
      for (let _k: i32 = 0; _k < MAX_ORACLES && j >= 0 && u256.gt(prices[j], key); _k++) {
        prices[j + 1] = prices[j];
        j--;
      }
      prices[j + 1] = key;
    }

    // Median: middle element (lower-middle for even count, exact middle for odd)
    const medianIdx: i32 = (prices.length - 1) / 2;
    const medianPrice: u256 = prices[medianIdx];

    // Update aggregated price
    const aKey: Address = this.assetKey(assetId);
    this.aggregatedPrices.set(aKey, medianPrice);
    this.aggregatedBlocks.set(aKey, currentBlockU256);

    this.emitEvent(new PriceAggregatedEvent(
      assetId, medianPrice, u256.fromU64(<u64>prices.length), currentBlockU256,
    ));
  }

  /** Internal Helpers */

  private requireAdmin(): void {
    if (!Blockchain.tx.sender.equals(this.adminAddress.value)) {
      throw new Revert('Only admin');
    }
  }

  private assetKey(assetId: u256): Address {
    const buf = new Uint8Array(32);
    const ab: Uint8Array = assetId.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = ab[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }

  private slotKey(slot: u256): Address {
    const buf = new Uint8Array(32);
    const sb: Uint8Array = slot.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = sb[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }

  private assetSlotKey(assetId: u256, slot: u256): Address {
    const buf = new Uint8Array(64);
    const ab: Uint8Array = assetId.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[i] = ab[i];
    const sb: Uint8Array = slot.toUint8Array(true);
    for (let i: i32 = 0; i < 32; i++) buf[32 + i] = sb[i];
    const hash: Uint8Array = Blockchain.sha256(buf);
    const arr: u8[] = new Array<u8>(32);
    for (let i: i32 = 0; i < 32; i++) arr[i] = hash[i];
    return new Address(arr);
  }
}
