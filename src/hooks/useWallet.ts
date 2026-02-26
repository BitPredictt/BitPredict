import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import type { WalletState } from '../types';

export function useWallet() {
  const {
    walletAddress,
    connecting,
    connectToWallet,
    openConnectModal,
    disconnect: sdkDisconnect,
    walletBalance,
    network,
  } = useWalletConnect();

  const [loading, setLoading] = useState(false);

  const wallet: WalletState = useMemo(() => ({
    connected: !!walletAddress,
    address: walletAddress ?? '',
    balanceSats: walletBalance ? Number(walletBalance.confirmed) : 0,
    network: 'regtest',
  }), [walletAddress, walletBalance]);

  // Sync loading state with SDK connecting state
  useEffect(() => {
    setLoading(connecting);
  }, [connecting]);

  const connectOPWallet = useCallback(async () => {
    try {
      // Try OP_WALLET first (official, supports MLDSA + quantum resistance)
      connectToWallet(SupportedWallets.OP_WALLET);
    } catch {
      // Fallback: open the connect modal which lets user pick
      openConnectModal();
    }
  }, [connectToWallet, openConnectModal]);

  const disconnect = useCallback(() => {
    sdkDisconnect();
  }, [sdkDisconnect]);

  const refreshBalance = useCallback(async (_address: string) => {
    // Balance is managed automatically by the SDK provider
  }, []);

  return {
    wallet,
    loading,
    connectOPWallet,
    disconnect,
    refreshBalance,
    isDemo: false,
    network,
  };
}
