import { useState, useEffect } from 'react';
import { X, AlertCircle, Zap, Info, BrainCircuit, Loader2, MessageCircle, Send, TrendingUp } from 'lucide-react';
import type { Market, WalletState } from '../types';
import { formatSats, BET_FEE_PCT } from '../lib/opnet';
import * as api from '../lib/api';

interface BetModalProps {
  market: Market;
  wallet: WalletState;
  onChainBalance: number; // WBTC balance in sats
  onClose: () => void;
  onPlaceBet: (marketId: string, side: 'yes' | 'no', amount: number) => void;
}

// Bob AI signal cache
const signalCache = new Map<string, { signal: string; ts: number }>();
const SIGNAL_TTL = 300000; // 5 min

export function BetModal({ market, wallet, onChainBalance, onClose, onPlaceBet }: BetModalProps) {
  const isMultiOutcome = !!(market.outcomes && market.outcomes.length > 1);
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [selectedOutcome, setSelectedOutcome] = useState<number>(0);
  const [amount, setAmount] = useState('25000');
  const [placing, setPlacing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [bobSignal, setBobSignal] = useState<string | null>(null);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [activity, setActivity] = useState<api.ActivityItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [priceHistory, setPriceHistory] = useState<api.MarketPricePoint[]>([]);

  // For multi-outcome, the active market is the selected outcome's sub-market
  const activeMarketId = isMultiOutcome ? (market.outcomes![selectedOutcome]?.marketId || market.id) : market.id;

  // Fetch Bob AI signal when modal opens
  useEffect(() => {
    const cached = signalCache.get(market.id);
    if (cached && Date.now() - cached.ts < SIGNAL_TTL) {
      setBobSignal(cached.signal);
      return;
    }
    let cancelled = false;
    setLoadingSignal(true);
    api.aiSignal(market.id).then(({ signal }) => {
      if (!cancelled) {
        setBobSignal(signal);
        signalCache.set(market.id, { signal, ts: Date.now() });
      }
    }).catch(() => {
      signalCache.set(market.id, { signal: '', ts: Date.now() });
    }).finally(() => { if (!cancelled) setLoadingSignal(false); });
    return () => { cancelled = true; };
  }, [market.id]);

  // Fetch activity feed + price history
  useEffect(() => {
    api.getMarketActivity(market.id).then(setActivity).catch(() => {});
    api.getMarketPriceHistory(market.id).then(setPriceHistory).catch(() => {});
  }, [market.id]);

  const handlePostComment = async () => {
    if (!commentText.trim() || !wallet.connected || postingComment) return;
    setPostingComment(true);
    try {
      await api.postComment(wallet.address, market.id, commentText.trim());
      setCommentText('');
      api.getMarketActivity(market.id).then(setActivity).catch(() => {});
    } catch { /* */ }
    setPostingComment(false);
  };

  const getSignalType = (text: string | null): 'bullish' | 'bearish' | 'neutral' => {
    if (!text) return 'neutral';
    const lower = text.toLowerCase();
    if (lower.includes('buy yes') || lower.includes('best bet') || lower.includes('high confidence')) return 'bullish';
    if (lower.includes('buy no') || lower.includes('bearish') || lower.includes('sell')) return 'bearish';
    if (lower.includes('hold') || lower.includes('medium confidence')) return 'neutral';
    return 'neutral';
  };

  const signalType = getSignalType(bobSignal);
  const signalColor = signalType === 'bullish' ? 'text-green-400' : signalType === 'bearish' ? 'text-red-400' : 'text-yellow-400';
  const signalBg = signalType === 'bullish' ? 'bg-green-500/10 border-green-500/20' : signalType === 'bearish' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20';

  const amountNum = parseInt(amount) || 0;

  // Parimutuel calculations
  const yesPool = market.yesPool || 0;
  const noPool = market.noPool || 0;
  const totalPool = yesPool + noPool;
  const yesPct = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPct = 100 - yesPct;

  // Fee from bet amount
  const fee = Math.ceil(amountNum * BET_FEE_PCT);
  const netBet = amountNum - fee;

  // Potential payout at current odds (changes with every new bet)
  const currentSidePool = isMultiOutcome ? yesPool : (side === 'yes' ? yesPool : noPool);
  const newSidePool = currentSidePool + netBet;
  const newTotalPool = totalPool + netBet;
  const potentialPayout = newSidePool > 0 ? Math.floor((netBet / newSidePool) * newTotalPool) : 0;
  const potentialProfit = potentialPayout - amountNum;
  const multiplier = amountNum > 0 ? (potentialPayout / amountNum).toFixed(2) : '0.00';

  const isEmptyPool = totalPool === 0;
  const isOneSided = totalPool > 0 && (yesPool === 0 || noPool === 0);

  const activeBalance = Math.floor(onChainBalance);
  const insufficientBalance = amountNum > activeBalance;
  const MIN_BET = 10000;
  const canPlace = wallet.connected && amountNum >= MIN_BET && !placing && !insufficientBalance;

  const handlePlace = async () => {
    if (!canPlace) return;
    setPlacing(true);
    try {
      await onPlaceBet(activeMarketId, isMultiOutcome ? 'yes' : side, amountNum);
      onClose();
    } catch {
      // Error toast is shown by App.tsx — keep modal open so user can retry
    } finally {
      setPlacing(false);
    }
  };

  const presets = [10_000, 25_000, 50_000, 100_000];

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-auto bg-surface-1 border border-white/5 rounded-t-3xl sm:rounded-3xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/5 text-gray-500">
          <X size={18} />
        </button>

        {/* Header */}
        <div className="mb-5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-btc">{market.category}</span>
          <h3 className="text-base font-bold text-white mt-1 pr-8">{market.question}</h3>
        </div>

        {/* Bob AI Signal */}
        {(bobSignal || loadingSignal) && (
          <div className={`flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl border ${bobSignal ? signalBg : 'bg-purple-500/5 border-purple-500/10'}`}>
            {loadingSignal && !bobSignal ? (
              <>
                <Loader2 size={14} className="text-purple-400 animate-spin mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] text-gray-500 font-bold">Bob AI analyzing market...</span>
                </div>
              </>
            ) : bobSignal ? (
              <>
                <BrainCircuit size={14} className="text-purple-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-purple-400">Bob AI</span>
                    <span className={`text-[10px] font-black uppercase ${signalColor}`}>{signalType}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{bobSignal}</p>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Side / Outcome selection */}
        {isMultiOutcome ? (
          <div className="mb-5 space-y-2 max-h-[240px] overflow-y-auto pr-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Choose outcome</p>
            {market.outcomes!.map((o, i) => {
              const pct = Math.round(o.price * 100);
              const isSelected = selectedOutcome === i;
              const colors = ['border-green-500 bg-green-500/10', 'border-blue-500 bg-blue-500/10', 'border-purple-500 bg-purple-500/10', 'border-yellow-500 bg-yellow-500/10'];
              const textColors = ['text-green-400', 'text-blue-400', 'text-purple-400', 'text-yellow-400'];
              return (
                <button
                  key={o.marketId}
                  onClick={() => setSelectedOutcome(i)}
                  className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                    isSelected ? colors[i % colors.length] : 'border-white/5 bg-surface-2 hover:border-white/10'
                  }`}
                >
                  <span className={`text-sm font-bold truncate mr-2 ${isSelected ? textColors[i % textColors.length] : 'text-gray-400'}`}>{o.label}</span>
                  <span className={`text-sm font-black shrink-0 ${isSelected ? textColors[i % textColors.length] : 'text-gray-500'}`}>{pct}%</span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Current odds bar */}
            <div className="flex gap-2 mb-5">
              <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden flex">
                <div className="progress-yes rounded-l-full" style={{ width: `${yesPct}%` }} />
                <div className="progress-no rounded-r-full" style={{ width: `${noPct}%` }} />
              </div>
            </div>
            {/* Yes/No buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                onClick={() => setSide('yes')}
                className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-[1.03] active:scale-95 ${
                  side === 'yes'
                    ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/10'
                    : 'border-white/5 bg-surface-2 hover:border-white/10'
                }`}
              >
                <div className={`text-2xl font-black ${side === 'yes' ? 'text-green-400' : 'text-gray-500'}`}>YES</div>
                <div className="text-xs text-gray-400 mt-1">{yesPct}% odds</div>
              </button>
              <button
                onClick={() => setSide('no')}
                className={`p-4 rounded-xl border-2 transition-all text-center hover:scale-[1.03] active:scale-95 ${
                  side === 'no'
                    ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                    : 'border-white/5 bg-surface-2 hover:border-white/10'
                }`}
              >
                <div className={`text-2xl font-black ${side === 'no' ? 'text-red-400' : 'text-gray-500'}`}>NO</div>
                <div className="text-xs text-gray-400 mt-1">{noPct}% odds</div>
              </button>
            </div>
          </>
        )}

        {/* Amount */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 mb-2 block">
            Amount (sats) — Balance: {formatSats(activeBalance)}
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-surface-2 border border-white/5 rounded-xl px-4 py-3 text-white text-lg font-bold focus:border-btc/50 focus:outline-none transition-colors"
            placeholder="Enter amount in sats"
          />
          <div className="flex gap-2 mt-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  amount === String(p)
                    ? 'bg-btc/20 text-btc border border-btc/30 scale-105'
                    : 'bg-surface-2 text-gray-500 border border-white/5 hover:text-white hover:scale-105 hover:border-white/10 active:scale-95'
                }`}
              >
                {p >= 1_000_000 ? `${p / 1_000_000}M` : p >= 1000 ? `${p / 1000}K` : p}
              </button>
            ))}
          </div>
        </div>

        {/* Empty pool notice */}
        {isEmptyPool && amountNum > 0 && (
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mb-4">
            <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-300">Be the first! You're betting against future participants. Odds will update as others join.</p>
          </div>
        )}

        {/* One-sided pool notice */}
        {isOneSided && amountNum > 0 && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
            <Info size={16} className="text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">Pool is one-sided. If no one bets the other side by resolution, all bets are refunded (minus fee).</p>
          </div>
        )}

        {/* Summary */}
        {amountNum > 0 && (
          <div className="bg-surface-2 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Bet amount</span>
              <span className="text-white font-bold">{formatSats(amountNum)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Fee (3%)</span>
              <span className="text-gray-400 font-medium">-{formatSats(fee)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Net amount in pool</span>
              <span className="text-white font-bold">{formatSats(netBet)}</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/5 pt-1">
              <span className="text-gray-500">Potential payout</span>
              <span className="text-white font-bold">{formatSats(potentialPayout)} ({multiplier}x)</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/5 pt-2">
              <span className="text-gray-500">Potential profit</span>
              <span className={`font-bold ${potentialProfit > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {potentialProfit > 0 ? '+' : ''}{formatSats(potentialProfit)}
              </span>
            </div>

            {/* Parimutuel details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-btc transition-colors pt-1"
            >
              <Info size={10} />
              {showDetails ? 'Hide' : 'Show'} pool details
            </button>

            {showDetails && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">YES pool</span>
                  <span className="text-gray-400 font-medium">{formatSats(yesPool)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">NO pool</span>
                  <span className="text-gray-400 font-medium">{formatSats(noPool)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Total pool</span>
                  <span className="text-gray-400 font-medium">{formatSats(totalPool)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Model</span>
                  <span className="text-gray-400 font-medium">Parimutuel</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Settlement</span>
                  <span className="text-gray-400 font-medium">Bitcoin L1 (OP_NET)</span>
                </div>
                <p className="text-[9px] text-gray-600 pt-1">
                  Odds change with every new bet. Final payout depends on pool sizes at resolution.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Warning */}
        {!wallet.connected && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
            <AlertCircle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-400">Connect your wallet first to place predictions.</p>
          </div>
        )}

        {insufficientBalance && wallet.connected && amountNum > 0 && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">
              Insufficient balance: {formatSats(activeBalance)} (need {formatSats(amountNum)}).
              Get WBTC on <a href="https://motoswap.org" target="_blank" rel="noopener" className="underline">MotoSwap</a>.
            </p>
          </div>
        )}

        {/* Place button */}
        <button
          onClick={handlePlace}
          disabled={!canPlace}
          className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'yes'
              ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400'
              : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400'
          }`}
        >
          {placing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in OP_WALLET...
            </>
          ) : !wallet.connected ? (
            'Connect Wallet First'
          ) : amountNum < MIN_BET ? (
            `Minimum bet: ${formatSats(MIN_BET)}`
          ) : insufficientBalance ? (
            `Insufficient WBTC (${formatSats(activeBalance)})`
          ) : (
            <>
              <Zap size={16} />
              {isMultiOutcome
                ? `Bet on ${market.outcomes![selectedOutcome]?.label || 'outcome'} — ${formatSats(amountNum)}`
                : `Place ${side.toUpperCase()} — ${formatSats(amountNum)}`}
            </>
          )}
        </button>

        {/* Activity Feed Toggle */}
        <button
          onClick={() => setShowActivity(!showActivity)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-[11px] text-gray-500 hover:text-white transition-colors"
        >
          <MessageCircle size={12} />
          {showActivity ? 'Hide' : 'Show'} Activity & Comments ({activity.length})
        </button>

        {showActivity && (
          <div className="mt-2 border-t border-white/5 pt-3 space-y-2 max-h-48 overflow-y-auto">
            {/* Price chart mini */}
            {priceHistory.length > 1 && (
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={10} className="text-gray-500" />
                <div className="flex-1 flex items-end gap-px h-6">
                  {priceHistory.slice(-20).map((p, i) => (
                    <div key={i} className="flex-1 bg-green-500/30 rounded-t" style={{ height: `${Math.max(4, p.yes_price * 100)}%` }} />
                  ))}
                </div>
                <span className="text-[9px] text-gray-600">{priceHistory.length} trades</span>
              </div>
            )}

            {/* Comment input */}
            {wallet.connected && (
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                  placeholder="Add a comment..."
                  className="flex-1 bg-surface-2 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-btc/30 focus:outline-none"
                  maxLength={500}
                />
                <button
                  onClick={handlePostComment}
                  disabled={!commentText.trim() || postingComment}
                  className="px-3 py-1.5 rounded-lg bg-btc/20 text-btc text-xs font-bold hover:bg-btc/30 disabled:opacity-40 transition-all"
                >
                  <Send size={12} />
                </button>
              </div>
            )}

            {/* Activity items */}
            {activity.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-3">No activity yet — be the first!</p>
            ) : (
              activity.slice(0, 15).map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-start gap-2 py-1">
                  <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${item.type === 'bet' ? 'bg-btc' : 'bg-purple-400'}`} />
                  <div className="flex-1 min-w-0">
                    {item.type === 'bet' ? (
                      <span className="text-[10px] text-gray-400">
                        <span className="text-white font-bold">{item.address?.slice(0, 10)}...</span>
                        {' '}bet {item.amount ? formatSats(item.amount) : '?'} on <span className={item.side === 'yes' ? 'text-green-400' : 'text-red-400'}>{item.side?.toUpperCase()}</span>
                      </span>
                    ) : (
                      <div>
                        <span className="text-[10px] text-white font-bold">{item.address?.slice(0, 10)}...</span>
                        <p className="text-[10px] text-gray-400">{item.text}</p>
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-gray-600 shrink-0">
                    {new Date(item.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <p className="text-[10px] text-gray-600 text-center mt-3">
          Powered by OP_NET · Bitcoin Layer 1 · Parimutuel betting
        </p>
      </div>
    </div>
  );
}
