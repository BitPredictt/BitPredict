/**
 * Hook for reading live data from PredictionMarket contract via OP_NET RPC.
 * Uses JSON-RPC btc_call to simulate read-only methods.
 */
import { useState, useEffect, useCallback } from 'react';
import { OPNET_CONFIG } from '../lib/opnet';

const CONTRACT = OPNET_CONFIG.contractAddress;
const RPC = OPNET_CONFIG.rpcUrl;

// Method selectors from compiled ABI (SHA256-based, first 4 bytes)
const SELECTORS = {
  getMarketInfo: '0f4729a5',
  getPrice: '4cd11fa4',
  getUserShares: '3edd19ce',
} as const;

function u256ToHex(val: bigint): string {
  return val.toString(16).padStart(64, '0');
}

function hexToU256(hex: string): bigint {
  if (!hex || hex === '0x') return 0n;
  return BigInt(hex.startsWith('0x') ? hex : '0x' + hex);
}

async function rpcCall(to: string, calldata: string): Promise<string | null> {
  try {
    const res = await fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'btc_call',
        params: [{ to, data: calldata }],
      }),
    });
    const data = await res.json();
    if (data.result && !data.error) {
      return typeof data.result === 'string' ? data.result : data.result.result || null;
    }
    return null;
  } catch {
    return null;
  }
}

export interface MarketInfo {
  yesReserve: bigint;
  noReserve: bigint;
  totalPool: bigint;
  endBlock: bigint;
  resolved: boolean;
  outcome: boolean;
  yesPrice: number;
  noPrice: number;
}

export function useMarketInfo(marketId: bigint): { data: MarketInfo | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<MarketInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!CONTRACT) { setLoading(false); return; }
    setLoading(true);
    const calldata = SELECTORS.getMarketInfo + u256ToHex(marketId);
    const result = await rpcCall(CONTRACT, calldata);
    if (result) {
      const hex = result.startsWith('0x') ? result.slice(2) : result;
      if (hex.length >= 258) { // 4*64 + 2 bools
        const yesReserve = hexToU256(hex.slice(0, 64));
        const noReserve = hexToU256(hex.slice(64, 128));
        const totalPool = hexToU256(hex.slice(128, 192));
        const endBlock = hexToU256(hex.slice(192, 256));
        const resolved = hex.slice(256, 258) !== '00';
        const outcome = hex.slice(258, 260) !== '00';
        const total = yesReserve + noReserve;
        const yesPrice = total > 0n ? Number(noReserve * 10000n / total) / 10000 : 0.5;
        setData({ yesReserve, noReserve, totalPool, endBlock, resolved, outcome, yesPrice, noPrice: 1 - yesPrice });
      }
    }
    setLoading(false);
  }, [marketId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { data, loading, refetch: fetch_ };
}

export function useBlockHeight(): { block: number | null; loading: boolean } {
  const [block, setBlock] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const res = await fetch(RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'btc_blockNumber', params: [] }),
        });
        const data = await res.json();
        if (data.result) setBlock(Number(data.result));
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchBlock();
    const interval = setInterval(fetchBlock, 30000);
    return () => clearInterval(interval);
  }, []);

  return { block, loading };
}
