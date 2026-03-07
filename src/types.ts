export interface MarketOutcome {
  marketId: string;
  label: string;
  price: number;
  volume: number;
}

export interface Market {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  endTime?: number;
  resolved: boolean;
  outcome?: 'yes' | 'no' | string | null;
  imageUrl?: string;
  tags: string[];
  marketType?: string;
  eventId?: string;
  yesPool?: number;
  noPool?: number;
  outcomes?: MarketOutcome[];
  oracleResolved?: boolean;
  onchainId?: number | null;
}

export interface Bet {
  id: string;
  marketId: string;
  question?: string;
  side: 'yes' | 'no';
  amount: number;
  netAmount?: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'won' | 'lost' | 'active' | 'claimable';
  txHash?: string;
  blockHeight?: number;
  payout?: number;
  potentialPayout?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'trading' | 'social' | 'explorer' | 'milestone';
  unlocked: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
  xpReward: number;
  rewardClaimed?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'onetime';
  completed: boolean;
  completedAt?: number;
  progress: number;
  maxProgress: number;
  xpReward: number;
  rewardClaimed?: boolean;
  action?: string;
}

export interface WalletState {
  connected: boolean;
  address: string;
  balanceSats: number;
  network: 'regtest' | 'testnet' | 'mainnet';
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  nickname: string;
  volume: number;
  wins: number;
  pnl: number;
  isUser?: boolean;
}

export type Tab = 'markets' | 'portfolio' | 'leaderboard' | 'ai' | 'achievements' | 'vault';
export type CategoryFilter = 'All' | 'Favorites' | 'Fast Bets' | 'Crypto' | 'Politics' | 'Sports' | 'Tech' | 'Culture';

// --- Vault types ---
export interface VaultInfo {
  totalStaked: number;
  totalRewards: number;
  apy: number;
  stakerCount: number;
  rewardsPerShare: number;
}

export interface VaultUserInfo {
  staked: number;
  pendingRewards: number;
  autoCompound: boolean;
  stakedAt?: number;
  lastClaim?: number;
}

export interface VaultRewardEntry {
  id: number;
  sourceMarketId: string;
  feeAmount: number;
  distributedAt: number;
  totalStakedAtTime: number;
}

export interface VaultVesting {
  id: number;
  totalAmount: number;
  claimedAmount: number;
  startTime: number;
  endTime: number;
  progress: number;
}

// --- Social types ---
export interface TopPredictor {
  rank: number;
  address: string;
  pnl: number;
  winRate: number;
  totalBets: number;
  isFollowed?: boolean;
}

// --- Treasury Deposit/Withdraw types ---
export interface TreasuryDeposit {
  id: number;
  address: string;
  tx_hash: string;
  amount_bpusd: number;
  status: 'pending' | 'confirmed';
  created_at: number;
  confirmed_at: number | null;
}

export interface WithdrawalRequest {
  id: number;
  address: string;
  amount_bpusd: number;
  fee_bpusd: number;
  nonce: string;
  signature: string;
  status: 'pending' | 'completed' | 'expired';
  tx_hash: string;
  created_at: number;
  expires_at: number;
  completed_at: number | null;
}

export interface DepositResult {
  success: boolean;
  status: string;
  amount: number;
  message: string;
}

export interface WithdrawResult {
  success: boolean;
  nonce: string;
  netAmount: number;
  fee: number;
  txHash?: string;
  status: string;
  message?: string;
}

// --- PnL types ---
export interface PnlData {
  cumulativePnl: number;
  winRate: number;
  roi: number;
  currentStreak: number;
  bestStreak: number;
  pnlSeries: { timestamp: number; pnl: number }[];
}
