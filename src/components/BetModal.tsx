import { useState, useMemo } from 'react';
import { X, TrendingUp, AlertCircle, Zap, ArrowRight, Shield, Info } from 'lucide-react';
import type { Market, WalletState } from '../types';
import { calculateShares } from '../lib/opnet';

interface BetModalProps {
  market: Market;
  wallet: WalletState;
  onClose: () => void;
  onPlaceBet: (marketId: string, side: 'yes' | 'no', amount: number) => void;
}

export function BetModal({ market, wallet, onClose, onPlaceBet }: BetModalProps) {
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('1000');
  const [placing, setPlacing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const amountNum = parseInt(amount) || 0;
  const yesPct = Math.round(market.yesPrice * 100);
  const noPct = 100 - yesPct;

  // Real AMM calculation using constant-product formula
  const ammResult = useMemo(() => {
    if (amountNum <= 0) return null;
    // Virtual reserves derived from market price (1M initial liquidity)
    const totalReserve = 1_000_000n;
    const yesReserve = BigInt(Math.round(Number(totalReserve) * (1 - market.yesPrice)));
    const noReserve = totalReserve - yesReserve;
    return calculateShares(BigInt(amountNum), side === 'yes', yesReserve, noReserve);
  }, [amountNum, side, market.yesPrice]);

  const price = side === 'yes' ? market.yesPrice : market.noPrice;
  const potentialPayout = amountNum > 0 ? Math.round(amountNum / price) : 0;
  const potentialProfit = potentialPayout - amountNum;
  const fee = Math.round(amountNum * 0.02); // 2% fee (200 bps)
  const priceImpact = ammResult
    ? Math.abs((side === 'yes' ? ammResult.newYesPrice : ammResult.newNoPrice) - price) / price * 100
    : 0;

  const handlePlace = async () => {
    if (amountNum <= 0 || !wallet.connected) return;
    setPlacing(true);
    await new Promise((r) => setTimeout(r, 1500));
    onPlaceBet(market.id, side, amountNum);
    setPlacing(false);
    onClose();
  };

  const presets = [500, 1000, 5000, 10000];

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

        {/* Current odds */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden flex">
            <div className="progress-yes rounded-l-full" style={{ width: `${yesPct}%` }} />
            <div className="progress-no rounded-r-full" style={{ width: `${noPct}%` }} />
          </div>
        </div>

        {/* Side selection */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setSide('yes')}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              side === 'yes'
                ? 'border-green-500 bg-green-500/10 shadow-lg shadow-green-500/10'
                : 'border-white/5 bg-surface-2 hover:border-white/10'
            }`}
          >
            <div className={`text-2xl font-black ${side === 'yes' ? 'text-green-400' : 'text-gray-500'}`}>YES</div>
            <div className="text-xs text-gray-400 mt-1">{yesPct}¢ per share</div>
          </button>
          <button
            onClick={() => setSide('no')}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              side === 'no'
                ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/10'
                : 'border-white/5 bg-surface-2 hover:border-white/10'
            }`}
          >
            <div className={`text-2xl font-black ${side === 'no' ? 'text-red-400' : 'text-gray-500'}`}>NO</div>
            <div className="text-xs text-gray-400 mt-1">{noPct}¢ per share</div>
          </button>
        </div>

        {/* Amount */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-gray-400 mb-2 block">Amount (sats)</label>
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
                    ? 'bg-btc/20 text-btc border border-btc/30'
                    : 'bg-surface-2 text-gray-500 border border-white/5 hover:text-white'
                }`}
              >
                {p >= 1000 ? `${p / 1000}K` : p}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {amountNum > 0 && (
          <div className="bg-surface-2 rounded-xl p-4 mb-5 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">You pay</span>
              <span className="text-white font-bold">{amountNum.toLocaleString()} sats</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Protocol fee (2%)</span>
              <span className="text-gray-400 font-medium">-{fee.toLocaleString()} sats</span>
            </div>
            {ammResult && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Shares received</span>
                <span className="text-white font-bold">{Number(ammResult.shares).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Potential payout</span>
              <span className="text-white font-bold">{potentialPayout.toLocaleString()} sats</span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/5 pt-2">
              <span className="text-gray-500">Potential profit</span>
              <span className="text-green-400 font-bold">+{potentialProfit.toLocaleString()} sats</span>
            </div>

            {/* AMM Details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-btc transition-colors pt-1"
            >
              <Info size={10} />
              {showDetails ? 'Hide' : 'Show'} AMM details
            </button>

            {showDetails && (
              <div className="space-y-1.5 pt-1 border-t border-white/5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Price impact</span>
                  <span className={`font-bold ${priceImpact > 5 ? 'text-red-400' : priceImpact > 1 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {priceImpact.toFixed(2)}%
                  </span>
                </div>
                {ammResult && (
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-600">New {side.toUpperCase()} price</span>
                    <span className="text-gray-400 font-medium">
                      {Math.round((side === 'yes' ? ammResult.newYesPrice : ammResult.newNoPrice) * 100)}¢
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">AMM model</span>
                  <span className="text-gray-400 font-medium">Constant Product (x·y=k)</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-gray-600">Settlement</span>
                  <span className="text-gray-400 font-medium">Bitcoin L1 (OP_NET)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Price impact warning */}
        {priceImpact > 5 && amountNum > 0 && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-400">High price impact ({priceImpact.toFixed(1)}%). Consider a smaller trade.</p>
          </div>
        )}

        {/* Warning */}
        {!wallet.connected && (
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
            <AlertCircle size={16} className="text-yellow-500 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-400">Connect your wallet first to place predictions.</p>
          </div>
        )}

        {/* Place button */}
        <button
          onClick={handlePlace}
          disabled={!wallet.connected || amountNum <= 0 || placing}
          className={`w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'yes'
              ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400'
              : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400'
          }`}
        >
          {placing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Broadcasting to Bitcoin...
            </>
          ) : (
            <>
              <Zap size={16} />
              Place {side.toUpperCase()} — {amountNum.toLocaleString()} sats
            </>
          )}
        </button>

        <p className="text-[10px] text-gray-600 text-center mt-3">
          Powered by OP_NET · Bitcoin Layer 1 · Testnet
        </p>
      </div>
    </div>
  );
}
