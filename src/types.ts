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
  outcomes?: MarketOutcome[];
}

export interface Bet {
  id: string;
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'won' | 'lost' | 'active' | 'claimable';
  txHash?: string;
  blockHeight?: number;
  payout?: number;
  shares?: number;
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

export type Tab = 'markets' | 'portfolio' | 'leaderboard' | 'ai' | 'achievements';
export type CategoryFilter = 'All' | 'Fast Bets' | 'Crypto' | 'Politics' | 'Sports' | 'Tech' | 'Culture';
