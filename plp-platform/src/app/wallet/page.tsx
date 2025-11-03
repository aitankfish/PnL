'use client';

import React, { useState, useEffect } from 'react';
import { useDynamicContext, DynamicEmbeddedWidget } from '@dynamic-labs/sdk-react-core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Settings,
  Target,
  TrendingUp,
  User,
  Activity,
  Plus,
  Award,
  Clock,
  Bell,
  Mail,
  Smartphone,
  Shield,
  Eye as EyeIcon,
  ExternalLink,
  TrendingDown
} from 'lucide-react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RPC_ENDPOINT, SOLANA_NETWORK } from '@/config/solana';
import useSWR from 'swr';

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function WalletPage() {
  const { primaryWallet, handleLogOut, user: contextUser } = useDynamicContext();

  // Use Dynamic context data directly
  const apiUser = contextUser;
  const apiWallets = primaryWallet ? [primaryWallet] : [];

  // Solana wallet balance state
  const [solBalance, setSolBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Fetch user stats
  const { data: statsData, error: statsError } = useSWR(
    primaryWallet?.address ? `/api/user/${primaryWallet.address}/stats` : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Fetch user trading history
  const { data: historyData, error: historyError } = useSWR(
    primaryWallet?.address ? `/api/user/${primaryWallet.address}/history` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch user positions
  const { data: positionsData, error: positionsError } = useSWR(
    primaryWallet?.address ? `/api/user/${primaryWallet.address}/positions` : null,
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch SOL balance from blockchain
  useEffect(() => {
    if (!primaryWallet?.address) {
      setSolBalance(0);
      return;
    }

    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);
        const connection = new Connection(RPC_ENDPOINT, 'confirmed');
        const publicKey = new PublicKey(primaryWallet.address);
        const balance = await connection.getBalance(publicKey);
        setSolBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Failed to fetch SOL balance:', error);
        setSolBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [primaryWallet?.address]);

  // Debug logging
  console.log('Dynamic Context User:', contextUser);
  console.log('Primary Wallet:', primaryWallet);
  console.log('Stats Data:', statsData);
  console.log('History Data:', historyData);
  console.log('Positions Data:', positionsData);
  console.log('SOL Balance:', solBalance);
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      push: true,
      projectUpdates: true,
      marketResults: true,
      weeklyDigest: false
    },
    privacy: {
      publicProfile: false,
      showActivity: true,
      showVotes: false,
      showStats: true
    },
    preferences: {
      theme: 'dark',
      autoConnect: true,
      defaultNetwork: 'devnet'
    }
  });

  // User stats from API
  const userStats = statsData?.success
    ? statsData.data
    : {
        projectsCreated: 0,
        totalVotes: 0,
        successfulPredictions: 0,
        totalSOLStaked: 0,
        joinedDate: new Date(),
        reputation: 0,
        successRate: 0,
        activePositions: 0,
        resolvedPositions: 0,
        totalTrades: 0,
      };

  // Recent activity from trading history
  const recentActivity =
    historyData?.success && historyData.data
      ? historyData.data.slice(0, 10).map((trade: any, index: number) => ({
          id: index + 1,
          type: trade.voteType === 'yes' ? 'vote' : 'vote',
          project: trade.marketName,
          action: `Voted ${trade.voteType.toUpperCase()}`,
          amount: `${trade.amount.toFixed(3)} SOL`,
          timestamp: new Date(trade.timestamp).toLocaleString(),
          status: 'success',
          marketState: trade.marketState,
          winningOption: trade.winningOption,
          signature: trade.signature,
        }))
      : [];

  // Active positions
  const activePositions = positionsData?.success ? positionsData.data.active : [];
  const claimablePositions = positionsData?.success ? positionsData.data.claimable : [];

  // Wallet helper functions

  const formatBalance = (balance: number) => {
    return balance.toFixed(4);
  };

  const updateSetting = (category: string, key: string, value: boolean | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'vote': return <TrendingUp className="w-4 h-4" />;
      case 'create': return <Plus className="w-4 h-4" />;
      case 'reward': return <Award className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'vote': return 'text-blue-400';
      case 'create': return 'text-purple-400';
      case 'reward': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Wallet & Profile</h1>
              <p className="text-gray-300 mt-1">Manage your wallet, profile, and settings</p>
            </div>
          </div>
          <Badge className="bg-green-500/20 text-green-300 border-green-400/30">
            Reputation: {userStats.reputation}
          </Badge>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Wallet Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Profile Information */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* My Information from Dynamic */}
                {apiUser ? (
                  <div className="space-y-4">
                    {/* Profile Header */}
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        {apiUser.profileImageUrl ? (
                          <img 
                            src={apiUser.profileImageUrl} 
                            alt="Profile" 
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {apiUser.firstName && apiUser.lastName 
                            ? `${apiUser.firstName} ${apiUser.lastName}` 
                            : apiUser.email?.split('@')[0] || 'User'
                          }
                        </h3>
                        {apiUser.email && (
                          <p className="text-sm text-gray-300">{apiUser.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Detailed User Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Information */}
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                          <User className="w-4 h-4" />
                          <span>Personal Information</span>
                        </h4>
                        <div className="space-y-2">
                          {apiUser?.firstName && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">First Name:</span>
                              <span className="text-white">{apiUser.firstName}</span>
                            </div>
                          )}
                          {apiUser?.lastName && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Name:</span>
                              <span className="text-white">{apiUser.lastName}</span>
                            </div>
                          )}
                          {apiUser?.email && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Email:</span>
                              <span className="text-white text-sm">{apiUser.email}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">User ID:</span>
                            <span className="text-white text-xs font-mono">
                              {apiUser?.id?.slice(0, 8) || apiUser?.userId?.slice(0, 8) || 'N/A'}...
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Account Information */}
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Account Details</span>
                        </h4>
                        <div className="space-y-2">
                          {apiUser?.createdAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Created:</span>
                              <span className="text-white text-sm">
                                {new Date(apiUser.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {apiUser?.updatedAt && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Last Updated:</span>
                              <span className="text-white text-sm">
                                {new Date(apiUser.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-400">Status:</span>
                            <Badge className="bg-green-500/20 text-green-300 border-green-400/30 text-xs">
                              {apiUser ? 'Active' : 'Not Connected'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Connected Wallets from Dynamic */}
                    {apiWallets && apiWallets.length > 0 && (
                      <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
                          <Wallet className="w-4 h-4" />
                          <span>Connected Wallets ({apiWallets.length})</span>
                        </h4>
                        <div className="space-y-2">
                          {apiWallets.map((wallet, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white/5 rounded border border-white/10">
                              <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded flex items-center justify-center">
                                  <span className="text-xs text-white font-bold">
                                    {wallet.connector?.name?.charAt(0) || 'W'}
                                  </span>
                                </div>
                                <span className="text-sm text-white">
                                  {wallet.connector?.name || 'Unknown Wallet'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400 font-mono">
                                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'No address'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 text-gray-400">
                    <div className="text-center">
                      <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Wallet connected but user profile data is not available</p>
                      <p className="text-sm mt-1">This may be due to API rate limits or configuration issues</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Member Since</div>
                    <div className="flex items-center space-x-2 text-white">
                      <Clock className="w-4 h-4" />
                      <span>
                        {apiUser 
                          ? new Date(apiUser.createdAt).toLocaleDateString()
                          : new Date(userStats.joinedDate).toLocaleDateString()
                        }
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                    {userStats.reputation} Rep
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-white">{userStats.projectsCreated}</div>
                    <div className="text-xs text-gray-400">Projects</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-white">{userStats.totalVotes}</div>
                    <div className="text-xs text-gray-400">Votes</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-white">
                      {Math.round((userStats.successfulPredictions / userStats.totalVotes) * 100)}%
                    </div>
                    <div className="text-xs text-gray-400">Success Rate</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-xl font-bold text-white">{userStats.totalSOLStaked}</div>
                    <div className="text-xs text-gray-400">SOL Staked</div>
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* Active Positions */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span>Active Positions</span>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Your current positions in active markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activePositions.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No active positions yet</p>
                    <p className="text-sm mt-1">Start voting on markets to see your positions here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activePositions.slice(0, 5).map((position: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:scale-[1.01] transition-all duration-200"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-white text-sm">
                              {position.marketName.length > 30
                                ? position.marketName.slice(0, 30) + '...'
                                : position.marketName}
                            </div>
                            <Badge
                              className={
                                position.voteType === 'yes'
                                  ? 'bg-green-500/20 text-green-300 border-green-400/30 text-xs'
                                  : 'bg-red-500/20 text-red-300 border-red-400/30 text-xs'
                              }
                            >
                              {position.voteType.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400">
                            {position.tradeCount} {position.tradeCount === 1 ? 'trade' : 'trades'} • Current: {position.voteType === 'yes' ? position.currentYesPrice.toFixed(0) : position.currentNoPrice.toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-white text-sm">
                            {position.totalAmount.toFixed(3)} SOL
                          </div>
                          <div className="text-xs text-gray-400">
                            {position.totalShares.toFixed(0)} shares
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Claimable Rewards */}
            {claimablePositions.length > 0 && (
              <Card className="bg-gradient-to-br from-green-900/30 to-emerald-800/20 border-green-500/30 text-white">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                      <Award className="w-4 h-4 text-white" />
                    </div>
                    <span>Claimable Rewards</span>
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    You have winning positions ready to claim!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {claimablePositions.map((position: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-white/10 rounded-lg border border-green-500/30"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white text-sm mb-1">
                            {position.marketName}
                          </div>
                          <div className="text-xs text-green-300">
                            Won on {position.voteType.toUpperCase()} side
                          </div>
                        </div>
                        <div className="text-right">
                          <Button
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => {
                              window.location.href = `/market/${position.marketId}`;
                            }}
                          >
                            Claim
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <span>Recent Activity</span>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Your latest transactions and interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No trading activity yet</p>
                    <p className="text-sm mt-1">Your trades will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:scale-[1.01] transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className={`w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ${getActivityColor(activity.type)}`}
                          >
                            {getActivityIcon(activity.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white text-sm">{activity.action}</p>
                              {activity.marketState === 1 && activity.winningOption !== undefined && (
                                <Badge
                                  className={
                                    (activity.action.includes('YES') && activity.winningOption) ||
                                    (activity.action.includes('NO') && !activity.winningOption)
                                      ? 'bg-green-500/20 text-green-300 border-green-400/30 text-xs'
                                      : 'bg-red-500/20 text-red-300 border-red-400/30 text-xs'
                                  }
                                >
                                  {(activity.action.includes('YES') && activity.winningOption) ||
                                  (activity.action.includes('NO') && !activity.winningOption)
                                    ? 'Won'
                                    : 'Lost'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-300 truncate">{activity.project}</p>
                            {activity.signature && (
                              <a
                                href={`https://explorer.solana.com/tx/${activity.signature}?cluster=${SOLANA_NETWORK}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors group"
                              >
                                <span className="font-mono">
                                  {activity.signature.slice(0, 8)}...{activity.signature.slice(-8)}
                                </span>
                                <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{activity.amount}</p>
                          <p className="text-xs text-gray-400">{activity.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Dynamic Widget & Settings */}
          <div className="space-y-6">
             {/* Embedded Dynamic Wallet Interface */}
             <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
               <CardHeader>
                 <CardTitle className="flex items-center space-x-2 text-white">
                   <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                     <Wallet className="w-4 h-4 text-white" />
                   </div>
                   <span>Wallet Management</span>
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                 {/* Embedded Dynamic Widget - Seamless overlay */}
                 <div className="relative overflow-hidden rounded-lg">
                   <DynamicEmbeddedWidget 
                     background="none" 
                     className="min-h-[400px] w-full"
                   />
                   {/* Subtle gradient overlay for seamless blending */}
                   <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-black/5 rounded-lg" />
                 </div>
               </CardContent>
             </Card>

            {/* Wallet Stats */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <span>Wallet Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SOL Balance */}
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400">SOL Balance</div>
                      <div className="text-xl font-bold text-white">
                        {balanceLoading ? (
                          <span className="text-gray-500">Loading...</span>
                        ) : (
                          `${solBalance.toFixed(4)} SOL`
                        )}
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">SOL</span>
                    </div>
                  </div>
                </div>

                {/* Total Staked */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Total Staked</div>
                    <div className="text-lg font-semibold text-white">
                      {userStats.totalSOLStaked.toFixed(3)} SOL
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-cyan-400">In {userStats.activePositions} markets</div>
                  </div>
                </div>

                {/* Total Trades */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Total Trades</div>
                    <div className="text-lg font-semibold text-white">{userStats.totalTrades}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">{userStats.totalVotes} markets</div>
                  </div>
                </div>

                {/* Success Rate */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">Success Rate</div>
                    <div className="text-lg font-semibold text-white">{userStats.successRate}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-400">
                      {userStats.successfulPredictions}/{userStats.totalVotes} wins
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 text-white" />
                  </div>
                  <span>Settings</span>
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Manage your preferences and privacy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Notifications */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-white">Email</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.email}
                        onChange={(e) => updateSetting('notifications', 'email', e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-white">Push</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.push}
                        onChange={(e) => updateSetting('notifications', 'push', e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Privacy */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Privacy</span>
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <EyeIcon className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-white">Public Profile</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.privacy.publicProfile}
                        onChange={(e) => updateSetting('privacy', 'publicProfile', e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Activity className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-white">Show Activity</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.privacy.showActivity}
                        onChange={(e) => updateSetting('privacy', 'showActivity', e.target.checked)}
                        className="w-3 h-3 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Quick Actions</span>
                  </h4>
                  <Button asChild className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-sm">
                    <a href="/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Project
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Disconnect Button */}
            <Card className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
              <CardContent className="pt-6">
                <Button
                  onClick={handleLogOut}
                  variant="outline"
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 hover:scale-105 transition-all duration-200"
                >
                  Disconnect Wallet
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  );
}
