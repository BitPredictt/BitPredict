import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, ExternalLink, Github, BarChart3, Lock, Briefcase, Trophy, Bot, Plus, X } from 'lucide-react';
import type { Tab, CategoryFilter, Market, Bet } from './types';
import { CATEGORIES } from './data/markets';
import { useWallet } from './hooks/useWallet';
import { useAchievements } from './hooks/useAchievements';
import * as api from './lib/api';
import { signRewardClaimProof, signBetAmountProof, buySharesOnChain, mintBpusdWithBtc, getOnChainBpusdBalance, approveForMarket, approveForVault, waitForTxConfirmation, SATS_PER_BPUSD, BTC_BET_FEE_PCT, BPUSD_BET_FEE_PCT, OPNET_CONFIG } from './lib/opnet';
import { Header } from './components/Header';
import { NetworkStats } from './components/NetworkStats';
import { MarketCard } from './components/MarketCard';
import { BetModal } from './components/BetModal';
import { CreateMarketModal } from './components/CreateMarketModal';
import { Leaderboard } from './components/Leaderboard';
import { AIChat } from './components/AIChat';
import { Portfolio } from './components/Portfolio';
import { Toast } from './components/Toast';
import { Footer } from './components/Footer';
import { HowItWorks } from './components/HowItWorks';
import { Achievements } from './components/Achievements';
import { VaultDashboard } from './components/VaultDashboard';
import { ProtocolStats } from './components/ProtocolStats';

function App() {
  const { wallet, loading: walletLoading, connectOPWallet, disconnect, refreshBalance, provider, network: walletNetwork, addressObj, signer, signerReady, signMessage } = useWallet();
  const achievements = useAchievements();
  const [activeTab, setActiveTab] = useState<Tab>('markets');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'ending_soon' | 'liquidity'>('volume');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [onChainBalance, setOnChainBalance] = useState(0); // BPUSD from on-chain balanceOf
  const [btcPrice, setBtcPrice] = useState(0); // Real BTC/USD price for rate calculation
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; link?: string; linkLabel?: string } | null>(null);
  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const marketsLoaded = useRef(false);

  // Ensure valid JWT before any authenticated API call.
  // Issue #3 fix: use signMessage from useWallet (checks walletInstance, not signer).
  // signerReady guards against timing issue where walletAddress is set before signer.
  const ensureAuth = useCallback(async () => {
    // Check if existing token matches current wallet address
    const existingToken = api.getAuthToken();
    if (existingToken) {
      try {
        const payload = JSON.parse(atob(existingToken.split('.')[1]));
        if (payload.address === wallet.address) return; // token valid for this wallet
      } catch { /* invalid token, re-auth */ }
      api.clearAuthToken(); // token is for a different address — clear it
    }
    if (!wallet.connected || !wallet.address) throw new Error('Wallet not connected');
    if (!signerReady) throw new Error('Wallet signer not ready — please wait a moment and try again');
    const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
    await api.loginWithWallet(
      wallet.address,
      signMessage,
      ref,
    );
  }, [wallet.connected, wallet.address, signerReady, signMessage]);

  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('bp_favorites') || '[]')); } catch { return new Set(); }
  });

  const toggleFavorite = useCallback((marketId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(marketId)) next.delete(marketId); else next.add(marketId);
      localStorage.setItem('bp_favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Fetch real BTC price for BTC→BPUSD rate calculation
  useEffect(() => {
    const fetchBtcPrice = () => api.getPrices().then(p => { if (p.btc > 0) setBtcPrice(p.btc); }).catch(() => {});
    fetchBtcPrice();
    const iv = setInterval(fetchBtcPrice, 60000); // refresh every 60s
    return () => clearInterval(iv);
  }, []);

  // Load markets from server
  useEffect(() => {
    if (marketsLoaded.current) return;
    marketsLoaded.current = true;
    api.getMarkets().then((m) => {
      setMarkets(m);
      setMarketsLoading(false);
      // Deep link: ?m=marketId → auto-open market
      const urlMarketId = new URLSearchParams(window.location.search).get('m');
      if (urlMarketId) {
        const found = m.find((mk) => mk.id === urlMarketId);
        if (found && !found.resolved) setSelectedMarket(found);
      }
    }).catch((e) => { console.error('Failed to load markets:', e); setMarketsLoading(false); });
    // Refresh every 10s for real-time updates
    const iv = setInterval(() => {
      api.getMarkets().then(setMarkets).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  // Auth user + load bets when wallet connects (and signer is ready), auto-refresh every 15s.
  // Issue #3 fix: depend on signerReady, NOT just wallet.connected.
  // The SDK sets walletAddress before signer — signerReady ensures both are available.
  useEffect(() => {
    if (!wallet.connected || !wallet.address || !signerReady) return;
    achievements.onWalletConnected();

    achievements.syncClaimedRewards(wallet.address);
    // Authenticate with server: challenge → sign → JWT
    const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
    const doAuth = () => api.loginWithWallet(
      wallet.address,
      signMessage,
      ref,
    ).catch((err) => console.warn('Auth failed:', err.message));

    if (!api.getAuthToken()) {
      doAuth();
    } else {
      // Validate existing token — re-auth if server rejects it
      api.getBalance(wallet.address).catch(() => {
        api.clearAuthToken();
        doAuth();
      });
    }

    const loadBets = () => {
      api.getUserBets(wallet.address).then((serverBets) => {
        setBets(serverBets.map((b) => ({
          id: b.id,
          marketId: b.marketId,
          question: b.question,
          side: b.side,
          amount: b.amount,
          price: b.price,
          timestamp: b.timestamp,
          status: b.status === 'cancelled' ? 'lost' as const : b.status as Bet['status'],
          payout: b.payout,
          shares: b.shares,
          currency: b.currency || 'bpusd',
        })));
      }).catch(() => {});
    };
    loadBets();
    const iv = setInterval(loadBets, 15000);
    return () => clearInterval(iv);
  }, [wallet.connected, wallet.address, signerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch on-chain BPUSD balance (real token balance from contract)
  // Retries on initial load because wallet SDK provider may not be ready immediately after reconnect
  useEffect(() => {
    if (!wallet.connected || !provider || !addressObj) return;
    let cancelled = false;
    const fetchBalance = () => {
      getOnChainBpusdBalance(provider, walletNetwork, addressObj)
        .then((b) => { if (!cancelled) setOnChainBalance(b); })
        .catch(() => {});
    };
    fetchBalance();
    // Retry quickly in case provider wasn't ready on first attempt
    const r1 = setTimeout(fetchBalance, 2000);
    const r2 = setTimeout(fetchBalance, 5000);
    const r3 = setTimeout(fetchBalance, 10000);
    const iv = setInterval(fetchBalance, 30000);
    return () => { cancelled = true; clearTimeout(r1); clearTimeout(r2); clearTimeout(r3); clearInterval(iv); };
  }, [wallet.connected, provider, walletNetwork, addressObj]);

  // Track leaderboard visits
  useEffect(() => {
    if (activeTab === 'leaderboard') {
      achievements.onLeaderboardVisited();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMarkets = useMemo(() => {
    let list = [...markets];

    if (category === 'Favorites') {
      list = list.filter((m) => favorites.has(m.id));
    } else if (category === 'Fast Bets') {
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
  }, [markets, category, search, sortBy, favorites]);

  const handlePlaceBet = useCallback(async (marketId: string, side: 'yes' | 'no', amount: number, currency: 'btc' | 'bpusd' = 'bpusd') => {
    let market = markets.find((m) => m.id === marketId);
    if (!market) {
      market = markets.find((m) => m.outcomes?.some((o) => o.marketId === marketId));
    }
    if (!market || !wallet.connected) {
      setToast({ message: !wallet.connected ? 'Wallet disconnected' : 'Market not found', type: 'error' });
      throw new Error('Cannot place bet');
    }

    const pendingId = `pending-${Date.now()}`;
    const pendingBet: Bet = {
      id: pendingId, marketId, side, amount,
      price: side === 'yes' ? market.yesPrice : market.noPrice,
      timestamp: Date.now(), status: 'pending',
      currency,
    };
    setBets((prev) => [pendingBet, ...prev]);

    try {
      let txHash = '';
      const hasOnchain = market.onchainId && market.onchainId > 0;

      if (currency === 'btc') {
        // BTC bet: always popup #1 — mint BPUSD + send BTC to treasury
        // Dynamic rate: 1 BPUSD = $1, so satsPerBpusd = 100M / btcPriceUSD
        const dynamicSatsPerBpusd = btcPrice > 0 ? Math.round(100_000_000 / btcPrice) : SATS_PER_BPUSD;
        const btcCostSats = Math.ceil(amount * dynamicSatsPerBpusd * (1 + BTC_BET_FEE_PCT));
        setToast({ message: `${hasOnchain ? 'Step 1/2: ' : ''}Mint ${amount} BPUSD + send ${btcCostSats.toLocaleString()} sats... Sign in OP_WALLET`, type: 'success' });
        const mintResult = await mintBpusdWithBtc(provider, walletNetwork, addressObj, wallet.address, amount, btcCostSats);
        if (!mintResult.success) throw new Error(mintResult.error || 'BTC→BPUSD conversion failed');
        txHash = mintResult.txHash;

        // If market is on-chain — approve (if needed) then buyShares
        if (hasOnchain) {
          setToast({ message: 'Checking allowance...', type: 'success' });
          const approveResult = await approveForMarket(provider, walletNetwork, addressObj, wallet.address, amount);
          if (!approveResult.success) throw new Error(approveResult.error || 'BPUSD approval failed');

          if (!approveResult.skipped) {
            setToast({ message: 'Waiting for approval confirmation...', type: 'success' });
            const apConf = await waitForTxConfirmation(provider, approveResult.txHash);
            if (!apConf.confirmed) throw new Error('Approval TX not confirmed in time. Please try again.');
          }

          setToast({ message: `${approveResult.skipped ? '' : 'Approved! '}Placing bet on-chain... Sign in OP_WALLET`, type: 'success' });
          const buyResult = await buySharesOnChain(provider, walletNetwork, addressObj, wallet.address, market.onchainId!, side === 'yes', amount);
          if (!buyResult.success) throw new Error(buyResult.error || 'buyShares failed');
          txHash = buyResult.txHash;
        }
      } else {
        // BPUSD bet
        if (hasOnchain) {
          // On-chain market: check allowance → approve if needed → buyShares
          setToast({ message: 'Checking allowance...', type: 'success' });
          const approveResult = await approveForMarket(provider, walletNetwork, addressObj, wallet.address, amount);
          if (!approveResult.success) throw new Error(approveResult.error || 'BPUSD approval failed');

          if (!approveResult.skipped) {
            setToast({ message: 'Waiting for approval confirmation...', type: 'success' });
            const apConf = await waitForTxConfirmation(provider, approveResult.txHash);
            if (!apConf.confirmed) throw new Error('Approval TX not confirmed in time. Please try again.');
          }

          setToast({ message: `${approveResult.skipped ? '' : 'Approved! '}Buying shares on-chain... Sign in OP_WALLET`, type: 'success' });
          const buyResult = await buySharesOnChain(provider, walletNetwork, addressObj, wallet.address, market.onchainId!, side === 'yes', amount);
          if (!buyResult.success) throw new Error(buyResult.error || 'buyShares failed');
          txHash = buyResult.txHash;
        } else {
          // Off-chain market: sign proof TX (1 popup)
          setToast({ message: 'Sign bet proof in OP_WALLET...', type: 'success' });
          const proofResult = await signBetAmountProof(provider, walletNetwork, addressObj, wallet.address, amount);
          if (!proofResult.success) throw new Error(proofResult.error || 'Bet proof signing failed');
          txHash = proofResult.txHash;
        }
      }

      setToast({ message: 'TX signed! Recording bet...', type: 'success' });

      // Ensure we have valid auth before server call
      await ensureAuth();

      // Send txHash to server — server records bet + AMM calc
      const result = await api.placeOnChainBet(wallet.address, marketId, side, amount, txHash, currency);

      // Refresh on-chain BPUSD balance
      getOnChainBpusdBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});
      // Refresh wallet BTC balance
      refreshBalance(wallet.address);

      const confirmedBet: Bet = {
        id: result.betId, marketId, side, amount,
        price: side === 'yes' ? market.yesPrice : market.noPrice,
        timestamp: Date.now(), status: 'active',
        shares: result.shares, txHash,
        currency,
      };
      setBets((prev) => prev.map((b) => b.id === pendingId ? confirmedBet : b));
      setMarkets((prev) => prev.map((m) =>
        m.id === marketId ? { ...m, yesPrice: result.newYesPrice, noPrice: result.newNoPrice, volume: m.volume + amount } : m
      ));
      const txLink = `${OPNET_CONFIG.explorerUrl}/transactions/${txHash}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
      setToast({ message: 'Bet confirmed on-chain!', type: 'success', link: txLink, linkLabel: 'View TX' });
      achievements.onBetPlaced(confirmedBet, bets, market.category);
    } catch (err) {
      setBets((prev) => prev.filter((b) => b.id !== pendingId));
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ message: `Bet failed: ${msg}`, type: 'error' });
      throw err;
    }
  }, [markets, wallet.connected, wallet.address, provider, walletNetwork, addressObj, bets, achievements, refreshBalance, ensureAuth]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <Header
        wallet={wallet}
        onConnect={connectOPWallet}
        onDisconnect={disconnect}
        connecting={walletLoading}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onChainBalance={onChainBalance}
      />
      <NetworkStats walletProvider={provider} marketCount={markets.filter(m => !m.resolved).length} />

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
                AI-powered prediction markets built on OP_NET. Trade binary outcomes with{import.meta.env.VITE_OPNET_NETWORK === 'testnet' ? ' testnet' : ''} Bitcoin on OP_NET.
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

            <ProtocolStats />
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
                {wallet.connected && (
                  <button
                    onClick={() => setShowCreateMarket(true)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-btc to-orange-500 text-white text-xs font-bold hover:from-btc-light hover:to-orange-400 transition-all"
                  >
                    <Plus size={14} />
                    Create
                  </button>
                )}
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
            {marketsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-surface-2 rounded-2xl p-5 border border-white/5 animate-pulse">
                    <div className="h-4 bg-surface-3 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-surface-3 rounded w-1/2 mb-4" />
                    <div className="flex gap-2">
                      <div className="h-8 bg-surface-3 rounded-lg flex-1" />
                      <div className="h-8 bg-surface-3 rounded-lg flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMarkets.length === 0 ? (
              <div className="text-center py-16">
                <Filter size={40} className="text-gray-700 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-400">No markets found</h3>
                <p className="text-xs text-gray-600 mt-1">Try a different search or category.</p>
                {(search || category !== 'All') && (
                  <button onClick={() => { setSearch(''); setCategory('All'); }} className="mt-3 px-4 py-2 rounded-lg bg-btc/10 text-btc text-xs font-bold hover:bg-btc/20 transition-all">
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarkets.map((market, i) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onSelect={setSelectedMarket}
                    index={i}
                    isFavorite={favorites.has(market.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}

            <Footer />
          </div>
        )}

        {activeTab === 'vault' && (
          <VaultDashboard
            walletConnected={wallet.connected}
            walletAddress={wallet.address}
            walletBtcBalance={wallet.balanceSats}
            onChainBalance={onChainBalance}
            onConnect={connectOPWallet}
            onBalanceRefresh={() => getOnChainBpusdBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {})}
            walletProvider={provider}
            walletNetwork={walletNetwork}
            walletAddressObj={addressObj}
          />
        )}

        {activeTab === 'portfolio' && (
          <Portfolio
            bets={bets}
            markets={markets}
            onChainBalance={onChainBalance}
            walletConnected={wallet.connected}
            walletAddress={wallet.address}
            walletBtcBalance={wallet.balanceSats}
            onConnect={connectOPWallet}
            onBalanceRefresh={() => getOnChainBpusdBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {})}
            onBetsUpdate={setBets}
            onToast={(msg, type, link, linkLabel) => setToast({ message: msg, type, link, linkLabel })}
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
            walletAddress={wallet.address}
            onClaimReward={async (rewardId, rewardType) => {
              // Server-side claim (amount is now controlled by server)
              await achievements.claimReward(wallet.address, rewardId, rewardType);
              // Refresh on-chain balance
              getOnChainBpusdBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});
            }}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
        <div className="flex">
          {([
            { id: 'markets' as Tab, icon: <BarChart3 size={18} />, label: 'Markets' },
            { id: 'vault' as Tab, icon: <Lock size={18} />, label: 'Vault' },
            { id: 'portfolio' as Tab, icon: <Briefcase size={18} />, label: 'Portfolio' },
            { id: 'leaderboard' as Tab, icon: <Trophy size={18} />, label: 'Ranks' },
            { id: 'ai' as Tab, icon: <Bot size={18} />, label: 'AI' },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center transition-all ${
                activeTab === tab.id ? 'text-btc' : 'text-gray-600'
              }`}
            >
              {tab.icon}
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
          onChainBalance={onChainBalance}
          btcPrice={btcPrice}
          onClose={() => setSelectedMarket(null)}
          onPlaceBet={handlePlaceBet}
        />
      )}

      {/* Create Market modal */}
      {showCreateMarket && wallet.connected && (
        <CreateMarketModal
          walletAddress={wallet.address}
          balance={onChainBalance}
          onClose={() => setShowCreateMarket(false)}
          onCreated={(marketId, _newBalance) => {
            getOnChainBpusdBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});
            setShowCreateMarket(false);
            setToast({ message: `Market created! ID: ${marketId.slice(0, 20)}...`, type: 'success' });
            api.getMarkets().then(setMarkets).catch(() => {});
          }}
        />
      )}

      {/* Achievement unlock notification — centered on screen */}
      {achievements.newUnlock && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto relative bg-gradient-to-r from-btc/40 to-purple-600/40 border border-btc/50 rounded-2xl px-8 py-5 backdrop-blur-2xl shadow-2xl flex items-center gap-4 animate-fade-in">
            <button onClick={achievements.dismissUnlock} className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 transition-colors">
              <X size={16} />
            </button>
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
