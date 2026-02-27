import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, Loader2, Zap, TrendingUp, Shield, Cpu, Trash2, BrainCircuit, ExternalLink, BarChart3 } from 'lucide-react';
import * as api from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'bob';
  text: string;
  ts: number;
  source?: string;
}

const QUICK_PROMPTS = [
  { icon: <TrendingUp size={13} />, label: 'Best value', text: 'Какие рынки сейчас дают лучший expected value? Рассчитай EV.' },
  { icon: <BarChart3 size={13} />, label: 'BTC analysis', text: 'Analyze the current BTC price markets — what\'s your signal?' },
  { icon: <Sparkles size={13} />, label: 'Strategy', text: 'Build me a portfolio strategy: which markets to bet on and how much PRED to allocate?' },
  { icon: <Shield size={13} />, label: 'OP_NET tech', text: 'Explain how OP_NET smart contracts work on Bitcoin L1 — Tapscript, WASM, the whole stack.' },
  { icon: <Zap size={13} />, label: 'How to start', text: 'Как начать пользоваться BitPredict? Пошагово: кошелёк, фаусет, ставки.' },
  { icon: <Cpu size={13} />, label: 'On-chain flow', text: 'How does the on-chain bet flow work? Approve PRED → buyShares → claimPayout?' },
];

interface AIChatProps {
  onAnalyze?: () => void;
  walletAddress?: string;
}

export function AIChat({ onAnalyze, walletAddress }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bob',
      text: "Привет! Я **Bob** — AI-агент OP_NET и ведущий аналитик BitPredict.\n\nМоя база знаний: протокол OP_NET, смарт-контракты на Bitcoin L1, AMM-механики, on-chain аналитика. Под капотом — **Gemini LLM** + глубокая экспертиза OPNet.\n\n🔍 Спроси меня о рынках, стратегиях, OP_NET технологиях или попроси сигнал на конкретный маркет!",
      ts: Date.now(),
      source: 'bob+gemini',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', text: text.trim(), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    onAnalyze?.();

    try {
      const { reply, source } = await api.aiChat(text.trim(), walletAddress);
      setMessages((prev) => [...prev, {
        id: `bob-${Date.now()}`,
        role: 'bob',
        text: reply,
        ts: Date.now(),
        source,
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bob offline';
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'bob',
        text: `⚠️ ${msg}\n\nПопробуй ещё раз через пару секунд.`,
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [loading, onAnalyze, walletAddress]);

  const clearChat = () => {
    setMessages([{
      id: 'cleared',
      role: 'bob',
      text: "Чат очищен. Задавай вопросы — анализирую рынки, объясняю OP_NET, даю сигналы. 🤖",
      ts: Date.now(),
      source: 'bob',
    }]);
  };

  const showQuickPrompts = messages.length <= 1;

  return (
    <div className="space-y-4 pb-20 animate-fade-in max-w-2xl mx-auto">
      {/* Bob Header */}
      <div className="text-center mb-4">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600/30 via-btc/20 to-blue-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
            <BrainCircuit size={36} className="text-purple-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-surface-1 flex items-center justify-center">
            <Zap size={10} className="text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-extrabold text-white">Bob AI</h2>
        <p className="text-[11px] text-gray-500 mt-1">
          <span className="text-purple-400 font-bold">OP_NET Intelligence</span> · Powered by <span className="text-btc font-bold">Gemini</span>
        </p>
        <div className="flex items-center justify-center gap-3 mt-2">
          <span className="text-[9px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-bold border border-purple-500/20">Protocol Expert</span>
          <span className="text-[9px] bg-btc/15 text-btc px-2 py-0.5 rounded-full font-bold border border-btc/20">Market Analyst</span>
          <span className="text-[9px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold border border-green-500/20">On-chain AI</span>
        </div>
      </div>

      {/* Capabilities strip */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { icon: <BarChart3 size={14} />, label: 'Market Analysis', color: 'text-btc' },
          { icon: <Shield size={14} />, label: 'Contract Audit', color: 'text-green-400' },
          { icon: <Cpu size={14} />, label: 'OP_NET Tech', color: 'text-purple-400' },
          { icon: <TrendingUp size={14} />, label: 'Trade Signals', color: 'text-blue-400' },
        ].map((c, i) => (
          <div key={i} className="bg-surface-2/40 rounded-lg p-2 text-center border border-white/5">
            <div className={`${c.color} mx-auto mb-0.5`}>{c.icon}</div>
            <div className="text-[8px] text-gray-500 font-bold">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Quick prompts */}
      {showQuickPrompts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p.text)}
              className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-left hover:border-purple-500/30 transition-all group"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-purple-400">{p.icon}</span>
                <span className="text-[10px] font-bold text-purple-400 group-hover:text-btc">{p.label}</span>
              </div>
              <div className="text-[10px] text-gray-500 group-hover:text-gray-300 leading-snug line-clamp-2">{p.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-btc/15 text-white border border-btc/20'
                  : 'bg-gradient-to-br from-surface-2/90 to-purple-500/5 text-gray-200 border border-purple-500/10'
              }`}
            >
              {msg.role === 'bob' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <BrainCircuit size={13} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-400">Bob</span>
                  {msg.source && (
                    <span className="text-[8px] bg-purple-500/10 text-purple-300/60 px-1.5 py-0.5 rounded-full border border-purple-500/10">
                      {msg.source}
                    </span>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap [&_strong]:text-white [&_strong]:font-bold">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-surface-2/90 to-purple-500/5 border border-purple-500/10 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-purple-400 animate-spin" />
              <span className="text-[11px] text-gray-400">Bob анализирует...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Спроси Bob о рынках, стратегиях, OP_NET..."
            disabled={loading}
            className="w-full bg-surface-2 border border-white/5 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-gray-600 focus:border-purple-500/30 focus:outline-none transition-colors disabled:opacity-50"
          />
          <BrainCircuit size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500/40" />
        </div>
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-4 rounded-xl bg-gradient-to-r from-purple-600 to-btc text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-purple-500/20"
        >
          <Send size={16} />
        </button>
        {messages.length > 2 && (
          <button onClick={clearChat} className="px-3 rounded-xl bg-surface-2 border border-white/5 text-gray-500 hover:text-white transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 pt-2 border-t border-white/5">
        <span className="text-[9px] text-gray-600">
          <BrainCircuit size={9} className="inline text-purple-400 mr-0.5" /> Bob AI · OP_NET Intelligence
        </span>
        <a href="https://dev.opnet.org" target="_blank" rel="noopener noreferrer" className="text-[9px] text-gray-600 hover:text-btc flex items-center gap-0.5">
          Docs <ExternalLink size={7} />
        </a>
        <a href="https://opscan.org" target="_blank" rel="noopener noreferrer" className="text-[9px] text-gray-600 hover:text-btc flex items-center gap-0.5">
          Explorer <ExternalLink size={7} />
        </a>
      </div>
    </div>
  );
}
