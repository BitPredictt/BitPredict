import { Buffer } from 'buffer';
// Required polyfills for OPNet SDK
(window as unknown as Record<string, unknown>).Buffer = Buffer;
(window as unknown as Record<string, unknown>).global = window;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WalletConnectProvider } from '@btc-vision/walletconnect';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletConnectProvider theme="dark">
      <App />
    </WalletConnectProvider>
  </StrictMode>,
);
