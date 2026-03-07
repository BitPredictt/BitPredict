import { useState } from 'react';
import { X, Zap, HelpCircle } from 'lucide-react';
import * as api from '../lib/api';

interface CreateMarketModalProps {
  walletAddress: string;
  balance: number;
  onClose: () => void;
  onCreated: (marketId: string, newBalance: number) => void;
}

const CATEGORIES = ['Crypto', 'Politics', 'Sports', 'Tech', 'Culture', 'Community'];
const DURATIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
  { label: '30 days', seconds: 2592000 },
];

export function CreateMarketModal({ walletAddress, balance, onClose, onCreated }: CreateMarketModalProps) {
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('Community');
  const [duration, setDuration] = useState(86400);
  const [liquidity, setLiquidity] = useState('500');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const liqNum = Math.floor(Number(liquidity) || 0);
  const canCreate = question.length >= 10 && liqNum >= 500 && liqNum <= balance && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    setError('');
    try {
      const endTime = Math.floor(Date.now() / 1000) + duration;
      const result = await api.createMarket(walletAddress, question, endTime, category, liqNum);
      onCreated(result.marketId, result.newBalance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create market');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-surface-1 rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Create Market</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Question */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Question</label>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Will Bitcoin reach $100K by end of 2026?"
              className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-btc/50 focus:outline-none resize-none"
              rows={2}
              maxLength={300}
            />
            <div className="text-[10px] text-gray-600 mt-1">{question.length}/300 characters (min 10)</div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    category === c ? 'bg-btc/20 text-btc border border-btc/30' : 'bg-surface-2 text-gray-500 border border-white/5 hover:text-white'
                  }`}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Duration</label>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.seconds}
                  onClick={() => setDuration(d.seconds)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    duration === d.seconds ? 'bg-btc/20 text-btc border border-btc/30' : 'bg-surface-2 text-gray-500 border border-white/5 hover:text-white'
                  }`}
                >{d.label}</button>
              ))}
            </div>
          </div>

          {/* Initial Liquidity */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              Initial Liquidity
              <HelpCircle size={10} className="text-gray-600" />
            </label>
            <div className="relative">
              <input
                type="number"
                value={liquidity}
                onChange={e => setLiquidity(e.target.value)}
                className="w-full bg-surface-2 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-btc/50 focus:outline-none"
                min={500}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">sats</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-600">Min: 500 sats</span>
              <span className="text-[10px] text-gray-500">Balance: {balance.toLocaleString()}</span>
            </div>
            <div className="flex gap-2 mt-2">
              {[500, 1000, 5000, 10000].map(p => (
                <button key={p} onClick={() => setLiquidity(String(p))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${liquidity === String(p) ? 'bg-btc/20 text-btc border border-btc/30' : 'bg-surface-2 text-gray-500 border border-white/5 hover:text-white'}`}
                >{p >= 1000 ? `${p/1000}K` : p}</button>
              ))}
            </div>
          </div>

          {/* Creator Rewards Info */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-1.5">
            <div className="text-xs font-bold text-green-400">Creator Rewards</div>
            <div className="text-[11px] text-gray-400 space-y-1">
              <div>- You earn <span className="text-green-400 font-bold">25% of all fees</span> from bets on your market</div>
              <div>- Your liquidity is <span className="text-green-400 font-bold">returned</span> when the market resolves</div>
              <div>- More volume = more earnings for you</div>
            </div>
          </div>

          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-btc to-orange-500 text-white hover:from-btc-light hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
            ) : (
              <><Zap size={16} /> Create Market</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
