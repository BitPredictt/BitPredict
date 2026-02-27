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
    provider,
    signer,
    address: addressObj,
  } = useWalletConnect();

  const [loading, setLoading] = useState(false);

  const wallet: WalletState = useMemo(() => ({
    connected: !!walletAddress,
    address: walletAddress ?? '',
    balanceSats: walletBalance ? Number(walletBalance.confirmed) : 0,
    network: 'testnet',
  }), [walletAddress, walletBalance]);

  useEffect(() => {
    setLoading(connecting);
  }, [connecting]);

  const connectOPWallet = useCallback(async () => {
    try {
      connectToWallet(SupportedWallets.OP_WALLET);
    } catch {
      openConnectModal();
    }
  }, [connectToWallet, openConnectModal]);

  const disconnect = useCallback(() => {
    sdkDisconnect();
  }, [sdkDisconnect]);

  const refreshBalance = useCallback(async (_address: string) => {}, []);

  return {
    wallet,
    loading,
    connectOPWallet,
    disconnect,
    refreshBalance,
    isDemo: false,
    // From walletconnect SDK — use for ALL on-chain interactions
    network,        // WalletConnectNetwork (extends Network)
    provider,       // AbstractRpcProvider — wallet's own RPC, NOT testnet.opnet.org
    signer,         // UnisatSigner — for sendTransaction
    addressObj,     // Address object with MLDSA support
  };
}
