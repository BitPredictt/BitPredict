import { useState } from 'react';
import { BrainCircuit, Bot, Code2, Shield, Workflow, ExternalLink, HelpCircle, ChevronDown, ChevronUp, Zap, Wallet, Globe, BookOpen } from 'lucide-react';

interface FAQItem {
  q: string;
  a: string;
  category: 'opnet' | 'platform' | 'wallet' | 'trading';
}

const FAQ_DATA: FAQItem[] = [
  { category: 'opnet', q: 'What is OP_NET?', a: 'OP_NET is a Bitcoin Layer 1 smart contract platform. It uses Tapscript-encoded calldata to execute WASM-compiled AssemblyScript smart contracts directly on Bitcoin, without sidechains or bridges. It provides Solidity-like development experience on Bitcoin.' },
  { category: 'opnet', q: 'How does OP_NET differ from other Bitcoin L2s?', a: 'Unlike Lightning, Stacks, or RSK, OP_NET runs directly on Bitcoin L1. Smart contracts are compiled to WebAssembly (WASM) and executed by OP_NET validators. Settlement happens on Bitcoin mainchain with PoW + OP_NET consensus.' },
  { category: 'opnet', q: 'What is the OP_NET Regtest?', a: 'The OP_NET Regtest is the current testing environment for OP_NET smart contracts. It uses regtest BTC (bcrt1 addresses) and connects to https://regtest.opnet.org RPC. You can get regtest BTC from the faucet at faucet.opnet.org.' },
  { category: 'opnet', q: 'What is Bob AI?', a: 'Bob is the OP_NET AI agent accessible via MCP (Model Context Protocol). Bob can analyze smart contracts, audit code, generate market insights, and help developers build on OP_NET. Bob powers the AI analysis signals in BitPredict.' },
  { category: 'opnet', q: 'What programming language are contracts written in?', a: 'OP_NET smart contracts are written in AssemblyScript (TypeScript-like language) and compiled to WASM. The runtime (btc-runtime) provides Solidity-like patterns: storage, events, modifiers, and u256 math. No floating-point arithmetic is allowed.' },
  { category: 'platform', q: 'What is BitPredict?', a: 'BitPredict is a decentralized prediction market platform built on OP_NET. You can trade YES/NO shares on binary outcomes across Crypto, Politics, Sports, Tech, and Culture categories. Prices are determined by a constant-product AMM (x·y=k).' },
  { category: 'platform', q: 'How does the AMM pricing work?', a: 'BitPredict uses a constant-product AMM (x·y=k) similar to Uniswap. YES and NO reserves maintain a product invariant. When you buy YES shares, you add to NO reserves and remove from YES reserves, shifting the price. A 2% protocol fee applies.' },
  { category: 'platform', q: 'What happens when a market resolves?', a: 'When the outcome is determined, the market creator (or oracle) resolves the market. Winning shares become redeemable 1:1 from the total pool. Losers receive nothing. Payouts settle on Bitcoin L1 via OP_NET smart contract.' },
  { category: 'platform', q: 'How are achievements and XP earned?', a: 'Complete quests and milestones to earn XP: place predictions, use Bob AI analysis, connect your wallet, explore the leaderboard, and more. XP accumulates to increase your level shown in the Quests tab.' },
  { category: 'wallet', q: 'What wallet do I need?', a: 'BitPredict uses OP_WALLET, a browser extension (UniSat fork) that supports OP_NET smart contract interactions. Install it from opnet.org. It exposes APIs for account connection, transaction signing (signPsbt), and broadcasting.' },
  { category: 'wallet', q: 'How do I get regtest BTC?', a: 'Visit the OP_NET faucet at https://faucet.opnet.org to receive free regtest BTC. Your wallet address should start with bcrt1 for regtest. The faucet distributes small amounts sufficient for testing.' },
  { category: 'wallet', q: 'Why does my balance show 0?', a: 'Balance is fetched live from the OP_NET regtest RPC. If you are using a demo wallet (random address), the balance will be 0. Connect a real OP_WALLET with regtest BTC from the faucet to see a non-zero balance.' },
  { category: 'trading', q: 'What is slippage?', a: 'Slippage is the difference between the expected price and the actual execution price. Larger trades relative to pool liquidity cause more slippage. The AMM details panel in the bet modal shows your exact price impact.' },
  { category: 'trading', q: 'What is the protocol fee?', a: 'A 2% (200 basis points) fee is charged on each trade. This fee goes to liquidity providers and the protocol. It is automatically deducted from your trade amount before calculating shares received.' },
  { category: 'trading', q: 'Can I lose more than I invest?', a: 'No. Your maximum loss is limited to the amount you invest. If your prediction is wrong, you lose your stake. If correct, your shares are redeemable for a proportional share of the total pool.' },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  opnet: { label: 'OP_NET', icon: <Zap size={14} className="text-btc" /> },
  platform: { label: 'Platform', icon: <Globe size={14} className="text-purple-400" /> },
  wallet: { label: 'Wallet', icon: <Wallet size={14} className="text-green-400" /> },
  trading: { label: 'Trading', icon: <BookOpen size={14} className="text-blue-400" /> },
};

interface AIAnalysisProps {
  onAnalyze?: () => void;
}

export function AIAnalysis({ onAnalyze }: AIAnalysisProps) {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [filterCat, setFilterCat] = useState<string>('all');

  const toggle = (i: number) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else { next.add(i); onAnalyze?.(); }
      return next;
    });
  };

  const filtered = filterCat === 'all' ? FAQ_DATA : FAQ_DATA.filter((f) => f.category === filterCat);

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-btc/20 flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
          <HelpCircle size={32} className="text-purple-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Help & FAQ</h2>
        <p className="text-xs text-gray-500 mt-1">Everything about <span className="text-btc font-bold">OP_NET</span>, BitPredict & trading</p>
      </div>

      {/* Bob AI Agent Card */}
      <div className="bg-gradient-to-br from-purple-500/5 to-btc/5 rounded-2xl p-5 border border-purple-500/10">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/20">
            <Bot size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Bob AI Agent
              <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold border border-green-500/20">MCP Connected</span>
            </h3>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              Bob powers AI analysis signals shown on each market card. He analyzes on-chain data, AMM reserves, and volume patterns.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-surface-2/50 rounded-lg p-2 text-center">
            <Code2 size={14} className="text-btc mx-auto mb-1" />
            <div className="text-[9px] text-gray-500 font-bold">Contract Analysis</div>
          </div>
          <div className="bg-surface-2/50 rounded-lg p-2 text-center">
            <Shield size={14} className="text-green-400 mx-auto mb-1" />
            <div className="text-[9px] text-gray-500 font-bold">Security Audit</div>
          </div>
          <div className="bg-surface-2/50 rounded-lg p-2 text-center">
            <Workflow size={14} className="text-purple-400 mx-auto mb-1" />
            <div className="text-[9px] text-gray-500 font-bold">AMM Optimizer</div>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <a href="https://dev.opnet.org" target="_blank" rel="noopener noreferrer" className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-center hover:border-btc/20 transition-all group">
          <BrainCircuit size={18} className="text-btc mx-auto mb-1" />
          <div className="text-[10px] font-bold text-gray-400 group-hover:text-white">OP_NET Docs</div>
          <ExternalLink size={8} className="text-gray-600 mx-auto mt-1" />
        </a>
        <a href="https://faucet.opnet.org" target="_blank" rel="noopener noreferrer" className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-center hover:border-btc/20 transition-all group">
          <Wallet size={18} className="text-green-400 mx-auto mb-1" />
          <div className="text-[10px] font-bold text-gray-400 group-hover:text-white">Get Regtest BTC</div>
          <ExternalLink size={8} className="text-gray-600 mx-auto mt-1" />
        </a>
        <a href="https://opscan.org" target="_blank" rel="noopener noreferrer" className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-center hover:border-btc/20 transition-all group">
          <Globe size={18} className="text-purple-400 mx-auto mb-1" />
          <div className="text-[10px] font-bold text-gray-400 group-hover:text-white">Block Explorer</div>
          <ExternalLink size={8} className="text-gray-600 mx-auto mt-1" />
        </a>
        <a href="https://github.com/opbitpredict/BitPredict" target="_blank" rel="noopener noreferrer" className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-center hover:border-btc/20 transition-all group">
          <Code2 size={18} className="text-blue-400 mx-auto mb-1" />
          <div className="text-[10px] font-bold text-gray-400 group-hover:text-white">Source Code</div>
          <ExternalLink size={8} className="text-gray-600 mx-auto mt-1" />
        </a>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setFilterCat('all')} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${filterCat === 'all' ? 'bg-btc/20 text-btc border-btc/30' : 'bg-surface-2 text-gray-500 border-white/5 hover:text-white'}`}>All</button>
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <button key={key} onClick={() => setFilterCat(key)} className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${filterCat === key ? 'bg-btc/20 text-btc border-btc/30' : 'bg-surface-2 text-gray-500 border-white/5 hover:text-white'}`}>
            {meta.icon} {meta.label}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      <div className="space-y-2">
        {filtered.map((item, i) => {
          const globalIdx = FAQ_DATA.indexOf(item);
          const isOpen = openItems.has(globalIdx);
          const meta = CATEGORY_META[item.category];
          return (
            <div key={globalIdx} className="bg-surface-2/50 border border-white/5 rounded-xl overflow-hidden hover:border-white/10 transition-all">
              <button onClick={() => toggle(globalIdx)} className="w-full flex items-center gap-3 p-4 text-left">
                <div className="shrink-0">{meta.icon}</div>
                <span className="text-xs font-bold text-white flex-1">{item.q}</span>
                {isOpen ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-surface-1 rounded-lg p-3">
                    <p className="text-xs text-gray-300 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-600 text-center pt-2 border-t border-white/5">
        Powered by <span className="text-btc">Bob AI</span> (OP_NET MCP) · <a href="https://dev.opnet.org" target="_blank" rel="noopener noreferrer" className="text-btc hover:underline">Full Documentation</a>
      </p>
    </div>
  );
}
