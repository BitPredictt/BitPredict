import { useState, useEffect } from 'react';
import { TrendingUp, Users, BarChart3, Shield, Layers, Activity } from 'lucide-react';
import * as api from '../lib/api';

export function ProtocolStats() {
  const [stats, setStats] = useState<api.ProtocolStats | null>(null);

  useEffect(() => {
    api.getProtocolStats().then(setStats).catch(() => {});
    const iv = setInterval(() => {
      api.getProtocolStats().then(setStats).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  if (!stats) return null;

  const fmt = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString();
  };

  const items = [
    { label: 'TVL', value: `${fmt(stats.tvl)} BPUSD`, icon: <Layers size={14} />, color: 'text-btc' },
    { label: '24h Volume', value: `${fmt(stats.volume24h)} BPUSD`, icon: <TrendingUp size={14} />, color: 'text-green-400' },
    { label: 'Total Bets', value: fmt(stats.totalBets), icon: <BarChart3 size={14} />, color: 'text-purple-400' },
    { label: 'Traders', value: fmt(stats.uniqueUsers), icon: <Users size={14} />, color: 'text-blue-400' },
    { label: 'Active Markets', value: String(stats.totalMarkets), icon: <Activity size={14} />, color: 'text-yellow-400' },
    { label: 'Auto-Resolved', value: String(stats.autoResolved), icon: <Shield size={14} />, color: 'text-emerald-400' },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-2/50 border border-white/5 rounded-xl p-3 text-center stat-card-hover">
          <div className={`${item.color} mx-auto mb-1 flex justify-center`}>{item.icon}</div>
          <div className="text-sm font-black text-white">{item.value}</div>
          <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
