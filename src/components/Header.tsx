import { Bitcoin, Wallet, LogOut, Menu, X, BarChart3, Lock, Briefcase, Award, Trophy, HelpCircle, ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { WalletState, Tab } from '../types';
import { NotificationBell } from './NotificationBell';
import { OPNET_CONFIG, formatBtc } from '../lib/opnet';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onChainBalance: number;
}

export function Header({ wallet, onConnect, onDisconnect, connecting, activeTab, onTabChange, onChainBalance }: HeaderProps) {
  const [mobileMenu, setMobileMenu] = useState(false);

  const formatAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

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
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[10px] font-bold text-btc">{formatBtc(Math.floor(onChainBalance))} WBTC</span>
                    <span className="text-gray-600 text-[10px]">|</span>
                    <span className="text-[10px] font-bold text-orange-400">{(wallet.balanceSats / 1e8).toFixed(6)} BTC</span>
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-0.5">
                    <div className="text-[9px] text-gray-500 font-mono">{formatAddress(wallet.address)}</div>
                    {OPNET_CONFIG.network === 'testnet' && (
                    <a
                      href={OPNET_CONFIG.faucetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] px-1.5 py-0.5 rounded bg-btc/10 text-btc hover:bg-btc/20 transition-all flex items-center gap-0.5"
                      title="Get testnet BTC from OP_NET faucet"
                    >
                      <ExternalLink size={7} />
                      Faucet
                    </a>
                    )}
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
