import { Trophy, TrendingUp, TrendingDown, Medal, Flame, Target } from 'lucide-react';
import type { LeaderboardEntry } from '../types';

interface ExtendedEntry extends LeaderboardEntry {
  totalBets: number;
  losses: number;
  winRate: number;
  streak: number;
  level: number;
}

const MOCK_LEADERBOARD: ExtendedEntry[] = [
  { rank: 1, address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080', nickname: 'SatoshiWhale', volume: 2450000, wins: 47, pnl: 890000, totalBets: 62, losses: 15, winRate: 75.8, streak: 8, level: 12 },
  { rank: 2, address: 'bcrt1qrp33g0q5b5698ahp5jnf5yzjmgcek7x2jg90dn', nickname: 'BTCOracle', volume: 1870000, wins: 38, pnl: 620000, totalBets: 51, losses: 13, winRate: 74.5, streak: 5, level: 10 },
  { rank: 3, address: 'bcrt1q0sq6agfcq0hv9av1fz6nerz00eqqxpzf6c8qkd', nickname: 'VibePredictor', volume: 1340000, wins: 31, pnl: 410000, totalBets: 45, losses: 14, winRate: 68.9, streak: 3, level: 9 },
  { rank: 4, address: 'bcrt1qm34lsc65zpw79lxes69zkqmk6ee3ewf0csmhtg', nickname: 'MoonHunter', volume: 980000, wins: 25, pnl: 280000, totalBets: 38, losses: 13, winRate: 65.8, streak: 4, level: 8 },
  { rank: 5, address: 'bcrt1qw2c3lxufxqe536nx4y4gzfg69azy2ce2pqscdu', nickname: 'CryptoSage', volume: 760000, wins: 22, pnl: 195000, totalBets: 35, losses: 13, winRate: 62.9, streak: 2, level: 7 },
  { rank: 6, address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8z4x0qmv', nickname: 'BitNinja', volume: 540000, wins: 18, pnl: 120000, totalBets: 30, losses: 12, winRate: 60.0, streak: 1, level: 6 },
  { rank: 7, address: 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusd0rkg7wnt2fk', nickname: 'OPNetter', volume: 420000, wins: 15, pnl: 88000, totalBets: 27, losses: 12, winRate: 55.6, streak: 3, level: 5 },
  { rank: 8, address: 'bcrt1qd6h6vp99qwstk3z668md42q0zc44vpwknhspk5', nickname: 'AlphaTrader', volume: 310000, wins: 12, pnl: 65000, totalBets: 22, losses: 10, winRate: 54.5, streak: 1, level: 4 },
  { rank: 9, address: 'bcrt1qf7936mqy2lzl23e4m7p9qs4p4kfm8c7s6kv4nz', nickname: 'DeFiDegen', volume: 245000, wins: 10, pnl: 42000, totalBets: 19, losses: 9, winRate: 52.6, streak: 0, level: 3 },
  { rank: 10, address: 'bcrt1qa2ew5j0dqqkr2g3zfvwql7mn69dexqk6n0s5qp', nickname: 'Predictor99', volume: 180000, wins: 8, pnl: 28000, totalBets: 16, losses: 8, winRate: 50.0, streak: 2, level: 3 },
];

interface LeaderboardProps {
  userAddress?: string;
}

export function Leaderboard({ userAddress }: LeaderboardProps) {
  const entries = MOCK_LEADERBOARD.map((e) => ({
    ...e,
    isUser: userAddress ? e.address === userAddress : false,
  }));

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return String(v);
  };

  const rankBg = (rank: number) => {
    if (rank === 1) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (rank === 2) return 'bg-gray-400/20 text-gray-300 border-gray-400/30';
    if (rank === 3) return 'bg-orange-600/20 text-orange-400 border-orange-600/30';
    return 'bg-surface-3 text-gray-500 border-white/5';
  };

  // Totals for header stats
  const totalVolume = entries.reduce((s, e) => s + e.volume, 0);
  const totalBets = entries.reduce((s, e) => s + e.totalBets, 0);
  const avgWinRate = entries.reduce((s, e) => s + e.winRate, 0) / entries.length;

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
          <Trophy size={32} className="text-yellow-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Leaderboard</h2>
        <p className="text-xs text-gray-500 mt-1">Top predictors on OP_NET Regtest</p>
      </div>

      {/* Global stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-sm font-black text-btc">{formatVolume(totalVolume)}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Total Volume</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-sm font-black text-white">{totalBets}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Total Bets</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-sm font-black text-green-400">{avgWinRate.toFixed(1)}%</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Avg Win Rate</div>
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3">
        {[entries[1], entries[0], entries[2]].map((e, i) => {
          const positions = [2, 1, 3];
          const pos = positions[i];
          return (
            <div
              key={e.address}
              className={`text-center p-4 rounded-2xl border glass-card ${pos === 1 ? 'scale-105 border-yellow-500/20' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 border ${rankBg(pos)}`}>
                {pos === 1 ? <Medal size={18} /> : <span className="font-black text-sm">{pos}</span>}
              </div>
              <div className="text-xs font-bold text-white truncate">{e.nickname}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Lv.{e.level}</div>
              <div className="text-[10px] text-green-400 mt-0.5">{e.winRate}% win</div>
              <div className="text-xs font-bold text-btc mt-1">{formatVolume(e.volume)} sats</div>
              {e.streak >= 3 && (
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <Flame size={10} className="text-orange-400" />
                  <span className="text-[9px] text-orange-400 font-bold">{e.streak} streak</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full list */}
      <div className="space-y-2">
        {entries.map((e) => (
          <div
            key={e.address}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              e.isUser
                ? 'bg-btc/10 border-btc/30'
                : 'bg-surface-2/50 border-white/5 hover:border-white/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${rankBg(e.rank)}`}>
              {e.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold truncate ${e.isUser ? 'text-btc' : 'text-white'}`}>
                  {e.nickname} {e.isUser && '(You)'}
                </span>
                <span className="text-[9px] bg-surface-3 text-gray-500 px-1.5 py-0.5 rounded-full font-bold shrink-0">Lv.{e.level}</span>
                {e.streak >= 3 && <Flame size={10} className="text-orange-400 shrink-0" />}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] text-gray-500 font-mono truncate">{e.address.slice(0, 8)}...{e.address.slice(-4)}</span>
                <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                  <Target size={8} />
                  {e.wins}W / {e.losses}L
                </span>
                <span className="text-[10px] text-green-400 font-bold">{e.winRate}%</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-white">{formatVolume(e.volume)} sats</div>
              <div className="flex items-center gap-1 justify-end text-[10px]">
                {e.pnl >= 0 ? (
                  <><TrendingUp size={10} className="text-green-400" /><span className="text-green-400 font-bold">+{formatVolume(e.pnl)}</span></>
                ) : (
                  <><TrendingDown size={10} className="text-red-400" /><span className="text-red-400 font-bold">{formatVolume(e.pnl)}</span></>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
