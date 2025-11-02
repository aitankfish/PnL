/**
 * Dynamic Wallet Provider Setup
 * Configures Dynamic wallet connection for Solana
 */

'use client';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Use appropriate Dynamic environment ID based on NODE_ENV
  // Production uses live environment, development uses sandbox
  const isProduction = process.env.NODE_ENV === 'production';
  const environmentId = isProduction 
    ? process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '08c4eb87-d159-4fed-82cd-e20233f87984'
    : process.env.NEXT_PUBLIC_DYNAMIC_SANDBOX_ID || process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '08c4eb87-d159-4fed-82cd-e20233f87984';

  // Log which environment is being used (only in development)
  if (!isProduction) {
    console.log(`🔧 Using Dynamic ${isProduction ? 'LIVE' : 'SANDBOX'} environment:`, environmentId);
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: environmentId,
        walletConnectors: [SolanaWalletConnectors],
        initialAuthenticationMode: 'connect-and-sign',
        eventsCallbacks: {
          onAuthSuccess: (args) => {
            console.log('Wallet connected:', args.user);
          },
          onAuthFailure: (args) => {
            console.error('Wallet connection failed:', args.error);
          },
          onLogout: () => {
            console.log('Wallet disconnected');
          },
        },
        // Custom design tokens to match space theme
        design: {
          // Modal backdrop
          overlay: {
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
          },
          // Modal card
          modal: {
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            borderRadius: '24px',
            border: '1px solid rgba(100, 200, 255, 0.2)',
            boxShadow: '0 0 60px rgba(100, 200, 255, 0.15), 0 0 120px rgba(59, 130, 246, 0.1)',
          },
          // Colors
          colors: {
            primary: '#3b82f6',
            primaryHover: '#2563eb',
            text: '#ffffff',
            textSecondary: '#cbd5e1',
            background: '#0f172a',
            backgroundSecondary: '#1e293b',
            border: 'rgba(100, 200, 255, 0.2)',
          },
          // Typography
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
