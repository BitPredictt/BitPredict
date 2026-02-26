import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Bet } from '../types';
import { MOCK_MARKETS } from '../data/markets';

interface PortfolioProps {
  bets: Bet[];
  walletConnected: boolean;
  onConnect: () => void;
}

export function Portfolio({ bets, walletConnected, onConnect }: PortfolioProps) {
  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center mb-4 border border-white/5">
          <Wallet size={32} className="text-gray-600" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-sm">
          Connect your OPWallet to view your predictions and track your performance.
        </p>
        <button onClick={onConnect} className="btc-btn flex items-center gap-2">
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

  const getMarketQuestion = (marketId: string) => {
    const market = MOCK_MARKETS.find((m) => m.id === marketId);
    return market?.question || 'Unknown Market';
  };

  const totalInvested = bets.reduce((sum, b) => sum + b.amount, 0);
  const activeBets = bets.filter((b) => b.status === 'active');
  const wonBets = bets.filter((b) => b.status === 'won');
  const lostBets = bets.filter((b) => b.status === 'lost');

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

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-white">My Predictions</h2>
        <p className="text-xs text-gray-500 mt-1">Track your bets on Bitcoin L1</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-2 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-lg font-black text-btc">{bets.length}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Total Bets</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-lg font-black text-green-400">{wonBets.length}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Won</div>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 border border-white/5 text-center">
          <div className="text-lg font-black text-white">{totalInvested.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Sats Wagered</div>
        </div>
      </div>

      {/* Bets list */}
      {bets.length === 0 ? (
        <div className="text-center py-12 bg-surface-2/50 rounded-2xl border border-white/5">
          <TrendingUp size={40} className="text-gray-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-400">No predictions yet</h3>
          <p className="text-xs text-gray-600 mt-1">Start predicting on the Markets tab!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bets.map((bet) => (
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
                    <span className="text-[10px] text-gray-500">{bet.amount.toLocaleString()} sats @ {Math.round(bet.price * 100)}¢</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
