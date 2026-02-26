/**
 * OP_NET Integration Layer for BitPredict
 *
 * Provides wallet management, contract interaction, and transaction
 * building for the prediction market on Bitcoin L1 via OP_NET.
 *
 * Supports:
 * - OP_WALLET browser extension (UniSat fork)
 * - Contract read/write calls via JSONRpcProvider
 * - Transaction broadcasting
 *
 * SDK: npm install opnet @btc-vision/transaction @btc-vision/bitcoin
 * Docs: https://dev.opnet.org / https://github.com/btc-vision/opnet
 */

// OP_NET regtest configuration (testnet not yet active per docs)
export const OPNET_CONFIG = {
  network: 'regtest' as const,
  rpcUrl: 'https://regtest.opnet.org',
  explorerUrl: 'https://opscan.org',
  faucetUrl: 'https://faucet.opnet.org',
  motoswapUrl: 'https://motoswap.org',
  contractAddress: '', // Set after deployment via OP_WALLET
};

// Official OP_NET SDK usage:
// import { JSONRpcProvider, getContract, OP_20_ABI } from 'opnet';
// import { networks } from '@btc-vision/bitcoin';
// const provider = new JSONRpcProvider(OPNET_CONFIG.rpcUrl, networks.regtest);

// Contract method selectors (keccak256 first 4 bytes)
export const CONTRACT_METHODS = {
  createMarket: 'createMarket',
  buyShares: 'buyShares',
  resolveMarket: 'resolveMarket',
  claimPayout: 'claimPayout',
  getMarketInfo: 'getMarketInfo',
  getUserShares: 'getUserShares',
  getPrice: 'getPrice',
} as const;

/**
 * Format satoshis to BTC string
 */
export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

/**
 * Format BTC to satoshis
 */
export function btcToSats(btc: number): number {
  return Math.round(btc * 100_000_000);
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatVolume(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 100_000_000).toFixed(2)} BTC`;
  if (sats >= 1_000_000) return `${(sats / 1_000_000).toFixed(1)}M sats`;
  if (sats >= 1_000) return `${(sats / 1_000).toFixed(0)}K sats`;
  return `${sats} sats`;
}

/**
 * Calculate AMM price from reserves (constant product)
 * YES price = noReserve / (yesReserve + noReserve)
 */
export function calculatePrice(yesReserve: bigint, noReserve: bigint): { yes: number; no: number } {
  const total = yesReserve + noReserve;
  if (total === 0n) return { yes: 0.5, no: 0.5 };
  const yesPrice = Number(noReserve * 10000n / total) / 10000;
  const noPrice = 1 - yesPrice;
  return { yes: yesPrice, no: noPrice };
}

/**
 * Calculate shares received for a given amount (constant product AMM)
 */
export function calculateShares(
  amount: bigint,
  isYes: boolean,
  yesReserve: bigint,
  noReserve: bigint,
  feeBps = 200n,
): { shares: bigint; newYesPrice: number; newNoPrice: number } {
  const fee = (amount * feeBps) / 10000n;
  const netAmount = amount - fee;
  const k = yesReserve * noReserve;

  let shares: bigint;
  let newYesReserve: bigint;
  let newNoReserve: bigint;

  if (isYes) {
    newNoReserve = noReserve + netAmount;
    newYesReserve = k / newNoReserve;
    shares = yesReserve - newYesReserve;
  } else {
    newYesReserve = yesReserve + netAmount;
    newNoReserve = k / newYesReserve;
    shares = noReserve - newNoReserve;
  }

  const total = newYesReserve + newNoReserve;
  const newYesPrice = Number(newNoReserve * 10000n / total) / 10000;

  return {
    shares,
    newYesPrice,
    newNoPrice: 1 - newYesPrice,
  };
}

/**
 * Calculate payout for winning shares
 */
export function calculatePayout(
  userShares: bigint,
  totalWinningShares: bigint,
  totalPool: bigint,
): bigint {
  if (totalWinningShares === 0n) return 0n;
  return (userShares * totalPool) / totalWinningShares;
}

/**
 * Detect if OP_WALLET extension is available
 * OP_WALLET is a fork of UniSat — exposes window.opnet with same API surface
 */
export function isOPWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).opnet;
}

/**
 * Connect to OP_WALLET browser extension
 * API: requestAccounts(), getPublicKey(), getNetwork(), signPsbt(), etc.
 * Install: https://opnet.org (Chrome Extension)
 */
export async function connectOPWallet(): Promise<{ address: string; publicKey: string } | null> {
  try {
    const opwallet = (window as unknown as { opnet?: { requestAccounts: () => Promise<string[]>; getPublicKey?: () => Promise<string> } }).opnet;
    if (!opwallet) return null;

    const accounts = await opwallet.requestAccounts();
    if (!accounts || accounts.length === 0) return null;

    const publicKey = await opwallet.getPublicKey?.() || '';
    return { address: accounts[0], publicKey };
  } catch (err) {
    console.error('OP_WALLET connection failed:', err);
    return null;
  }
}

/**
 * Build a contract interaction calldata buffer
 */
export function encodeCalldata(method: string, ...args: bigint[]): Uint8Array {
  // Simple encoding: method selector (4 bytes) + u256 args (32 bytes each)
  const methodBytes = new TextEncoder().encode(method);
  const selectorBytes = new Uint8Array(4);
  // Simple hash for selector
  for (let i = 0; i < methodBytes.length; i++) {
    selectorBytes[i % 4] ^= methodBytes[i];
  }

  const totalSize = 4 + args.length * 32;
  const buffer = new Uint8Array(totalSize);
  buffer.set(selectorBytes, 0);

  args.forEach((arg, index) => {
    const offset = 4 + index * 32;
    const hex = arg.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      buffer[offset + i] = parseInt(hex.substr(i * 2, 2), 16);
    }
  });

  return buffer;
}

/**
 * Market state interface matching on-chain storage
 */
export interface OnChainMarketState {
  yesReserve: bigint;
  noReserve: bigint;
  totalPool: bigint;
  endBlock: bigint;
  resolved: boolean;
  outcome: boolean; // true = YES, false = NO
  yesPrice: number;
  noPrice: number;
}

/**
 * Decode getMarketInfo response (6 x u256)
 */
export function decodeMarketInfo(data: Uint8Array): OnChainMarketState {
  const readU256 = (offset: number): bigint => {
    let hex = '0x';
    for (let i = 0; i < 32; i++) {
      hex += data[offset + i].toString(16).padStart(2, '0');
    }
    return BigInt(hex);
  };

  const yesReserve = readU256(0);
  const noReserve = readU256(32);
  const totalPool = readU256(64);
  const endBlock = readU256(96);
  const resolved = readU256(128) !== 0n;
  const outcome = readU256(160) !== 0n;

  const { yes: yesPrice, no: noPrice } = calculatePrice(yesReserve, noReserve);

  return { yesReserve, noReserve, totalPool, endBlock, resolved, outcome, yesPrice, noPrice };
}

/**
 * Validate a Bitcoin regtest address
 * Regtest uses bcrt1 prefix for bech32, tb1 for testnet
 */
export function isValidRegtestAddress(address: string): boolean {
  if (!address) return false;
  // bcrt1 (bech32 regtest), tb1 (testnet), m/n (legacy testnet/regtest)
  return /^(bcrt1[a-z0-9]{39,59}|tb1[a-z0-9]{39,59}|[mn][a-km-zA-HJ-NP-Z1-9]{25,34}|2[a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address);
}

/**
 * Fetch current block height from OP_NET RPC
 */
export async function fetchBlockHeight(): Promise<number | null> {
  try {
    const res = await fetch(OPNET_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'btc_blockNumber', params: [] }),
    });
    const data = await res.json();
    if (data.result) return Number(data.result);
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate a transaction explorer URL
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${OPNET_CONFIG.explorerUrl}/tx/${txHash}`;
}

/**
 * Generate an address explorer URL
 */
export function getExplorerAddressUrl(address: string): string {
  return `${OPNET_CONFIG.explorerUrl}/address/${address}`;
}
