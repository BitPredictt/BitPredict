import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, Loader2, RefreshCw, X } from 'lucide-react';
import * as api from '../lib/api';
import { wrapBTC, unwrapWBTC, getExplorerTxUrl, waitForTxConfirmation, formatBtc } from '../lib/opnet';
import type { TreasuryDeposit, WithdrawalRequest } from '../types';

interface WalletPanelProps {
  walletConnected: boolean;
  walletAddress: string;
  onChainBalance: number;
  walletBtcBalance?: number;
  onConnect: () => void;
  onClose?: () => void;
  onBalanceRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'loading', link?: string, linkLabel?: string) => void;
  onEnsureAuth: () => Promise<void>;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown;
}

export function WalletPanel({
  walletConnected, walletAddress, onChainBalance, walletBtcBalance,
  onConnect, onClose, onBalanceRefresh, onToast, onEnsureAuth,
  walletProvider, walletNetwork, walletAddressObj,
}: WalletPanelProps) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('');
  const [deposits, setDeposits] = useState<TreasuryDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const loadHistory = useCallback(async () => {
    if (!walletAddress) return;
    const [deps, wds] = await Promise.all([
      api.getDepositHistory(walletAddress).catch(() => []),
      api.getWithdrawHistory(walletAddress).catch(() => []),
    ]);
    setDeposits(deps);
    setWithdrawals(wds);
  }, [walletAddress]);

  useEffect(() => {
    loadHistory();
    const iv = setInterval(loadHistory, 30000);
    return () => clearInterval(iv);
  }, [loadHistory]);

  const handleDeposit = async () => {
    const sats = Math.round((parseFloat(amount) || 0) * 1e8);
    if (sats < 10000) {
      onToast('Minimum: 0.0001 BTC', 'error');
      return;
    }
    const amt = sats;

    setLoading(true);
    try {
      // Wrap BTC → WBTC (stays in wallet, ready for on-chain bets)
      setStep(`Wrapping ${formatBtc(amt)} → WBTC...`);
      onToast(`Wrapping ${formatBtc(amt)} BTC → WBTC...`, 'loading');
      const wrapResult = await wrapBTC(walletProvider, walletNetwork, walletAddressObj, walletAddress, amt);
      if (!wrapResult.success) {
        onToast(wrapResult.error || 'Wrap failed', 'error');
        return;
      }
      onToast('Wrapped! Waiting for confirmation...', 'loading');
      setStep('Waiting for confirmation...');
      if (wrapResult.txHash) {
        await waitForTxConfirmation(walletProvider, wrapResult.txHash, 120000);
      }
      onToast(`Wrapped ${formatBtc(amt)} BTC → WBTC`, 'success',
        wrapResult.txHash ? getExplorerTxUrl(wrapResult.txHash) : undefined,
        wrapResult.txHash ? 'View TX' : undefined);
      setAmount('');
      onBalanceRefresh();
      loadHistory();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Wrap error', 'error');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const handleWithdraw = async () => {
    const sats = Math.round((parseFloat(amount) || 0) * 1e8);
    if (sats < 10000) {
      onToast('Minimum: 0.0001 BTC', 'error');
      return;
    }
    const amt = sats;
    if (amt > onChainBalance) {
      onToast(`Max: ${formatBtc(onChainBalance)} WBTC`, 'error');
      return;
    }

    setLoading(true);
    try {
      // Unwrap WBTC → BTC (on-chain burn + server sends BTC)
      setStep(`Unwrapping ${formatBtc(amt)} WBTC → BTC...`);
      onToast(`Unwrapping ${formatBtc(amt)} WBTC → BTC...`, 'loading');
      const result = await unwrapWBTC(walletProvider, walletNetwork, walletAddressObj, walletAddress, amt);

      if (!result.success) {
        onToast(result.error || 'Unwrap failed', 'error');
        return;
      }

      onToast(`Unwrapped ${formatBtc(amt)} WBTC → BTC`, 'success',
        result.txHash ? getExplorerTxUrl(result.txHash) : undefined,
        result.txHash ? 'View TX' : undefined);
      setAmount('');
      onBalanceRefresh();
      loadHistory();
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Unwrap error', 'error');
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'confirmed' || status === 'completed') return <CheckCircle2 size={14} className="text-green-400" />;
    if (status === 'pending' || status === 'authorized') return <Clock size={14} className="text-yellow-400" />;
    return <XCircle size={14} className="text-red-400" />;
  };

  const formatTime = (ts: number) => new Date(ts * 1000).toLocaleDateString();

  if (!walletConnected) {
    return (
      <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6 text-center">
        <Wallet className="mx-auto mb-3 text-gray-500" size={32} />
        <p className="text-gray-400 mb-4">Connect wallet to manage deposits</p>
        <button onClick={onConnect} className="px-6 py-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition">
          Connect Wallet
        </button>
      </div>
    );
  }

  const amtBtc = parseFloat(amount) || 0;
  const amt = Math.round(amtBtc * 1e8); // convert BTC to sats

  return (
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet size={20} /> Wallet
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { onBalanceRefresh(); loadHistory(); }} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all" title="Refresh">
            <RefreshCw size={16} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all" title="Close">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Balance breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-xs text-green-400">WBTC Balance</div>
          <div className="text-lg font-bold text-green-400">{formatBtc(onChainBalance)}</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-xs text-orange-400">BTC Balance</div>
          <div className="text-lg font-bold text-orange-400">{walletBtcBalance != null ? (walletBtcBalance / 1e8).toFixed(6) : '—'}</div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('deposit')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            mode === 'deposit' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownToLine size={14} className="inline mr-1.5" /> Deposit
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
            mode === 'withdraw' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpFromLine size={14} className="inline mr-1.5" /> Withdraw
        </button>
      </div>

      {/* Info banners */}
      {mode === 'deposit' && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-3 py-2 mb-3 text-xs text-green-300">
          Wraps BTC → WBTC. WBTC stays in your wallet for on-chain bets.
        </div>
      )}
      {mode === 'withdraw' && (
        <div className="bg-orange-900/20 border border-orange-700/30 rounded-xl px-3 py-2 mb-3 text-xs text-orange-300">
          Unwraps WBTC → BTC back to your wallet.
        </div>
      )}

      {/* Amount input */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === 'deposit' ? 'Amount in BTC (e.g. 0.001)' : 'Amount in BTC (e.g. 0.001)'}
            step="0.00000001"
            min={0.0001}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          {mode === 'withdraw' && (
            <button onClick={() => setAmount((onChainBalance / 1e8).toFixed(8))} className="px-3 py-2.5 bg-gray-800 rounded-xl text-xs text-gray-400 hover:text-white border border-gray-700">
              MAX
            </button>
          )}
        </div>
        {false && mode === 'withdraw' && amt > 0 && (
          <div className="text-xs text-gray-400 mt-1.5">
            Fee: {formatBtc(Math.ceil(amt * 0.005))} (0.5%) | Net: {formatBtc(Math.floor(amt * 0.995))}
          </div>
        )}
      </div>

      <button
        onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
        disabled={loading || !amount || amt < 10000 || (mode === 'withdraw' && amt > onChainBalance)}
        className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
          loading ? 'bg-gray-700 cursor-wait' :
          mode === 'deposit' ? 'bg-green-600 hover:bg-green-500 text-white' :
          'bg-orange-600 hover:bg-orange-500 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> {step || 'Processing...'}</>
        ) : mode === 'deposit' ? (
          `Wrap BTC → WBTC ${amtBtc > 0 ? formatBtc(amt) : ''}`
        ) : (
          `Unwrap WBTC → BTC ${amtBtc > 0 ? formatBtc(amt) : ''}`
        )}
      </button>

      {/* Transaction history */}
      {(deposits.length > 0 || withdrawals.length > 0) && (
        <div className="mt-5">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Transactions</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {deposits.slice(0, 5).map(d => (
              <div key={`d-${d.id}`} className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {statusIcon(d.status)}
                  <ArrowDownToLine size={12} className="text-green-400" />
                  <span className="text-green-400">+{formatBtc(d.amount_bpusd || 0)}</span>
                </div>
                <span className="text-gray-500">{formatTime(d.created_at)}</span>
              </div>
            ))}
            {withdrawals.slice(0, 5).map(w => (
              <div key={`w-${w.id}`} className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {statusIcon(w.status)}
                  <ArrowUpFromLine size={12} className="text-orange-400" />
                  <span className="text-orange-400">-{formatBtc(w.amount_bpusd || 0)}</span>
                  {(w.fee_bpusd || 0) > 0 && (
                    <span className="text-gray-600">(fee: {formatBtc(w.fee_bpusd)})</span>
                  )}
                </div>
                <span className="text-gray-500">{formatTime(w.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
