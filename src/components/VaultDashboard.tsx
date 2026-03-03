import { useState, useEffect, useCallback } from 'react';
import { Wallet, Lock, Unlock, TrendingUp, RefreshCw, Loader2, ExternalLink, BarChart3, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import * as api from '../lib/api';
import { signVaultProof, getExplorerTxUrl, OPNET_CONFIG, MIN_BTC_FOR_TX, satsToBtc } from '../lib/opnet';
import type { VaultInfo, VaultUserInfo, VaultRewardEntry, VaultVesting } from '../types';
import { TopPredictors } from './TopPredictors';

interface VaultDashboardProps {
  walletConnected: boolean;
  walletAddress: string;
  walletBtcBalance: number;
  predBalance: number;
  onConnect: () => void;
  onBalanceUpdate: (balance: number) => void;
  walletProvider: unknown;
  walletNetwork: unknown;
  walletAddressObj: unknown;
}

export function VaultDashboard({
  walletConnected, walletAddress, walletBtcBalance, predBalance,
  onConnect, onBalanceUpdate, walletProvider, walletNetwork, walletAddressObj,
}: VaultDashboardProps) {
  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null>(null);
  const [userInfo, setUserInfo] = useState<VaultUserInfo | null>(null);
  const [history, setHistory] = useState<VaultRewardEntry[]>([]);
  const [vestings, setVestings] = useState<VaultVesting[]>([]);
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txMsg, setTxMsg] = useState<{ text: string; type: 'success' | 'error'; txHash?: string } | null>(null);
  const [claiming, setClaiming] = useState(false);

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
    }
  }, [walletAddress]);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 15000);
    return () => clearInterval(iv);
  }, [loadData]);

  const handleStakeUnstake = async () => {
    const amtNum = Number(amount);
    if (!amtNum || amtNum < 100 || loading) return;

    setLoading(true);
    setTxMsg({ text: 'Sign the transaction in OP_WALLET...', type: 'success' });

    try {
      const proof = await signVaultProof(walletProvider, walletNetwork, walletAddressObj, walletAddress, amtNum);
      if (!proof.success) throw new Error(proof.error || 'TX signing failed');

      setTxMsg({ text: 'TX signed! Processing...', type: 'success' });

      let result;
      if (mode === 'stake') {
        result = await api.stakeVault(walletAddress, amtNum, proof.txHash);
      } else {
        result = await api.unstakeVault(walletAddress, amtNum, proof.txHash);
      }

      onBalanceUpdate(result.newBalance);
      setTxMsg({
        text: `${mode === 'stake' ? 'Staked' : 'Unstaked'} ${amtNum.toLocaleString()} BPUSD!`,
        type: 'success',
        txHash: proof.txHash,
      });
      setAmount('');
      loadData();
    } catch (err) {
      setTxMsg({ text: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (claiming || !userInfo?.pendingRewards) return;
    setClaiming(true);
    setTxMsg({ text: 'Sign claim TX in OP_WALLET...', type: 'success' });

    try {
      const proof = await signVaultProof(walletProvider, walletNetwork, walletAddressObj, walletAddress, userInfo.pendingRewards);
      if (!proof.success) throw new Error(proof.error || 'TX signing failed');

      const result = await api.claimVaultRewards(walletAddress, proof.txHash);
      onBalanceUpdate(result.newBalance);
      setTxMsg({
        text: `Claimed ${result.claimed.toLocaleString()} BPUSD!`,
        type: 'success',
        txHash: proof.txHash,
      });
      loadData();
    } catch (err) {
      setTxMsg({ text: err instanceof Error ? err.message : String(err), type: 'error' });
    } finally {
      setClaiming(false);
    }
  };

  const handleAutoCompound = async () => {
    if (!userInfo) return;
    const newVal = !userInfo.autoCompound;
    await api.setAutoCompound(walletAddress, newVal).catch(() => {});
    setUserInfo({ ...userInfo, autoCompound: newVal });
  };

  const maxAmount = mode === 'stake' ? predBalance : (userInfo?.staked || 0);

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
          Stake BPUSD and earn passive income from trading fees. Connect your wallet to get started.
        </p>
        <button onClick={onConnect} className="btc-btn flex items-center gap-2">
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

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
          <p className="text-xs text-gray-400 mb-5">Stake BPUSD, earn from every trade on the platform</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">TVL</div>
              <div className="text-lg font-black text-white">{formatNum(vaultInfo?.totalStaked || 0)}</div>
              <div className="text-[9px] text-gray-500">BPUSD</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">APY</div>
              <div className="text-lg font-black text-green-400">{vaultInfo?.apy || 0}%</div>
              <div className="text-[9px] text-gray-500">Estimated</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Your Rewards</div>
              <div className="text-lg font-black text-btc">{formatNum(userInfo?.pendingRewards || 0)}</div>
              <div className="text-[9px] text-gray-500">BPUSD pending</div>
            </div>
            <div className="bg-black/30 rounded-xl p-3 backdrop-blur-sm border border-white/5">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Stakers</div>
              <div className="text-lg font-black text-purple-400">{vaultInfo?.stakerCount || 0}</div>
              <div className="text-[9px] text-gray-500">Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column: Stake panel + Vesting */}
        <div className="lg:col-span-3 space-y-6">
          {/* Stake/Unstake Panel */}
          <div className="vault-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-white">Stake BPUSD</h3>
              <button onClick={loadData} className="ml-auto p-1.5 rounded-lg bg-surface-3 text-gray-500 hover:text-white transition-all">
                <RefreshCw size={12} />
              </button>
            </div>

            {/* Your position */}
            {(userInfo?.staked ?? 0) > 0 && (
              <div className="bg-purple-600/10 border border-purple-500/20 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Your Stake</span>
                  <span className="text-sm font-black text-white">{formatNum(userInfo!.staked)} BPUSD</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Pending Rewards</span>
                  <span className="text-sm font-black text-btc">{formatNum(userInfo!.pendingRewards)} BPUSD</span>
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
                placeholder={`Amount (min 100 BPUSD)`}
                min={100}
                max={maxAmount}
                className="w-full bg-surface-2 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/30 focus:outline-none transition-colors"
              />
              <button
                onClick={() => setAmount(String(maxAmount))}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-purple-600/20 text-[10px] font-bold text-purple-300 hover:bg-purple-600/30 transition-all"
              >
                MAX
              </button>
            </div>

            <div className="flex items-center justify-between mb-4 text-[10px] text-gray-500">
              <span>Available: {formatNum(mode === 'stake' ? predBalance : (userInfo?.staked || 0))} BPUSD</span>
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

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleStakeUnstake}
                disabled={loading || !Number(amount) || Number(amount) < 100}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 bg-gradient-to-r from-purple-600/30 to-btc/30 border border-purple-500/30 text-white hover:border-purple-400/50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Processing...
                  </span>
                ) : (
                  <span>{mode === 'stake' ? 'Stake' : 'Unstake'} BPUSD</span>
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

            {walletBtcBalance < MIN_BTC_FOR_TX && walletBtcBalance >= 0 && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-[11px] text-red-400 font-bold text-center">
                Low BTC balance: {satsToBtc(walletBtcBalance)} BTC — need at least {satsToBtc(MIN_BTC_FOR_TX)} BTC for gas.
                <a href={OPNET_CONFIG.faucetUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-btc underline">Get testnet BTC</a>
              </div>
            )}

            {txMsg && (
              <div className={`text-xs mt-3 text-center font-bold ${txMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                <span>{txMsg.text}</span>
                {txMsg.txHash && (
                  <a href={getExplorerTxUrl(txMsg.txHash)} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-btc hover:underline">
                    <ExternalLink size={10} /> View TX
                  </a>
                )}
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
                        formatter={(v) => [`${Number(v).toLocaleString()} BPUSD`, 'TVL']}
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
                        formatter={(v) => [`${Number(v).toLocaleString()} BPUSD`, 'Reward']}
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
                        <span className="text-xs font-bold text-white">{v.totalAmount.toLocaleString()} BPUSD</span>
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

        {/* Right column: Stats + Social */}
        <div className="lg:col-span-2 space-y-6">
          {/* How it works */}
          <div className="vault-card rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-3">How Vault Works</h3>
            <div className="space-y-3">
              {[
                { icon: <Lock size={14} className="text-purple-400" />, title: 'Stake BPUSD', desc: 'Lock your tokens in the vault' },
                { icon: <TrendingUp size={14} className="text-green-400" />, title: 'Earn Fees', desc: '50% of 2% trading fee distributed to stakers' },
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

          {/* Total distributed */}
          <div className="vault-card rounded-2xl p-5">
            <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">Total Distributed</div>
            <div className="text-2xl font-black text-btc">{formatNum(vaultInfo?.totalRewards || 0)}</div>
            <div className="text-[10px] text-gray-500">BPUSD from trading fees</div>
          </div>

          {/* Top Predictors */}
          <TopPredictors walletAddress={walletAddress} />
        </div>
      </div>
    </div>
  );
}
