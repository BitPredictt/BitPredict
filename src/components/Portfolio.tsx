import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, BarChart3, Target, PieChart, ExternalLink, Coins } from 'lucide-react';
import type { Bet, Market } from '../types';
import { getExplorerTxUrl } from '../lib/opnet';

interface PortfolioProps {
  bets: Bet[];
  markets: Market[];
  predBalance: number;
  walletConnected: boolean;
  onConnect: () => void;
}

export function Portfolio({ bets, markets, predBalance, walletConnected, onConnect }: PortfolioProps) {
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
  const getMarketQuestion = (marketId: string) => getMarket(marketId)?.question || 'Unknown Market';

  const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
  const activeBets = bets.filter((b) => b.status === 'active');
  const pendingBets = bets.filter((b) => b.status === 'pending');
  const wonBets = bets.filter((b) => b.status === 'won');
  const lostBets = bets.filter((b) => b.status === 'lost');
  const resolvedBets = [...wonBets, ...lostBets];

  // PnL calculation
  const wonAmount = wonBets.reduce((sum, b) => sum + Math.round(b.amount / b.price), 0);
  const lostAmount = lostBets.reduce((sum, b) => sum + b.amount, 0);
  const realizedPnl = wonAmount - lostAmount - wonBets.reduce((s, b) => s + b.amount, 0);
  const unrealizedPnl = activeBets.reduce((sum, b) => {
    const market = getMarket(b.marketId);
    if (!market) return sum;
    const currentPrice = b.side === 'yes' ? market.yesPrice : market.noPrice;
    return sum + Math.round(b.amount * (currentPrice / b.price - 1));
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
      case 'lost': return <XCircle size={12} className="text-red-400" />;
      default: return <Clock size={12} className="text-gray-500" />;
    }
  };

  const statusColor = (status: Bet['status']) => {
    switch (status) {
      case 'active': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'won': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'lost': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const formatSats = (v: number) => {
    if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(v);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-btc/20 to-purple-500/20 flex items-center justify-center mx-auto mb-3 border border-btc/20">
          <BarChart3 size={32} className="text-btc" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Portfolio</h2>
        <p className="text-xs text-gray-500 mt-1">Track your predictions on OP_NET Testnet</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Coins size={16} className="text-btc" />
          <span className="text-lg font-black text-btc">{predBalance.toLocaleString()} PRED</span>
        </div>
      </div>

      {/* PnL Banner */}
      <div className={`rounded-2xl p-5 border ${totalPnl >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total PnL</span>
          {totalPnl >= 0 ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
        </div>
        <div className={`text-2xl font-black ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {totalPnl >= 0 ? '+' : ''}{totalPnl.toLocaleString()} sats
        </div>
        <div className="flex gap-4 mt-2">
          <span className="text-[10px] text-gray-500">Realized: <span className={realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{realizedPnl >= 0 ? '+' : ''}{formatSats(realizedPnl)}</span></span>
          <span className="text-[10px] text-gray-500">Unrealized: <span className={unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}>{unrealizedPnl >= 0 ? '+' : ''}{formatSats(unrealizedPnl)}</span></span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-lg font-black text-btc">{bets.length}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Total Bets</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-lg font-black text-white">{formatSats(totalInvested)}</div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Invested</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="flex items-center justify-center gap-1">
            <Target size={14} className="text-green-400" />
            <span className="text-lg font-black text-green-400">{winRate.toFixed(0)}%</span>
          </div>
          <div className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Win Rate</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-3 border border-white/5 text-center">
          <div className="text-lg font-black text-white">{formatSats(avgBetSize)}</div>
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
            {Array.from(categoryMap.entries()).map(([cat, data]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-white w-16">{cat}</span>
                <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-btc-dark to-btc" style={{ width: `${(data.count / bets.length) * 100}%` }} />
                </div>
                <span className="text-[10px] text-gray-500 w-20 text-right">{data.count} bets · {formatSats(data.amount)}</span>
              </div>
            ))}
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
            <p className="text-xs text-gray-600 mt-1">Start predicting on the Markets tab!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => {
              const market = getMarket(bet.marketId);
              const currentPrice = market ? (bet.side === 'yes' ? market.yesPrice : market.noPrice) : bet.price;
              const priceDelta = ((currentPrice / bet.price) - 1) * 100;
              return (
                <div
                  key={bet.id}
                  className="bg-surface-2/50 rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white leading-snug truncate">
                        {getMarketQuestion(bet.marketId)}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          bet.side === 'yes' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'
                        }`}>
                          {bet.side}
                        </span>
                        <span className="text-[10px] text-gray-500">{bet.amount.toLocaleString()} PRED @ {Math.round(bet.price * 100)}¢</span>
                        {bet.status === 'active' && (
                          <span className={`text-[10px] font-bold ${priceDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {priceDelta >= 0 ? '+' : ''}{priceDelta.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-gray-600">{new Date(bet.timestamp).toLocaleDateString()}</span>
                        {bet.txHash && (
                          <a href={getExplorerTxUrl(bet.txHash)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[9px] text-btc hover:underline">
                            TX <ExternalLink size={7} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {statusIcon(bet.status)}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor(bet.status)}`}>
                        {bet.status}
                      </span>
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
