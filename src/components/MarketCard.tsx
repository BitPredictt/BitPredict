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
  const daysLeft = Math.max(0, Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000));

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
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
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <Clock size={10} />
          <span>{daysLeft}d left</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-sm font-bold text-white leading-snug mb-4 group-hover:text-btc-light transition-colors">
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
            <span>{formatVolume(market.volume)} vol</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Droplets size={10} />
            <span>{formatVolume(market.liquidity)}</span>
          </div>
        </div>
        <ChevronRight size={14} className="text-gray-600 group-hover:text-btc transition-colors" />
      </div>
    </div>
  );
}
