import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, ExternalLink, Github } from 'lucide-react';
import type { Tab, CategoryFilter, Market, Bet } from './types';
import { CATEGORIES } from './data/markets';
import { useWallet } from './hooks/useWallet';
import { useAchievements } from './hooks/useAchievements';
import * as api from './lib/api';
import { signBetProof } from './lib/opnet';
import { Header } from './components/Header';
import { NetworkStats } from './components/NetworkStats';
import { MarketCard } from './components/MarketCard';
import { BetModal } from './components/BetModal';
import { Leaderboard } from './components/Leaderboard';
import { AIChat } from './components/AIChat';
import { Portfolio } from './components/Portfolio';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { HowItWorks } from './components/HowItWorks';
import { Achievements } from './components/Achievements';

function App() {
  const { wallet, loading: walletLoading, connectOPWallet, disconnect, refreshBalance, provider, network: walletNetwork, addressObj } = useWallet();
  const achievements = useAchievements();
  const [activeTab, setActiveTab] = useState<Tab>('markets');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'ending_soon' | 'liquidity'>('volume');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [predBalance, setPredBalance] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; link?: string; linkLabel?: string } | null>(null);
  const marketsLoaded = useRef(false);

  // Load markets from server
  useEffect(() => {
    if (marketsLoaded.current) return;
    marketsLoaded.current = true;
    api.getMarkets().then(setMarkets).catch((e) => console.error('Failed to load markets:', e));
    // Refresh every 10s for real-time updates
    const iv = setInterval(() => {
      api.getMarkets().then(setMarkets).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Auth user + load balance and bets when wallet connects, auto-refresh every 15s
  useEffect(() => {
    if (!wallet.connected || !wallet.address) return;
    achievements.onWalletConnected();

    const loadBets = () => {
      api.authUser(wallet.address).then((u) => setPredBalance(u.balance)).catch(() => {});
      api.getUserBets(wallet.address).then((serverBets) => {
        setBets(serverBets.map((b) => ({
          id: b.id,
          marketId: b.marketId,
          side: b.side,
          amount: b.amount,
          price: b.price,
          timestamp: b.timestamp,
          status: b.status === 'cancelled' ? 'lost' as const : b.status as Bet['status'],
          payout: b.payout,
          shares: b.shares,
        })));
      }).catch(() => {});
    };
    loadBets();
    const iv = setInterval(loadBets, 15000);
    return () => clearInterval(iv);
  }, [wallet.connected, wallet.address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track leaderboard visits
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      achievements.onLeaderboardVisited();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMarkets = useMemo(() => {
    let list = [...markets];

    if (category === 'Fast Bets') {
      list = list.filter((m) => m.marketType === 'price_5min');
    } else if (category !== 'All') {
      list = list.filter((m) => m.category === category && m.marketType !== 'price_5min');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.question.toLowerCase().includes(q) ||
          m.tags.some((t) => t.includes(q)) ||
          m.category.toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case 'volume':
        list.sort((a, b) => b.volume - a.volume);
        break;
      case 'liquidity':
        list.sort((a, b) => b.liquidity - a.liquidity);
        break;
      case 'ending_soon':
        list = list.filter((m) => {
          const end = m.endTime ? m.endTime * 1000 : new Date(m.endDate).getTime();
          return end > Date.now() && end - Date.now() < 86400000;
        });
        list.sort((a, b) => {
          const endA = a.endTime ? a.endTime * 1000 : new Date(a.endDate).getTime();
          const endB = b.endTime ? b.endTime * 1000 : new Date(b.endDate).getTime();
          return endA - endB;
        });
        break;
    }

    // Always put resolved markets at the bottom
    list.sort((a, b) => {
      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
      return 0;
    });

    return list;
  }, [markets, category, search, sortBy]);

  const handlePlaceBet = useCallback(async (marketId: string, side: 'yes' | 'no', amount: number) => {
    const market = markets.find((m) => m.id === marketId);
    if (!market || !wallet.connected) return;

    const pendingId = `pending-${Date.now()}`;
    const pendingBet: Bet = {
      id: pendingId, marketId, side, amount,
      price: side === 'yes' ? market.yesPrice : market.noPrice,
      timestamp: Date.now(), status: 'pending',
    };
    setBets((prev) => [pendingBet, ...prev]);
    setToast({ message: 'Sign the transaction in OP_WALLET...', type: 'success' });

    try {
      // Step 1: User signs on-chain TX (increaseAllowance as bet proof) — user pays gas
      const proof = await signBetProof(provider, walletNetwork, addressObj, wallet.address, BigInt(amount));
      if (!proof.success) {
        throw new Error(proof.error || 'TX signing failed');
      }

      setToast({ message: 'TX signed! Recording bet...', type: 'success' });

      // Step 2: Send txHash to server — server records bet + AMM calc
      const result = await api.placeOnChainBet(wallet.address, marketId, side, amount, proof.txHash);

      setPredBalance(result.newBalance);
      const confirmedBet: Bet = {
        id: result.betId, marketId, side, amount,
        price: side === 'yes' ? market.yesPrice : market.noPrice,
        timestamp: Date.now(), status: 'active',
        shares: result.shares, txHash: proof.txHash,
      };
      setBets((prev) => prev.map((b) => b.id === pendingId ? confirmedBet : b));
      setMarkets((prev) => prev.map((m) =>
        m.id === marketId ? { ...m, yesPrice: result.newYesPrice, noPrice: result.newNoPrice, volume: m.volume + amount } : m
      ));
      const txLink = `https://opscan.org/transactions/${proof.txHash}?network=op_testnet`;
      setToast({ message: '✅ Bet confirmed on-chain!', type: 'success', link: txLink, linkLabel: 'View TX' });
      achievements.onBetPlaced(confirmedBet, bets, market.category);
    } catch (err) {
      setBets((prev) => prev.filter((b) => b.id !== pendingId));
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ message: `Bet failed: ${msg}`, type: 'error' });
    }
  }, [markets, wallet.connected, wallet.address, provider, walletNetwork, addressObj, bets, achievements]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <NetworkStats walletProvider={provider} />

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
                AI-powered prediction markets built on OP_NET. Trade binary outcomes with testnet Bitcoin on OP_NET.
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <a
                  href="https://github.com/BitPredictt/BitPredict"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-btc transition-colors"
                >
                  <Github size={14} />
                  GitHub
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
                  <option value="ending_soon">Ending Soon</option>
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
            markets={markets}
            predBalance={predBalance}
            walletConnected={wallet.connected}
            walletAddress={wallet.address}
            onConnect={connectOPWallet}
            onBalanceUpdate={setPredBalance}
            walletProvider={provider}
            walletNetwork={walletNetwork}
            walletAddressObj={addressObj}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard userAddress={wallet.address} />
        )}

        {activeTab === 'ai' && <AIChat onAnalyze={achievements.onAIUsed} walletAddress={wallet.address} />}

        {activeTab === 'achievements' && (
          <Achievements
            achievements={achievements.achievements}
            quests={achievements.quests}
            totalXP={achievements.totalXP}
            level={achievements.level}
            xpToNext={achievements.xpToNext}
            onFaucetVisited={achievements.onFaucetVisited}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
        <div className="flex">
          {([
            { id: 'markets' as Tab, icon: '📊', label: 'Markets' },
            { id: 'portfolio' as Tab, icon: '💼', label: 'Portfolio' },
            { id: 'achievements' as Tab, icon: '🏅', label: 'Quests' },
            { id: 'leaderboard' as Tab, icon: '🏆', label: 'Ranks' },
            { id: 'ai' as Tab, icon: '🤖', label: 'AI' },
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
          predBalance={predBalance}
          onClose={() => setSelectedMarket(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {/* Achievement unlock notification — centered on screen */}
      {achievements.newUnlock && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-btc/40 to-purple-600/40 border border-btc/50 rounded-2xl px-8 py-5 backdrop-blur-2xl shadow-2xl flex items-center gap-4 animate-fade-in">
            <span className="text-4xl">{achievements.newUnlock.icon}</span>
            <div>
              <div className="text-sm font-black text-btc">Achievement Unlocked!</div>
              <div className="text-lg font-bold text-white">{achievements.newUnlock.title}</div>
              <div className="text-xs text-gray-300">+{achievements.newUnlock.xpReward} XP</div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          link={toast.link}
          linkLabel={toast.linkLabel}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
