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
};

export function MarketCard({ market, onSelect, index }: MarketCardProps) {
  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = 100 - yesPct;
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

  return (
    <div
      onClick={() => onSelect(market)}
      className="glass-card rounded-2xl p-5 cursor-pointer group animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Category badge */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${categoryColors[market.category] || 'bg-gray-500/15 text-gray-400 border-gray-500/20'}`}>
          {market.category}
        </span>
        <div className={`flex items-center gap-1 text-[10px] ${isEndingSoon ? 'text-red-400 font-bold' : 'text-gray-500'}`}>
          <Clock size={10} />
          <span>{formatTimeLeft()}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-sm font-bold text-white leading-snug mb-3 group-hover:text-btc-light transition-colors">
        {market.question}
      </h3>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between mb-1.5">
          <span className="text-xs font-bold text-green-400">Yes {yesPct}%</span>
          <span className="text-xs font-bold text-red-400">No {noPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden flex">
          <div
            className="progress-yes rounded-l-full transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="progress-no rounded-r-full transition-all duration-500"
            style={{ width: `${noPct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <TrendingUp size={10} />
            <span>{formatVolume(market.volume)} PUSD vol</span>
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
