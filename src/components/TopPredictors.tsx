import { useState, useEffect } from 'react';
import { Trophy, UserPlus, UserCheck, TrendingUp, TrendingDown } from 'lucide-react';
import * as api from '../lib/api';
import type { TopPredictor } from '../types';
import { truncateAddress } from '../lib/opnet';

interface TopPredictorsProps {
  walletAddress: string;
}

export function TopPredictors({ walletAddress }: TopPredictorsProps) {
  const [predictors, setPredictors] = useState<TopPredictor[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTopPredictors().catch(() => []),
      walletAddress ? api.getFollowing(walletAddress).catch(() => []) : Promise.resolve([]),
    ]).then(([preds, follows]) => {
      setPredictors(preds);
      setFollowing(new Set(follows));
      setLoading(false);
    });
  }, [walletAddress]);

  const handleFollow = async (addr: string) => {
    if (!walletAddress) return;
    if (following.has(addr)) {
      await api.unfollowUser(walletAddress, addr).catch(() => {});
      setFollowing(prev => { const n = new Set(prev); n.delete(addr); return n; });
    } else {
      await api.followUser(walletAddress, addr).catch(() => {});
      setFollowing(prev => new Set(prev).add(addr));
    }
  };

  if (loading) {
    return (
      <div className="vault-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-btc" />
          <h3 className="text-sm font-bold text-white">Top Predictors</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-3 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="vault-card rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-btc" />
        <h3 className="text-sm font-bold text-white">Top Predictors</h3>
        <span className="text-[10px] text-gray-500 ml-auto">By PnL</span>
      </div>

      {predictors.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">No predictors yet</p>
      ) : (
        <div className="space-y-2">
          {predictors.slice(0, 10).map((p) => {
            const isMe = p.address === walletAddress;
            const isFollowed = following.has(p.address);
            return (
              <div
                key={p.address}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                  isMe ? 'bg-btc/10 border border-btc/20' : 'bg-surface-2/50 hover:bg-surface-3/50'
                }`}
              >
                <span className={`text-xs font-black w-6 text-center ${
                  p.rank <= 3 ? 'text-btc' : 'text-gray-500'
                }`}>
                  {p.rank <= 3 ? ['', '1st', '2nd', '3rd'][p.rank] : `#${p.rank}`}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {isMe ? 'You' : truncateAddress(p.address, 6)}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-gray-500">{p.totalBets} bets</span>
                    <span className="text-[9px] text-gray-500">{p.winRate}% win</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {p.pnl >= 0 ? (
                    <TrendingUp size={12} className="text-green-400" />
                  ) : (
                    <TrendingDown size={12} className="text-red-400" />
                  )}
                  <span className={`text-xs font-black ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {p.pnl >= 0 ? '+' : ''}{p.pnl.toLocaleString()}
                  </span>
                </div>

                {!isMe && walletAddress && (
                  <button
                    onClick={() => handleFollow(p.address)}
                    className={`p-1.5 rounded-lg transition-all ${
                      isFollowed
                        ? 'bg-btc/20 text-btc'
                        : 'bg-surface-3 text-gray-500 hover:text-white'
                    }`}
                    title={isFollowed ? 'Unfollow' : 'Follow'}
                  >
                    {isFollowed ? <UserCheck size={12} /> : <UserPlus size={12} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
