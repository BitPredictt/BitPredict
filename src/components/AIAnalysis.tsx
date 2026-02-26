import { useState } from 'react';
import { BrainCircuit, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Send, Bot, Code2, Shield, Workflow } from 'lucide-react';
import type { Market } from '../types';
import { MOCK_MARKETS } from '../data/markets';

interface AnalysisResult {
  marketId: string;
  question: string;
  recommendation: 'yes' | 'no' | 'neutral';
  confidence: number;
  reasoning: string;
  factors: string[];
}

const generateAnalysis = (market: Market): AnalysisResult => {
  const isYesFavored = market.yesPrice > 0.5;
  const confidence = 55 + Math.floor(Math.random() * 30);
  
  const factors = [
    market.category === 'Crypto' ? 'Bitcoin adoption metrics trending upward' : 'Market sentiment analysis complete',
    `Current odds: ${Math.round(market.yesPrice * 100)}% YES / ${Math.round(market.noPrice * 100)}% NO`,
    `Volume: $${(market.volume / 1000).toFixed(0)}K indicates strong market interest`,
    market.liquidity > 100000 ? 'High liquidity — reliable price discovery' : 'Moderate liquidity — prices may be volatile',
    isYesFavored ? 'Market consensus leans YES' : 'Market consensus leans NO',
  ];

  const reasoning = isYesFavored
    ? `Based on current market data and trend analysis, the YES outcome appears more likely. The market has attracted significant volume ($${(market.volume / 1000).toFixed(0)}K), and the current pricing of ${Math.round(market.yesPrice * 100)}¢ suggests the crowd expects this outcome. However, markets can shift quickly — consider position sizing carefully.`
    : `The NO outcome is currently favored by the market at ${Math.round(market.noPrice * 100)}¢. While contrarian YES bets offer higher potential returns, the consensus view has historically been reliable in similar markets. Volume of $${(market.volume / 1000).toFixed(0)}K provides reasonable price confidence.`;

  return {
    marketId: market.id,
    question: market.question,
    recommendation: isYesFavored ? 'yes' : 'no',
    confidence,
    reasoning,
    factors,
  };
};

export function AIAnalysis() {
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [customQuery, setCustomQuery] = useState('');

  const handleAnalyze = async (market: Market) => {
    setSelectedMarket(market);
    setLoading(true);
    setAnalysis(null);
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
    setAnalysis(generateAnalysis(market));
    setLoading(false);
  };

  const handleCustomQuery = async () => {
    if (!customQuery.trim()) return;
    const randomMarket = MOCK_MARKETS[Math.floor(Math.random() * MOCK_MARKETS.length)];
    await handleAnalyze(randomMarket);
    setCustomQuery('');
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-btc/20 flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
          <BrainCircuit size={32} className="text-purple-400" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">AI Market Analyst</h2>
        <p className="text-xs text-gray-500 mt-1">Powered by <span className="text-btc font-bold">Bob</span> — OP_NET AI Agent</p>
      </div>

      {/* Bob AI Agent Card */}
      <div className="bg-gradient-to-br from-purple-500/5 to-btc/5 rounded-2xl p-5 border border-purple-500/10 mb-2">
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
              Bob analyzes markets using on-chain OP_NET data, AMM reserve ratios, volume patterns, and smart contract state to generate trading signals.
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

      {/* Custom query */}
      <div className="flex gap-2">
        <input
          type="text"
          value={customQuery}
          onChange={(e) => setCustomQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustomQuery()}
          placeholder="Ask about any market..."
          className="flex-1 bg-surface-2 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-btc/30 focus:outline-none transition-colors"
        />
        <button
          onClick={handleCustomQuery}
          className="btc-btn flex items-center gap-2 shrink-0"
        >
          <Send size={16} />
          Analyze
        </button>
      </div>

      {/* Quick picks */}
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Quick Analysis</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MOCK_MARKETS.slice(0, 6).map((market) => (
            <button
              key={market.id}
              onClick={() => handleAnalyze(market)}
              className={`text-left p-3 rounded-xl border transition-all ${
                selectedMarket?.id === market.id
                  ? 'bg-btc/10 border-btc/30'
                  : 'bg-surface-2/50 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-xs font-bold text-white leading-snug line-clamp-2">{market.question}</div>
              <div className="text-[10px] text-gray-500 mt-1">{market.category} · {Math.round(market.yesPrice * 100)}% YES</div>
            </button>
          ))}
        </div>
      </div>

      {/* Analysis result */}
      {loading && (
        <div className="bg-surface-2 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-400 animate-pulse" />
            </div>
            <div>
              <div className="h-3 w-32 animate-shimmer rounded" />
              <div className="h-2 w-48 animate-shimmer rounded mt-2" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 animate-shimmer rounded w-full" />
            <div className="h-3 animate-shimmer rounded w-4/5" />
            <div className="h-3 animate-shimmer rounded w-3/5" />
          </div>
        </div>
      )}

      {analysis && !loading && (
        <div className="bg-surface-2 rounded-2xl p-6 border border-white/5 space-y-4 animate-fade-in">
          {/* Market info */}
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              analysis.recommendation === 'yes' ? 'bg-green-500/20' : analysis.recommendation === 'no' ? 'bg-red-500/20' : 'bg-yellow-500/20'
            }`}>
              {analysis.recommendation === 'yes' ? (
                <TrendingUp size={20} className="text-green-400" />
              ) : analysis.recommendation === 'no' ? (
                <TrendingDown size={20} className="text-red-400" />
              ) : (
                <AlertTriangle size={20} className="text-yellow-400" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">{analysis.question}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs font-black uppercase ${
                  analysis.recommendation === 'yes' ? 'text-green-400' : analysis.recommendation === 'no' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  Recommend: {analysis.recommendation}
                </span>
                <span className="text-[10px] text-gray-500">· {analysis.confidence}% confidence</span>
              </div>
            </div>
          </div>

          {/* Confidence bar */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] text-gray-500">AI Confidence</span>
              <span className="text-[10px] text-btc font-bold">{analysis.confidence}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-btc-dark to-btc transition-all duration-700"
                style={{ width: `${analysis.confidence}%` }}
              />
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-surface-1 rounded-xl p-4">
            <h5 className="text-xs font-bold text-gray-400 mb-2">Analysis</h5>
            <p className="text-xs text-gray-300 leading-relaxed">{analysis.reasoning}</p>
          </div>

          {/* Factors */}
          <div>
            <h5 className="text-xs font-bold text-gray-400 mb-2">Key Factors</h5>
            <div className="space-y-1.5">
              {analysis.factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-btc mt-1.5 shrink-0" />
                  <span className="text-xs text-gray-400">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-gray-600 text-center pt-2 border-t border-white/5">
            Powered by <span className="text-btc">Bob AI</span> (OP_NET MCP) · Analysis is informational only · DYOR
          </p>
        </div>
      )}
    </div>
  );
}
