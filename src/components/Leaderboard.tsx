import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, TrendingDown, Medal, Flame, Target, Loader2 } from 'lucide-react';
import * as api from '../lib/api';

interface LeaderEntry {
  rank: number;
  address: string;
  nickname: string;
  volume: number;
  wins: number;
  pnl: number;
  totalBets: number;
  losses: number;
  winRate: number;
  streak: number;
  level: number;
  isUser?: boolean;
}

interface LeaderboardProps {
  userAddress?: string;
}

export function Leaderboard({ userAddress }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard().then((data) => {
      const mapped: LeaderEntry[] = data.map((e, i) => ({
        rank: e.rank || i + 1,
        address: e.address,
        nickname: e.address.slice(0, 8) + '...',
        volume: e.volume || 0,
        wins: e.wins || 0,
        pnl: e.pnl || 0,
        totalBets: e.totalBets || 0,
        losses: Math.max(0, (e.totalBets || 0) - (e.wins || 0)),
        winRate: e.totalBets > 0 ? Math.round((e.wins / e.totalBets) * 1000) / 10 : 0,
        streak: 0,
        level: Math.max(1, Math.floor(Math.sqrt((e.totalBets || 0) + (e.wins || 0)))),
        isUser: userAddress ? e.address === userAddress : false,
      }));
      setEntries(mapped);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [userAddress]);

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

  const totalVolume = entries.reduce((s, e) => s + e.volume, 0);
  const totalBets = entries.reduce((s, e) => s + e.totalBets, 0);
  const avgWinRate = entries.length > 0 ? entries.reduce((s, e) => s + e.winRate, 0) / entries.length : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Loader2 size={24} className="animate-spin text-btc" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-20 animate-fade-in">
        <Trophy size={40} className="text-gray-700 mx-auto mb-3" />
        <h3 className="text-sm font-bold text-gray-400">No predictors yet</h3>
        <p className="text-xs text-gray-600 mt-1">Be the first to place a bet and claim the top spot!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-3 border border-yellow-500/20">
          <Trophy size={32} className="text-yellow-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Leaderboard</h2>
        <p className="text-xs text-gray-500 mt-1">Top predictors on OP_NET</p>
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
      {entries.length >= 3 && (
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
      )}

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
