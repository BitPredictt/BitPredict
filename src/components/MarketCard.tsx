import { Clock, TrendingUp, Droplets, ChevronRight, BrainCircuit } from 'lucide-react';
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

// Inline AI signal for each market
const AI_SIGNALS: Record<string, { signal: 'bullish' | 'bearish' | 'neutral'; confidence: number; hint: string }> = {
  'btc-100k-2026': { signal: 'bullish', confidence: 78, hint: 'Post-halving momentum + ETF inflows' },
  'eth-etf-spot': { signal: 'neutral', confidence: 55, hint: 'Moderate inflows, ambitious target' },
  'us-election-2026': { signal: 'neutral', confidence: 52, hint: 'Too early, mixed signals' },
  'opnet-adoption': { signal: 'bullish', confidence: 72, hint: 'Ecosystem growing rapidly' },
  'ai-agi-2027': { signal: 'bearish', confidence: 85, hint: 'Timeline too ambitious' },
  'champions-league': { signal: 'bearish', confidence: 60, hint: 'Strong competition' },
  'btc-dominance': { signal: 'bullish', confidence: 62, hint: 'Altcoin rotation slowing' },
  'mars-mission': { signal: 'bearish', confidence: 70, hint: 'Technical delays likely' },
  'nft-comeback': { signal: 'bearish', confidence: 75, hint: 'Market not recovering' },
  'fed-rate-cut': { signal: 'neutral', confidence: 48, hint: 'Depends on inflation data' },
  'solana-flip-eth': { signal: 'neutral', confidence: 50, hint: 'Both chains growing' },
  'world-cup-2026': { signal: 'bearish', confidence: 65, hint: 'Many strong competitors' },
};

export function MarketCard({ market, onSelect, index }: MarketCardProps) {
  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = 100 - yesPct;
  const daysLeft = Math.max(0, Math.ceil((new Date(market.endDate).getTime() - Date.now()) / 86400000));
  const ai = AI_SIGNALS[market.id];

  const formatVolume = (v: number) => {
    if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
    return `$${v}`;
  };

  const signalColor = ai?.signal === 'bullish' ? 'text-green-400' : ai?.signal === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const signalBg = ai?.signal === 'bullish' ? 'bg-green-500/10 border-green-500/20' : ai?.signal === 'bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';

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
      <h3 className="text-sm font-bold text-white leading-snug mb-3 group-hover:text-btc-light transition-colors">
        {market.question}
      </h3>

      {/* AI Signal inline */}
      {ai && (
        <div className={`flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg border ${signalBg}`}>
          <BrainCircuit size={12} className="text-purple-400" />
          <span className={`text-[10px] font-black uppercase ${signalColor}`}>{ai.signal}</span>
          <span className="text-[10px] text-gray-500">{ai.confidence}%</span>
          <span className="text-[10px] text-gray-500 truncate flex-1">{ai.hint}</span>
        </div>
      )}

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
