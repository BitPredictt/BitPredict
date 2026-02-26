import { useState, useCallback, useEffect, useRef } from 'react';
import type { WalletState } from '../types';
import { fetchBalance, isOPWalletAvailable } from '../lib/opnet';

const STORAGE_KEY = 'bitpredict_wallet';
const BALANCE_POLL_MS = 15_000;

interface StoredWallet {
  address: string;
  connected: boolean;
  isDemo: boolean;
}

async function loadRealBalance(address: string): Promise<number> {
  const bal = await fetchBalance(address);
  return bal ?? 0;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balanceSats: 0,
    network: 'regtest',
  });
  const [loading, setLoading] = useState(false);
  const isDemoRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBalance = useCallback(async (address: string) => {
    if (!address || isDemoRef.current) return;
    const bal = await loadRealBalance(address);
    setWallet((prev) => (prev.address === address ? { ...prev, balanceSats: bal } : prev));
  }, []);

  // Restore from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredWallet = JSON.parse(stored);
        if (parsed.connected && parsed.address) {
          isDemoRef.current = !!parsed.isDemo;
          setWallet({
            connected: true,
            address: parsed.address,
            balanceSats: 0,
            network: 'regtest',
          });
          if (!parsed.isDemo) {
            loadRealBalance(parsed.address).then((bal) => {
              setWallet((prev) => (prev.address === parsed.address ? { ...prev, balanceSats: bal } : prev));
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Poll balance for real wallets
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (wallet.connected && wallet.address && !isDemoRef.current) {
      pollRef.current = setInterval(() => refreshBalance(wallet.address), BALANCE_POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [wallet.connected, wallet.address, refreshBalance]);

  const connectOPWallet = useCallback(async () => {
    setLoading(true);
    try {
      if (isOPWalletAvailable()) {
        const opnet = (window as unknown as { opnet: { requestAccounts: () => Promise<string[]> } }).opnet;
        const accounts = await opnet.requestAccounts();
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          isDemoRef.current = false;
          setWallet({ connected: true, address: addr, balanceSats: 0, network: 'regtest' });
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: addr, connected: true, isDemo: false }));
          // Fetch real balance immediately
          const bal = await loadRealBalance(addr);
          setWallet((prev) => (prev.address === addr ? { ...prev, balanceSats: bal } : prev));
          return;
        }
      }

      // Fallback: demo wallet (clearly marked)
      const demoAddr = 'bcrt1q' + Array.from({ length: 38 }, () =>
        '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]
      ).join('');
      isDemoRef.current = true;
      const state: WalletState = { connected: true, address: demoAddr, balanceSats: 0, network: 'regtest' };
      setWallet(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: demoAddr, connected: true, isDemo: true }));
      // Try to fetch balance even for demo addr (will be 0 on-chain)
      const bal = await loadRealBalance(demoAddr);
      setWallet((prev) => (prev.address === demoAddr ? { ...prev, balanceSats: bal } : prev));
    } catch (err) {
      console.error('Wallet connect failed:', err);
      const demoAddr = 'bcrt1q' + Array.from({ length: 38 }, () =>
        '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]
      ).join('');
      isDemoRef.current = true;
      setWallet({ connected: true, address: demoAddr, balanceSats: 0, network: 'regtest' });
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    isDemoRef.current = false;
    setWallet({ connected: false, address: '', balanceSats: 0, network: 'regtest' });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { wallet, loading, connectOPWallet, disconnect, refreshBalance, isDemo: isDemoRef.current };
}
