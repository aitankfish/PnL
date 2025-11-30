/**
 * SPL Token Configuration
 * Token mint addresses for different networks
 */

import { PublicKey } from '@solana/web3.js';

// USDC Token Mint Addresses
export const USDC_MINT = {
  'mainnet-beta': new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  'devnet': new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
} as const;

// Token decimals
export const TOKEN_DECIMALS = {
  USDC: 6, // USDC has 6 decimals
  SOL: 9,  // SOL has 9 decimals
} as const;

// Get USDC mint address for current network
export const getUsdcMint = (network: 'devnet' | 'mainnet-beta'): PublicKey => {
  return USDC_MINT[network];
};

// Format token amount from raw value
export const formatTokenAmount = (
  amount: bigint | number,
  decimals: number,
  displayDecimals: number = 2
): string => {
  const value = Number(amount) / Math.pow(10, decimals);
  return value.toFixed(displayDecimals);
};
