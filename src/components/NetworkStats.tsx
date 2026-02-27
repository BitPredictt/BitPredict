import { useState, useEffect } from 'react';
import { Activity, Box, Cpu, Zap, ExternalLink } from 'lucide-react';
import { fetchBlockHeight } from '../lib/opnet';

interface NetworkStatsProps {
  walletProvider?: unknown;
}

interface NetworkStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  change?: string;
}

export function NetworkStats({ walletProvider }: NetworkStatsProps) {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!walletProvider) return;
    let mounted = true;
    const poll = async () => {
      const height = await fetchBlockHeight(walletProvider);
      if (mounted && height !== null) {
        setBlockHeight(height);
        setLive(true);
      }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, [walletProvider]);

  const stats: NetworkStat[] = [
    {
      label: 'Network',
      value: 'OP_NET Testnet',
      icon: <Activity size={12} className="text-green-400" />,
    },
    {
      label: 'Block',
      value: blockHeight !== null ? blockHeight.toLocaleString() : '...',
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
    <div className="bg-surface-2/30 border-b border-white/3">
      <div className="max-w-6xl mx-auto flex items-center justify-center gap-4 overflow-x-auto no-scrollbar py-2 px-4">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className={`text-[10px] font-bold ${live ? 'text-green-400' : 'text-yellow-400'}`}>{live ? 'LIVE' : 'CONNECTING'}</span>
        </div>
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-1.5 shrink-0">
            {stat.icon}
            <span className="text-[10px] text-gray-600">{stat.label}:</span>
            <span className="text-[10px] text-gray-400 font-bold">{stat.value}</span>
          </div>
        ))}
        <a
          href="https://dev.opnet.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-btc transition-colors shrink-0"
        >
          Docs <ExternalLink size={8} />
        </a>
      </div>
    </div>
  );
}
