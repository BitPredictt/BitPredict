import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, BarChart3, Target, PieChart, ExternalLink, Coins, Loader2, Gift, Flame, Percent } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Bet, Market, PnlData } from '../types';
import { getExplorerTxUrl, signClaimProof, OPNET_CONFIG, MIN_BTC_FOR_TX, satsToBtc, formatBtc } from '../lib/opnet';
import * as api from '../lib/api';

interface PortfolioProps {
  bets: Bet[];
  markets: Market[];
  onChainBalance: number;
  walletConnected: boolean;
  walletAddress: string;
  walletBtcBalance: number;
  onConnect: () => void;
  onBalanceRefresh: () => void;
  onBetsUpdate: (bets: Bet[]) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'loading', link?: string, linkLabel?: string) => void;
  trackOp: (type: string, txHash?: string, details?: string, marketId?: string) => Promise<number | null>;
  completeOp: (opId: number | null, status: 'confirmed' | 'failed', txHash?: string) => Promise<void>;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown;
}

export function Portfolio({ bets, markets, onChainBalance, walletConnected, walletAddress, walletBtcBalance, onConnect, onBalanceRefresh, onBetsUpdate, onToast, trackOp, completeOp, walletProvider, walletNetwork, walletAddressObj }: PortfolioProps) {
  const [claimingBetId, setClaimingBetId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<api.PortfolioMetrics | null>(null);
  const [pnlData, setPnlData] = useState<PnlData | null>(null);

  useEffect(() => {
    if (walletAddress) {
      api.getPortfolioPnl(walletAddress).then(setPnlData).catch(() => {});
      api.getPortfolioMetrics(walletAddress).then(setMetrics).catch(() => {});
    }
  }, [walletAddress, bets.length]);

  const handleClaim = async (betId: string) => {
    if (claimingBetId || !walletAddress) return;
    const bet = bets.find(b => b.id === betId);
    if (!bet || !bet.payout) return;
    setClaimingBetId(betId);
    let opId: number | null = null;
    try {
      opId = await trackOp('claim', undefined, `Claim ${formatBtc(bet.payout)} reward`, bet.marketId);
      onToast(`Claiming ${formatBtc(bet.payout)}... Sign in OP_WALLET`, 'loading');

      // Sign claim proof for server verification
      const r = await signClaimProof(walletProvider, walletNetwork, walletAddressObj, walletAddress, bet.payout);
      if (!r.success) throw new Error(r.error || 'Claim proof signing failed');

      const result = await api.claimPayout(walletAddress, betId, r.txHash);
      onBalanceRefresh();
      onToast(`+${formatBtc(result.payout)} claimed!`, 'success');
      completeOp(opId, 'confirmed', r.txHash);
    } catch (err) {
      onToast(err instanceof Error ? err.message : String(err), 'error');
      completeOp(opId, 'failed');
    } finally {
      setClaimingBetId(null);
    }
  };

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4 border border-white/5">
          <Wallet size={32} className="text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-sm">
          Connect your OP_WALLET to view your portfolio and track performance.
        </p>
        <button onClick={onConnect} className="btc-btn flex items-center gap-2">
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

  const getMarket = (marketId: string) => markets.find((m) => m.id === marketId);
  const getMarketQuestion = (marketId: string, bet?: Bet) => bet?.question || getMarket(marketId)?.question || 'Unknown Market';

  const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
  const activeBets = bets.filter((b) => b.status === 'active');
  const pendingBets = bets.filter((b) => b.status === 'pending');
  const wonBets = bets.filter((b) => b.status === 'won' || b.status === 'claimable');
  const lostBets = bets.filter((b) => b.status === 'lost');
  const resolvedBets = [...wonBets, ...lostBets];

  // PnL calculation — all in sats (WBTC)
  const wonAmt = wonBets.reduce((s, b) => s + (b.payout ?? 0), 0);
  const wonInv = wonBets.reduce((s, b) => s + b.amount, 0);
  const lostAmt = lostBets.reduce((s, b) => s + b.amount, 0);
  const realizedPnl = wonAmt - wonInv - lostAmt;
  const unrealizedPnl = activeBets.reduce((s, b) => {
    return s + ((b.potentialPayout ?? 0) - b.amount);
  }, 0);
  const totalPnl = realizedPnl + unrealizedPnl;

  const winRate = resolvedBets.length > 0 ? (wonBets.length / resolvedBets.length) * 100 : 0;
  const avgBetSize = bets.length > 0 ? Math.round(totalInvested / bets.length) : 0;

  // Category breakdown
  const categoryMap = new Map<string, { count: number; amount: number }>();
  bets.forEach((b) => {
    const cat = getMarket(b.marketId)?.category || 'Unknown';
    const existing = categoryMap.get(cat) || { count: 0, amount: 0 };
    categoryMap.set(cat, { count: existing.count + 1, amount: existing.amount + b.amount });
  });

  const statusIcon = (status: Bet['status']) => {
    switch (status) {
      case 'active': return <Clock size={12} className="text-blue-400" />;
      case 'won': return <CheckCircle2 size={12} className="text-green-400" />;
      case 'claimable': return <Gift size={12} className="text-yellow-400" />;
      case 'lost': return <XCircle size={12} className="text-red-400" />;
      default: return <Clock size={12} className="text-gray-500" />;
    }
  };

  const statusColor = (status: Bet['status']) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'won': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'claimable': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'lost': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const fmtBtc = (v: number) => formatBtc(Math.abs(v));

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-btc/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3 border border-btc/20">
          <BarChart3 size={32} className="text-btc" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Portfolio</h2>
        <p className="text-xs text-gray-500 mt-1">Track your predictions on OP_NET</p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <div className="flex items-center gap-1">
            <Coins size={14} className="text-btc" />
            <span className="text-sm font-black text-btc">{formatBtc(Math.floor(onChainBalance))}</span>
          </div>
          <span className="text-gray-600">|</span>
          <div className="flex items-center gap-1">
            <Coins size={14} className="text-orange-400" />
            <span className="text-sm font-black text-orange-400">{formatBtc(walletBtcBalance)} BTC</span>
          </div>
        </div>
        {walletBtcBalance > 0 && walletBtcBalance < MIN_BTC_FOR_TX && (
          <div className="mt-3 mx-auto max-w-sm p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 font-bold text-center">
            Low BTC balance: {satsToBtc(walletBtcBalance)} BTC — need at least {satsToBtc(MIN_BTC_FOR_TX)} BTC for on-chain TXs.
            {OPNET_CONFIG.network === 'testnet' && <a href={OPNET_CONFIG.faucetUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-btc underline">Get testnet BTC</a>}
          </div>
        )}
      </div>

      {/* PnL Banner */}
      <div className={`rounded-2xl p-5 border ${totalPnl >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total PnL</span>
          {totalPnl >= 0 ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
        </div>
        <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {totalPnl >= 0 ? '+' : '-'}{fmtBtc(totalPnl)}
        </div>
        <div className="flex gap-4 mt-2">
          <span className="text-[10px] text-gray-500">Realized: <span className={realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{realizedPnl >= 0 ? '+' : ''}{fmtBtc(realizedPnl)}</span></span>
          <span className="text-[10px] text-gray-500">Unrealized: <span className={unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{unrealizedPnl >= 0 ? '+' : ''}{fmtBtc(unrealizedPnl)}</span></span>
        </div>
      </div>

      {/* P&L Chart + Streak + ROI */}
      {pnlData && pnlData.pnlSeries.length > 1 && (
        <div className="bg-surface-2/50 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-btc" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cumulative P&L</h3>
            </div>
            <div className="flex items-center gap-3">
              {pnlData.currentStreak > 0 && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                  <Flame size={10} /> {pnlData.currentStreak} streak
                </span>
              )}
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                pnlData.roi >= 0 ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                <Percent size={10} /> ROI: {pnlData.roi > 0 ? '+' : ''}{pnlData.roi}%
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={pnlData.pnlSeries.map((p, i) => ({ name: `#${i + 1}`, pnl: p.pnl }))}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={pnlData.cumulativePnl >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={pnlData.cumulativePnl >= 0 ? '#22c55e' : '#ef4444'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#9ca3af' }}
                formatter={(v) => [formatBtc(Number(v)), 'P&L']}
              />
              <Area
                type="monotone"
                dataKey="pnl"
                stroke={pnlData.cumulativePnl >= 0 ? '#22c55e' : '#ef4444'}
                fill="url(#pnlGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
          {pnlData.bestStreak > 0 && (
            <div className="text-[9px] text-gray-600 text-center mt-1">Best streak: {pnlData.bestStreak} wins</div>
          )}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center stat-card-hover">
          <div className="text-lg font-black text-btc">{bets.length}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Total Bets</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center stat-card-hover">
          <div className="text-lg font-black text-white">{fmtBtc(totalInvested)}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Invested</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center stat-card-hover">
          <div className="flex items-center justify-center gap-1">
            <Target size={14} className="text-green-400" />
            <span className="text-lg font-black text-green-400">{winRate.toFixed(0)}%</span>
          </div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Win Rate</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center stat-card-hover">
          <div className="text-lg font-black text-white">{fmtBtc(avgBetSize)}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Avg Bet</div>
        </div>
      </div>

      {/* Win/Loss breakdown */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
          <div className="text-sm font-black text-blue-400">{activeBets.length}</div>
          <div className="text-[9px] text-gray-500 font-bold">Active</div>
        </div>
        <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 text-center">
          <div className="text-sm font-black text-gray-400">{pendingBets.length}</div>
          <div className="text-[9px] text-gray-500 font-bold">Pending</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-sm font-black text-green-400">{wonBets.length}</div>
          <div className="text-[9px] text-gray-500 font-bold">Won</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-sm font-black text-red-400">{lostBets.length}</div>
          <div className="text-[9px] text-gray-500 font-bold">Lost</div>
        </div>
      </div>

      {/* Category breakdown */}
      {categoryMap.size > 0 && (
        <div className="bg-surface-2/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <PieChart size={14} className="text-btc" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">By Category</h3>
          </div>
          <div className="space-y-2">
            {Array.from(categoryMap.entries()).map(([cat, data], i) => {
              const colors = ['from-btc to-orange-400', 'from-purple-500 to-purple-400', 'from-blue-500 to-blue-400', 'from-green-500 to-green-400', 'from-red-500 to-red-400', 'from-yellow-500 to-yellow-400'];
              const color = colors[i % colors.length];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-white w-16">{cat}</span>
                  <div className="flex-1 h-2.5 rounded-full bg-surface-3 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${Math.max(5, (data.count / bets.length) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500 w-24 text-right">{data.count} bets · {fmtBtc(data.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Metrics */}
      {metrics && metrics.totalBets > 0 && (
        <div className="bg-surface-2/50 rounded-xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-btc" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prediction Score</h3>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-2xl font-black ${metrics.predictionScore >= 70 ? 'text-green-400' : metrics.predictionScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                {metrics.predictionScore}
              </span>
              <span className="text-[10px] text-gray-500">/100</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{metrics.winRate}%</div>
              <div className="text-[9px] text-gray-500">Win Rate</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{metrics.profitFactor}x</div>
              <div className="text-[9px] text-gray-500">Profit Factor</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className={`text-sm font-bold ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>{metrics.roi > 0 ? '+' : ''}{metrics.roi}%</div>
              <div className="text-[9px] text-gray-500">ROI</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-orange-400">{metrics.bestStreak}</div>
              <div className="text-[9px] text-gray-500">Best Streak</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-red-400">{fmtBtc(metrics.maxDrawdown)}</div>
              <div className="text-[9px] text-gray-500">Max DD</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{fmtBtc(metrics.avgBet)}</div>
              <div className="text-[9px] text-gray-500">Avg Bet</div>
            </div>
          </div>
        </div>
      )}

      {/* Bets list */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Bet History</h3>
        {bets.length === 0 ? (
          <div className="text-center py-12 bg-surface-2/50 rounded-2xl border border-white/5">
            <TrendingUp size={40} className="text-gray-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-gray-400">No predictions yet</h3>
            <p className="text-xs text-gray-600 mt-1 mb-3">Place your first bet on a market to start earning.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => {
              const market = getMarket(bet.marketId);
              const currentPrice = market ? (bet.side === 'yes' ? market.yesPrice : market.noPrice) : bet.price;
              const priceDelta = bet.price > 0 ? ((currentPrice / bet.price) - 1) * 100 : 0;
              return (
                <div
                  key={bet.id}
                  className={`bg-surface-2/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all border-l-2 ${
                    bet.status === 'won' || bet.status === 'claimable' ? 'border-l-green-500' : bet.status === 'lost' ? 'border-l-red-500' : 'border-l-blue-500'
                  } hover:translate-x-0.5`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-snug truncate">
                        {getMarketQuestion(bet.marketId, bet)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          bet.side === 'yes' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          {bet.side}
                        </span>
                        <span className="text-[10px] text-gray-500">{bet.amount.toLocaleString()} sats @ {Math.round(bet.price * 100)}%</span>
                        {bet.status === 'active' && (
                          <span className={`text-[10px] font-bold ${priceDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-gray-600">{new Date(bet.timestamp < 1e12 ? bet.timestamp * 1000 : bet.timestamp).toLocaleDateString()}</span>
                        {bet.txHash && (
                          <a href={getExplorerTxUrl(bet.txHash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[9px] text-btc hover:underline">
                            TX <ExternalLink size={7} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(bet.status)}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor(bet.status)}`}>
                          {bet.status === 'claimable' ? 'Claim!' : bet.status}
                        </span>
                      </div>
                      {(bet.status === 'won' || bet.status === 'claimable') && (bet.payout ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-green-400">+{(bet.payout ?? 0).toLocaleString()} sats</span>
                      )}
                      {bet.status === 'claimable' && (bet.payout ?? 0) > 0 && (
                        <button
                          onClick={() => handleClaim(bet.id)}
                          disabled={!!claimingBetId}
                          className="mt-1 flex items-center gap-1 px-3 py-1 rounded-lg bg-gradient-to-r from-yellow-600/30 to-btc/30 border border-yellow-500/40 text-[10px] font-bold text-yellow-300 hover:border-yellow-400/60 transition-all disabled:opacity-50"
                        >
                          {claimingBetId === bet.id ? <Loader2 size={10} className="animate-spin" /> : <Gift size={10} />}
                          {claimingBetId === bet.id ? 'Claiming...' : 'Claim'}
                        </button>
                      )}
                      {bet.status === 'active' && (bet.potentialPayout ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-blue-400">
                          Potential: {(bet.potentialPayout ?? 0).toLocaleString()} sats
                        </span>
                      )}
                      {bet.status === 'won' && (bet.payout ?? 0) > 0 && (
                        <span className="text-[9px] text-green-500 font-bold flex items-center gap-0.5">
                          <CheckCircle2 size={9} /> Claimed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
