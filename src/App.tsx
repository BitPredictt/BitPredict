import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Filter, ExternalLink, Github, BarChart3, Lock, Briefcase, Trophy, Bot, Plus } from 'lucide-react';
import type { Tab, CategoryFilter, Market, Bet } from './types';
import { CATEGORIES } from './data/markets';
import { useWallet } from './hooks/useWallet';
import * as api from './lib/api';
import { approveForMarket, placeBetOnChain, waitForTxConfirmation, waitForTxVisible, waitForAllowanceUpdate, getOnChainWbtcBalance, OPNET_CONFIG, formatBtc } from './lib/opnet';
import { Header } from './components/Header';
import { useTheme } from './hooks/useTheme';
import { NetworkStats } from './components/NetworkStats';
import { MarketCard } from './components/MarketCard';
import { BetModal } from './components/BetModal';
import { CreateMarketModal } from './components/CreateMarketModal';
import { Leaderboard } from './components/Leaderboard';
import { AIChat } from './components/AIChat';
import { Portfolio } from './components/Portfolio';
import { ToastContainer, useToasts } from './components/Toast';
import type { ToastType } from './components/Toast';
import { Footer } from './components/Footer';
import { HowItWorks } from './components/HowItWorks';
import { VaultDashboard } from './components/VaultDashboard';
import { WalletPanel } from './components/WalletPanel';
import { ProtocolStats } from './components/ProtocolStats';
import { ActiveOperations } from './components/ActiveOperations';

function App() {
  const { wallet, loading: walletLoading, connectOPWallet, disconnect, refreshBalance, provider, network: walletNetwork, addressObj, signerReady, signMessage } = useWallet();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('markets');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'ending_soon' | 'liquidity'>('volume');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [onChainBalance, setOnChainBalance] = useState(0); // WBTC balance from on-chain balanceOf (in sats)
  const [backedBalance, setBackedBalance] = useState(0); // Backed balance (withdrawable)
  const [serverBalance, setServerBalance] = useState(0); // Total server balance
  const { toasts, addToast, removeToast } = useToasts();
  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [opsRefreshKey, setOpsRefreshKey] = useState(0);
  const marketsLoaded = useRef(false);

  /** Track an operation on the server + bump refresh key */
  const trackOp = useCallback(async (type: string, txHash?: string, details?: string, marketId?: string) => {
    if (!wallet.address) return null;
    try {
      const r = await api.createPendingOp(wallet.address, type, txHash, details, marketId);
      setOpsRefreshKey(k => k + 1);
      return r.id;
    } catch { return null; }
  }, [wallet.address]);

  const completeOp = useCallback(async (opId: number | null, status: 'confirmed' | 'failed', txHash?: string) => {
    if (!opId) return;
    try {
      await api.updatePendingOp(opId, status, txHash);
      setOpsRefreshKey(k => k + 1);
    } catch { /* silent */ }
  }, []);

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
      addressObj,
    );
  }, [wallet.connected, wallet.address, signerReady, signMessage, addressObj]);

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
    // Authenticate with server: challenge → sign → JWT
    const ref = new URLSearchParams(window.location.search).get('ref') || undefined;
    const doAuth = () => api.loginWithWallet(
      wallet.address,
      signMessage,
      ref,
      addressObj,
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
          netAmount: b.netAmount,
          price: b.price,
          timestamp: b.timestamp,
          status: b.status === 'cancelled' ? 'lost' as const : b.status as Bet['status'],
          payout: b.payout,
          potentialPayout: b.potentialPayout,
          txHash: b.txHash || undefined,
        })));
      }).catch(() => {});
    };
    loadBets();
    const iv = setInterval(loadBets, 15000);
    return () => clearInterval(iv);
  }, [wallet.connected, wallet.address, signerReady, signMessage]);

  // Fetch on-chain WBTC balance (real token balance from contract)
  // Retries on initial load because wallet SDK provider may not be ready immediately after reconnect
  useEffect(() => {
    if (!wallet.connected || !provider || !addressObj) return;
    let cancelled = false;
    const fetchBalance = () => {
      getOnChainWbtcBalance(provider, walletNetwork, addressObj)
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

  // Fetch server balance (including backed_balance) periodically
  useEffect(() => {
    if (!wallet.connected || !wallet.address) return;
    const fetchBal = () => {
      api.getBalance(wallet.address).then(b => {
        setServerBalance(b.balance);
        setBackedBalance(b.backedBalance);
      }).catch(() => {});
    };
    fetchBal();
    const iv = setInterval(fetchBal, 15000);
    return () => clearInterval(iv);
  }, [wallet.connected, wallet.address]);

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

  const handlePlaceBet = useCallback(async (marketId: string, side: 'yes' | 'no', amount: number) => {
    let market = markets.find((m) => m.id === marketId);
    if (!market) {
      market = markets.find((m) => m.outcomes?.some((o) => o.marketId === marketId));
    }
    if (!market || !wallet.connected) {
      addToast(!wallet.connected ? 'Wallet disconnected' : 'Market not found', 'error');
      throw new Error('Cannot place bet');
    }

    const pendingId = `pending-${Date.now()}`;
    const pendingBet: Bet = {
      id: pendingId, marketId, side, amount,
      price: side === 'yes' ? market.yesPrice : market.noPrice,
      timestamp: Date.now(), status: 'pending',
    };
    setBets((prev) => [pendingBet, ...prev]);

    let opId: number | null = null;
    try {
      // Ensure JWT is valid before any authenticated API call
      await ensureAuth();

      opId = await trackOp('buy', undefined, `${side.toUpperCase()} ${formatBtc(amount)}`, marketId);

      // Deploy market on-chain if not yet deployed
      let onchainId = market.onchainId;
      if (!onchainId) {
        addToast('Deploying market on-chain...', 'loading');
        await ensureAuth();
        const deploy = await api.deployMarket(marketId);
        if (!deploy.success) throw new Error(deploy.error || 'Deploy failed');
        onchainId = deploy.onchainId;
        // Update local market state
        setMarkets((prev) => prev.map((m) => m.id === marketId ? { ...m, onchainId } : m));
      }

      // Step 1/3: Approve WBTC for PredictionMarket contract
      addToast('Step 1/3: Approving WBTC...', 'loading');
      const approveResult = await approveForMarket(provider, walletNetwork, addressObj, wallet.address, amount);
      if (!approveResult.success) throw new Error(approveResult.error || 'Approval failed');

      if (approveResult.skipped) {
        addToast('WBTC already approved', 'success');
      } else if (approveResult.txHash) {
        const approveTxLink = `${OPNET_CONFIG.explorerUrl}/transactions/${approveResult.txHash}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
        addToast('Approval sent, waiting for on-chain update...', 'loading', approveTxLink, 'View TX');
        // Poll allowance instead of TX lookup — approve TXs may not appear via btc_getTransactionByHash
        const allowanceOk = await waitForAllowanceUpdate(provider, walletNetwork, addressObj, OPNET_CONFIG.contractAddress, amount, 90_000);
        if (!allowanceOk) {
          // Allowance didn't update in time — but the TX may still be processing, try placeBet anyway
          addToast('Allowance update slow, proceeding...', 'loading');
        }
      }

      // Step 2/3: Place bet on-chain via contract
      addToast('Step 2/3: Placing bet on-chain...', 'loading');
      const betResult = await placeBetOnChain(provider, walletNetwork, addressObj, wallet.address, onchainId!, side === 'yes', amount);
      if (!betResult.success) throw new Error(betResult.error || 'placeBet failed');
      const txHash = betResult.txHash;

      // Report immediately — btc_getTransactionByHash is unreliable, but TXs DO process
      const betTxLink = `${OPNET_CONFIG.explorerUrl}/transactions/${txHash}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
      addToast('Step 3/3: Recording bet...', 'loading', betTxLink, 'View TX');
      await ensureAuth();
      const result = await api.reportBetTx(wallet.address, marketId, side, amount, txHash, onchainId!);

      getOnChainWbtcBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});

      const confirmedBet: Bet = {
        id: result.betId, marketId, side, amount,
        netAmount: result.netAmount,
        price: side === 'yes' ? market.yesPrice : market.noPrice,
        timestamp: Date.now(), status: 'active',
        txHash,
      };
      setBets((prev) => prev.map((b) => b.id === pendingId ? confirmedBet : b));
      setMarkets((prev) => prev.map((m) =>
        m.id === marketId ? { ...m, yesPrice: result.newYesPrice, noPrice: result.newNoPrice, volume: m.volume + amount } : m
      ));
      const txLink = `${OPNET_CONFIG.explorerUrl}/transactions/${txHash}?network=${OPNET_CONFIG.network === 'mainnet' ? 'op_mainnet' : 'op_testnet'}`;
      addToast('Bet confirmed on-chain!', 'success', txLink, 'View TX');
      completeOp(opId, 'confirmed', txHash);
    } catch (err) {
      setBets((prev) => prev.filter((b) => b.id !== pendingId));
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Bet failed: ${msg}`, 'error');
      completeOp(opId, 'failed');
      throw err;
    }
  }, [markets, wallet.connected, wallet.address, provider, walletNetwork, addressObj, bets, refreshBalance, ensureAuth, addToast, trackOp, completeOp]);

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
        onWalletClick={() => setShowWalletModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
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

            {/* Quick Deposit Banner */}
            {wallet.connected && (
              <div className="mb-6 bg-surface-2/80 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-left">
                    <div className="text-xs text-green-400">WBTC Balance</div>
                    <div className="text-lg font-bold text-green-400">{formatBtc(onChainBalance)}</div>
                  </div>
                  <div className="w-px h-8 bg-white/10 hidden sm:block" />
                  <div className="text-center sm:text-left">
                    <div className="text-xs text-orange-400">BTC</div>
                    <div className="text-lg font-bold text-orange-400">{(wallet.balanceSats / 1e8).toFixed(6)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowWalletModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white text-sm font-bold hover:from-green-500 hover:to-green-400 transition-all whitespace-nowrap"
                >
                  Deposit / Withdraw
                </button>
              </div>
            )}

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
          <div className="space-y-6">
          <VaultDashboard
            walletConnected={wallet.connected}
            walletAddress={wallet.address}
            walletBtcBalance={wallet.balanceSats}
            onChainBalance={onChainBalance}
            onConnect={connectOPWallet}
            onBalanceRefresh={() => getOnChainWbtcBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {})}
            onToast={(msg, type, link, linkLabel) => addToast(msg, type as ToastType, link, linkLabel)}
            onEnsureAuth={ensureAuth}
            trackOp={trackOp}
            completeOp={completeOp}
            walletProvider={provider}
            walletNetwork={walletNetwork}
            walletAddressObj={addressObj}
          />
          </div>
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
            onBalanceRefresh={() => getOnChainWbtcBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {})}
            onBetsUpdate={setBets}
            onToast={(msg, type, link, linkLabel) => addToast(msg, type as ToastType, link, linkLabel)}
            onEnsureAuth={ensureAuth}
            trackOp={trackOp}
            completeOp={completeOp}
            walletProvider={provider}
            walletNetwork={walletNetwork}
            walletAddressObj={addressObj}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard userAddress={wallet.address} />
        )}

        {activeTab === 'ai' && <AIChat walletAddress={wallet.address} />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
        <div className="flex">
          {([
            { id: 'markets' as Tab, icon: <BarChart3 size={18} />, label: 'Markets' },
            { id: 'vault' as Tab, icon: <Lock size={18} />, label: 'Staking' },
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
          onCreated={(marketId) => {
            getOnChainWbtcBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});
            setShowCreateMarket(false);
            addToast(`Market created! ID: ${marketId.slice(0, 20)}...`, 'success');
            api.getMarkets().then(setMarkets).catch(() => {});
          }}
        />
      )}

      {/* Wallet Modal (Deposit / Withdraw) */}
      {showWalletModal && wallet.connected && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWalletModal(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
            <WalletPanel
              walletConnected={wallet.connected}
              walletAddress={wallet.address}
              onChainBalance={onChainBalance}
              walletBtcBalance={wallet.balanceSats}
              onConnect={connectOPWallet}
              onClose={() => setShowWalletModal(false)}
              onBalanceRefresh={() => {
                getOnChainWbtcBalance(provider, walletNetwork, addressObj).then(setOnChainBalance).catch(() => {});
                api.getBalance(wallet.address).then(b => { setServerBalance(b.balance); setBackedBalance(b.backedBalance); }).catch(() => {});
              }}
              onToast={(msg, type, link, linkLabel) => addToast(msg, type as ToastType, link, linkLabel)}
              onEnsureAuth={ensureAuth}
              walletProvider={provider}
              walletNetwork={walletNetwork}
              walletAddressObj={addressObj}
            />
          </div>
        </div>
      )}

      {/* Active operations tracker */}
      {wallet.connected && (
        <ActiveOperations walletAddress={wallet.address} refreshKey={opsRefreshKey} />
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
