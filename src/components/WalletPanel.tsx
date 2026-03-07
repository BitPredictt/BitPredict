import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import * as api from '../lib/api';
import { depositToTreasury, getExplorerTxUrl } from '../lib/opnet';
import type { TreasuryDeposit, WithdrawalRequest } from '../types';

interface WalletPanelProps {
  walletConnected: boolean;
  walletAddress: string;
  balance: number;
  backedBalance: number;
  onConnect: () => void;
  onBalanceRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'loading', link?: string, linkLabel?: string) => void;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown;
}

export function WalletPanel({
  walletConnected, walletAddress, balance, backedBalance,
  onConnect, onBalanceRefresh, onToast,
  walletProvider, walletNetwork, walletAddressObj,
}: WalletPanelProps) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [deposits, setDeposits] = useState<TreasuryDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  const syntheticBalance = Math.max(0, balance - backedBalance);

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
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt < 10000) {
      onToast('Minimum deposit: 10,000 sats', 'error');
      return;
    }

    setLoading(true);
    try {
      // Step 1: On-chain deposit via Treasury contract
      onToast('Approving WBTC for Treasury...', 'loading');
      const txResult = await depositToTreasury(walletProvider, walletNetwork, walletAddressObj, walletAddress, amt);

      if (!txResult.success) {
        onToast(txResult.error || 'Deposit failed', 'error');
        return;
      }

      // Step 2: Notify server about the deposit
      const result = await api.depositConfirm(walletAddress, txResult.txHash, amt);
      if (result.success) {
        onToast(`Deposit ${result.status === 'confirmed' ? 'confirmed' : 'pending'}: +${amt.toLocaleString()} sats`, 'success',
          getExplorerTxUrl(txResult.txHash), 'View TX');
        setAmount('');
        onBalanceRefresh();
        loadHistory();
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Deposit error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(amount, 10);
    if (isNaN(amt) || amt < 10000) {
      onToast('Minimum withdrawal: 10,000 sats', 'error');
      return;
    }
    if (amt > backedBalance) {
      onToast(`Insufficient backed balance: ${backedBalance.toLocaleString()} sats`, 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await api.withdrawRequest(walletAddress, amt);
      if (result.success) {
        const msg = result.status === 'completed'
          ? `Withdrawn ${result.netAmount.toLocaleString()} sats (fee: ${result.fee.toLocaleString()})`
          : `Withdrawal queued: ${result.netAmount.toLocaleString()} sats`;
        onToast(msg, 'success', result.txHash ? getExplorerTxUrl(result.txHash) : undefined, result.txHash ? 'View TX' : undefined);
        setAmount('');
        onBalanceRefresh();
        loadHistory();
      }
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Withdrawal error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'confirmed' || status === 'completed') return <CheckCircle2 size={14} className="text-green-400" />;
    if (status === 'pending') return <Clock size={14} className="text-yellow-400" />;
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

  return (
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet size={20} /> Wallet
        </h3>
        <button onClick={() => { onBalanceRefresh(); loadHistory(); }} className="text-gray-400 hover:text-white">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Balance breakdown */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-xs text-gray-400">Total</div>
          <div className="text-lg font-bold text-white">{balance.toLocaleString()}</div>
          <div className="text-xs text-gray-500">sats</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-xs text-green-400">Backed</div>
          <div className="text-lg font-bold text-green-400">{backedBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Withdrawable</div>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-3 text-center">
          <div className="text-xs text-purple-400">Bonus</div>
          <div className="text-lg font-bold text-purple-400">{syntheticBalance.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Rewards</div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('deposit')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
            mode === 'deposit' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ArrowDownToLine size={14} className="inline mr-1" /> Deposit
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
            mode === 'withdraw' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <ArrowUpFromLine size={14} className="inline mr-1" /> Withdraw
        </button>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === 'deposit' ? 'Amount to deposit' : 'Amount to withdraw'}
            min={10000}
            max={mode === 'withdraw' ? backedBalance : undefined}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
          {mode === 'withdraw' && (
            <button onClick={() => setAmount(String(backedBalance))} className="px-3 py-2.5 bg-gray-800 rounded-xl text-xs text-gray-400 hover:text-white">
              MAX
            </button>
          )}
        </div>
        {mode === 'withdraw' && amount && (
          <div className="text-xs text-gray-400 mt-1">
            Fee: {Math.ceil(parseInt(amount || '0', 10) * 0.005).toLocaleString()} sats (0.5%) | Net: {Math.floor(parseInt(amount || '0', 10) * 0.995).toLocaleString()} sats
          </div>
        )}
      </div>

      <button
        onClick={mode === 'deposit' ? handleDeposit : handleWithdraw}
        disabled={loading || !amount || parseInt(amount, 10) < 10000}
        className={`w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 ${
          loading ? 'bg-gray-700 cursor-wait' :
          mode === 'deposit' ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-orange-600 hover:bg-orange-500 text-white'
        } disabled:opacity-50`}
      >
        {loading ? <><Loader2 size={16} className="animate-spin" /> Processing...</> :
          mode === 'deposit' ? 'Deposit WBTC' : 'Withdraw WBTC'}
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
                  <span className="text-green-400">+{d.amount_bpusd}</span>
                </div>
                <span className="text-gray-500">{formatTime(d.created_at)}</span>
              </div>
            ))}
            {withdrawals.slice(0, 5).map(w => (
              <div key={`w-${w.id}`} className="flex items-center justify-between text-xs bg-gray-800/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  {statusIcon(w.status)}
                  <ArrowUpFromLine size={12} className="text-orange-400" />
                  <span className="text-orange-400">-{w.amount_bpusd}</span>
                  {w.fee_bpusd > 0 && <span className="text-gray-600">(fee: {w.fee_bpusd})</span>}
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
