/**
 * BitPredict Server API Client
 * All balances, bets, and market data stored on the server.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'https://polyfantasy.xyz/bpapi';

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`API error ${res.status}: server returned non-JSON response`);
  }
  if (!res.ok) throw new Error((data.error as string) || `API error ${res.status}`);
  return data as T;
}

// --- Auth / Balance ---
export async function authUser(address: string, referrer?: string) {
  return apiFetch<{ address: string; balance: number; btcBalance: number; referrer: string | null }>('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ address, referrer }),
  });
}

export async function getBalance(address: string) {
  return apiFetch<{ balance: number; btcBalance: number }>(`/api/balance/${address}`);
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
  onchainId?: number | null;
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
  currency?: 'btc' | 'bpusd';
}

export interface PlaceBetResult {
  success: boolean;
  betId: string;
  shares: number;
  fee: number;
  newBalance: number;
  newBtcBalance: number;
  newYesPrice: number;
  newNoPrice: number;
  txHash?: string;
}

export async function placeBet(address: string, marketId: string, side: 'yes' | 'no', amount: number, currency: 'btc' | 'bpusd' = 'bpusd') {
  return apiFetch<PlaceBetResult>('/api/bet', {
    method: 'POST',
    body: JSON.stringify({ address, marketId, side, amount, currency }),
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
  return apiFetch<{ success: boolean; payout: number; newBalance: number; newBtcBalance: number; txHash: string }>('/api/claim', {
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
  newBtcBalance: number;
  newYesPrice: number;
  newNoPrice: number;
}

export async function placeOnChainBet(address: string, marketId: string, side: 'yes' | 'no', amount: number, txHash: string, currency: 'btc' | 'bpusd' = 'bpusd') {
  return apiFetch<OnChainBetResult>('/api/bet/onchain', {
    method: 'POST',
    body: JSON.stringify({ address, marketId, side, amount, txHash, currency }),
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

// --- Sell Shares ---
export interface SellResult {
  success: boolean;
  payout: number;
  fee: number;
  sharesSold: number;
  remainingShares: number;
  newBalance: number;
  newBtcBalance: number;
  newYesPrice: number;
  newNoPrice: number;
}

export async function sellShares(address: string, betId: string, sharesToSell?: number) {
  return apiFetch<SellResult>('/api/bet/sell', {
    method: 'POST',
    body: JSON.stringify({ address, betId, sharesToSell }),
  });
}

// --- BTC Faucet ---
export async function claimBtcFaucet(address: string) {
  return apiFetch<{ success: boolean; claimed: number; newBalance: number; newBtcBalance: number; message: string }>('/api/faucet/btc', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });
}

// --- User Market Creation ---
export async function createMarket(address: string, question: string, endTime: number, category?: string, initialLiquidity?: number, tags?: string[]) {
  return apiFetch<{ success: boolean; marketId: string; newBalance: number }>('/api/markets/create', {
    method: 'POST',
    body: JSON.stringify({ address, question, category, endTime, initialLiquidity, tags }),
  });
}

// --- Comments ---
export interface Comment {
  id: number;
  market_id: string;
  address: string;
  text: string;
  created_at: number;
}

export async function getComments(marketId: string) {
  return apiFetch<Comment[]>(`/api/comments/${marketId}`);
}

export async function postComment(address: string, marketId: string, text: string) {
  return apiFetch<Comment>('/api/comments', {
    method: 'POST',
    body: JSON.stringify({ address, marketId, text }),
  });
}

// --- Activity Feed ---
export interface ActivityItem {
  id: number | string;
  type: 'bet' | 'comment';
  address: string;
  timestamp: number;
  side?: string;
  amount?: number;
  shares?: number;
  text?: string;
}

export async function getMarketActivity(marketId: string) {
  return apiFetch<ActivityItem[]>(`/api/markets/${marketId}/activity`);
}

// --- Market Price History ---
export interface MarketPricePoint {
  yes_price: number;
  no_price: number;
  volume: number;
  timestamp: number;
}

export async function getMarketPriceHistory(marketId: string) {
  return apiFetch<MarketPricePoint[]>(`/api/markets/${marketId}/price-history`);
}

// --- Referral ---
export async function setReferral(address: string, referrer: string) {
  return apiFetch<{ success: boolean }>('/api/referral', {
    method: 'POST',
    body: JSON.stringify({ address, referrer }),
  });
}

export async function getReferralStats(address: string) {
  return apiFetch<{ referralCount: number; totalEarned: number }>(`/api/referral/stats/${address}`);
}

// --- Portfolio Metrics ---
export interface PortfolioMetrics {
  winRate: number;
  totalBets: number;
  resolvedBets: number;
  avgBet: number;
  biggestWin: number;
  biggestLoss: number;
  maxDrawdown: number;
  profitFactor: number;
  currentStreak: number;
  bestStreak: number;
  predictionScore: number;
  roi: number;
  totalInvested: number;
  totalReturn: number;
}

export async function getPortfolioMetrics(address: string) {
  return apiFetch<PortfolioMetrics>(`/api/portfolio/metrics/${address}`);
}

// --- Notifications ---
export interface Notification {
  id: number;
  address: string;
  type: string;
  title: string;
  body: string;
  market_id: string | null;
  read: number;
  created_at: number;
}

export async function getNotifications(address: string) {
  return apiFetch<{ notifications: Notification[]; unreadCount: number }>(`/api/notifications/${address}`);
}

export async function markNotificationsRead(address: string, notificationId?: number) {
  return apiFetch<{ success: boolean }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify({ address, notificationId }),
  });
}
