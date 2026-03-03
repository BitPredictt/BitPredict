import { Bitcoin, Wallet, LogOut, Menu, X, BarChart3, Lock, Briefcase, Award, Trophy, HelpCircle } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { WalletState, Tab } from '../types';
import { NotificationBell } from './NotificationBell';
import * as api from '../lib/api';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  predBalance: number;
  btcBalance: number;
  onBalanceUpdate: (balance: number, btcBalance: number) => void;
}

export function Header({ wallet, onConnect, onDisconnect, connecting, activeTab, onTabChange, predBalance, btcBalance, onBalanceUpdate }: HeaderProps) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [claimingFaucet, setClaimingFaucet] = useState<'bpusd' | 'btc' | null>(null);

  const formatAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const handleBtcFaucet = async () => {
    if (claimingFaucet || !wallet.address) return;
    setClaimingFaucet('btc');
    try {
      const r = await api.claimBtcFaucet(wallet.address);
      onBalanceUpdate(r.newBalance, r.newBtcBalance);
    } catch { /* cooldown */ }
    setClaimingFaucet(null);
  };

  const handleBuyBpusd = async () => {
    if (claimingFaucet || !wallet.address) return;
    const input = window.prompt('Buy BPUSD with BTC\n1,000 sats = 1 BPUSD\n\nHow much BPUSD?', '100');
    if (!input) return;
    const amount = Math.floor(Number(input));
    if (!amount || amount < 1) return;
    const satsCost = amount * 1000;
    if (satsCost > btcBalance) {
      alert(`Not enough BTC. Need ${satsCost.toLocaleString()} sats, have ${btcBalance.toLocaleString()} sats`);
      return;
    }
    setClaimingFaucet('bpusd');
    try {
      const r = await api.buyBpusd(wallet.address, amount);
      onBalanceUpdate(r.newBalance, r.newBtcBalance);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Exchange failed');
    }
    setClaimingFaucet(null);
  };

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'markets', label: 'Markets', icon: <BarChart3 size={14} /> },
    { id: 'vault', label: 'Vault', icon: <Lock size={14} /> },
    { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={14} /> },
    { id: 'achievements', label: 'Quests', icon: <Award size={14} /> },
    { id: 'leaderboard', label: 'Ranks', icon: <Trophy size={14} /> },
    { id: 'ai', label: 'Help', icon: <HelpCircle size={14} /> },
  ];

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('markets')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-btc to-btc-dark flex items-center justify-center shadow-lg">
              <Bitcoin size={20} className="text-black" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none">
                <span className="btc-gradient">Bit</span>
                <span className="text-white">Predict</span>
              </h1>
              <p className="text-[9px] text-gray-500 font-medium tracking-wider uppercase">Bitcoin L1 · OP_NET</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-2/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-btc/20 text-btc shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {wallet.connected ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 status-breathing shrink-0" />
                <div className="hidden sm:block text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-bold text-btc">{predBalance.toLocaleString()} BPUSD</span>
                    <span className="text-gray-600 text-[10px]">|</span>
                    <span className="text-[10px] font-bold text-orange-400">{btcBalance.toLocaleString()} sats</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <div className="text-[9px] text-gray-500 font-mono">{formatAddress(wallet.address)}</div>
                    <button
                      onClick={handleBuyBpusd}
                      disabled={!!claimingFaucet}
                      className="text-[8px] px-1 py-0.5 rounded bg-btc/10 text-btc hover:bg-btc/20 transition-all disabled:opacity-50"
                      title="Buy BPUSD with BTC (1000 sats = 1 BPUSD)"
                    >
                      Buy BPUSD
                    </button>
                    <button
                      onClick={handleBtcFaucet}
                      disabled={!!claimingFaucet}
                      className="text-[8px] px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                      title="Claim BTC faucet (2000 sats)"
                    >
                      +BTC
                    </button>
                  </div>
                </div>
                <NotificationBell walletAddress={wallet.address} />
                <button
                  onClick={onDisconnect}
                  className="p-2 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                  title="Disconnect"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnect}
                disabled={connecting}
                className="btc-btn flex items-center gap-2 text-sm disabled:opacity-50"
              >
                <Wallet size={16} />
                {connecting ? 'Connecting...' : 'Connect'}
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 rounded-lg bg-surface-2 text-gray-400"
            >
              {mobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenu && (
          <nav className="md:hidden flex gap-1 mt-3 bg-surface-2/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setMobileMenu(false);
                }}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center ${
                  activeTab === tab.id
                    ? 'bg-btc/20 text-btc'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <div className="mt-0.5">{tab.label}</div>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
