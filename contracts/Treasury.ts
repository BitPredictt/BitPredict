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

/** Constants */

const MIN_DEPOSIT: u256 = u256.fromU64(100); // 100 BPUSD minimum
const EMERGENCY_TIMELOCK: u64 = 1008; // ~7 days at 10min blocks

// Cross-contract call selectors (OP-20 standard)
const TRANSFER_FROM_SELECTOR: u32 = 0x4b6685e7;
const TRANSFER_SELECTOR: u32 = 0x3b88ef57;

// NOTE: EIP-712 + ML-DSA signature verification removed because OPNet testnet
// does not yet implement the verifySignature external function.
// When mainnet supports ML-DSA verification, restore signature-based withdraw.
// For now, adminWithdraw() is used (admin-only, server calls directly).

/** Events */

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

/** Contract */

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

  /** Lifecycle */

  public override onDeployment(calldata: Calldata): void {
    const token: Address = calldata.readAddress();
    const signerHash: u256 = calldata.readU256(); // sha256 of ML-DSA pubkey (32 bytes)

    this.adminAddress.value = Blockchain.tx.sender;
    this.tokenAddress.value = token;
    this.serverSignerHash.value = signerHash;
    this.totalDeposits.value = u256.Zero;
  }

  /** Write Methods */

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
  /**
   * adminWithdraw() — Admin-authorized withdrawal.
   * Only callable by admin (server). Bypasses signature verification
   * because OPNet testnet does not yet support verifySignature external.
   * When ML-DSA verification works on mainnet, switch back to signature-based withdraw.
   */
  @method(
    { name: 'user', type: ABIDataTypes.ADDRESS },
    { name: 'amount', type: ABIDataTypes.UINT256 },
  )
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public adminWithdraw(calldata: Calldata): BytesWriter {
    this.requireAdmin();
    this.whenNotPaused();

    const user: Address = calldata.readAddress();
    const amount: u256 = calldata.readU256();

    // Check balance
    const currentBalance: u256 = this.balances.get(user);
    if (u256.lt(currentBalance, amount)) {
      throw new Revert('Insufficient balance');
    }

    // === EFFECTS ===
    const currentNonce: u256 = this.nonces.get(user);
    const newBalance: u256 = SafeMath.sub(currentBalance, amount);
    this.balances.set(user, newBalance);
    this.totalDeposits.value = SafeMath.sub(this.totalDeposits.value, amount);
    this.nonces.set(user, SafeMath.add(currentNonce, u256.One));

    // === INTERACTIONS ===
    this._transferToken(user, amount);

    this.emitEvent(new WithdrawEvent(user, amount, currentNonce));

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
   * cancelEmergencyWithdraw() — Cancel own pending emergency withdrawal.
   */
  @method()
  @returns({ name: 'success', type: ABIDataTypes.BOOL })
  public cancelEmergencyWithdraw(_calldata: Calldata): BytesWriter {
    const caller: Address = Blockchain.tx.sender;

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

  /** Admin Methods */

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

    const writer = new BytesWriter(1);
    writer.writeBoolean(true);
    return writer;
  }

  /** View Methods */

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
