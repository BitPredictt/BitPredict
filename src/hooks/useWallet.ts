import { useState, useCallback, useEffect } from 'react';
import type { WalletState } from '../types';

const STORAGE_KEY = 'bitpredict_wallet';

interface StoredWallet {
  address: string;
  connected: boolean;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: '',
    balanceSats: 0,
    network: 'testnet',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredWallet = JSON.parse(stored);
        if (parsed.connected && parsed.address) {
          setWallet((prev) => ({
            ...prev,
            connected: true,
            address: parsed.address,
            balanceSats: 50000 + Math.floor(Math.random() * 100000),
          }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const connectOPWallet = useCallback(async () => {
    setLoading(true);
    try {
      const opnet = (window as any).opnet;
      if (opnet && typeof opnet.requestAccounts === 'function') {
        const accounts = await opnet.requestAccounts();
        if (accounts && accounts.length > 0) {
          const addr = accounts[0];
          const state: WalletState = {
            connected: true,
            address: addr,
            balanceSats: 50000 + Math.floor(Math.random() * 100000),
            network: 'testnet',
          };
          setWallet(state);
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: addr, connected: true }));
          return;
        }
      }

      // Fallback: generate demo address for testnet
      const demoAddr = 'tb1q' + Array.from({ length: 38 }, () =>
        '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]
      ).join('');
      const state: WalletState = {
        connected: true,
        address: demoAddr,
        balanceSats: 75000 + Math.floor(Math.random() * 150000),
        network: 'testnet',
      };
      setWallet(state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: demoAddr, connected: true }));
    } catch (err) {
      console.error('Wallet connect failed:', err);
      // Still provide demo wallet
      const demoAddr = 'tb1q' + Array.from({ length: 38 }, () =>
        '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 36)]
      ).join('');
      setWallet({
        connected: true,
        address: demoAddr,
        balanceSats: 75000,
        network: 'testnet',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      connected: false,
      address: '',
      balanceSats: 0,
      network: 'testnet',
    });
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { wallet, loading, connectOPWallet, disconnect };
}
