import { Coins, ArrowLeftRight, Brain, Trophy } from 'lucide-react';

const steps = [
  {
    icon: <Coins size={20} className="text-btc" />,
    title: 'Choose a Market',
    desc: 'Browse prediction markets on crypto, politics, sports & more. Each market has YES/NO outcomes priced by AMM.',
  },
  {
    icon: <ArrowLeftRight size={20} className="text-purple-400" />,
    title: 'Buy Shares',
    desc: 'Use regtest BTC to buy YES or NO shares. Constant-product AMM (x·y=k) ensures fair pricing with slippage protection.',
  },
  {
    icon: <Brain size={20} className="text-green-400" />,
    title: 'AI Analysis',
    desc: 'Bob AI agent analyzes on-chain data, volume patterns, and reserve ratios to generate trading signals.',
  },
  {
    icon: <Trophy size={20} className="text-yellow-400" />,
    title: 'Collect Payout',
    desc: 'When the market resolves, winning shares are redeemable 1:1. Payouts settle directly on Bitcoin L1 via OP_NET.',
  },
];

export function HowItWorks() {
  return (
    <div className="my-12">
      <h3 className="text-center text-lg font-extrabold text-white mb-6">How It Works</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {steps.map((s, i) => (
          <div key={i} className="relative bg-surface-2/50 border border-white/5 rounded-2xl p-4 text-center hover:border-btc/20 transition-all group">
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-surface-1 border border-white/10 flex items-center justify-center text-[10px] font-black text-gray-500 group-hover:text-btc group-hover:border-btc/30 transition-colors">
              {i + 1}
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center mx-auto mb-3">
              {s.icon}
            </div>
            <h4 className="text-xs font-bold text-white mb-1">{s.title}</h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
