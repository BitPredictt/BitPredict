export interface Market {
  id: string;
  question: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  liquidity: number;
  endDate: string;
  resolved: boolean;
  outcome?: 'yes' | 'no';
  imageUrl?: string;
  tags: string[];
}

export interface Bet {
  id: string;
  marketId: string;
  side: 'yes' | 'no';
  amount: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'won' | 'lost' | 'active';
}

export interface WalletState {
  connected: boolean;
  address: string;
  balanceSats: number;
  network: 'testnet' | 'mainnet';
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

export type Tab = 'markets' | 'portfolio' | 'leaderboard' | 'ai';
export type CategoryFilter = 'All' | 'Crypto' | 'Politics' | 'Sports' | 'Tech' | 'Culture';
