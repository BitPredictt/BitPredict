/**
 * BitPredict Server API Client
 * All balances, bets, and market data stored on the server.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://polyfantasy.xyz/bpapi';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data as T;
}

// --- Auth / Balance ---
export async function authUser(address: string) {
  return apiFetch<{ address: string; balance: number }>('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

export async function getBalance(address: string) {
  return apiFetch<{ balance: number }>(`/api/balance/${address}`);
}

// --- Markets ---
export interface ServerMarket {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  endTime: number;
  resolved: boolean;
  outcome: string | null;
  tags: string[];
  marketType: string;
  yesPool: number;
  noPool: number;
  imageUrl?: string;
  eventId?: string;
  outcomes?: { marketId: string; label: string; price: number; volume: number }[];
}

export async function getMarkets() {
  return apiFetch<ServerMarket[]>('/api/markets');
}

export async function getMarket(id: string) {
  return apiFetch<ServerMarket>(`/api/markets/${id}`);
}

// --- Bets ---
export interface ServerBet {
  id: string;
  marketId: string;
  question: string;
  category: string;
  side: 'yes' | 'no';
  amount: number;
  price: number;
  shares: number;
  status: 'active' | 'won' | 'lost' | 'cancelled' | 'claimable';
  payout: number;
  timestamp: number;
  currentYesPrice: number;
  currentNoPrice: number;
  marketResolved: boolean;
  marketOutcome: string | null;
}

export interface PlaceBetResult {
  success: boolean;
  betId: string;
  shares: number;
  fee: number;
  newBalance: number;
  newYesPrice: number;
  newNoPrice: number;
  txHash?: string;
}

export async function placeBet(address: string, marketId: string, side: 'yes' | 'no', amount: number) {
  return apiFetch<PlaceBetResult>('/api/bet', {
    method: 'POST',
    body: JSON.stringify({ address, marketId, side, amount }),
  });
}

export async function getUserBets(address: string) {
  return apiFetch<ServerBet[]>(`/api/bets/${address}`);
}

// --- Prices ---
export async function getPrices() {
  return apiFetch<{ btc: number; eth: number; ts: number }>('/api/prices');
}

// --- Leaderboard ---
export interface LeaderEntry {
  rank: number;
  address: string;
  balance: number;
  totalBets: number;
  wins: number;
  volume: number;
  pnl: number;
}

export async function getLeaderboard() {
  return apiFetch<LeaderEntry[]>('/api/leaderboard');
}

// --- Bob AI Chat ---
export async function aiChat(message: string, address?: string, marketId?: string) {
  return apiFetch<{ reply: string; model: string; source: string }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, address, marketId }),
  });
}

// --- Bob Signal (per-market quick analysis) ---
export async function aiSignal(marketId: string) {
  return apiFetch<{ marketId: string; signal: string; source: string }>(`/api/ai/signal/${marketId}`);
}

// --- Claim payout (user-signed TX proof) ---
export async function claimPayout(address: string, betId: string, txHash: string) {
  return apiFetch<{ success: boolean; payout: number; newBalance: number; txHash: string }>('/api/claim', {
    method: 'POST',
    body: JSON.stringify({ address, betId, txHash }),
  });
}

// --- On-chain bet (requires txHash from wallet signature) ---
export interface OnChainBetResult {
  success: boolean;
  betId: string;
  shares: number;
  fee: number;
  txHash: string;
  newBalance: number;
  newYesPrice: number;
  newNoPrice: number;
}

export async function placeOnChainBet(address: string, marketId: string, side: 'yes' | 'no', amount: number, txHash: string) {
  return apiFetch<OnChainBetResult>('/api/bet/onchain', {
    method: 'POST',
    body: JSON.stringify({ address, marketId, side, amount, txHash }),
  });
}

// --- Reward claims (achievement/quest BPUSD) ---
export interface RewardClaim {
  reward_id: string;
  reward_type: string;
  amount: number;
  claimed_at: number;
}

export async function claimReward(address: string, rewardId: string, rewardType: string, amount: number) {
  return apiFetch<{ success: boolean; amount: number; newBalance: number }>('/api/reward/claim', {
    method: 'POST',
    body: JSON.stringify({ address, rewardId, rewardType, amount }),
  });
}

export async function getClaimedRewards(address: string) {
  return apiFetch<RewardClaim[]>(`/api/reward/claimed/${address}`);
}

// --- Price history (for sparkline charts) ---
export async function getPriceHistory(asset: string = 'btc', minutes: number = 30) {
  return apiFetch<{ price: number; timestamp: number }[]>(`/api/prices/history?asset=${asset}&minutes=${minutes}`);
}

// --- Protocol stats ---
export interface ProtocolStats {
  totalMarkets: number;
  resolvedMarkets: number;
  autoResolved: number;
  totalBets: number;
  bets24h: number;
  volume24h: number;
  volumeTotal: number;
  uniqueUsers: number;
  users24h: number;
  tvl: number;
  vaultTvl: number;
  activeBetsTvl: number;
}

export async function getProtocolStats() {
  return apiFetch<ProtocolStats>('/api/stats');
}

// --- Health ---
export async function healthCheck() {
  return apiFetch<{ status: string; ts: number; markets: number }>('/api/health');
}

// --- Vault ---
import type { VaultInfo, VaultUserInfo, VaultRewardEntry, VaultVesting, TopPredictor, PnlData } from '../types';

export async function getVaultInfo() {
  return apiFetch<VaultInfo>('/api/vault/info');
}

export async function getVaultUser(address: string) {
  return apiFetch<VaultUserInfo>(`/api/vault/user/${address}`);
}

export async function stakeVault(address: string, amount: number, txHash: string) {
  return apiFetch<{ success: boolean; newStaked: number; newBalance: number }>('/api/vault/stake', {
    method: 'POST',
    body: JSON.stringify({ address, amount, txHash }),
  });
}

export async function unstakeVault(address: string, amount: number, txHash: string) {
  return apiFetch<{ success: boolean; newStaked: number; newBalance: number }>('/api/vault/unstake', {
    method: 'POST',
    body: JSON.stringify({ address, amount, txHash }),
  });
}

export async function claimVaultRewards(address: string, txHash: string) {
  return apiFetch<{ success: boolean; claimed: number; newBalance: number }>('/api/vault/claim', {
    method: 'POST',
    body: JSON.stringify({ address, txHash }),
  });
}

export async function setAutoCompound(address: string, enabled: boolean) {
  return apiFetch<{ success: boolean }>('/api/vault/autocompound', {
    method: 'POST',
    body: JSON.stringify({ address, enabled }),
  });
}

export async function getVaultHistory() {
  return apiFetch<VaultRewardEntry[]>('/api/vault/history');
}

export async function getVaultVesting(address: string) {
  return apiFetch<VaultVesting[]>(`/api/vault/vesting/${address}`);
}

// --- Social ---
export async function followUser(follower: string, following: string) {
  return apiFetch<{ success: boolean }>('/api/social/follow', {
    method: 'POST',
    body: JSON.stringify({ follower, following }),
  });
}

export async function unfollowUser(follower: string, following: string) {
  return apiFetch<{ success: boolean }>('/api/social/unfollow', {
    method: 'POST',
    body: JSON.stringify({ follower, following }),
  });
}

export async function getFollowing(address: string) {
  return apiFetch<string[]>(`/api/social/following/${address}`);
}

export async function getTopPredictors() {
  return apiFetch<TopPredictor[]>('/api/social/top-predictors');
}

// --- Portfolio PnL ---
export async function getPortfolioPnl(address: string) {
  return apiFetch<PnlData>(`/api/portfolio/pnl/${address}`);
}
