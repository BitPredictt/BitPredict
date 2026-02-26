import { Bitcoin, Wallet, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { WalletState, Tab } from '../types';

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  connecting: boolean;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Header({ wallet, onConnect, onDisconnect, connecting, activeTab, onTabChange }: HeaderProps) {
  const [mobileMenu, setMobileMenu] = useState(false);

  const formatAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  const formatSats = (sats: number) => {
    if (sats >= 100000000) return `${(sats / 100000000).toFixed(4)} BTC`;
    return `${sats.toLocaleString()} sats`;
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'markets', label: 'Markets', icon: '📊' },
    { id: 'portfolio', label: 'My Bets', icon: '💼' },
    { id: 'achievements', label: 'Quests', icon: '🏅' },
    { id: 'leaderboard', label: 'Ranks', icon: '🏆' },
    { id: 'ai', label: 'AI', icon: '🧠' },
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
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-btc/20 text-btc shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {wallet.connected ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-bold text-btc">{formatSats(wallet.balanceSats)}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{formatAddress(wallet.address)}</div>
                </div>
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
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all text-center ${
                  activeTab === tab.id
                    ? 'bg-btc/20 text-btc'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div>{tab.icon}</div>
                <div className="mt-0.5">{tab.label}</div>
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
