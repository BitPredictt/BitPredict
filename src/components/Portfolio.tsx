import { useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, BarChart3, Target, PieChart, ExternalLink, Coins, Loader2, Gift } from 'lucide-react';
import type { Bet, Market } from '../types';
import { getExplorerTxUrl, mintTokensOnChain, signClaimProof, OPNET_CONFIG } from '../lib/opnet';
import * as api from '../lib/api';

interface PortfolioProps {
  bets: Bet[];
  markets: Market[];
  predBalance: number;
  walletConnected: boolean;
  walletAddress: string;
  onConnect: () => void;
  onBalanceUpdate: (balance: number) => void;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown; // Address object from walletconnect
}

export function Portfolio({ bets, markets, predBalance, walletConnected, walletAddress, onConnect, onBalanceUpdate, walletProvider, walletNetwork, walletAddressObj }: PortfolioProps) {
  const [minting, setMinting] = useState(false);
  const [mintMsg, setMintMsg] = useState<{ text: string; type: 'success' | 'error'; txHash?: string } | null>(null);
  const [claimingBetId, setClaimingBetId] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ text: string; type: 'success' | 'error'; txHash?: string } | null>(null);

  const handleMint = async () => {
    if (minting || !walletAddress) return;
    setMinting(true);
    setMintMsg(null);
    try {
      setMintMsg({ text: `Minting ${OPNET_CONFIG.mintAmount.toLocaleString()} ${OPNET_CONFIG.tokenSymbol}... (sign in OP_WALLET)`, type: 'success' });
      const result = await mintTokensOnChain(walletProvider, walletNetwork, walletAddressObj, walletAddress);
      if (result.success) {
        setMintMsg({
          text: `+${OPNET_CONFIG.mintAmount.toLocaleString()} ${OPNET_CONFIG.tokenSymbol} minted on-chain!`,
          type: 'success',
          txHash: result.txHash,
        });
      } else {
        setMintMsg({ text: result.error || 'Mint failed', type: 'error' });
      }
    } catch (err) {
      setMintMsg({ text: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally {
      setMinting(false);
    }
  };

  const handleClaim = async (betId: string) => {
    if (claimingBetId || !walletAddress) return;
    setClaimingBetId(betId);
    setClaimMsg(null);
    try {
      setClaimMsg({ text: 'Sign claim TX in OP_WALLET...', type: 'success' });
      const proof = await signClaimProof(walletProvider, walletNetwork, walletAddressObj, walletAddress);
      if (!proof.success) throw new Error(proof.error || 'Claim TX failed');
      const result = await api.claimPayout(walletAddress, betId, proof.txHash);
      onBalanceUpdate(result.newBalance);
      setClaimMsg({ text: `+${result.payout.toLocaleString()} ${OPNET_CONFIG.tokenSymbol} claimed!`, type: 'success', txHash: proof.txHash });
    } catch (err) {
      setClaimMsg({ text: err instanceof Error ? err.message : String(err), type: 'error' });
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
          <span className="text-lg font-black text-btc">{predBalance.toLocaleString()} {OPNET_CONFIG.tokenSymbol}</span>
        </div>
        <button
          onClick={handleMint}
          disabled={minting}
          className="mt-3 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-btc/20 border border-purple-500/30 text-sm font-bold text-white hover:border-btc/40 transition-all disabled:opacity-50"
        >
          {minting ? <Loader2 size={16} className="animate-spin" /> : <Coins size={16} className="text-purple-400" />}
          {minting ? 'Minting...' : `Mint ${OPNET_CONFIG.mintAmount.toLocaleString()} ${OPNET_CONFIG.tokenSymbol} (On-Chain)`}
        </button>
        <p className="text-[10px] text-gray-600 mt-1">Real on-chain mint via OP_WALLET — requires testnet BTC for gas</p>
        {mintMsg && (
          <div className={`text-xs mt-2 text-center font-bold ${mintMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            <span>{mintMsg.text}</span>
            {mintMsg.txHash && (
              <a
                href={getExplorerTxUrl(mintMsg.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-1 text-btc hover:underline"
              >
                <ExternalLink size={10} />
                View TX
              </a>
            )}
          </div>
        )}
        {claimMsg && (
          <div className={`text-xs mt-2 text-center font-bold ${claimMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            <span>{claimMsg.text}</span>
            {claimMsg.txHash && (
              <a href={getExplorerTxUrl(claimMsg.txHash)} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-btc hover:underline">
                <ExternalLink size={10} /> View TX
              </a>
            )}
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
                        <span className="text-[10px] text-gray-500">{bet.amount.toLocaleString()} BPUSD @ {Math.round(bet.price * 100)}¢</span>
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
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <div className="flex items-center gap-1.5">
                        {statusIcon(bet.status)}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusColor(bet.status)}`}>
                          {bet.status === 'claimable' ? 'won' : bet.status}
                        </span>
                      </div>
                      {(bet.status === 'won' || bet.status === 'claimable') && (bet.payout ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-green-400">+{(bet.payout ?? 0).toLocaleString()}</span>
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
