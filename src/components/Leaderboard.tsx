import { Trophy, TrendingUp, Medal } from 'lucide-react';
import type { LeaderboardEntry } from '../types';

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4', nickname: 'SatoshiWhale', volume: 2450000, wins: 47, pnl: 890000 },
  { rank: 2, address: 'bcrt1qrp33g0q5b5698ahp5jnf5yzjmgcek7x2z7y3a5', nickname: 'BTCOracle', volume: 1870000, wins: 38, pnl: 620000 },
  { rank: 3, address: 'bcrt1q0sq6agfcq0hv9av1fz6nerz00eqqxpzfhq9xkm', nickname: 'VibePredictor', volume: 1340000, wins: 31, pnl: 410000 },
  { rank: 4, address: 'bcrt1qm34lsc65zpw79lxes69zkqmk6ee3ewf0jn6v8r', nickname: 'MoonHunter', volume: 980000, wins: 25, pnl: 280000 },
  { rank: 5, address: 'bcrt1qw2c3lxufxqe536nx4y4gzfg69azy2ce2x8jqml', nickname: 'CryptoSage', volume: 760000, wins: 22, pnl: 195000 },
  { rank: 6, address: 'bcrt1qcr8te4kr609gcawutmrza0j4xv80jy8z7m5qwd', nickname: 'BitNinja', volume: 540000, wins: 18, pnl: 120000 },
  { rank: 7, address: 'bcrt1q6rz28mcfaxtmd6v789l9rrlrusd0rkg7tp2j5n', nickname: 'OPNetter', volume: 420000, wins: 15, pnl: 88000 },
  { rank: 8, address: 'bcrt1qd6h6vp99qwstk3z668md42q0zc44vpwk0rqm4j', nickname: 'AlphaTrader', volume: 310000, wins: 12, pnl: 65000 },
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

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
          <Trophy size={32} className="text-yellow-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Leaderboard</h2>
        <p className="text-xs text-gray-500 mt-1">Top predictors on Bitcoin L1</p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
              <div className="text-[10px] text-gray-500 mt-1">{e.wins} wins</div>
              <div className="text-xs font-bold text-btc mt-1">{formatVolume(e.volume)} sats</div>
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
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${rankBg(e.rank)}`}>
              {e.rank}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-bold truncate ${e.isUser ? 'text-btc' : 'text-white'}`}>
                {e.nickname} {e.isUser && '(You)'}
              </div>
              <div className="text-[10px] text-gray-500 font-mono truncate">{e.address}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-bold text-white">{formatVolume(e.volume)} sats</div>
              <div className="flex items-center gap-1 justify-end text-[10px] text-green-400">
                <TrendingUp size={10} />
                +{formatVolume(e.pnl)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
