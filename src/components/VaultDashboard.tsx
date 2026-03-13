import { useState, useEffect, useCallback } from 'react';
import { Wallet, Lock, Unlock, TrendingUp, RefreshCw, Loader2, BarChart3, Zap, Clock, CheckCircle2, Link } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../lib/api';
import { getExplorerTxUrl, OPNET_CONFIG, MIN_BTC_FOR_TX, satsToBtc, formatBtc, stakeOnChain, unstakeOnChain, claimVaultOnChain, getOnChainVaultInfo, approveForVault, waitForTxConfirmation } from '../lib/opnet';
import type { VaultInfo, VaultUserInfo, VaultRewardEntry, VaultVesting } from '../types';

interface VaultDashboardProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBtcBalance: number;
  onChainBalance: number;
  onConnect: () => void;
  onBalanceRefresh: () => void;
  onToast: (msg: string, type: 'success' | 'error' | 'loading', link?: string, linkLabel?: string) => void;
  onEnsureAuth: () => Promise<void>;
  trackOp: (type: string, txHash?: string, details?: string, marketId?: string) => Promise<number | null>;
  completeOp: (opId: number | null, status: 'confirmed' | 'failed', txHash?: string) => Promise<void>;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown;
}

export function VaultDashboard({
  walletConnected, walletAddress, walletBtcBalance, onChainBalance,
  onConnect, onBalanceRefresh, onToast, onEnsureAuth, trackOp, completeOp, walletProvider, walletNetwork, walletAddressObj,
}: VaultDashboardProps) {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userInfo, setUserInfo] = useState<VaultUserInfo | null>(null);
  const [history, setHistory] = useState<VaultRewardEntry[]>([]);
  const [vestings, setVestings] = useState<VaultVesting[]>([]);
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [onChainTvl, setOnChainTvl] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const info = await api.getVaultInfo().catch(() => null);
    setVaultInfo(info);
    const hist = await api.getVaultHistory().catch(() => []);
    setHistory(hist);

    if (walletAddress) {
      const uInfo = await api.getVaultUser(walletAddress).catch(() => null);
      setUserInfo(uInfo);
      const vests = await api.getVaultVesting(walletAddress).catch(() => []);
      setVestings(vests);
      // Read on-chain TVL from StakingVault contract
      getOnChainVaultInfo(walletProvider, walletNetwork, walletAddressObj)
        .then(r => { if (r) setOnChainTvl((Number(r.totalStaked) / 1e8).toLocaleString()); })
        .catch(() => {});
    }
  }, [walletAddress, walletProvider, walletNetwork, walletAddressObj]);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 15000);
    return () => clearInterval(iv);
  }, [loadData]);

  const [step, setStep] = useState('');

  const handleStakeUnstake = async () => {
    const amtNum = Math.round((parseFloat(amount) || 0) * 1e8); // BTC → sats
    const max = mode === 'stake' ? Math.floor(onChainBalance) : (userInfo?.staked || 0);
    if (!amtNum || amtNum < 10000 || amtNum > max || loading) return;

    setLoading(true);
    let opId: number | null = null;

    try {
      await onEnsureAuth();
      let r: { txHash: string; success: boolean; error?: string };
      opId = await trackOp(mode, undefined, `${mode === 'stake' ? 'Stake' : 'Unstake'} ${formatBtc(amtNum)} WBTC`);

      if (mode === 'stake') {
        // Step 1: Approve
        setStep('Step 1/3: Approving WBTC...');
        onToast('Step 1/3: Checking allowance...', 'loading');
        const approveResult = await approveForVault(walletProvider, walletNetwork, walletAddressObj, walletAddress, amtNum);
        if (!approveResult.success) throw new Error(approveResult.error || 'WBTC approval failed');

        if (!approveResult.skipped) {
          // Step 2: Wait for confirm
          setStep('Step 2/3: Waiting for approval...');
          onToast('Step 2/3: Waiting for approval confirmation...', 'loading');
          const confirmed = await waitForTxConfirmation(walletProvider, approveResult.txHash);
          if (!confirmed.confirmed) throw new Error('Approval TX not confirmed in time. Please try again.');
        }

        // Step 3: Stake
        setStep('Step 3/3: Staking on-chain...');
        onToast(`${approveResult.skipped ? 'Step 2/2' : 'Step 3/3'}: Staking... Sign in wallet`, 'loading');
        r = await stakeOnChain(walletProvider, walletNetwork, walletAddressObj, walletAddress, amtNum);
      } else {
        setStep('Unstaking on-chain...');
        onToast('Unstaking... Sign in wallet', 'loading');
        r = await unstakeOnChain(walletProvider, walletNetwork, walletAddressObj, walletAddress, amtNum);
      }

      if (!r.success) throw new Error(r.error || 'TX failed');

      // Optimistic update
      if (mode === 'stake') {
        setUserInfo(prev => prev ? { ...prev, staked: prev.staked + amtNum } : prev);
      } else {
        setUserInfo(prev => prev ? { ...prev, staked: prev.staked - amtNum } : prev);
      }

      setStep('Confirming...');
      onToast('TX signed! Syncing with server...', 'loading');

      if (mode === 'stake') {
        await api.stakeVault(walletAddress, amtNum, r.txHash);
      } else {
        await api.unstakeVault(walletAddress, amtNum, r.txHash);
      }

      onBalanceRefresh();
      const txLink = getExplorerTxUrl(r.txHash);
      onToast(`${mode === 'stake' ? 'Staked' : 'Unstaked'} ${formatBtc(amtNum)}!`, 'success', txLink, 'View TX');
      setAmount('');
      completeOp(opId, 'confirmed', r.txHash);
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : String(err), 'error');
      completeOp(opId, 'failed');
      loadData();
    } finally {
      setLoading(false);
      setStep('');
    }
  };

  const handleClaim = async () => {
    if (claiming || !userInfo?.pendingRewards) return;
    setClaiming(true);
    onToast('Claiming rewards... Sign in wallet', 'loading');
    let opId: number | null = null;

    try {
      await onEnsureAuth();
      opId = await trackOp('vault_claim', undefined, `Claim ${formatBtc(userInfo.pendingRewards)} rewards`);

      const r = await claimVaultOnChain(walletProvider, walletNetwork, walletAddressObj, walletAddress);
      if (!r.success) throw new Error(r.error || 'Claim TX failed');

      onToast('Syncing with server...', 'loading');
      const result = await api.claimVaultRewards(walletAddress, r.txHash);
      onBalanceRefresh();
      const txLink = getExplorerTxUrl(r.txHash);
      onToast(`Claimed ${formatBtc(result.claimed)}!`, 'success', txLink, 'View TX');
      completeOp(opId, 'confirmed', r.txHash);
      loadData();
    } catch (err) {
      onToast(err instanceof Error ? err.message : String(err), 'error');
      completeOp(opId, 'failed');
    } finally {
      setClaiming(false);
    }
  };

  const handleAutoCompound = async () => {
    if (!userInfo) return;
    const newVal = !userInfo.autoCompound;
    setUserInfo({ ...userInfo, autoCompound: newVal }); // optimistic
    try {
      await onEnsureAuth();
      await api.setAutoCompound(walletAddress, newVal);
    } catch {
      setUserInfo({ ...userInfo, autoCompound: !newVal }); // rollback
    }
  };

  const maxSats = mode === 'stake' ? Math.floor(onChainBalance) : (userInfo?.staked || 0);
  const maxBtc = maxSats / 1e8;

  const formatNum = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  // Chart data
  const tvlData = history.slice().reverse().map((h, i) => ({
    name: `#${i + 1}`,
    tvl: h.totalStakedAtTime,
  }));

  const rewardData = history.slice(0, 20).reverse().map((h, i) => ({
    name: `#${i + 1}`,
    reward: h.feeAmount,
  }));

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600/20 to-btc/20 flex items-center justify-center mb-4 border border-purple-500/20">
          <Lock size={32} className="text-purple-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Predict & Earn Vault</h3>
        <p className="text-xs text-gray-500 mb-6 text-center max-w-sm">
          Stake WBTC and earn passive income from betting fees. Connect your wallet to get started.
        </p>
        <button onClick={onConnect} className="btc-btn cta-glow flex items-center gap-2">
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

  // Skeleton while vault data loads
  if (!vaultInfo) {
    return (
      <div className="space-y-6 pb-20 animate-fade-in max-w-3xl mx-auto">
        <div className="rounded-2xl p-6 vault-hero-gradient border border-purple-500/20">
          <div className="h-5 w-48 bg-surface-3 rounded animate-pulse mb-2" />
          <div className="h-3 w-72 bg-surface-3 rounded animate-pulse mb-5" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-black/30 rounded-xl p-3 border border-white/5">
                <div className="h-2 w-10 bg-surface-3 rounded animate-pulse mb-2" />
                <div className="h-6 w-16 bg-surface-3 rounded animate-pulse mb-1" />
                <div className="h-2 w-12 bg-surface-3 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
        <div className="vault-card rounded-2xl p-5">
          <div className="h-4 w-32 bg-surface-3 rounded animate-pulse mb-4" />
          <div className="h-10 bg-surface-3 rounded-xl animate-pulse mb-3" />
          <div className="h-10 bg-surface-3 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="vault-card rounded-2xl p-5">
            <div className="h-4 w-24 bg-surface-3 rounded animate-pulse mb-3" />
            <div className="h-32 bg-surface-3 rounded-xl animate-pulse" />
          </div>
          <div className="vault-card rounded-2xl p-5">
            <div className="h-4 w-28 bg-surface-3 rounded animate-pulse mb-3" />
            <div className="h-32 bg-surface-3 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const highApy = (vaultInfo?.apy || 0) > 100;

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-3xl mx-auto">
      {/* Vault Hero */}
      <div className="relative overflow-hidden rounded-2xl p-6 vault-hero-gradient border border-purple-500/20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-btc/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={18} className="text-purple-400" />
            <h2 className="text-xl font-extrabold text-white">Predict & Earn Vault</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5">Stake WBTC, earn from every bet on the platform</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5 stat-card-hover">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">TVL</div>
              <div className="text-lg font-black text-white">{formatBtc(vaultInfo?.totalStaked || 0)}</div>
              {onChainTvl && (
                <div className="flex items-center gap-0.5 mt-1 text-[8px] text-sky-400">
                  <Link size={7} /> On-chain: {onChainTvl}
                </div>
              )}
            </div>
            <div className={`bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5 stat-card-hover ${highApy ? 'vault-pulse' : ''}`}>
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">APY</div>
              <div className="text-lg font-black text-green-400">{vaultInfo?.apy || 0}%</div>
              <div className="text-[9px] text-gray-500">{vaultInfo?.apyLabel || 'Estimated'}</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5 stat-card-hover">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Your Rewards</div>
              <div className="text-lg font-black text-btc">{formatBtc(userInfo?.pendingRewards || 0)}</div>
              <div className="text-[9px] text-gray-500">pending</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5 stat-card-hover">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Stakers</div>
              <div className="text-lg font-black text-purple-400">{vaultInfo?.stakerCount || 0}</div>
              <div className="text-[9px] text-gray-500">Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        {/* Left column: Stake panel + Vesting */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Stake/Unstake Panel */}
          <div className="vault-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Stake WBTC</h3>
              <button onClick={loadData} className="ml-auto p-1.5 rounded-lg bg-surface-3 text-gray-500 hover:text-white transition-all">
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Your position */}
            {(userInfo?.staked ?? 0) > 0 && (
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Your Stake</span>
                  <span className="text-sm font-black text-white">{formatBtc(userInfo!.staked)}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Pending Rewards</span>
                  <span className="text-sm font-black text-btc">{formatBtc(userInfo!.pendingRewards)}</span>
                </div>
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-4">
              <button
                onClick={() => setMode('stake')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'stake' ? 'bg-purple-600/30 text-purple-300' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Lock size={12} className="inline mr-1" /> Stake
              </button>
              <button
                onClick={() => setMode('unstake')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === 'unstake' ? 'bg-btc/20 text-btc' : 'text-gray-500 hover:text-white'
                }`}
              >
                <Unlock size={12} className="inline mr-1" /> Unstake
              </button>
            </div>

            {/* Amount input */}
            <div className="relative mb-3">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount in BTC (min 0.0001)"
                min={10000}
                max={maxBtc}
                className="w-full bg-surface-2 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/30 focus:outline-none transition-colors"
              />
              <button
                onClick={() => setAmount(String(maxBtc))}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-purple-600/20 text-[10px] font-bold text-purple-300 hover:bg-purple-600/30 transition-all"
              >
                MAX
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 text-[10px] text-gray-500">
              <span>Available: {formatBtc(mode === 'stake' ? Math.floor(onChainBalance) : (userInfo?.staked || 0))} {mode === 'stake' ? '(on-chain WBTC)' : '(staked)'}</span>
              <span>Fee: 0%</span>
            </div>

            {/* Auto-compound toggle */}
            <div className="flex items-center justify-between mb-4 bg-surface-2/50 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <div>
                  <div className="text-xs font-bold text-white">Auto-Compound</div>
                  <div className="text-[9px] text-gray-500">Automatically reinvest rewards</div>
                </div>
              </div>
              <button
                onClick={handleAutoCompound}
                className={`toggle-track ${userInfo?.autoCompound ? 'active' : ''}`}
              >
                <span className="toggle-thumb" />
              </button>
            </div>

            {/* Earnings calculator */}
            {Number(amount) > 0 && (vaultInfo?.apy || 0) > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 mb-4">
                <div className="text-[10px] text-green-400 font-bold uppercase mb-1">Estimated Earnings ({vaultInfo?.apyLabel || 'APY'}: {vaultInfo.apy}%)</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Weekly</span>
                  <span className="text-green-400 font-bold">{formatBtc(Math.round(Number(amount) * 1e8 * (vaultInfo.apy / 100) / 52))}</span>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">Monthly</span>
                  <span className="text-green-400 font-bold">{formatBtc(Math.round(Number(amount) * 1e8 * (vaultInfo.apy / 100) / 12))}</span>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleStakeUnstake}
                disabled={loading || !Number(amount) || Math.round(Number(amount) * 1e8) < 10000}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 bg-gradient-to-r from-purple-600/30 to-btc/30 border border-purple-500/30 text-white hover:border-purple-400/50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> {step || 'Processing...'}
                  </span>
                ) : (
                  <span>{mode === 'stake' ? 'Stake' : 'Unstake'} WBTC</span>
                )}
              </button>

              {(userInfo?.pendingRewards ?? 0) > 0 && !userInfo?.autoCompound && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="px-4 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-btc/20 to-yellow-600/20 border border-btc/30 text-btc hover:border-btc/50 transition-all disabled:opacity-50"
                >
                  {claiming ? <Loader2 size={14} className="animate-spin" /> : 'Claim'}
                </button>
              )}
            </div>

            {walletBtcBalance > 0 && walletBtcBalance < MIN_BTC_FOR_TX && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 font-bold text-center">
                Low BTC balance: {satsToBtc(walletBtcBalance)} BTC — need at least {satsToBtc(MIN_BTC_FOR_TX)} BTC for gas.
                {OPNET_CONFIG.network === 'testnet' && <a href={OPNET_CONFIG.faucetUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-btc underline">Get testnet BTC</a>}
              </div>
            )}

          </div>

          {/* Charts */}
          {(tvlData.length > 1 || rewardData.length > 1) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tvlData.length > 1 && (
                <div className="vault-card rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">TVL History</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={tvlData}>
                      <defs>
                        <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#9333ea" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(v) => [formatBtc(Number(v)), 'TVL']}
                      />
                      <Area type="monotone" dataKey="tvl" stroke="#9333ea" fill="url(#tvlGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {rewardData.length > 1 && (
                <div className="vault-card rounded-2xl p-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Reward Distributions</h4>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={rewardData}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{ background: '#1a1a24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                        labelStyle={{ color: '#9ca3af' }}
                        formatter={(v) => [formatBtc(Number(v)), 'Reward']}
                      />
                      <Bar dataKey="reward" fill="#f7931a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Vesting Panel */}
          {vestings.length > 0 && (
            <div className="vault-card rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={16} className="text-purple-400" />
                <h3 className="text-sm font-bold text-white">Vesting Schedule</h3>
              </div>
              <div className="space-y-3">
                {vestings.slice(0, 5).map((v) => {
                  const isComplete = v.progress >= 100;
                  return (
                    <div key={v.id} className="bg-surface-2/50 rounded-xl p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{formatBtc(v.totalAmount)}</span>
                        <span className={`text-[10px] font-bold flex items-center gap-1 ${isComplete ? 'text-green-400' : 'text-purple-400'}`}>
                          {isComplete ? <><CheckCircle2 size={10} /> Vested</> : `${v.progress}%`}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, v.progress)}%`,
                            background: isComplete
                              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                              : 'linear-gradient(90deg, #9333ea, #f7931a)',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] text-gray-600">
                          {new Date(v.startTime).toLocaleDateString()}
                        </span>
                        <span className="text-[9px] text-gray-600">
                          {new Date(v.endTime).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* How it works */}
          <div className="vault-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">How Vault Works</h3>
            <div className="space-y-3">
              {[
                { icon: <Lock size={14} className="text-purple-400" />, title: 'Stake WBTC', desc: 'Lock your WBTC in the vault' },
                { icon: <TrendingUp size={14} className="text-green-400" />, title: 'Earn Fees', desc: '40% of 2% bet fee → 0.8% of volume to stakers' },
                { icon: <Zap size={14} className="text-yellow-400" />, title: 'Auto-Compound', desc: 'Rewards automatically reinvested' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
                    {step.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{step.title}</div>
                    <div className="text-[10px] text-gray-500">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Flow */}
          <div className="vault-card rounded-2xl p-5 flex-1 flex flex-col justify-center">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-3">Fee Flow</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Total Volume</span>
                <span className="text-xs font-bold text-white">{formatNum(vaultInfo?.totalVolume || 0)} sats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-700" />
                <span className="text-[9px] text-gray-600">2% fee</span>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">40% → Vault</span>
                <span className="text-xs font-bold text-btc">{formatNum(vaultInfo?.totalRewards || 0)} sats</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-700" />
                <span className="text-[9px] text-gray-600">your share</span>
                <div className="h-px flex-1 bg-gradient-to-r from-gray-700 to-transparent" />
              </div>
              {(userInfo?.staked ?? 0) > 0 && vaultInfo?.totalStaked ? (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">Your Share</span>
                  <span className="text-xs font-bold text-purple-400">{((userInfo!.staked / vaultInfo.totalStaked) * 100).toFixed(1)}%</span>
                </div>
              ) : (
                <div className="text-[10px] text-gray-600 text-center">Stake to earn your share</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
