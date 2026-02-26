import { useState, useEffect } from 'react';
import { Activity, Box, Cpu, Zap, ExternalLink } from 'lucide-react';

interface NetworkStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
}

export function NetworkStats() {
  const [blockHeight, setBlockHeight] = useState(892_147);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlockHeight((prev) => prev + (Math.random() > 0.7 ? 1 : 0));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats: NetworkStat[] = [
    {
      label: 'Network',
      value: 'OP_NET Testnet',
      icon: <Activity size={12} className="text-green-400" />,
    },
    {
      label: 'Block Height',
      value: blockHeight.toLocaleString(),
      icon: <Box size={12} className="text-btc" />,
    },
    {
      label: 'Markets',
      value: '12 Active',
      icon: <Zap size={12} className="text-purple-400" />,
    },
    {
      label: 'Consensus',
      value: 'PoW + WASM',
      icon: <Cpu size={12} className="text-blue-400" />,
    },
  ];

  return (
    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-2 px-4 bg-surface-2/30 border-b border-white/3">
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="text-[10px] text-green-400 font-bold">LIVE</span>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-1.5 shrink-0">
          {stat.icon}
          <span className="text-[10px] text-gray-600">{stat.label}:</span>
          <span className="text-[10px] text-gray-400 font-bold">{stat.value}</span>
        </div>
      ))}
      <a
        href="https://docs.opnet.org"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-btc transition-colors shrink-0 ml-auto"
      >
        Docs <ExternalLink size={8} />
      </a>
    </div>
  );
}
