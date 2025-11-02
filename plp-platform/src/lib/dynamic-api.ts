/**
 * Dynamic Labs API Integration
 * Based on: https://www.dynamic.xyz/docs/developer-dashboard/api-token-permissions
 */

interface DynamicUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  verifiedCredentials: Array<{
    id: string;
    address: string;
    chainType: string;
    walletPublicKey: string;
  }>;
}

interface DynamicWallet {
  id: string;
  address: string;
  chainType: string;
  walletPublicKey: string;
  connector: {
    name: string;
    shortName: string;
  };
  createdAt: string;
}

interface DynamicBalance {
  chainType: string;
  nativeCurrency: {
    symbol: string;
    name: string;
  };
  balance: string;
  balanceFormatted: string;
  balanceUSD: string;
}

interface DynamicAnalytics {
  totalUsers: number;
  activeUsers: number;
  totalWallets: number;
  totalTransactions: number;
}

class DynamicAPI {
  private baseURL = 'https://app.dynamic.xyz/api';
  private environmentId: string;
  private apiToken: string;
  private isSandbox: boolean;

  constructor() {
    // Import environment here to avoid circular dependencies
    const { environment } = require('@/lib/environment');
    const dynamicConfig = environment.getDynamicConfig();
    
    // Use environment configuration
    this.isSandbox = dynamicConfig.isSandbox;
    this.environmentId = dynamicConfig.environmentId;
    this.apiToken = dynamicConfig.apiToken;
    
    // If no token found, throw an error with helpful message
    if (!this.apiToken) {
      const tokenType = this.isSandbox ? 'DYNAMIC_SANDBOX_API_TOKEN' : 'DYNAMIC_LIVE_API_TOKEN';
      throw new Error(`Dynamic API token not configured. Please set ${tokenType} in your environment variables.`);
    }
    
    console.log('Dynamic API Configuration:', {
      environment: this.isSandbox ? 'SANDBOX' : 'LIVE',
      environmentId: this.environmentId,
      hasToken: !!this.apiToken,
      tokenLength: this.apiToken?.length || 0,
      tokenStart: this.apiToken?.substring(0, 10) || 'none'
    });
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      throw new Error('Dynamic API calls must be made server-side only');
    }

    // Check if API token is available
    if (!this.apiToken || this.apiToken === 'your_api_token_here') {
      console.log('Dynamic API Token Status:', {
        hasToken: !!this.apiToken,
        tokenLength: this.apiToken?.length || 0,
        tokenStart: this.apiToken?.substring(0, 10) || 'none'
      });
      throw new Error('Dynamic API token not configured. Please set DYNAMIC_API_TOKEN in your environment variables.');
    }

    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Dynamic API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        url: url,
        errorText: errorText,
        hasToken: !!this.apiToken,
        tokenLength: this.apiToken?.length || 0
      });
      throw new Error(`Dynamic API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get user information by user ID
   * Requires: environment.users.read permission
   */
  async getUser(userId: string): Promise<DynamicUser> {
    return this.makeRequest(`/environments/${this.environmentId}/users/${userId}`);
  }

  /**
   * Get user wallets
   * Requires: environment.users.read permission
   */
  async getUserWallets(userId: string): Promise<DynamicWallet[]> {
    return this.makeRequest(`/environments/${this.environmentId}/users/${userId}/wallets`);
  }

  /**
   * Get user balances across all chains
   * Requires: environment.balances.read permission
   */
  async getUserBalances(userId: string): Promise<DynamicBalance[]> {
    // Try GET first, as POST might not be the correct method
    try {
      return this.makeRequest(`/environments/${this.environmentId}/users/${userId}/balances`);
    } catch (error) {
      console.log('GET failed, trying POST method for balances');
      return this.makeRequest(`/environments/${this.environmentId}/users/${userId}/balances`, {
        method: 'POST',
      });
    }
  }

  /**
   * Get environment analytics
   * Requires: environment.analytics.read permission
   */
  async getAnalytics(): Promise<DynamicAnalytics> {
    const overview = await this.makeRequest(`/environments/${this.environmentId}/analytics/overview`);
    
    return {
      totalUsers: overview.totalUsers || 0,
      activeUsers: overview.activeUsers || 0,
      totalWallets: overview.totalWallets || 0,
      totalTransactions: overview.totalTransactions || 0,
    };
  }

  /**
   * Get wallet information by wallet ID
   * Requires: environment.users.read permission
   */
  async getWallet(walletId: string): Promise<DynamicWallet> {
    return this.makeRequest(`/environments/${this.environmentId}/wallets/${walletId}`);
  }

  /**
   * Get all users in the environment (with pagination)
   * Requires: environment.users.read permission
   */
  async getUsers(limit: number = 50, offset: number = 0): Promise<{
    users: DynamicUser[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return this.makeRequest(`/environments/${this.environmentId}/users?${params}`);
  }
}

// Create singleton instance
export const dynamicAPI = new DynamicAPI();

// Export types for use in components
export type { DynamicUser, DynamicWallet, DynamicBalance, DynamicAnalytics };
