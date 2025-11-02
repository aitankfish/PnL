/**
 * PLP Platform Configuration
 * Centralized configuration for environment variables and constants
 * 
 * @deprecated Use environment.ts for new configuration
 * This file is kept for backward compatibility
 */

export const config = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  
  // Solana Network Configuration
  solana: {
    network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    mainnetRpc: process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC || 'https://api.mainnet-beta.solana.com',
    devnetRpc: process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC || 'https://api.devnet.solana.com',
    isDevnet: (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') === 'devnet',
    isMainnet: (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') === 'mainnet-beta',
  },
  
  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || '',
    // Environment-specific database names
    devDatabase: process.env.MONGODB_DEV_DATABASE || 'plp_platform_dev',
    prodDatabase: process.env.MONGODB_PROD_DATABASE || 'plp_platform_prod',
    // Get current database name based on environment
    currentDatabase: process.env.NODE_ENV === 'production' 
      ? (process.env.MONGODB_PROD_DATABASE || 'plp_platform_prod')
      : (process.env.MONGODB_DEV_DATABASE || 'plp_platform_dev'),
  },
  
  // Dynamic Wallet
  dynamic: {
    environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID || '',
    apiToken: process.env.DYNAMIC_API_TOKEN || '',
    sandboxId: process.env.NEXT_PUBLIC_DYNAMIC_SANDBOX_ID || '',
  },
  
  // Actions Protocol
  actions: {
    programId: 'ACTUdJVh7H389kKpgxKjhR6o2JhRrTPdB9dS6cy41XzX', // Actions Protocol program ID
    platformId: 'ACTYY7k4vRAhzHw5gazNtEDdYEk1hC8751enx5K7Rwc', // Use default Actions Protocol platform
  },
  
  // Slerf Tools
  slerf: {
    apiKey: process.env.SLERF_TOOLS_API_KEY || '',
  },
  
  // Platform Constants
  platform: {
    fee: parseInt(process.env.NEXT_PUBLIC_PLATFORM_FEE || '500000000'), // 0.5 SOL in lamports
    targetPool: parseInt(process.env.NEXT_PUBLIC_TARGET_POOL || '5000000000'), // 5 SOL in lamports
    yesVoteCost: parseInt(process.env.NEXT_PUBLIC_YES_VOTE_COST || '50000000'), // 0.05 SOL in lamports
  },
  
  // UI Constants
  ui: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 5,
    maxDescriptionLength: 2000,
    maxAdditionalNotesLength: 1000,
    minTouchTarget: 44, // 44px minimum for mobile touch targets
  },
} as const;

// Helper functions
export const isDevnet = () => config.solana.isDevnet;
export const isMainnet = () => config.solana.isMainnet;
export const getSolanaRpcUrl = () => config.solana.rpcUrl;
export const getMainnetRpcUrl = () => config.solana.mainnetRpc;
export const getDevnetRpcUrl = () => config.solana.devnetRpc;
export const getNetworkName = () => config.solana.network;
