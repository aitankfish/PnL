/**
 * Hook to fetch and manage user profile data
 * Provides profile information including username and profile photo
 */

'use client';

import useSWR from 'swr';
import { useWallet } from './useWallet';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export interface UserProfile {
  walletAddress: string;
  username?: string;
  email?: string;
  profilePhotoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useUserProfile() {
  const { primaryWallet, user } = useWallet();

  // Fetch user profile from MongoDB
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data?: UserProfile;
    error?: string;
  }>(
    primaryWallet?.address ? `/api/profile/${primaryWallet.address}` : null,
    fetcher,
    {
      refreshInterval: 0, // Don't auto-refresh, manual refresh only
      revalidateOnFocus: false,
    }
  );

  const profile = data?.success && data.data ? data.data : null;

  // Get display name (priority: username > email prefix > address)
  const displayName = profile?.username
    || user?.email?.split('@')[0]
    || primaryWallet?.address?.slice(0, 8)
    || 'User';

  // Get profile photo URL (priority: stored photo > Privy photo > null)
  const profilePhotoUrl = profile?.profilePhotoUrl || user?.profileImageUrl || null;

  return {
    profile,
    displayName,
    profilePhotoUrl,
    isLoading,
    error,
    refreshProfile: mutate,
  };
}
