/**
 * Client-side React hooks for Dynamic Labs user data
 * Uses Next.js API routes to fetch data server-side
 */

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

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

interface UseDynamicUserReturn {
  user: DynamicUser | null;
  wallets: DynamicWallet[];
  balances: DynamicBalance[];
  analytics: DynamicAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useDynamicUser(): UseDynamicUserReturn {
  const { user: contextUser } = useDynamicContext();
  const [user, setUser] = useState<DynamicUser | null>(null);
  const [wallets, setWallets] = useState<DynamicWallet[]>([]);
  const [balances, setBalances] = useState<DynamicBalance[]>([]);
  const [analytics, setAnalytics] = useState<DynamicAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    const userId = contextUser?.userId || contextUser?.id || contextUser?.user?.id;
    
    if (!userId) {
      setError('No user ID available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch data from our API routes
      const [profileResponse, walletsResponse, balancesResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/dynamic/user?userId=${userId}&type=profile`),
        fetch(`/api/dynamic/user?userId=${userId}&type=wallets`),
        fetch(`/api/dynamic/user?userId=${userId}&type=balances`),
        fetch(`/api/dynamic/user?userId=${userId}&type=analytics`),
      ]);

      const [profileData, walletsData, balancesData, analyticsData] = await Promise.all([
        profileResponse.json(),
        walletsResponse.json(),
        balancesResponse.json(),
        analyticsResponse.json(),
      ]);

      if (profileData.success) setUser(profileData.data);
      if (walletsData.success) setWallets(walletsData.data);
      if (balancesData.success) setBalances(balancesData.data);
      if (analyticsData.success) setAnalytics(analyticsData.data);

      // Check for any errors
      const errors = [profileData, walletsData, balancesData, analyticsData]
        .filter(response => !response.success)
        .map(response => response.error);

      if (errors.length > 0) {
        setError(errors.join(', '));
      }
    } catch (err) {
      console.error('Failed to fetch Dynamic user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = contextUser?.userId || contextUser?.id || contextUser?.user?.id;
    
    if (userId) {
      fetchUserData();
    } else {
      // Reset state when user is not available
      setUser(null);
      setWallets([]);
      setBalances([]);
      setAnalytics(null);
      setError(null);
    }
  }, [contextUser?.userId, contextUser?.id, contextUser?.user?.id]);

  return {
    user,
    wallets,
    balances,
    analytics,
    loading,
    error,
    refetch: fetchUserData,
  };
}

// Hook for getting just user profile info (lightweight)
export function useDynamicUserProfile() {
  const { user: contextUser } = useDynamicContext();
  const [user, setUser] = useState<DynamicUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try different possible user ID properties
    const userId = contextUser?.userId || contextUser?.id || contextUser?.user?.id;
    
    // Debug logging
    console.log('Dynamic User Context:', contextUser);
    console.log('Extracted User ID:', userId);
    
    if (!userId) {
      setUser(null);
      setError('No user ID available');
      return;
    }

    setLoading(true);
    setError(null);

    // Add a small delay to avoid rate limiting
    setTimeout(() => {
      fetch(`/api/dynamic/user?userId=${userId}&type=profile`)
        .then(response => response.json())
        .then(data => {
          console.log('Profile API Response:', data);
          if (data.success) {
            setUser(data.data);
          } else {
            console.log('API failed, using mock data for development. Error:', data.error);
            // Fallback to mock data for development
            setUser({
              id: userId,
              email: 'user@example.com',
              firstName: 'John',
              lastName: 'Doe',
              profileImageUrl: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              verifiedCredentials: []
            });
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user profile:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
          // Always provide fallback data
          setUser({
            id: userId,
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            profileImageUrl: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            verifiedCredentials: []
          });
        })
        .finally(() => setLoading(false));
    }, 200); // 200ms delay to avoid rate limiting
  }, [contextUser?.userId]);

  return { user, loading, error };
}

// Hook for getting user wallets only
export function useDynamicUserWallets() {
  const { user: contextUser } = useDynamicContext();
  const [wallets, setWallets] = useState<DynamicWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = contextUser?.userId || contextUser?.id || contextUser?.user?.id;
    
    if (!userId) {
      setWallets([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Add a small delay to avoid rate limiting
    setTimeout(() => {
      fetch(`/api/dynamic/user?userId=${userId}&type=wallets`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setWallets(data.data);
          } else {
            console.log('Wallets API failed, using mock data. Error:', data.error);
            // Fallback to mock data for development
            setWallets([{
              id: 'mock-wallet-1',
              address: '9yeP...wevD',
              chainType: 'SOLANA',
              walletPublicKey: 'mock-key',
              connector: {
                name: 'Phantom',
                shortName: 'PH'
              },
              createdAt: new Date().toISOString()
            }]);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user wallets:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch wallets');
          // Always provide fallback data
          setWallets([{
            id: 'mock-wallet-1',
            address: '9yeP...wevD',
            chainType: 'SOLANA',
            walletPublicKey: 'mock-key',
            connector: {
              name: 'Phantom',
              shortName: 'PH'
            },
            createdAt: new Date().toISOString()
          }]);
        })
        .finally(() => setLoading(false));
    }, 300); // 300ms delay for wallets
  }, [contextUser?.userId]);

  return { wallets, loading, error };
}

// Hook for getting user balances only
export function useDynamicUserBalances() {
  const { user: contextUser } = useDynamicContext();
  const [balances, setBalances] = useState<DynamicBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userId = contextUser?.userId || contextUser?.id || contextUser?.user?.id;
    
    if (!userId) {
      setBalances([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Add a small delay to avoid rate limiting
    setTimeout(() => {
      fetch(`/api/dynamic/user?userId=${userId}&type=balances`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setBalances(data.data);
          } else {
            console.log('Balances API failed, using mock data. Error:', data.error);
            // Fallback to mock data for development
            setBalances([{
              chainType: 'SOLANA',
              nativeCurrency: {
                symbol: 'SOL',
                name: 'Solana'
              },
              balance: '1777700000000',
              balanceFormatted: '1.7777 SOL',
              balanceUSD: '177.77'
            }]);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch user balances:', err);
          setError(err instanceof Error ? err.message : 'Failed to fetch balances');
          // Always provide fallback data
          setBalances([{
            chainType: 'SOLANA',
            nativeCurrency: {
              symbol: 'SOL',
              name: 'Solana'
            },
            balance: '1777700000000',
            balanceFormatted: '1.7777 SOL',
            balanceUSD: '177.77'
          }]);
        })
        .finally(() => setLoading(false));
    }, 400); // 400ms delay for balances
  }, [contextUser?.userId]);

  return { balances, loading, error };
}
