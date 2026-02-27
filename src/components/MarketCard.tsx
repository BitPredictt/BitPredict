import { useState, useEffect } from 'react';
import { Clock, TrendingUp, Droplets, ChevronRight, BrainCircuit, Loader2 } from 'lucide-react';
import type { Market } from '../types';
import * as api from '../lib/api';

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

// Cache Bob signals in memory
const signalCache = new Map<string, { signal: string; ts: number }>();
const SIGNAL_TTL = 300000; // 5 min cache

export function MarketCard({ market, onSelect, index }: MarketCardProps) {
  const [bobSignal, setBobSignal] = useState<string | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);

  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = 100 - yesPct;
  const endMs = market.endTime ? market.endTime * 1000 : new Date(market.endDate).getTime();
  const msLeft = Math.max(0, endMs - Date.now());
  const daysLeft = Math.ceil(msLeft / 86400000);
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minsLeft = Math.floor((msLeft % 3600000) / 60000);
  const isEndingSoon = msLeft > 0 && msLeft < 86400000;

  // Fetch Bob signal on mount (with cache, debounced)
  useEffect(() => {
    const cached = signalCache.get(market.id);
    if (cached && Date.now() - cached.ts < SIGNAL_TTL) {
      setBobSignal(cached.signal);
      return;
    }
    if (market.id.includes('-5min-')) return;

    let cancelled = false;
    // Stagger requests to avoid rate limits
    const delay = index * 800;
    const timer = setTimeout(() => {
      setLoadingSignal(true);
      api.aiSignal(market.id).then(({ signal }) => {
        if (!cancelled) {
          setBobSignal(signal);
          signalCache.set(market.id, { signal, ts: Date.now() });
        }
      }).catch(() => {
        // Cache empty on error to avoid retries
        signalCache.set(market.id, { signal: '', ts: Date.now() });
      }).finally(() => { if (!cancelled) setLoadingSignal(false); });
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [market.id, index]);

  // Parse signal direction from Bob's text
  const getSignalType = (text: string | null): 'bullish' | 'bearish' | 'neutral' => {
    if (!text) return 'neutral';
    const lower = text.toLowerCase();
    if (lower.includes('buy yes') || lower.includes('bullish') || lower.includes('high confidence')) return 'bullish';
    if (lower.includes('buy no') || lower.includes('bearish') || lower.includes('sell')) return 'bearish';
    return 'neutral';
  };

  const signalType = getSignalType(bobSignal);
  const signalColor = signalType === 'bullish' ? 'text-green-400' : signalType === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const signalBg = signalType === 'bullish' ? 'bg-green-500/10 border-green-500/20' : signalType === 'bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';

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
          <span>{isEndingSoon ? `${hoursLeft}h ${minsLeft}m` : `${daysLeft}d left`}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-sm font-bold text-white leading-snug mb-3 group-hover:text-btc-light transition-colors">
        {market.question}
      </h3>

      {/* Bob AI Signal */}
      {(bobSignal || loadingSignal) && (
        <div className={`flex items-center gap-2 mb-3 px-2.5 py-1.5 rounded-lg border ${bobSignal ? signalBg : 'bg-purple-500/5 border-purple-500/10'}`}>
          {loadingSignal && !bobSignal ? (
            <>
              <Loader2 size={11} className="text-purple-400 animate-spin" />
              <span className="text-[10px] text-gray-500">Bob analyzing...</span>
            </>
          ) : (
            <>
              <BrainCircuit size={12} className="text-purple-400 shrink-0" />
              <span className={`text-[10px] font-black uppercase ${signalColor} shrink-0`}>{signalType}</span>
              <span className="text-[10px] text-gray-400 truncate flex-1">{bobSignal}</span>
            </>
          )}
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
            <span>{formatVolume(market.volume)} PRED vol</span>
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
