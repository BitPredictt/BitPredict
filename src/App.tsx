import { useState, useMemo, useCallback } from 'react';
import { Search, Filter, ExternalLink, Github, MessageCircle } from 'lucide-react';
import type { Tab, CategoryFilter, Market, Bet } from './types';
import { MOCK_MARKETS, CATEGORIES } from './data/markets';
import { useWallet } from './hooks/useWallet';
import { Header } from './components/Header';
import { NetworkStats } from './components/NetworkStats';
import { MarketCard } from './components/MarketCard';
import { BetModal } from './components/BetModal';
import { Leaderboard } from './components/Leaderboard';
import { AIAnalysis } from './components/AIAnalysis';
import { Portfolio } from './components/Portfolio';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { HowItWorks } from './components/HowItWorks';

function App() {
  const { wallet, loading: walletLoading, connectOPWallet, disconnect } = useWallet();
  const [activeTab, setActiveTab] = useState<Tab>('markets');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'ending' | 'liquidity'>('volume');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const filteredMarkets = useMemo(() => {
    let markets = [...MOCK_MARKETS];

    if (category !== 'All') {
      markets = markets.filter((m) => m.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      markets = markets.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.tags.some((t) => t.includes(q)) ||
          m.category.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'volume':
        markets.sort((a, b) => b.volume - a.volume);
        break;
      case 'ending':
        markets.sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
        break;
      case 'liquidity':
        markets.sort((a, b) => b.liquidity - a.liquidity);
        break;
    }

    return markets;
  }, [category, search, sortBy]);

  const handlePlaceBet = useCallback((marketId: string, side: 'yes' | 'no', amount: number) => {
    const market = MOCK_MARKETS.find((m) => m.id === marketId);
    if (!market) return;

    const newBet: Bet = {
      id: `bet-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      marketId,
      side,
      amount,
      price: side === 'yes' ? market.yesPrice : market.noPrice,
      timestamp: Date.now(),
      status: 'active',
    };

    setBets((prev) => [newBet, ...prev]);
    setToast({ message: `${side.toUpperCase()} prediction placed! ${amount.toLocaleString()} sats on Bitcoin L1`, type: 'success' });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  return (
    <div className="min-h-screen">
      <Header
        wallet={wallet}
        onConnect={connectOPWallet}
        onDisconnect={disconnect}
        connecting={walletLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <NetworkStats />

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'markets' && (
          <div className="animate-fade-in">
            {/* Hero */}
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Predict the Future<br />
                <span className="btc-gradient">on Bitcoin L1</span>
              </h2>
              <p className="text-sm text-gray-500 mt-3 max-w-md mx-auto">
                AI-powered prediction markets built on OP_NET. Trade binary outcomes with testnet Bitcoin.
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <a
                  href="https://github.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-btc transition-colors"
                >
                  <Github size={14} />
                  GitHub
                </a>
                <a
                  href="https://t.me/opnetbtc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-btc transition-colors"
                >
                  <MessageCircle size={14} />
                  Telegram
                </a>
                <a
                  href="https://opnet.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-btc transition-colors"
                >
                  <ExternalLink size={14} />
                  OP_NET
                </a>
              </div>
            </div>

            <HowItWorks />

            {/* Search & filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search markets..."
                  className="w-full bg-surface-2 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-btc/30 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-surface-2 border border-white/5 rounded-xl px-3 py-2.5 text-xs text-gray-400 focus:border-btc/30 focus:outline-none cursor-pointer"
                >
                  <option value="volume">Top Volume</option>
                  <option value="ending">Ending Soon</option>
                  <option value="liquidity">Highest Liquidity</option>
                </select>
              </div>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat as CategoryFilter)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                    category === cat
                      ? 'bg-btc/20 text-btc border-btc/30'
                      : 'bg-surface-2 text-gray-500 border-white/5 hover:text-white hover:border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Markets grid */}
            {filteredMarkets.length === 0 ? (
              <div className="text-center py-16">
                <Filter size={40} className="text-gray-700 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-400">No markets found</h3>
                <p className="text-xs text-gray-600 mt-1">Try a different search or category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarkets.map((market, i) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onSelect={setSelectedMarket}
                    index={i}
                  />
                ))}
              </div>
            )}

            <Footer />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <Portfolio
            bets={bets}
            walletConnected={wallet.connected}
            onConnect={connectOPWallet}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard userAddress={wallet.address} />
        )}

        {activeTab === 'ai' && <AIAnalysis />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
        <div className="flex">
          {([
            { id: 'markets' as Tab, icon: '📊', label: 'Markets' },
            { id: 'portfolio' as Tab, icon: '💼', label: 'My Bets' },
            { id: 'leaderboard' as Tab, icon: '🏆', label: 'Ranks' },
            { id: 'ai' as Tab, icon: '🧠', label: 'AI' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center transition-all ${
                activeTab === tab.id ? 'text-btc' : 'text-gray-600'
              }`}
            >
              <div className="text-base">{tab.icon}</div>
              <div className="text-[9px] font-bold mt-0.5">{tab.label}</div>
            </button>
          ))}
        </div>
      </nav>

      {/* Bet modal */}
      {selectedMarket && (
        <BetModal
          market={selectedMarket}
          wallet={wallet}
          onClose={() => setSelectedMarket(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
