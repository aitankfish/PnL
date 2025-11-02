/**
 * React hook for Dynamic Labs user data integration
 * Uses the Dynamic API to fetch user information, wallets, and balances
 */

import { useState, useEffect } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { dynamicAPI, type DynamicUser, type DynamicWallet, type DynamicBalance, type DynamicAnalytics } from '@/lib/dynamic-api';

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
  const { user: contextUser, primaryWallet } = useDynamicContext();
  const [user, setUser] = useState<DynamicUser | null>(null);
  const [wallets, setWallets] = useState<DynamicWallet[]>([]);
  const [balances, setBalances] = useState<DynamicBalance[]>([]);
  const [analytics, setAnalytics] = useState<DynamicAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = async () => {
    if (!contextUser?.userId) {
      setError('No user ID available');
      return;
    }

    // Skip API calls on client-side
    if (typeof window !== 'undefined') {
      setError('Dynamic API integration requires server-side setup');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user information, wallets, and balances in parallel
      const [userData, userWallets, userBalances, analyticsData] = await Promise.all([
        dynamicAPI.getUser(contextUser.userId),
        dynamicAPI.getUserWallets(contextUser.userId),
        dynamicAPI.getUserBalances(contextUser.userId),
        dynamicAPI.getAnalytics(),
      ]);

      setUser(userData);
      setWallets(userWallets);
      setBalances(userBalances);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to fetch Dynamic user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (contextUser?.userId) {
      fetchUserData();
    } else {
      // Reset state when user is not available
      setUser(null);
      setWallets([]);
      setBalances([]);
      setAnalytics(null);
      setError(null);
    }
  }, [contextUser?.userId]);

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
    if (!contextUser?.userId) {
      setUser(null);
      setError(null);
      return;
    }

    // Skip API calls on client-side
    if (typeof window !== 'undefined') {
      setError('Dynamic API integration requires server-side setup');
      return;
    }

    setLoading(true);
    setError(null);

    dynamicAPI.getUser(contextUser.userId)
      .then(setUser)
      .catch((err) => {
        console.error('Failed to fetch user profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      })
      .finally(() => setLoading(false));
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
    if (!contextUser?.userId) {
      setWallets([]);
      setError(null);
      return;
    }

    // Skip API calls on client-side
    if (typeof window !== 'undefined') {
      setError('Dynamic API integration requires server-side setup');
      return;
    }

    setLoading(true);
    setError(null);

    dynamicAPI.getUserWallets(contextUser.userId)
      .then(setWallets)
      .catch((err) => {
        console.error('Failed to fetch user wallets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch wallets');
      })
      .finally(() => setLoading(false));
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
    if (!contextUser?.userId) {
      setBalances([]);
      setError(null);
      return;
    }

    // Skip API calls on client-side
    if (typeof window !== 'undefined') {
      setError('Dynamic API integration requires server-side setup');
      return;
    }

    setLoading(true);
    setError(null);

    dynamicAPI.getUserBalances(contextUser.userId)
      .then(setBalances)
      .catch((err) => {
        console.error('Failed to fetch user balances:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
      })
      .finally(() => setLoading(false));
  }, [contextUser?.userId]);

  return { balances, loading, error };
}
