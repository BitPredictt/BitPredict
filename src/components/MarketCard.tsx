import { useState, useEffect } from 'react';
import { Clock, TrendingUp, Droplets, ChevronRight } from 'lucide-react';
import type { Market } from '../types';

interface MarketCardProps {
  market: Market;
  onSelect: (market: Market) => void;
  index: number;
}

const categoryColors: Record<string, string> = {
  Crypto: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Politics: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Sports: 'bg-green-500/15 text-green-400 border-green-500/20',
  Tech: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Culture: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Fast Bets': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
};

export function MarketCard({ market, onSelect, index }: MarketCardProps) {
  const yesRaw = market.yesPrice * 100;
  const noRaw = market.noPrice * 100;
  const fmtPct = (v: number) => {
    if (v <= 0) return '0';
    if (v < 1) return v.toFixed(1);
    if (v > 99 && v < 100) return v.toFixed(1);
    return Math.round(v).toString();
  };
  const yesPct = fmtPct(yesRaw);
  const noPct = fmtPct(noRaw);
  const yesWidth = Math.max(0.5, Math.min(99.5, yesRaw));
  const noWidth = 100 - yesWidth;
  const endMs = market.endTime ? market.endTime * 1000 : new Date(market.endDate).getTime();

  const [now, setNow] = useState(Date.now());
  const msLeft = Math.max(0, endMs - now);
  const isEndingSoon = msLeft > 0 && msLeft < 86400000;
  const isUrgent = msLeft > 0 && msLeft < 120000; // < 2 min

  useEffect(() => {
    if (msLeft <= 0) return;
    const interval = setInterval(() => setNow(Date.now()), isUrgent ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [msLeft, isUrgent]);

  const formatTimeLeft = () => {
    if (msLeft <= 0) return 'Ended';
    const secs = Math.floor(msLeft / 1000);
    const mins = Math.floor(msLeft / 60000);
    const hrs = Math.floor(msLeft / 3600000);
    const days = Math.ceil(msLeft / 86400000);
    if (secs < 120) return `${secs}s`;
    if (mins < 60) return `${mins}m`;
    if (hrs < 24) return `${hrs}h ${Math.floor((msLeft % 3600000) / 60000)}m`;
    return `${days}d left`;
  };

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
    return `${v}`;
  };

  const isEnded = msLeft <= 0;
  const isResolved = market.resolved;

  return (
    <div
      onClick={() => !isResolved && onSelect(market)}
      className={`glass-card rounded-2xl p-5 group animate-fade-in ${isResolved ? 'opacity-60' : 'cursor-pointer'}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${market.marketType === 'price_5min' ? categoryColors['Fast Bets'] : (categoryColors[market.category] || 'bg-gray-500/15 text-gray-400 border-gray-500/20')}`}>
          {market.marketType === 'price_5min' ? '⚡ FAST' : market.category}
        </span>
        <div className={`flex items-center gap-1 text-[10px] ${isResolved ? 'text-purple-400 font-bold' : isEnded ? 'text-red-400 font-bold' : isEndingSoon ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
          <Clock size={10} />
          <span>{isResolved ? `Resolved: ${(market.outcome || '').toUpperCase()}` : formatTimeLeft()}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-sm font-bold text-white leading-snug mb-3 group-hover:text-btc-light transition-colors">
        {market.question}
      </h3>

      {/* Progress bar / Outcomes */}
      {market.outcomes && market.outcomes.length > 1 ? (
        <div className="mb-3 space-y-1.5">
          {market.outcomes.slice(0, 4).map((o, i) => {
            const pct = Math.round(o.price * 100);
            const barW = Math.max(2, Math.min(98, pct));
            const colors = ['text-green-400 bg-green-500/20', 'text-blue-400 bg-blue-500/20', 'text-purple-400 bg-purple-500/20', 'text-yellow-400 bg-yellow-500/20'];
            return (
              <div key={o.marketId || i} className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium truncate w-[45%]">{o.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div className={`h-full rounded-full ${colors[i % colors.length].split(' ')[1]}`} style={{ width: `${barW}%` }} />
                </div>
                <span className={`text-[10px] font-bold min-w-[32px] text-right ${colors[i % colors.length].split(' ')[0]}`}>{pct}%</span>
              </div>
            );
          })}
          {market.outcomes.length > 4 && (
            <span className="text-[9px] text-gray-600 font-medium">+{market.outcomes.length - 4} more outcomes</span>
          )}
        </div>
      ) : (
        <div className="mb-3">
          <div className="flex justify-between mb-1.5">
            <span className="text-xs font-bold text-green-400">Yes {yesPct}%</span>
            <span className="text-xs font-bold text-red-400">No {noPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden flex">
            <div
              className="progress-yes rounded-l-full transition-all duration-500"
              style={{ width: `${yesWidth}%` }}
            />
            <div
              className="progress-no rounded-r-full transition-all duration-500"
              style={{ width: `${noWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <TrendingUp size={10} />
            <span>{formatVolume(market.volume)} BPUSD vol</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Droplets size={10} />
            <span>{formatVolume(market.liquidity)} liq</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-btc transition-colors" />
      </div>
    </div>
  );
}
