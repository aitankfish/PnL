'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  UserMinus,
  Users,
  ExternalLink,
} from 'lucide-react';
import useSWR from 'swr';
import Link from 'next/link';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PublicProfilePage() {
  const params = useParams();
  const profileWallet = params.wallet as string;
  const { primaryWallet } = useWallet();
  const viewerWallet = primaryWallet?.address;

  const [addressCopied, setAddressCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Fetch profile data
  const { data: profileData, error: profileError, isLoading: profileLoading, mutate: mutateProfile } = useSWR(
    profileWallet ? `/api/profile/${profileWallet}` : null,
    fetcher
  );

  // Fetch positions
  const { data: positionsData, isLoading: positionsLoading, mutate: mutatePositions } = useSWR(
    profileWallet ? `/api/user/${profileWallet}/positions` : null,
    fetcher
  );

  // Fetch projects
  const { data: projectsData, isLoading: projectsLoading } = useSWR(
    profileWallet ? `/api/projects?wallet=${profileWallet}` : null,
    fetcher
  );

  // Fetch follow status
  const { data: followStatusData, mutate: mutateFollowStatus } = useSWR(
    profileWallet && viewerWallet ? `/api/profile/${profileWallet}/follow-status?viewer=${viewerWallet}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.success) {
          setIsFollowing(data.data.isFollowing);
        }
      }
    }
  );

  const profile = profileData?.data;
  const followerCount = profile?.followerCount || 0;
  const followingCount = profile?.followingCount || 0;
  const isOwnProfile = viewerWallet && profileWallet === viewerWallet;

  // Copy address to clipboard
  const copyAddress = () => {
    navigator.clipboard.writeText(profileWallet);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 2000);
  };

  // Handle follow/unfollow
  const handleFollowToggle = async () => {
    if (!viewerWallet) {
      alert('Please connect your wallet to follow users');
      return;
    }

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/profile/${profileWallet}/follow?followerWallet=${viewerWallet}`, {
          method: 'DELETE',
        });

        const data = await response.json();
        if (data.success) {
          setIsFollowing(false);
          mutateProfile(); // Refresh profile to update follower count
          mutateFollowStatus();
        } else {
          alert(data.error || 'Failed to unfollow');
        }
      } else {
        // Follow
        const response = await fetch(`/api/profile/${profileWallet}/follow`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ followerWallet: viewerWallet }),
        });

        const data = await response.json();
        if (data.success) {
          setIsFollowing(true);
          mutateProfile(); // Refresh profile to update follower count
          mutateFollowStatus();
        } else {
          alert(data.error || 'Failed to follow');
        }
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      alert('Failed to update follow status');
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-white animate-spin mx-auto mb-3" />
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen p-4 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Failed to load profile</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-white/20 text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Profile Header */}
      <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
        <div className="text-center mb-6 px-4">
          {/* Profile Photo */}
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center overflow-hidden ring-4 ring-white/20 mx-auto mb-4">
            {profile?.profilePhotoUrl ? (
              <img src={profile.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            )}
          </div>

          {/* Username */}
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {profile?.username || 'Anonymous User'}
          </h1>

          {/* Bio */}
          {profile?.bio && (
            <p className="text-gray-400 text-sm sm:text-base mb-3 max-w-2xl mx-auto">
              {profile.bio}
            </p>
          )}

          {/* Wallet Address */}
          <button
            onClick={copyAddress}
            className="text-xs text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer inline-flex items-center gap-1 break-all max-w-full px-2"
          >
            <span className="truncate">
              {profileWallet.slice(0, 8)}...{profileWallet.slice(-6)}
            </span>
            {addressCopied ? (
              <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
            ) : (
              <Copy className="w-3 h-3 flex-shrink-0" />
            )}
          </button>
          {addressCopied && (
            <p className="text-xs text-green-400 mt-1">Copied!</p>
          )}
        </div>

        {/* Stats & Follow Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href={`/profile/${profileWallet}/followers`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-2xl font-bold text-white">{followerCount}</div>
              <div className="text-xs text-gray-400">Followers</div>
            </Link>
            <Link href={`/profile/${profileWallet}/following`} className="text-center hover:opacity-80 transition-opacity">
              <div className="text-2xl font-bold text-white">{followingCount}</div>
              <div className="text-xs text-gray-400">Following</div>
            </Link>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{profile?.totalPredictions || 0}</div>
              <div className="text-xs text-gray-400">Predictions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{profile?.projectsCreated || 0}</div>
              <div className="text-xs text-gray-400">Projects</div>
            </div>
          </div>

          {/* Follow Button - Only show if not own profile */}
          {!isOwnProfile && viewerWallet && (
            <Button
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              className={`${
                isFollowing
                  ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              }`}
            >
              {isFollowLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : isFollowing ? (
                <UserMinus className="w-4 h-4 mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}

          {/* View Own Wallet Button */}
          {isOwnProfile && (
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link href="/wallet">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Wallet
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Active Positions */}
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold text-white px-2 sm:px-0">Active Predictions</h3>

          {positionsLoading ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center text-gray-400 py-8">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading predictions...</p>
                </div>
              </CardContent>
            </Card>
          ) : positionsData?.success && positionsData.data?.active?.length > 0 ? (
            <div className="space-y-3">
              {positionsData.data.active.map((position: any) => (
                <Card key={position.marketId} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link href={`/market/${position.marketId}`} className="hover:text-cyan-400 transition-colors">
                          <h4 className="text-white font-semibold mb-1 truncate">{position.marketName}</h4>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                          <Badge className={`${
                            position.voteType === 'yes'
                              ? 'bg-green-500/20 text-green-400 border-green-400/30'
                              : 'bg-red-500/20 text-red-400 border-red-400/30'
                          }`}>
                            {position.voteType.toUpperCase()}
                          </Badge>
                          <span className="text-gray-400 whitespace-nowrap">
                            {position.totalAmount.toFixed(4)} SOL
                          </span>
                          <span className="text-gray-400 whitespace-nowrap">
                            {position.tradeCount} {position.tradeCount === 1 ? 'trade' : 'trades'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-center text-gray-400 py-8">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">No active predictions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Projects Created */}
        {projectsData?.success && projectsData.data?.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-white px-2 sm:px-0">Projects Created</h3>

            <div className="space-y-3">
              {projectsData.data.map((project: any) => (
                <Card key={project._id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {project.projectImageUrl ? (
                        <img
                          src={project.projectImageUrl}
                          alt={project.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold mb-1 truncate">{project.name}</h4>
                        <p className="text-gray-400 text-sm mb-2 line-clamp-2">{project.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
                            {project.category}
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-xs">
                            {project.tokenSymbol}
                          </Badge>
                          <Badge className={`text-xs ${
                            project.status === 'active'
                              ? 'bg-green-500/20 text-green-300 border-green-400/30'
                              : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                          }`}>
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
