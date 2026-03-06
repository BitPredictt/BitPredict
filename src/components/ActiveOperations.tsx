import { useState, useEffect, useCallback } from 'react';
import { Loader2, ExternalLink, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import * as api from '../lib/api';
import { getExplorerTxUrl } from '../lib/opnet';

interface ActiveOperationsProps {
  walletAddress: string;
  refreshKey: number; // bump to force refresh
}

const OP_LABELS: Record<string, string> = {
  buy: 'Buy Shares',
  sell: 'Sell Shares',
  stake: 'Stake BPUSD',
  unstake: 'Unstake BPUSD',
  claim: 'Claim Payout',
  vault_claim: 'Claim Rewards',
  approve: 'Approve BPUSD',
  mint: 'Mint BPUSD',
};

export function ActiveOperations({ walletAddress, refreshKey }: ActiveOperationsProps) {
  const [ops, setOps] = useState<api.PendingOperation[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const loadOps = useCallback(async () => {
    if (!walletAddress) return;
    try {
      const result = await api.getPendingOps(walletAddress);
      setOps(result);
    } catch { /* silent */ }
  }, [walletAddress]);

  useEffect(() => {
    loadOps();
    const iv = setInterval(loadOps, 10000);
    return () => clearInterval(iv);
  }, [loadOps, refreshKey]);

  if (!walletAddress || ops.length === 0) return null;

  const statusIcon = (status: string) => {
    if (status === 'confirmed') return <CheckCircle2 size={12} className="text-green-400" />;
    if (status === 'failed' || status === 'expired') return <XCircle size={12} className="text-red-400" />;
    return <Loader2 size={12} className="animate-spin text-btc" />;
  };

  const statusColor = (status: string) => {
    if (status === 'confirmed') return 'border-green-500/30 bg-green-500/5';
    if (status === 'failed' || status === 'expired') return 'border-red-500/30 bg-red-500/5';
    return 'border-btc/30 bg-btc/5';
  };

  const timeAgo = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-[100] max-w-xs w-full">
      <div className="backdrop-blur-xl bg-surface-2/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin text-btc" />
            <span className="text-xs font-bold text-white">
              Active Operations ({ops.length})
            </span>
          </div>
          {collapsed ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </button>

        {/* Operations list */}
        {!collapsed && (
          <div className="px-3 pb-3 space-y-2 max-h-60 overflow-y-auto">
            {ops.map(op => (
              <div
                key={op.id}
                className={`rounded-xl p-2.5 border ${statusColor(op.status)} transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusIcon(op.status)}
                    <span className="text-[11px] font-bold text-white">
                      {OP_LABELS[op.type] || op.type}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-500">{timeAgo(op.created_at)}</span>
                </div>
                {op.details && (
                  <div className="text-[10px] text-gray-400 mt-1 truncate">{op.details}</div>
                )}
                {op.tx_hash && (
                  <a
                    href={getExplorerTxUrl(op.tx_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-[10px] text-btc hover:underline"
                  >
                    <ExternalLink size={9} />
                    {op.tx_hash.slice(0, 10)}...{op.tx_hash.slice(-6)}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
