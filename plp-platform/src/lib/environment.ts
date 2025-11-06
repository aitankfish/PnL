/**
 * Environment Configuration
 * Centralized configuration for switching between development and production environments
 * Automatically handles devnet/mainnet switching and other environment-specific settings
 */

import { config } from './config';

export interface EnvironmentConfig {
  // Network Configuration
  network: 'devnet' | 'mainnet-beta';
  rpcUrl: string;
  
  // Solana Configuration
  solana: {
    network: 'devnet' | 'mainnet-beta';
    rpcUrl: string;
    wsUrl?: string;
  };
  
  // Dynamic Labs Configuration
  dynamic: {
    environmentId: string;
    apiToken: string;
    isSandbox: boolean;
  };
  
  // Actions Protocol Configuration
  actions: {
    platformId: string;
    programId: string;
  };
  
  // IPFS Configuration
  ipfs: {
    enabled: boolean;
    gatewayUrl: string;
  };
  
  // Feature Flags
  features: {
    enableDevnetFaucet: boolean;
    enableMockMode: boolean;
    enableTestnetFeatures: boolean;
  };
  
  // UI Configuration
  ui: {
    showDebugInfo: boolean;
    showNetworkStatus: boolean;
  };
}

class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.buildConfig();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private buildConfig(): EnvironmentConfig {
    const isDevelopment = config.isDevelopment;

    // Determine network based on environment
    const network = isDevelopment ? 'devnet' : 'mainnet-beta';
    const rpcUrl = isDevelopment ? config.solana.devnetRpc : config.solana.mainnetRpc;

    // Dynamic Labs configuration
    const dynamicEnvironmentId = isDevelopment 
      ? (config.dynamic.sandboxId || '08c4eb87-d159-4fed-82cd-e20233f87984')
      : (config.dynamic.environmentId || 'eb8aea8b-5ab9-402f-95b1-efff16f611b5');
    
    const dynamicApiToken = isDevelopment
      ? (process.env.DYNAMIC_SANDBOX_API_TOKEN || process.env.DYNAMIC_API_TOKEN || '')
      : (process.env.DYNAMIC_LIVE_API_TOKEN || process.env.DYNAMIC_API_TOKEN || '');

    // Actions Protocol configuration
    const actionsPlatformId = 'ACTYY7k4vRAhzHw5gazNtEDdYEk1hC8751enx5K7Rwc'; // Use default Actions Protocol platform

    // IPFS configuration
    const ipfsEnabled = !!(process.env.NEXT_PUBLIC_PINATA_JWT || (process.env.NEXT_PUBLIC_PINATA_API_KEY && process.env.NEXT_PUBLIC_PINATA_SECRET_KEY));

    return {
      network,
      rpcUrl,
      
      solana: {
        network,
        rpcUrl,
        wsUrl: isDevelopment ? undefined : rpcUrl.replace('https://', 'wss://'),
      },
      
      dynamic: {
        environmentId: dynamicEnvironmentId,
        apiToken: dynamicApiToken,
        isSandbox: isDevelopment,
      },
      
      actions: {
        platformId: actionsPlatformId,
        programId: 'ACTUdJVh7H389kKpgxKjhR6o2JhRrTPdB9dS6cy41XzX', // Actions Protocol program ID
      },
      
      ipfs: {
        enabled: ipfsEnabled,
        gatewayUrl: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud',
      },
      
      features: {
        enableDevnetFaucet: isDevelopment,
        enableMockMode: isDevelopment,
        enableTestnetFeatures: isDevelopment,
      },
      
      ui: {
        showDebugInfo: isDevelopment,
        showNetworkStatus: isDevelopment,
      },
    };
  }

  /**
   * Get the current environment configuration
   */
  public getConfig(): EnvironmentConfig {
    return this.config;
  }

  /**
   * Get network-specific configuration
   */
  public getNetworkConfig() {
    return this.config.solana;
  }

  /**
   * Get Dynamic Labs configuration
   */
  public getDynamicConfig() {
    return this.config.dynamic;
  }

  /**
   * Get Actions Protocol configuration
   */
  public getActionsConfig() {
    return this.config.actions;
  }

  /**
   * Get IPFS configuration
   */
  public getIPFSConfig() {
    return this.config.ipfs;
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.config.features[feature];
  }

  /**
   * Check if UI debug info should be shown
   */
  public shouldShowDebugInfo(): boolean {
    return this.config.ui.showDebugInfo;
  }

  /**
   * Get the current network name for display
   */
  public getNetworkName(): string {
    return this.config.network === 'devnet' ? 'Devnet' : 'Mainnet';
  }

  /**
   * Get the network color for UI
   */
  public getNetworkColor(): string {
    return this.config.network === 'devnet' ? 'yellow' : 'green';
  }

  /**
   * Check if we're on devnet
   */
  public isDevnet(): boolean {
    return this.config.network === 'devnet';
  }

  /**
   * Check if we're on mainnet
   */
  public isMainnet(): boolean {
    return this.config.network === 'mainnet-beta';
  }

  /**
   * Get environment-specific logging prefix
   */
  public getLogPrefix(): string {
    const network = this.getNetworkName();
    const env = this.config.dynamic.isSandbox ? 'SANDBOX' : 'LIVE';
    return `[${network}:${env}]`;
  }

  /**
   * Validate configuration
   */
  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required environment variables
    if (!this.config.dynamic.environmentId) {
      errors.push('Dynamic environment ID is not configured');
    }

    if (!this.config.dynamic.apiToken) {
      errors.push('Dynamic API token is not configured');
    }

    if (!this.config.actions.platformId) {
      errors.push('Actions Protocol platform ID is not configured');
    }


    if (!this.config.ipfs.enabled) {
      errors.push('IPFS is not configured (Pinata API keys missing)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration summary for debugging
   */
  public getConfigSummary(): object {
    return {
      network: this.config.network,
      rpcUrl: this.config.rpcUrl,
      dynamic: {
        environmentId: this.config.dynamic.environmentId,
        isSandbox: this.config.dynamic.isSandbox,
        hasApiToken: !!this.config.dynamic.apiToken,
      },
      actions: {
        hasPlatformId: !!this.config.actions.platformId,
      },
      ipfs: {
        enabled: this.config.ipfs.enabled,
      },
      features: this.config.features,
    };
  }
}

// Export singleton instance
export const environment = EnvironmentManager.getInstance();

// Export convenience functions
export const getEnvironmentConfig = () => environment.getConfig();
export const getNetworkConfig = () => environment.getNetworkConfig();
export const getDynamicConfig = () => environment.getDynamicConfig();
export const getActionsConfig = () => environment.getActionsConfig();
export const getIPFSConfig = () => environment.getIPFSConfig();
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']) => environment.isFeatureEnabled(feature);
export const isDevnet = () => environment.isDevnet();
export const isMainnet = () => environment.isMainnet();
export const getNetworkName = () => environment.getNetworkName();
export const getNetworkColor = () => environment.getNetworkColor();
export const shouldShowDebugInfo = () => environment.shouldShowDebugInfo();

// Export for backward compatibility
export default environment;
