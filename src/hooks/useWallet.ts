import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
    walletInstance,
  } = useWalletConnect();

  const [loading, setLoading] = useState(false);

  /**
   * Issue #3 fix: "Wallet signer not ready"
   * The walletconnect SDK sets walletAddress before signer is ready.
   * We track signerReady separately — it becomes true only when both
   * walletAddress AND signer are non-null simultaneously.
   * This prevents ensureAuth from firing with a null signer.
   */
  const [signerReady, setSignerReady] = useState(false);
  const signerReadyRef = useRef(false);

  useEffect(() => {
    // Bob: signer (UnisatSigner) is ALWAYS null for OP_WALLET — it's UniSat-only.
    // Use walletInstance as readiness indicator for OP_WALLET signing.
    const isReady = !!(walletAddress && walletInstance);
    if (isReady !== signerReadyRef.current) {
      signerReadyRef.current = isReady;
      setSignerReady(isReady);
    }
  }, [walletAddress, walletInstance]);

  const wallet: WalletState = useMemo(() => ({
    connected: !!walletAddress,
    address: walletAddress ?? '',
    balanceSats: walletBalance?.total != null ? Number(walletBalance.total) : (walletBalance?.confirmed != null ? Number(walletBalance.confirmed) : 0),
    network: (import.meta.env.VITE_OPNET_NETWORK || 'testnet') as string,
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

  const refreshBalance = useCallback(async () => {}, []);

  /**
   * Sign a message for auth challenge.
   * Uses walletInstance.signMessage (Bob pattern) — NOT signer directly.
   * Waits until walletInstance is available to avoid "Wallet signer not ready".
   */
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletInstance) {
      throw new Error('Wallet signer not ready — wallet instance unavailable');
    }
    const signature = await (walletInstance as unknown as { signMessage: (msg: string) => Promise<string> }).signMessage(message);
    if (!signature) {
      throw new Error('Wallet returned empty signature');
    }
    return signature;
  }, [walletInstance]);

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
    signer,         // UnisatSigner — for sendTransaction (pass to getContract)
    addressObj,     // Address object with MLDSA support
    walletInstance, // Raw wallet instance — use for signMessage()
    signerReady,    // True only when both walletAddress AND signer are non-null
    signMessage,    // Safe sign helper — use instead of signer.sign directly
  };
}
