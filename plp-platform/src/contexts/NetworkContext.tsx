/**
 * Network Context - Single Source of Truth for Network State
 *
 * In production: Always uses mainnet-beta
 * In development: Allows manual network selection via dropdown (saved to localStorage)
 */

'use client';

import React, { createContext, useContext, useState } from 'react';

export type SolanaNetwork = 'devnet' | 'mainnet-beta';

interface NetworkContextType {
  network: SolanaNetwork;
  setNetwork: (network: SolanaNetwork) => void;
  isMainnet: boolean;
  isDevnet: boolean;
  isDevelopment: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const getInitialNetwork = (): SolanaNetwork => {
    // Production always uses mainnet
    if (!isDevelopment) {
      return 'mainnet-beta';
    }

    // Development: prioritize env variable over localStorage
    const envNetwork = process.env.NEXT_PUBLIC_SOLANA_NETWORK as SolanaNetwork;
    if (envNetwork === 'mainnet-beta' || envNetwork === 'devnet') {
      // Update localStorage to match env
      if (typeof window !== 'undefined') {
        localStorage.setItem('plp-network', envNetwork);
      }
      return envNetwork;
    }

    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('plp-network');
      if (saved === 'devnet' || saved === 'mainnet-beta') {
        return saved;
      }
    }

    // Final fallback to devnet
    return 'devnet';
  };

  const [network, setNetworkState] = useState<SolanaNetwork>(getInitialNetwork);

  const setNetwork = (newNetwork: SolanaNetwork) => {
    console.log('🔄 Network changed to:', newNetwork);
    setNetworkState(newNetwork);

    // Save to localStorage in development mode
    if (isDevelopment && typeof window !== 'undefined') {
      localStorage.setItem('plp-network', newNetwork);
    }
  };

  const value: NetworkContextType = {
    network,
    setNetwork,
    isMainnet: network === 'mainnet-beta',
    isDevnet: network === 'devnet',
    isDevelopment,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within NetworkProvider');
  }
  return context;
}
