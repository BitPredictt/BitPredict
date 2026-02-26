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
  status: 'active' | 'won' | 'lost' | 'cancelled';
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

// --- Health ---
export async function healthCheck() {
  return apiFetch<{ status: string; ts: number; markets: number }>('/api/health');
}
