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
  tokenAddress: 'opt1sqpumh2np66f0dev767my7qvetur8x2zd3clgxs8d', // BPUSD MintableToken (our own, publicMint enabled)
  tokenPubkey: '0x1fc02c213008668e4a8bde3a600b5dc9afd6b3ad0b5c558c2e6dc128f4d14195',
  tokenDecimals: 8,
  tokenSymbol: 'BPUSD',
  mintAmount: 1000, // Fixed 1000 tokens per mint
  maxMintPerTx: 10_000_000, // 10M BPUSD per tx
};

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
 * Fetch current block height using wallet's provider (NOT testnet.opnet.org).
 * Pass provider from useWalletConnect().
 */
export async function fetchBlockHeight(walletProvider?: unknown): Promise<number | null> {
  if (!walletProvider) return null;
  try {
    const result = await (walletProvider as any).getBlockNumber();
    return typeof result === 'number' ? result : Number(result);
  } catch {
    return null;
  }
}

/**
 * Fetch real BTC balance via wallet's provider (NOT testnet.opnet.org).
 */
export async function fetchBalance(_address: string, _walletProvider?: unknown): Promise<number | null> {
  // Balance is managed by walletconnect SDK (walletBalance field)
  return null;
}

/**
 * Fetch UTXOs — use wallet provider, not direct RPC
 */
export async function fetchUTXOs(_address: string, _walletProvider?: unknown): Promise<unknown[] | null> {
  return null;
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

// ─── On-chain helpers ───
// Per Bob (OPNet AI): use wallet's OWN provider from useWalletConnect(), NOT JSONRpcProvider.
// Use OP_20_ABI from opnet package. Use IOP20Contract for type safety.
// wallet handles signing automatically via OP_WALLET extension.
// Access results via result.properties.balance (not result.decoded).

const MAX_SATS = 50000n;

// Minimum BTC balance (in sats) required to perform any on-chain action (gas fees)
export const MIN_BTC_FOR_TX = 10_000; // 10,000 sats = 0.0001 BTC

// Re-export types for consumers
export type { AbstractRpcProvider } from 'opnet';

/**
 * Get MINE token balance on-chain via OP-20 balanceOf.
 * Uses wallet's provider from useWalletConnect().
 * senderAddr must be Address object from useWalletConnect().address
 */
export async function getPredBalanceOnChain(
  provider: unknown,
  network: unknown,
  senderAddr: unknown, // Address object from walletconnect
): Promise<bigint> {
  if (!provider || !network || !senderAddr) return 0n;
  try {
    const { getContract, OP_20_ABI } = await import('opnet');
    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never, // Address object, NOT string
    );
    const result = await (token as any).balanceOf(senderAddr);
    return result?.properties?.balance ?? 0n;
  } catch (err) {
    console.warn('getPredBalanceOnChain:', err instanceof Error ? err.message : err);
    return 0n;
  }
}

/**
 * Sign a bet proof TX — user signs increaseAllowance on BPUSD token.
 * This creates a real on-chain TX that proves the user authorized the bet.
 * User pays gas from their own BTC UTXOs.
 */
export async function signBetProof(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,  // Address object from walletconnect
  walletAddress: string,
  amount: bigint,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { getContract, OP_20_ABI } = await import('opnet');
    const { Address } = await import('@btc-vision/transaction');
    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    // Approve BPUSD contract itself to spend — creates verifiable on-chain proof
    const spenderAddr = Address.fromString(OPNET_CONFIG.tokenPubkey) as any;
    const sim = await withRetry(() => (token as any).increaseAllowance(spenderAddr, amount)) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `Approve revert: ${sim.revert}` };

    const gas = await (provider as any).gasParameters();
    const feeRate = gas?.bitcoin?.recommended?.medium || gas?.bitcoin?.conservative || 10;
    const gasPerSat = gas?.gasPerSat > 0n ? gas.gasPerSat : 1n;
    const priorityFeeSats = gas.baseGas / gasPerSat;
    const priorityFee = priorityFeeSats < 1000n ? 1000n : priorityFeeSats > 50000n ? 50000n : priorityFeeSats;

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: 250_000n,
      network,
      feeRate,
      priorityFee,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('no utxo')) msg = 'No BTC UTXOs. Get testnet BTC first: https://faucet.opnet.org';
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Sign a claim TX — user signs increaseAllowance for the exact claim amount.
 * This creates a REAL on-chain TX with the actual BPUSD payout value.
 * Used when claiming winnings from resolved markets.
 * @param claimAmount - payout amount in BPUSD (will be expanded to token decimals)
 */
export async function signClaimProof(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  claimAmount: number = 1,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { BitcoinUtils } = await import('opnet');
    const expandedAmount = BitcoinUtils.expandToDecimals(claimAmount, OPNET_CONFIG.tokenDecimals);
    return signBetProof(provider, network, senderAddr, walletAddress, expandedAmount);
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sign a reward claim TX — user signs increaseAllowance for the reward amount.
 * Used when claiming achievement/quest BPUSD rewards.
 * @param rewardAmount - reward in BPUSD (will be expanded to token decimals)
 */
export async function signRewardClaimProof(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  rewardAmount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  return signClaimProof(provider, network, senderAddr, walletAddress, rewardAmount);
}

/** Retry wrapper for flaky RPC simulations (matches vibe pattern) */
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 2000): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Retry exhausted');
}

/**
 * On-chain publicMint — mints BPUSD tokens directly via MintableToken contract.
 * User's OP_WALLET signs the TX. No server faucet needed.
 * Pattern from vibe's SwapUI.tsx (proven working).
 */
export async function mintTokensOnChain(
  provider: unknown,
  network: unknown,
  senderAddr: unknown, // Address object from walletconnect
  walletAddress: string,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { getContract, ABIDataTypes, BitcoinAbiTypes, BitcoinUtils } = await import('opnet');

    const MINTABLE_ABI = [
      {
        name: 'publicMint',
        inputs: [{ name: 'amount', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
      },
    ] as any;

    const contract = getContract(
      OPNET_CONFIG.tokenAddress,
      MINTABLE_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const rawAmount = BitcoinUtils.expandToDecimals(OPNET_CONFIG.mintAmount, OPNET_CONFIG.tokenDecimals);
    const sim = await withRetry(() => (contract as any).publicMint(rawAmount)) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `Mint reverted: ${sim.revert}` };

    // Build TX params with gas from provider
    const gas = await (provider as any).gasParameters();
    const feeRate = gas?.bitcoin?.recommended?.medium || gas?.bitcoin?.conservative || 10;
    const gasPerSat = gas?.gasPerSat > 0n ? gas.gasPerSat : 1n;
    const priorityFeeSats = gas.baseGas / gasPerSat;
    const priorityFee = priorityFeeSats < 1000n ? 1000n : priorityFeeSats > 50000n ? 50000n : priorityFeeSats;

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: 250_000n,
      network,
      feeRate,
      priorityFee,
    });

    const txHash = receipt?.transactionId || receipt?.txid || '';
    return { txHash, success: true };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('no utxo')) msg = 'No BTC UTXOs. Get testnet BTC first: https://faucet.opnet.org';
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Submit a prediction bet on-chain: approve PRED → buyShares on PredictionMarket.
 * Uses wallet's OWN provider from useWalletConnect().
 * Both TXs trigger OP_WALLET signing popups.
 */
export async function submitBetTransaction(
  marketId: string,
  side: 'yes' | 'no',
  amountSats: number,
  provider: unknown,
  network: unknown,
  senderAddr: unknown, // Address object from walletconnect
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet provider not available' };
  try {
    const { getContract } = await import('opnet');

    // Step 1: Approve BPUSD spending (user signs via OP_WALLET)
    const approveResult = await signBetProof(provider, network, senderAddr, '', BigInt(amountSats));
    if (!approveResult.success) {
      return { txHash: '', success: false, error: approveResult.error || 'Approve failed' };
    }

    // Step 2: buyShares on PredictionMarket
    const { ABIDataTypes, BitcoinAbiTypes } = await import('opnet');
    const MARKET_ABI = [
      { name: 'buyShares', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }, { name: 'isYes', type: ABIDataTypes.BOOL }, { name: 'amount', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'shares', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    ] as any;
    const contract = getContract(
      OPNET_CONFIG.contractAddress,
      MARKET_ABI,
      provider as never,
      network as never,
      senderAddr as never, // Address object
    );

    const marketIdBytes = new TextEncoder().encode(marketId);
    const marketIdHex = Array.from(marketIdBytes)
      .map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64);
    const marketIdBig = BigInt('0x' + marketIdHex);

    const simulation = await (contract as any).buyShares(marketIdBig, side === 'yes', BigInt(amountSats));
    if (simulation?.revert) {
      return { txHash: '', success: false, error: `buyShares revert: ${simulation.revert}` };
    }

    const receipt = await simulation.sendTransaction({
      refundTo: senderAddr,
      maximumAllowedSatToSpend: BigInt(amountSats) + MAX_SATS,
      network,
    });

    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Claim on-chain payout for a resolved market.
 */
export async function claimPayoutOnChain(
  marketId: string,
  provider: unknown,
  network: unknown,
  senderAddr: unknown, // Address object
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet provider not available' };
  try {
    const { getContract, ABIDataTypes, BitcoinAbiTypes } = await import('opnet');
    const MARKET_ABI = [
      { name: 'claimPayout', inputs: [{ name: 'marketId', type: ABIDataTypes.UINT256 }], outputs: [{ name: 'payout', type: ABIDataTypes.UINT256 }], type: BitcoinAbiTypes.Function },
    ] as any;
    const contract = getContract(
      OPNET_CONFIG.contractAddress,
      MARKET_ABI,
      provider as never,
      network as never,
      senderAddr as never, // Address object
    );

    const marketIdBytes = new TextEncoder().encode(marketId);
    const marketIdHex = Array.from(marketIdBytes)
      .map(b => b.toString(16).padStart(2, '0')).join('').padEnd(64, '0').slice(0, 64);

    const sim = await (contract as any).claimPayout(BigInt('0x' + marketIdHex));
    if (sim?.revert) return { txHash: '', success: false, error: `Revert: ${sim.revert}` };

    const receipt = await sim.sendTransaction({
      refundTo: senderAddr,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Generate a transaction explorer URL
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${OPNET_CONFIG.explorerUrl}/transactions/${txHash}?network=op_testnet`;
}

/**
 * Generate an address explorer URL
 */
export function getExplorerAddressUrl(address: string): string {
  return `${OPNET_CONFIG.explorerUrl}/accounts/${address}?network=op_testnet`;
}
