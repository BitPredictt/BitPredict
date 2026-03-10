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

// OP_NET configuration (env-driven for mainnet/testnet switch)
const OPNET_NETWORK = (import.meta.env.VITE_OPNET_NETWORK || 'testnet') as 'testnet' | 'mainnet';

// Safety: on mainnet, require all addresses from env vars
if (OPNET_NETWORK === 'mainnet') {
  const required = ['VITE_CONTRACT_ADDRESS', 'VITE_VAULT_ADDRESS', 'VITE_TOKEN_ADDRESS', 'VITE_TOKEN_PUBKEY'] as const;
  for (const key of required) {
    if (!import.meta.env[key]) {
      throw new Error(`FATAL: ${key} is required for mainnet deployment`);
    }
  }
}

export const OPNET_CONFIG = {
  network: OPNET_NETWORK,
  rpcUrl: import.meta.env.VITE_OPNET_RPC_URL || (OPNET_NETWORK === 'mainnet' ? 'https://api.opnet.org' : 'https://testnet.opnet.org'),
  explorerUrl: import.meta.env.VITE_EXPLORER_URL || 'https://opscan.org',
  faucetUrl: OPNET_NETWORK === 'testnet' ? 'https://faucet.opnet.org' : '',
  motoswapUrl: 'https://motoswap.org',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '',
  vaultAddress: import.meta.env.VITE_VAULT_ADDRESS || '',
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS || '',
  tokenPubkey: import.meta.env.VITE_TOKEN_PUBKEY || '',
  // Contract public keys (hex, SHA256 of MLDSA public key) — required for Address.fromString()
  // Use `await provider.getPublicKeyInfo(contractAddress, true)` to fetch dynamically if not set.
  contractPubkey: import.meta.env.VITE_CONTRACT_PUBKEY || '',
  vaultPubkey: import.meta.env.VITE_VAULT_PUBKEY || '',
  treasuryAddress: import.meta.env.VITE_TREASURY_ADDRESS || '',
  treasuryPubkey: import.meta.env.VITE_TREASURY_PUBKEY || '',
  tokenDecimals: 8,
  tokenSymbol: 'WBTC',
  wbtcPoolAddress: import.meta.env.VITE_WBTC_POOL_ADDRESS || '',
};

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
 * Format sats for display
 */
export function formatSats(sats: number): string {
  if (sats >= 100_000_000) return `${(sats / 1e8).toFixed(4)} WBTC`;
  if (sats >= 1_000_000) return `${(sats / 1e6).toFixed(2)}M sats`;
  return `${sats.toLocaleString()} sats`;
}

/**
 * Detect if OP_WALLET extension is available
 * OP_WALLET is a fork of UniSat — exposes window.opnet with same API surface
 */
export function isOPWalletAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).opnet;
}

/**
 * Validate an OP_NET address (testnet or mainnet)
 */
export function isValidOPNetAddress(address: string): boolean {
  if (!address) return false;
  // ob1 (OPNet mainnet), opt1 (OPNet testnet), bc1 (mainnet taproot/segwit), bcrt1 (regtest), tb1 (Bitcoin testnet)
  return /^(ob1[a-z0-9]{39,80}|opt1[a-z0-9]{39,80}|bc1[a-z0-9]{39,80}|bcrt1[a-z0-9]{39,59}|tb1[a-z0-9]{39,59}|[mn13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(address);
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

// ─── On-chain helpers ───
// Per Bob (OPNet AI): use wallet's OWN provider from useWalletConnect(), NOT JSONRpcProvider.
// Use OP_20_ABI from opnet package. Use IOP20Contract for type safety.
// wallet handles signing automatically via OP_WALLET extension.
// Access results via result.properties.balance (not result.decoded).

const MAX_SATS = 250_000n;

// Parimutuel fee: 3% from bet amount
export const BET_FEE_PCT = 0.03;

// Treasury address for BTC payments (deployer / contract owner)
export const TREASURY_ADDRESS = import.meta.env.VITE_TREASURY_ADDRESS || OPNET_CONFIG.treasuryAddress;

/**
 * Get gas parameters from provider (reusable helper)
 */
export async function getGasParameters(provider: unknown): Promise<{ feeRate: number; priorityFee: bigint }> {
  const gas = await (provider as any).gasParameters();
  const feeRate = Number(gas?.bitcoin?.recommended?.medium || gas?.bitcoin?.conservative || 10);
  const rawGasPerSat = gas?.gasPerSat != null ? BigInt(gas.gasPerSat) : 1n;
  const gasPerSat = rawGasPerSat > 0n ? rawGasPerSat : 1n;
  const rawBaseGas = gas?.baseGas != null ? BigInt(gas.baseGas) : 1000n;
  const priorityFeeSats = rawBaseGas / gasPerSat;
  const priorityFee = priorityFeeSats < 1000n ? 1000n : priorityFeeSats > 50000n ? 50000n : priorityFeeSats;
  return { feeRate, priorityFee };
}

// Minimum BTC balance (in sats) required to perform any on-chain action (gas fees)
export const MIN_BTC_FOR_TX = 10_000; // 10,000 sats = 0.0001 BTC

/**
 * Wait for a TX to be confirmed on-chain (Bob pattern: poll getTransaction, check blockNumber).
 * Required between approve + action steps — approval must be confirmed before the next TX
 * can see the updated allowance state.
 * Uses wallet's provider.getTransaction() — same RPC the SDK uses.
 *
 * @param provider - wallet's JSONRpcProvider
 * @param txHash - transaction hash to wait for
 * @param timeoutMs - max wait time (default 5 min)
 * @param pollMs - poll interval (default 5 sec)
 */
export async function waitForTxConfirmation(
  provider: unknown,
  txHash: string,
  timeoutMs = 300_000,
  pollMs = 5_000,
): Promise<{ confirmed: boolean; blockNumber?: number }> {
  if (!txHash || !provider) return { confirmed: false };
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const tx = await (provider as any).getTransaction(txHash);
      if (tx && tx.blockNumber !== undefined && tx.blockNumber !== null) {
        return { confirmed: true, blockNumber: Number(tx.blockNumber) };
      }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, pollMs));
  }
  return { confirmed: false };
}

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
 * Get WBTC balance in raw units (sats) as a number.
 * Wrapper around getPredBalanceOnChain for convenience.
 */
export async function getOnChainWbtcBalance(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
): Promise<number> {
  const raw = await getPredBalanceOnChain(provider, network, senderAddr);
  return Number(raw); // raw on-chain units (sats)
}

/**
 * Sign a bet proof TX — user signs increaseAllowance on WBTC token.
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
    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    // Approve WBTC token itself to spend — creates verifiable on-chain proof
    // tokenPubkey is a hex key (0x...) — Address.fromString() accepts hex only, NOT opt1/bc1 strings
    const spenderAddr = await resolveContractAddress(provider, OPNET_CONFIG.tokenAddress, OPNET_CONFIG.tokenPubkey) as any;
    const sim = await withRetry(() => (token as any).increaseAllowance(spenderAddr, amount)) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `Approve revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      // Bob: signer/mldsaSigner MUST be null on frontend — wallet handles signing
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('no utxo')) msg = OPNET_CONFIG.network === 'testnet' ? 'No BTC UTXOs. Get testnet BTC: https://faucet.opnet.org' : 'No BTC UTXOs. Ensure your wallet has sufficient BTC for fees.';
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Sign a bet proof TX — user signs increaseAllowance for the bet amount (in sats).
 * Wraps signBetProof, passing amount directly as raw on-chain units.
 */
export async function signBetAmountProof(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    return signBetProof(provider, network, senderAddr, walletAddress, BigInt(amount));
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sign a claim TX — user signs increaseAllowance for the exact claim amount.
 * This creates a REAL on-chain TX with the actual WBTC payout value.
 * Used when claiming winnings from resolved markets.
 * @param claimAmount - payout amount in raw on-chain units (sats)
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
    return signBetProof(provider, network, senderAddr, walletAddress, BigInt(claimAmount));
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Sign a reward claim TX — user signs increaseAllowance for the reward amount.
 * Used when claiming achievement/quest WBTC rewards.
 * @param rewardAmount - reward in sats (will be expanded to token decimals)
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

/**
 * Resolve a contract's Address object for use as a parameter in contract calls
 * (e.g. increaseAllowance spender argument).
 *
 * Address.fromString() requires a HEX public key — NOT an opt1/bc1 address string.
 * For contracts, the correct key is mldsaHashedPublicKey (SHA256 of MLDSA key).
 *
 * Strategy:
 *   1. If pubkeyHex is provided in config — use it directly (fast, no RPC).
 *   2. Otherwise — fetch dynamically via provider.getPublicKeyInfo(address, true).
 *
 * @param provider  - wallet's AbstractRpcProvider from useWalletConnect()
 * @param contractAddress - opt1/bc1 address string of the contract
 * @param pubkeyHex - optional pre-configured hex public key (from env var)
 */
async function resolveContractAddress(
  provider: unknown,
  contractAddress: string,
  pubkeyHex?: string,
): Promise<unknown> {
  const { Address } = await import('@btc-vision/transaction');
  if (pubkeyHex) {
    // Fast path: pubkey pre-configured, no RPC needed
    return Address.fromString(pubkeyHex);
  }
  // Dynamic path: fetch from chain — isContract=true uses mldsaHashedPublicKey
  return (provider as any).getPublicKeyInfo(contractAddress, true);
}

/**
 * Read current allowance of WBTC token for a given spender.
 * Returns allowance in human units (divided by 1e8).
 * Used to skip approve step if sufficient allowance already exists.
 */
export async function getTokenAllowance(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  spenderAddress: string,
  spenderPubkey?: string,
): Promise<number> {
  if (!provider || !network || !senderAddr) return 0;
  try {
    const { getContract, OP_20_ABI } = await import('opnet');

    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const spenderAddr = await resolveContractAddress(provider, spenderAddress, spenderPubkey) as any;
    const result = await (token as any).allowance(senderAddr, spenderAddr);
    if (!result || result.revert) return 0;

    const raw = result?.properties?.allowance ?? result?.decoded?.[0] ?? 0n;
    return Number(BigInt(raw)) / 1e8;
  } catch {
    return 0;
  }
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
 * Generate a transaction explorer URL
 */
export function getExplorerTxUrl(txHash: string): string {
  return `${OPNET_CONFIG.explorerUrl}/transactions/${txHash}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
}

/**
 * Generate an address explorer URL
 */
export function getExplorerAddressUrl(address: string): string {
  return `${OPNET_CONFIG.explorerUrl}/accounts/${address}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
}

// ─── On-chain Vault operations (StakingVault contract) ───

/**
 * Stake WBTC on-chain via StakingVault.stake(amount).
 * Non-blocking — called after server records the stake.
 */
export async function stakeOnChain(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { getContract } = await import('opnet');
    const { StakingVaultAbi } = await import('../../contracts/abis/StakingVault.abi');

    const contract = getContract(
      OPNET_CONFIG.vaultAddress,
      StakingVaultAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const rawAmount = BigInt(amount);
    const sim = await withRetry(() => (contract as any).stake(rawAmount)) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `stake revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      // Bob: signer/mldsaSigner MUST be null on frontend — wallet handles signing
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Unstake WBTC on-chain via StakingVault.unstake(amount).
 */
export async function unstakeOnChain(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { getContract } = await import('opnet');
    const { StakingVaultAbi } = await import('../../contracts/abis/StakingVault.abi');

    const contract = getContract(
      OPNET_CONFIG.vaultAddress,
      StakingVaultAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const rawAmount = BigInt(amount);
    const sim = await withRetry(() => (contract as any).unstake(rawAmount)) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `unstake revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      // Bob: signer/mldsaSigner MUST be null on frontend — wallet handles signing
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Claim vault rewards on-chain via StakingVault.claimRewards().
 */
export async function claimVaultOnChain(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    const { getContract } = await import('opnet');
    const { StakingVaultAbi } = await import('../../contracts/abis/StakingVault.abi');

    const contract = getContract(
      OPNET_CONFIG.vaultAddress,
      StakingVaultAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const sim = await withRetry(() => (contract as any).claimRewards()) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `claimRewards revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      // Bob: signer/mldsaSigner MUST be null on frontend — wallet handles signing
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Read on-chain market price via PredictionMarket.getPrice(marketId).
 * Returns yesPriceBps (0-10000) or null on error.
 */
export async function getOnChainPrice(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  onchainMarketId: number,
): Promise<{ yesPrice: number; noPrice: number } | null> {
  if (!provider || !network || !senderAddr) return null;
  try {
    const { getContract } = await import('opnet');
    const { PredictionMarketAbi } = await import('../../contracts/abis/PredictionMarket.abi');
    const contract = getContract(
      OPNET_CONFIG.contractAddress,
      PredictionMarketAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );
    const result = await (contract as any).getPrice(BigInt(onchainMarketId));
    const yesBps = Number(result?.properties?.yesPriceBps ?? 5000n);
    return { yesPrice: yesBps / 10000, noPrice: 1 - yesBps / 10000 };
  } catch {
    return null;
  }
}

/**
 * Read on-chain vault TVL via StakingVault.getVaultInfo().
 */
export async function getOnChainVaultInfo(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
): Promise<{ totalStaked: bigint } | null> {
  if (!provider || !network || !senderAddr) return null;
  try {
    const { getContract } = await import('opnet');
    const { StakingVaultAbi } = await import('../../contracts/abis/StakingVault.abi');
    const contract = getContract(
      OPNET_CONFIG.vaultAddress,
      StakingVaultAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );
    const result = await (contract as any).getVaultInfo();
    return { totalStaked: result?.properties?.totalStaked ?? 0n };
  } catch {
    return null;
  }
}

/**
 * Sign a vault stake/unstake/claim proof TX.
 * Same pattern as signBetProof but with a different memo context.
 * @param amount - WBTC amount (will be expanded to token decimals)
 */
export async function signVaultProof(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    return signBetProof(provider, network, senderAddr, walletAddress, BigInt(amount));
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// PredictionMarket on-chain functions removed — parimutuel model uses server-side pools

// claimPayoutOnChain2 and approveForMarket removed — no PredictionMarket contract in parimutuel model

/**
 * Approve WBTC allowance for the StakingVault contract.
 * Checks current allowance first — skips TX if already sufficient.
 *
 * @param amount - WBTC amount in human units (e.g. 500 = 500 WBTC)
 * @returns skipped=true when existing allowance was sufficient (no TX needed)
 */
export async function approveForVault(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string; skipped?: boolean }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  try {
    // Check existing allowance — skip TX if already enough (both in sats)
    const currentAllowanceBtc = await getTokenAllowance(provider, network, senderAddr, OPNET_CONFIG.vaultAddress, OPNET_CONFIG.vaultPubkey);
    const currentAllowanceSats = currentAllowanceBtc * 1e8;
    if (currentAllowanceSats >= amount) {
      return { txHash: '', success: true, skipped: true };
    }

    const { getContract, OP_20_ABI } = await import('opnet');

    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const spenderAddr = await resolveContractAddress(provider, OPNET_CONFIG.vaultAddress, OPNET_CONFIG.vaultPubkey) as any;
    const rawAmount = BigInt(amount);

    const approveSim = await withRetry(() => (token as any).increaseAllowance(spenderAddr, rawAmount)) as any;
    if (approveSim?.revert) return { txHash: '', success: false, error: `increaseAllowance revert: ${approveSim.revert}` };

    const gas = await getGasParameters(provider);

    const approveTx = await approveSim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: approveTx?.transactionId || approveTx?.txid || '', success: true };
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Deposit WBTC to Treasury contract (on-chain).
 * Step 1: increaseAllowance for Treasury
 * Step 2: call Treasury.deposit(amount)
 * Frontend: signer=null, mldsaSigner=null (wallet handles signing).
 *
 * @param amount - WBTC amount in human units
 */
export async function depositToTreasury(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amount: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  if (!OPNET_CONFIG.treasuryAddress) return { txHash: '', success: false, error: 'Treasury address not configured' };

  try {
    const { getContract, OP_20_ABI } = await import('opnet');
    const rawAmount = BigInt(amount);

    // Step 1: increaseAllowance for Treasury contract
    const token = getContract(
      OPNET_CONFIG.tokenAddress,
      OP_20_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const treasuryAddr = await resolveContractAddress(provider, OPNET_CONFIG.treasuryAddress, OPNET_CONFIG.treasuryPubkey) as any;
    const approveSim = await withRetry(() => (token as any).increaseAllowance(treasuryAddr, rawAmount)) as any;
    if (approveSim?.revert) return { txHash: '', success: false, error: `Allowance revert: ${approveSim.revert}` };

    const gas = await getGasParameters(provider);

    const approveTx = await approveSim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      signer: null,
      mldsaSigner: null,
    });

    // Step 2: Call Treasury.deposit(amount)
    const TREASURY_ABI = [
      {
        name: 'deposit',
        inputs: [{ name: 'amount', type: 'uint256' }],
        outputs: [{ name: 'success', type: 'bool' }],
        type: 'function',
      },
    ];

    const treasury = getContract(
      OPNET_CONFIG.treasuryAddress,
      TREASURY_ABI,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const depositSim = await withRetry(() => (treasury as any).deposit(rawAmount)) as any;
    if (depositSim?.revert) return { txHash: '', success: false, error: `Deposit revert: ${depositSim.revert}` };

    const depositTx = await depositSim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      signer: null,
      mldsaSigner: null,
    });

    return { txHash: depositTx?.transactionId || depositTx?.txid || '', success: true };
  } catch (err) {
    return { txHash: '', success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Wrap/Unwrap BTC <-> WBTC (NativeSwap) ───

/**
 * Wrap BTC to WBTC via the WBTC contract.
 * Sends BTC to pool address via extraOutputs, contract mints WBTC 1:1.
 *
 * @param amountSats - amount in satoshis to wrap
 */
export async function wrapBTC(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amountSats: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };
  if (!OPNET_CONFIG.wbtcPoolAddress) return { txHash: '', success: false, error: 'Pool address not configured' };

  try {
    const { getContract } = await import('opnet');
    const { WBTCAbi } = await import('../../contracts/abis/WBTC.abi');

    const contract = getContract(
      OPNET_CONFIG.tokenAddress,
      WBTCAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );

    // Set transaction details for payable method — include BTC output to pool
    await (contract as any).setTransactionDetails({
      outputs: [{ to: OPNET_CONFIG.wbtcPoolAddress, value: BigInt(amountSats) }],
    });

    const sim = await withRetry(() => (contract as any).wrap(BigInt(amountSats))) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `wrap revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      extraOutputs: [{ address: OPNET_CONFIG.wbtcPoolAddress, value: BigInt(amountSats) }],
      signer: null,
      mldsaSigner: null,
    });
    return { txHash: receipt?.transactionId || receipt?.txid || '', success: true };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('no utxo')) msg = OPNET_CONFIG.network === 'testnet' ? 'No BTC UTXOs. Get testnet BTC: https://faucet.opnet.org' : 'No BTC UTXOs. Ensure your wallet has sufficient BTC.';
    return { txHash: '', success: false, error: msg };
  }
}

/**
 * Unwrap WBTC to BTC — two-step custodial process:
 * 1. Call contract.unwrap(amount) — burns WBTC on-chain
 * 2. Server sends BTC from pool to user wallet
 *
 * @param amountSats - amount in satoshis to unwrap
 */
export async function unwrapWBTC(
  provider: unknown,
  network: unknown,
  senderAddr: unknown,
  walletAddress: string,
  amountSats: number,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  if (!provider || !network || !senderAddr) return { txHash: '', success: false, error: 'Wallet not connected' };

  try {
    // Step 1: Burn WBTC on-chain via contract.unwrap()
    const { getContract } = await import('opnet');
    const { WBTCAbi } = await import('../../contracts/abis/WBTC.abi');

    const contract = getContract(
      OPNET_CONFIG.tokenAddress,
      WBTCAbi as never,
      provider as never,
      network as never,
      senderAddr as never,
    );

    const sim = await withRetry(() => (contract as any).unwrap(BigInt(amountSats))) as any;
    if (sim?.revert) return { txHash: '', success: false, error: `unwrap revert: ${sim.revert}` };

    const gas = await getGasParameters(provider);

    const receipt = await sim.sendTransaction({
      refundTo: walletAddress,
      maximumAllowedSatToSpend: MAX_SATS,
      network,
      feeRate: gas.feeRate,
      priorityFee: gas.priorityFee,
      signer: null,
      mldsaSigner: null,
    });

    const burnTxHash = receipt?.transactionId || receipt?.txid || '';
    if (!burnTxHash) return { txHash: '', success: false, error: 'Burn TX failed' };

    // Step 2: Request BTC disbursement from server
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('bp_jwt') || '';
    const resp = await fetch(`${apiUrl}/api/unwrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ address: walletAddress, amount: amountSats, burnTxHash }),
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      // Burn succeeded but server disbursement pending — user will get BTC later
      return { txHash: burnTxHash, success: true, error: data.error || 'BTC disbursement queued' };
    }

    return { txHash: data.btcTxHash || burnTxHash, success: true };
  } catch (err) {
    let msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('no utxo')) msg = OPNET_CONFIG.network === 'testnet' ? 'No BTC UTXOs. Get testnet BTC: https://faucet.opnet.org' : 'No BTC UTXOs. Ensure your wallet has sufficient BTC.';
    return { txHash: '', success: false, error: msg };
  }
}
