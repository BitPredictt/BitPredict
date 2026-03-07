/**
 * BitPredict — Treasury Smart Contract for OP_NET (Bitcoin L1)
 *
 * Hybrid model: deposits/withdrawals on-chain, bets off-chain in SQLite.
 * - deposit(): user sends BPUSD → treasury, credited to on-chain balance
 * - withdraw(): server signs ML-DSA authorization, user withdraws
 * - emergencyWithdraw: timelock 1008 blocks (~7 days), works even when paused
 *
 * Follows CEI pattern, ReentrancyGuard, AddressMemoryMap.
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

import { sha256 } from '@btc-vision/btc-runtime/runtime/env/global';
import { MLDSASecurityLevel } from '@btc-vision/btc-runtime/runtime/env/consensus/MLDSAMetadata';

// ============================================================
// Constants
// ============================================================

const MIN_DEPOSIT: u256 = u256.fromU64(100); // 100 BPUSD minimum
const EMERGENCY_TIMELOCK: u64 = 1008; // ~7 days at 10min blocks

// Cross-contract call selectors (OP-20 standard)
const TRANSFER_FROM_SELECTOR: u32 = 0x4b6685e7;
const TRANSFER_SELECTOR: u32 = 0x3b88ef57;

// EIP-712 style typehash for withdraw authorization
// sha256("Withdraw(address user,uint256 amount,uint256 nonce)")
// Precomputed at deploy, but we compute at runtime for clarity
function getWithdrawTypehash(): Uint8Array {
  const writer = new BytesWriter(64);
  writer.writeString('Withdraw(address user,uint256 amount,uint256 nonce)');
  return sha256(writer.getBuffer());
}

function getDomainSeparator(name: string, version: string, contractAddr: Address): Uint8Array {
  const writer = new BytesWriter(256);
  const typeHashWriter = new BytesWriter(128);
  typeHashWriter.writeString('EIP712Domain(string name,string version,address verifyingContract)');
  writer.writeBytes(sha256(typeHashWriter.getBuffer()));

  const nameWriter = new BytesWriter(32);
  nameWriter.writeString(name);
  writer.writeBytes(sha256(nameWriter.getBuffer()));

  const versionWriter = new BytesWriter(8);
  versionWriter.writeString(version);
  writer.writeBytes(sha256(versionWriter.getBuffer()));

  writer.writeAddress(contractAddr);

  return sha256(writer.getBuffer());
}

// ============================================================
// Events
// ============================================================

class DepositEvent extends NetEvent {
  constructor(user: Address, amount: u256, newBalance: u256) {
    const data = new BytesWriter(96);
    data.writeAddress(user);
    data.writeU256(amount);
    data.writeU256(newBalance);
    super('Deposit', data);
  }
}

class WithdrawEvent extends NetEvent {
  constructor(user: Address, amount: u256, nonce: u256) {
    const data = new BytesWriter(96);
    data.writeAddress(user);
    data.writeU256(amount);
    data.writeU256(nonce);
    super('Withdraw', data);
  }
}

class EmergencyRequestEvent extends NetEvent {
  constructor(user: Address, amount: u256, unlockBlock: u256) {
    const data = new BytesWriter(96);
    data.writeAddress(user);
    data.writeU256(amount);
    data.writeU256(unlockBlock);
    super('EmergencyRequest', data);
  }
}

class EmergencyExecuteEvent extends NetEvent {
  constructor(user: Address, amount: u256) {
    const data = new BytesWriter(64);
    data.writeAddress(user);
    data.writeU256(amount);
    super('EmergencyExecute', data);
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

class PausedEvent extends NetEvent {
  constructor(paused: boolean) {
    const data = new BytesWriter(1);
    data.writeBoolean(paused);
    super('Paused', data);
  }
}

// ============================================================
// Contract
// ============================================================

@final
export class Treasury extends ReentrancyGuard {
  protected readonly reentrancyLevel: ReentrancyLevel = ReentrancyLevel.STANDARD;

  // Storage layout (Blockchain.nextPointer order)
  private adminAddress: StoredAddress;           // 0x00
  private tokenAddress: StoredAddress;           // 0x01 (BPUSD)
  private serverSignerHash: StoredU256;          // 0x02 sha256(ML-DSA pubkey)
  private totalDeposits: StoredU256;             // 0x03
  private _paused: StoredBoolean;               // 0x04
  private balances: AddressMemoryMap;            // 0x05
  private nonces: AddressMemoryMap;              // 0x06
  private emergencyAmount: AddressMemoryMap;     // 0x07
  private emergencyUnlock: AddressMemoryMap;     // 0x08

  constructor() {
    super();
    const emptySubPointer = new Uint8Array(0);
    this.adminAddress      = new StoredAddress(Blockchain.nextPointer);
    this.tokenAddress      = new StoredAddress(Blockchain.nextPointer);
    this.serverSignerHash  = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this.totalDeposits     = new StoredU256(Blockchain.nextPointer, emptySubPointer);
    this._paused           = new StoredBoolean(Blockchain.nextPointer, false);
    this.balances          = new AddressMemoryMap(Blockchain.nextPointer);
    this.nonces            = new AddressMemoryMap(Blockchain.nextPointer);
    this.emergencyAmount   = new AddressMemoryMap(Blockchain.nextPointer);
    this.emergencyUnlock   = new AddressMemoryMap(Blockchain.nextPointer);
  }

  // ============================================================
  // Lifecycle
  // ============================================================

  public override onDeployment(calldata: Calldata): void {
    const token: Address = calldata.readAddress();
    const signerHash: u256 = calldata.readU256(); // sha256 of ML-DSA pubkey (32 bytes)

    this.adminAddress.value = Blockchain.tx.sender;
    this.tokenAddress.value = token;
    this.serverSignerHash.value = signerHash;
    this.totalDeposits.value = u256.Zero;
  }

  // ============================================================
  // Write Methods
  // ============================================================

  /**
   * deposit(amount: u256) — Deposit BPUSD into treasury.
   * User must approve treasury first (increaseAllowance).
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public deposit(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const amount: u256 = calldata.readU256();
    if (u256.lt(amount, MIN_DEPOSIT)) {
      throw new Revert('Amount below minimum deposit');
    }

    const user: Address = Blockchain.tx.sender;

    // === EFFECTS ===
    const currentBalance: u256 = this.balances.get(user);
    const newBalance: u256 = SafeMath.add(currentBalance, amount);
    this.balances.set(user, newBalance);
    this.totalDeposits.value = SafeMath.add(this.totalDeposits.value, amount);

    // === INTERACTIONS ===
    this._transferFromToken(user, Blockchain.contract.address, amount);

    this.emitEvent(new DepositEvent(user, amount, newBalance));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * withdraw(amount, nonce, serverPubKey, signature)
   * Server authorizes withdrawal via ML-DSA signature.
   */
  @method(
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'nonce', type: ABIDataTypes.UINT256 },
    { name: 'serverPubKey', type: ABIDataTypes.BYTES },
    { name: 'signature', type: ABIDataTypes.BYTES },
  )
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public withdraw(calldata: Calldata): BytesWriter {
    this.whenNotPaused();

    const amount: u256 = calldata.readU256();
    const nonce: u256 = calldata.readU256();
    const serverPubKey: Uint8Array = calldata.readBytesWithLength();
    const signature: Uint8Array = calldata.readBytesWithLength();

    const user: Address = Blockchain.tx.sender;

    // Verify nonce matches user's current nonce
    const currentNonce: u256 = this.nonces.get(user);
    if (!u256.eq(nonce, currentNonce)) {
      throw new Revert('Invalid nonce');
    }

    // Verify server pubkey authenticity: sha256(pubKey) must match stored hash
    const pubKeyHash: Uint8Array = sha256(serverPubKey);
    const pubKeyHashU256 = u256.fromBytes(pubKeyHash, false);
    if (!u256.eq(pubKeyHashU256, this.serverSignerHash.value)) {
      throw new Revert('Invalid server signer');
    }

    // Build message hash: domain separator + struct hash
    const domainSep = getDomainSeparator('BitPredict Treasury', '1', Blockchain.contract.address);
    const structWriter = new BytesWriter(128);
    structWriter.writeBytes(getWithdrawTypehash());
    structWriter.writeAddress(user);
    structWriter.writeU256(amount);
    structWriter.writeU256(nonce);
    const structHash = sha256(structWriter.getBuffer());

    const finalWriter = new BytesWriter(66);
    finalWriter.writeU8(0x19);
    finalWriter.writeU8(0x01);
    finalWriter.writeBytes(domainSep);
    finalWriter.writeBytes(structHash);
    const messageHash = sha256(finalWriter.getBuffer());

    // Verify ML-DSA signature
    const isValid = Blockchain.verifyMLDSASignature(
      MLDSASecurityLevel.Level2,
      serverPubKey,
      signature,
      messageHash,
    );
    if (!isValid) {
      throw new Revert('Invalid server signature');
    }

    // Check balance
    const currentBalance: u256 = this.balances.get(user);
    if (u256.lt(currentBalance, amount)) {
      throw new Revert('Insufficient balance');
    }

    // === EFFECTS ===
    const newBalance: u256 = SafeMath.sub(currentBalance, amount);
    this.balances.set(user, newBalance);
    this.totalDeposits.value = SafeMath.sub(this.totalDeposits.value, amount);
    this.nonces.set(user, SafeMath.add(currentNonce, u256.One));

    // === INTERACTIONS ===
    this._transferToken(user, amount);

    this.emitEvent(new WithdrawEvent(user, amount, nonce));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * requestEmergencyWithdraw(amount) — Initiate timelock withdrawal.
   * Works even when paused (user protection).
   */
  @method({ name: 'amount', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public requestEmergencyWithdraw(calldata: Calldata): BytesWriter {
    // NOTE: no whenNotPaused() — emergency works even when paused

    const amount: u256 = calldata.readU256();
    const user: Address = Blockchain.tx.sender;

    // Check balance
    const currentBalance: u256 = this.balances.get(user);
    if (u256.lt(currentBalance, amount)) {
      throw new Revert('Insufficient balance');
    }

    // Check no existing emergency request
    const existingAmount: u256 = this.emergencyAmount.get(user);
    if (!u256.eq(existingAmount, u256.Zero)) {
      throw new Revert('Emergency withdrawal already pending');
    }

    // === EFFECTS ===
    const unlockBlock: u256 = SafeMath.add(
      u256.fromU64(Blockchain.block.number),
      u256.fromU64(EMERGENCY_TIMELOCK)
    );
    this.emergencyAmount.set(user, amount);
    this.emergencyUnlock.set(user, unlockBlock);

    this.emitEvent(new EmergencyRequestEvent(user, amount, unlockBlock));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * executeEmergencyWithdraw() — Execute after timelock expires.
   */
  @method()
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public executeEmergencyWithdraw(_calldata: Calldata): BytesWriter {
    const user: Address = Blockchain.tx.sender;

    const amount: u256 = this.emergencyAmount.get(user);
    if (u256.eq(amount, u256.Zero)) {
      throw new Revert('No emergency withdrawal pending');
    }

    const unlockBlock: u256 = this.emergencyUnlock.get(user);
    const currentBlock: u256 = u256.fromU64(Blockchain.block.number);
    if (u256.lt(currentBlock, unlockBlock)) {
      throw new Revert('Timelock not expired');
    }

    // Verify balance still sufficient
    const currentBalance: u256 = this.balances.get(user);
    if (u256.lt(currentBalance, amount)) {
      throw new Revert('Insufficient balance');
    }

    // === EFFECTS ===
    const newBalance: u256 = SafeMath.sub(currentBalance, amount);
    this.balances.set(user, newBalance);
    this.totalDeposits.value = SafeMath.sub(this.totalDeposits.value, amount);
    this.emergencyAmount.set(user, u256.Zero);
    this.emergencyUnlock.set(user, u256.Zero);

    // === INTERACTIONS ===
    this._transferToken(user, amount);

    this.emitEvent(new EmergencyExecuteEvent(user, amount));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * cancelEmergencyWithdraw() — Cancel pending emergency withdrawal.
   * Can be called by user or admin.
   */
  @method()
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public cancelEmergencyWithdraw(_calldata: Calldata): BytesWriter {
    const caller: Address = Blockchain.tx.sender;

    // Admin can cancel any user's emergency withdrawal (via additional param)
    // For simplicity, only self-cancel for now
    const amount: u256 = this.emergencyAmount.get(caller);
    if (u256.eq(amount, u256.Zero)) {
      throw new Revert('No emergency withdrawal pending');
    }

    this.emergencyAmount.set(caller, u256.Zero);
    this.emergencyUnlock.set(caller, u256.Zero);

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  // ============================================================
  // Admin Methods
  // ============================================================

  /**
   * setServerSigner(newSignerHash) — Update server ML-DSA pubkey hash.
   */
  @method({ name: 'newSignerHash', type: ABIDataTypes.UINT256 })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public setServerSigner(calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const newHash: u256 = calldata.readU256();
    this.serverSignerHash.value = newHash;

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * pause() — Pause deposits and normal withdrawals.
   */
  @method()
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public pause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = true;
    this.emitEvent(new PausedEvent(true));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * unpause() — Resume normal operations.
   */
  @method()
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public unpause(_calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this._paused.value = false;
    this.emitEvent(new PausedEvent(false));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /**
   * transferAdmin(newAdmin) — Transfer admin role.
   */
  @method({ name: 'newAdmin', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public transferAdmin(calldata: Calldata): BytesWriter {
    this.requireAdmin();

    const newAdmin: Address = calldata.readAddress();
    const oldAdmin: Address = this.adminAddress.value;
    this.adminAddress.value = newAdmin;

    this.emitEvent(new AdminChangedEvent(oldAdmin, newAdmin));

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  // ============================================================
  // View Methods
  // ============================================================

  /**
   * getBalance(user) — Get user's treasury balance.
   */
  @method({ name: 'user', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'balance', type: ABIDataTypes.UINT256 })
  public getBalance(calldata: Calldata): BytesWriter {
    const user: Address = calldata.readAddress();
    const balance: u256 = this.balances.get(user);

    const writer = new BytesWriter(32);
    writer.writeU256(balance);
    return writer;
  }

  /**
   * getNonce(user) — Get user's current nonce.
   */
  @method({ name: 'user', type: ABIDataTypes.ADDRESS })
  @returns({ name: 'nonce', type: ABIDataTypes.UINT256 })
  public getNonce(calldata: Calldata): BytesWriter {
    const user: Address = calldata.readAddress();
    const nonce: u256 = this.nonces.get(user);

    const writer = new BytesWriter(32);
    writer.writeU256(nonce);
    return writer;
  }

  /**
   * getTotalDeposits() — Get total BPUSD in treasury.
   */
  @method()
  @returns({ name: 'total', type: ABIDataTypes.UINT256 })
  public getTotalDeposits(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(32);
    writer.writeU256(this.totalDeposits.value);
    return writer;
  }

  /**
   * getEmergencyInfo(user) — Get emergency withdrawal info.
   */
  @method({ name: 'user', type: ABIDataTypes.ADDRESS })
  @returns(
    { name: 'amount', type: ABIDataTypes.UINT256 },
    { name: 'unlockBlock', type: ABIDataTypes.UINT256 },
  )
  public getEmergencyInfo(calldata: Calldata): BytesWriter {
    const user: Address = calldata.readAddress();

    const writer = new BytesWriter(64);
    writer.writeU256(this.emergencyAmount.get(user));
    writer.writeU256(this.emergencyUnlock.get(user));
    return writer;
  }

  /**
   * isPaused() — Check if contract is paused.
   */
  @method()
  @returns({ name: 'paused', type: ABIDataTypes.BOOL })
  public isPaused(_calldata: Calldata): BytesWriter {
    const writer = new BytesWriter(1);
    writer.writeBoolean(this._paused.value);
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
}
