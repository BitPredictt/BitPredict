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

// OP_NET testnet configuration (Signet fork, opt1 prefix)
export const OPNET_CONFIG = {
  network: 'testnet' as const,
  rpcUrl: 'https://testnet.opnet.org',
  explorerUrl: 'https://opscan.org',
  faucetUrl: 'https://faucet.opnet.org',
  motoswapUrl: 'https://motoswap.org',
  contractAddress: 'opt1sqr00sl3vc4h955dpwdr2j35mqmflrnav8qskrepj', // Deployed PredictionMarket
  predTokenAddress: 'opt1sqzc2a3tg6g9u04hlzu8afwwtdy87paeha5c3paph', // $PRED OP-20 Token
};

// Official OP_NET SDK usage:
// import { JSONRpcProvider, getContract, OP_20_ABI } from 'opnet';
// import { networks } from '@btc-vision/bitcoin';
// const provider = new JSONRpcProvider(OPNET_CONFIG.rpcUrl, networks.opnetTestnet);

// Contract method selectors (SHA256 first 4 bytes — OPNet uses SHA256, NOT keccak256)
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
 * Validate an OP_NET testnet address
 * OPNet testnet uses opt1 prefix (Signet fork)
 */
export function isValidOPNetAddress(address: string): boolean {
  if (!address) return false;
  // opt1 (OPNet testnet bech32m), bcrt1 (regtest fallback), tb1 (Bitcoin testnet)
  return /^(opt1[a-z0-9]{39,80}|bcrt1[a-z0-9]{39,59}|tb1[a-z0-9]{39,59}|[mn][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address);
}

/**
 * Fetch current block height from OP_NET RPC
 */
export async function fetchBlockHeight(): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(OPNET_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'btc_blockNumber', params: [] }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.result) return Number(data.result);
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch real BTC balance from OP_NET RPC
 * Uses btc_getBalance JSON-RPC method
 */
export async function fetchBalance(address: string): Promise<number | null> {
  try {
    const res = await fetch(OPNET_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'btc_getBalance',
        params: [address, true],
      }),
    });
    const data = await res.json();
    if (data.result !== undefined && data.result !== null) {
      const val = data.result;
      if (typeof val === 'string') {
        return val.startsWith('0x') ? Number(BigInt(val)) : Number(val);
      }
      return Number(val);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch UTXOs for an address from OP_NET RPC
 */
export async function fetchUTXOs(address: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(OPNET_CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'btc_getUTXOs',
        params: [{ address, optimize: true }],
      }),
    });
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

interface OPWalletAPI {
  requestAccounts: () => Promise<string[]>;
  getPublicKey?: () => Promise<string>;
  getNetwork?: () => Promise<string>;
  signPsbt?: (psbtHex: string, options?: Record<string, unknown>) => Promise<string>;
  pushPsbt?: (psbtHex: string) => Promise<string>;
  sendBitcoin?: (to: string, amount: number, options?: Record<string, unknown>) => Promise<string>;
}

function getOPWallet(): OPWalletAPI | null {
  const w = window as unknown as { opnet?: OPWalletAPI };
  return w.opnet || null;
}

/**
 * Submit a prediction bet as a real OP_NET transaction.
 * Uses opnet SDK: getContract() → simulate() → sendTransaction({signer:null})
 * Per Bob's rules: signer and mldsaSigner are ALWAYS null on frontend.
 */
export async function submitBetTransaction(
  marketId: string,
  side: 'yes' | 'no',
  amountSats: number,
  senderAddress: string,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    // Dynamic import to avoid SSR issues
    const { getContract, JSONRpcProvider } = await import('opnet');
    const { opnetTestnet } = await import('@btc-vision/bitcoin');

    const provider = new JSONRpcProvider(OPNET_CONFIG.rpcUrl, opnetTestnet);

    // PredictionMarket ABI (flat array per Bob's rules)
    const abi = [
      {
        name: 'buyShares',
        inputs: [
          { name: 'marketId', type: 'UINT256' },
          { name: 'isYes', type: 'BOOL' },
          { name: 'amount', type: 'UINT256' },
        ],
        outputs: [{ name: 'shares', type: 'UINT256' }],
        type: 'Function',
      },
    ];

    const contract = getContract(
      OPNET_CONFIG.contractAddress,
      abi,
      provider,
      opnetTestnet,
      senderAddress,
    );

    // Encode marketId as u256 from string
    const marketIdBig = BigInt('0x' + Array.from(new TextEncoder().encode(marketId))
      .map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0'));
    const isYes = side === 'yes';

    // Step 1: Simulate
    const simulation = await (contract as any).buyShares(marketIdBig, isYes, BigInt(amountSats));

    if (simulation.revert) {
      return { txHash: '', success: false, error: `Contract revert: ${simulation.revert}` };
    }

    // Step 2: Send transaction — signer: null on frontend (OP_WALLET handles signing)
    const receipt = await simulation.sendTransaction({
      signer: null,
      mldsaSigner: null,
      refundTo: senderAddress,
      maximumAllowedSatToSpend: BigInt(amountSats + 10000),
      network: opnetTestnet,
    });

    return {
      txHash: receipt.transactionId || receipt.txid || '',
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { txHash: '', success: false, error: msg };
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
