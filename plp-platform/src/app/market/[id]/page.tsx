'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, ArrowLeft, ExternalLink, Users, Target, MapPin, Briefcase, Globe, Github, Twitter, MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { FEES, SOLANA_NETWORK } from '@/config/solana';
import { useVoting } from '@/lib/hooks/useVoting';
import { useClaiming } from '@/lib/hooks/useClaiming';
import { useResolution } from '@/lib/hooks/useResolution';
import { useExtend } from '@/lib/hooks/useExtend';
import { useTeamVesting } from '@/lib/hooks/useTeamVesting';
import { usePlatformTokens } from '@/lib/hooks/usePlatformTokens';
import { useClose } from '@/lib/hooks/useClose';
import { useNetwork } from '@/lib/hooks/useNetwork';
import { getPositionPDA } from '@/lib/anchor-program';
import { PublicKey } from '@solana/web3.js';
import CountdownTimer from '@/components/CountdownTimer';
import { parseError } from '@/lib/utils/errorParser';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import useSWR from 'swr';
import ErrorDialog from '@/components/ErrorDialog';
import SuccessDialog from '@/components/SuccessDialog';

// Lazy load heavy components to reduce initial bundle size
const ProbabilityChart = dynamic(() => import('@/components/ProbabilityChart'), {
  loading: () => <div className="h-64 bg-white/5 animate-pulse rounded-lg" />,
  ssr: false,
});

const LiveActivityFeed = dynamic(() => import('@/components/LiveActivityFeed'), {
  loading: () => <div className="h-96 bg-white/5 animate-pulse rounded-lg" />,
  ssr: false,
});

const MarketHolders = dynamic(() => import('@/components/MarketHolders'), {
  loading: () => <div className="h-96 bg-white/5 animate-pulse rounded-lg" />,
  ssr: false,
});

interface MarketDetails {
  id: string;
  marketAddress: string;
  name: string;
  description: string;
  category: string;
  stage: string;
  tokenSymbol: string;
  targetPool: string;
  yesVotes: number;
  noVotes: number;
  totalYesStake: number;
  totalNoStake: number;
  expiryTime: string;
  status: string;
  metadataUri?: string;
  projectImageUrl?: string;
  metadata?: {
    name: string;
    description: string;
    image?: string;
    category?: string;
    projectType?: string;
    projectStage?: string;
    location?: string;
    teamSize?: number;
    socialLinks?: {
      website?: string;
      twitter?: string;
      discord?: string;
      github?: string;
      telegram?: string;
      linkedin?: string;
    };
    additionalNotes?: string;
  };
}

// Format category and stage for proper display
function formatLabel(value: string): string {
  const uppercaseValues: { [key: string]: string } = {
    'dao': 'DAO',
    'nft': 'NFT',
    'ai': 'AI/ML',
    'defi': 'DeFi',
    'mvp': 'MVP'
  };

  if (uppercaseValues[value.toLowerCase()]) {
    return uppercaseValues[value.toLowerCase()];
  }

  // Capitalize first letter of each word
  return value
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Determine detailed market status based on on-chain data
function getDetailedMarketStatus(
  market: MarketDetails,
  onchainData?: { success: boolean; data?: any }
): { status: string; badgeClass: string } {
  // If we have on-chain data, use it for detailed status
  if (onchainData?.success && onchainData.data) {
    const { resolution, isExpired, poolProgressPercentage } = onchainData.data;

    // Check resolution status first
    if (resolution === 'YesWins') {
      return {
        status: '🎉 YES Wins',
        badgeClass: 'bg-green-500/20 text-green-300 border-green-400/30'
      };
    }

    if (resolution === 'NoWins') {
      return {
        status: '❌ NO Wins',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-400/30'
      };
    }

    if (resolution === 'Refund') {
      return {
        status: '↩️ Refund',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      };
    }

    // Unresolved market - check if expired
    if (resolution === 'Unresolved') {
      if (isExpired) {
        return {
          status: '⏳ Awaiting Resolution',
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30'
        };
      }

      // Pool is full but not expired
      if (poolProgressPercentage >= 100) {
        return {
          status: '🎯 Pool Complete',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
        };
      }

      // Active market
      return {
        status: '✅ Active',
        badgeClass: 'bg-green-500/20 text-green-300 border-green-400/30'
      };
    }
  }

  // Fallback to basic expiry check if no on-chain data
  const now = new Date().getTime();
  const expiryTime = new Date(market.expiryTime).getTime();
  const isExpired = now >= expiryTime;

  // Parse target pool
  const targetPoolValue = parseFloat(market.targetPool.replace(' SOL', ''));
  const currentPool = (market.totalYesStake + market.totalNoStake) / 1_000_000_000;
  const isPoolFull = currentPool >= targetPoolValue;

  if (isExpired || isPoolFull) {
    return {
      status: 'Expired',
      badgeClass: 'bg-red-500/20 text-red-300 border-red-400/30'
    };
  }

  return {
    status: 'Active',
    badgeClass: 'bg-green-500/20 text-green-300 border-green-400/30'
  };
}

export default function MarketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { primaryWallet } = useDynamicContext();
  const { network } = useNetwork(); // Get current network from wallet
  const [market, setMarket] = useState<MarketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [votingType, setVotingType] = useState<'yes' | 'no' | null>(null);
  const { vote, isVoting } = useVoting();
  const { claim, isClaiming } = useClaiming();
  const { resolve, isResolving } = useResolution();
  const { extend, isExtending } = useExtend();
  const { initVesting, isInitializing, claimTeamTokens, isClaiming: isClaimingTeamTokens } = useTeamVesting();
  const { claimPlatformTokens, isClaiming: isClaimingPlatformTokens } = usePlatformTokens();
  const { closePosition, isClosingPosition, closeMarket, isClosingMarket } = useClose();
  const [hasClaimed, setHasClaimed] = useState(false);

  // Error dialog state
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    details?: string;
  }>({
    open: false,
    title: '',
    message: '',
    details: undefined,
  });

  // Success dialog state
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    signature?: string;
    details?: string;
  }>({
    open: false,
    title: '',
    message: '',
    signature: undefined,
    details: undefined,
  });

  // Use minimum investment from config (convert lamports to SOL)
  const QUICK_VOTE_AMOUNT = FEES.MINIMUM_INVESTMENT / 1_000_000_000; // 0.01 SOL
  const [amount, setAmount] = useState<string>(QUICK_VOTE_AMOUNT.toString());

  // Fetch trade history with SWR for live updates (pass network parameter)
  const fetcher = (url: string) => fetch(url).then((res) => res.json());
  const { data: historyData, error: historyError, mutate: refetchHistory } = useSWR(
    params.id ? `/api/markets/${params.id}/history?network=${network}` : null,
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds for live updates
      revalidateOnFocus: true,
    }
  );

  // Fetch user's position on this market
  const { data: positionData, mutate: refetchPosition } = useSWR(
    params.id && primaryWallet?.address
      ? `/api/markets/${params.id}/position?wallet=${primaryWallet.address}&network=${network}`
      : null,
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  // Fetch market holders with SWR for live updates (pass network parameter)
  const { data: holdersData, mutate: refetchHolders } = useSWR(
    params.id ? `/api/markets/${params.id}/holders?network=${network}` : null,
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds for live updates
      revalidateOnFocus: true,
    }
  );

  // Fetch on-chain market data (resolution status, pool progress)
  const { data: onchainData, mutate: refetchOnchainData } = useSWR(
    market?.marketAddress ? `/api/markets/${market.marketAddress}/onchain?network=${network}` : null,
    fetcher,
    {
      refreshInterval: 15000, // Poll every 15 seconds for status updates
      revalidateOnFocus: true,
    }
  );

  useEffect(() => {
    if (params.id) {
      fetchMarketDetails(params.id as string);
    }
  }, [params.id]);

  const fetchMarketDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/markets/${id}`);
      const result = await response.json();

      if (result.success) {
        setMarket(result.data);
      } else {
        setError(result.error || 'Failed to load market details');
      }
    } catch (err) {
      console.error('Error fetching market details:', err);
      setError('Failed to load market details');
    } finally {
      setLoading(false);
    }
  };

  // Check if market is expired
  const isMarketExpired = () => {
    if (!market) return false;
    const now = new Date().getTime();
    const expiry = new Date(market.expiryTime).getTime();
    return now >= expiry;
  };

  const handleVote = async (voteType: 'yes' | 'no') => {
    if (!market) return;

    // Check if market is expired
    if (isMarketExpired()) {
      setErrorDialog({
        open: true,
        title: 'Market Expired',
        message: 'This market has already expired. You can no longer vote on this market.',
        details: `Market expired on ${new Date(market.expiryTime).toLocaleString()}`,
      });
      return;
    }

    // Check if user has opposite position
    if (positionData?.success && positionData.data.hasPosition) {
      if (positionData.data.side !== voteType) {
        setErrorDialog({
          open: true,
          title: 'Already Has Position',
          message: `You already voted ${positionData.data.side.toUpperCase()} on this market. Each wallet can only hold one position per market.`,
          details: `Current position: ${positionData.data.totalAmount.toFixed(3)} SOL on ${positionData.data.side.toUpperCase()} (${positionData.data.tradeCount} ${positionData.data.tradeCount === 1 ? 'trade' : 'trades'})`,
        });
        return;
      }
    }

    const voteAmount = parseFloat(amount);
    if (isNaN(voteAmount) || voteAmount < QUICK_VOTE_AMOUNT) {
      setErrorDialog({
        open: true,
        title: 'Invalid Amount',
        message: `The minimum vote amount is ${QUICK_VOTE_AMOUNT} SOL.`,
        details: `You entered: ${amount} SOL`,
      });
      return;
    }

    setVotingType(voteType);

    const result = await vote({
      marketId: params.id as string,
      marketAddress: market.marketAddress,
      voteType,
      amount: voteAmount,
    });

    setVotingType(null);

    if (result.success) {
      // Success! Refresh data
      fetchMarketDetails(params.id as string);
      refetchHistory(); // Update chart and activity feed immediately
      refetchHolders(); // Update holders list immediately
      refetchPosition(); // Update user's position immediately
      refetchOnchainData(); // Update pool progress and market status

      // Show success dialog
      setSuccessDialog({
        open: true,
        title: `${voteType.toUpperCase()} Vote Recorded`,
        message: 'Your vote has been successfully recorded on the blockchain.',
        signature: result.signature,
        details: `You voted ${voteType.toUpperCase()} with ${voteAmount} SOL`,
      });
    } else {
      // Parse error and show in dialog
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleClaim = async () => {
    if (!market) return;

    const result = await claim({
      marketId: params.id as string,
      marketAddress: market.marketAddress,
    });

    if (result.success) {
      // Success! Refresh data
      setHasClaimed(true); // Track claim success locally
      fetchMarketDetails(params.id as string);
      refetchPosition(); // Position will be closed after claim
      refetchOnchainData(); // Update pool balance

      // Show success dialog
      setSuccessDialog({
        open: true,
        title: 'Rewards Claimed Successfully',
        message: 'Your rewards have been transferred to your wallet.',
        signature: result.signature,
      });
    } else {
      // Parse error and show in dialog
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleResolve = async () => {
    if (!market || !onchainData?.success) return;

    const result = await resolve({
      marketId: params.id as string,
      marketAddress: market.marketAddress,
    });

    if (result.success) {
      // Success! Refresh all data
      fetchMarketDetails(params.id as string);
      refetchOnchainData(); // Update market state and resolution
      refetchHistory(); // Refresh trade history
      refetchHolders(); // Refresh holders

      // Show success dialog
      setSuccessDialog({
        open: true,
        title: 'Market Resolved Successfully',
        message: 'The market has been resolved. Participants can now claim their rewards.',
        signature: result.signature,
        details: 'Check the Market Status section for your eligibility to claim rewards.',
      });
    } else {
      // Parse error and show in dialog
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleExtend = async () => {
    if (!market) return;

    const result = await extend({
      marketId: params.id as string,
      marketAddress: market.marketAddress,
    });

    if (result.success) {
      // Success! Refresh all data
      fetchMarketDetails(params.id as string);
      refetchOnchainData(); // Update market phase

      // Show success dialog
      setSuccessDialog({
        open: true,
        title: 'Market Extended to Funding Phase',
        message: 'The market has been extended. Additional funding can now be raised.',
        signature: result.signature,
        details: 'The market is now in Funding Phase. The voting results are locked, and additional capital can be raised.',
      });
    } else {
      // Parse error and show in dialog
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleInitTeamVesting = async () => {
    if (!market || !onchainData?.success || !primaryWallet) return;

    // For now, use a placeholder for total token supply
    // In production, this should be calculated from the actual token created
    const totalTokenSupply = 1_000_000_000; // 1 billion tokens as placeholder

    const result = await initVesting({
      marketAddress: market.marketAddress,
      teamWallet: onchainData.data.founder,
      totalTokenSupply,
    });

    if (result.success) {
      refetchOnchainData();

      setSuccessDialog({
        open: true,
        title: 'Team Vesting Initialized',
        message: 'The team vesting schedule has been initialized successfully.',
        signature: result.signature,
        details: 'The founder can now claim 5% immediately and 15% vested over 12 months.',
      });
    } else {
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleClaimTeamTokens = async () => {
    if (!market || !onchainData?.success) return;

    const result = await claimTeamTokens({
      marketAddress: market.marketAddress,
      tokenMint: onchainData.data.tokenMint || '',
    });

    if (result.success) {
      refetchOnchainData();

      setSuccessDialog({
        open: true,
        title: 'Team Tokens Claimed',
        message: 'Your team tokens have been successfully claimed.',
        signature: result.signature,
        details: 'The tokens have been transferred to your wallet.',
      });
    } else {
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleClaimPlatformTokens = async () => {
    if (!market || !onchainData?.success) return;

    const result = await claimPlatformTokens({
      marketAddress: market.marketAddress,
      tokenMint: onchainData.data.tokenMint || '',
    });

    if (result.success) {
      refetchOnchainData();

      setSuccessDialog({
        open: true,
        title: 'Platform Tokens Claimed',
        message: 'The 1% platform allocation has been successfully claimed.',
        signature: result.signature,
        details: 'The tokens have been transferred to the P&L platform wallet.',
      });
    } else {
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleClosePosition = async () => {
    if (!market) return;

    const result = await closePosition({
      marketAddress: market.marketAddress,
    });

    if (result.success) {
      refetchPosition(); // Position will be deleted
      refetchOnchainData();

      setSuccessDialog({
        open: true,
        title: 'Position Closed',
        message: 'Your position has been closed and rent has been recovered.',
        signature: result.signature,
        details: 'The account rent has been transferred back to your wallet.',
      });
    } else {
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  const handleCloseMarket = async () => {
    if (!market) return;

    const result = await closeMarket({
      marketAddress: market.marketAddress,
    });

    if (result.success) {
      setSuccessDialog({
        open: true,
        title: 'Market Closed',
        message: 'The market has been closed and rent has been recovered.',
        signature: result.signature,
        details: 'The market account has been deleted and rent transferred back to you. You will be redirected shortly.',
      });

      // Redirect to markets page after 3 seconds
      setTimeout(() => {
        router.push('/browse');
      }, 3000);
    } else {
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-white" />
      </div>
    );
  }

  if (error || !market) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-red-400 text-xl mb-4">{error || 'Market not found'}</p>
          <Button onClick={() => router.push('/browse')} className="bg-gradient-to-r from-purple-500 to-pink-500">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Markets
          </Button>
        </div>
      </div>
    );
  }

  const yesPercentage = market.yesVotes + market.noVotes > 0
    ? Math.round((market.yesVotes / (market.yesVotes + market.noVotes)) * 100)
    : 50;

  // Calculate dynamic market status
  const marketStatus = getDetailedMarketStatus(market, onchainData);

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/browse')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Markets
        </Button>

        {/* Combined Header & Voting Stats Section */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Project Image */}
                {market.projectImageUrl ? (
                  <img
                    src={market.projectImageUrl}
                    alt={market.name}
                    className="w-20 h-20 rounded-xl object-cover ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-3xl font-bold text-white/70">{market.name.charAt(0)}</span>
                  </div>
                )}

                {/* Project Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <CardTitle className="text-2xl text-white">{market.name}</CardTitle>
                    <Badge className={marketStatus.badgeClass}>{marketStatus.status}</Badge>
                    {/* Phase Badge */}
                    {onchainData?.success && (
                      <Badge className={`${
                        onchainData.data.phase === 'Funding'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-400/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-400/30'
                      }`}>
                        {onchainData.data.phase === 'Funding' ? '💰 Funding Phase' : '📊 Prediction Phase'}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-gray-300 mb-2">
                    {market.description}
                  </CardDescription>

                  {/* Token, Category, Stage & Social Links - All on same line */}
                  <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-white">${market.tokenSymbol}</span>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                      {formatLabel(market.category)}
                    </Badge>
                    <Badge className="bg-white/10 text-white border-white/20">
                      {formatLabel(market.stage)}
                    </Badge>

                    {/* Social Links */}
                    {market.metadata?.socialLinks && Object.values(market.metadata.socialLinks).some(link => link) && (
                      <>
                        {market.metadata.socialLinks.website && (
                          <a
                            href={market.metadata.socialLinks.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-blue-400/30 rounded-lg transition-all hover:scale-105"
                          >
                            <Globe className="w-4 h-4 text-blue-400" />
                            <span className="text-white text-sm font-medium">Website</span>
                          </a>
                        )}
                        {market.metadata.socialLinks.twitter && (
                          <a
                            href={market.metadata.socialLinks.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-sky-500/20 to-blue-500/20 hover:from-sky-500/30 hover:to-blue-500/30 border border-sky-400/30 rounded-lg transition-all hover:scale-105"
                          >
                            <Twitter className="w-4 h-4 text-sky-400" />
                            <span className="text-white text-sm font-medium">Twitter</span>
                          </a>
                        )}
                        {market.metadata.socialLinks.discord && (
                          <a
                            href={market.metadata.socialLinks.discord}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-400/30 rounded-lg transition-all hover:scale-105"
                          >
                            <MessageCircle className="w-4 h-4 text-indigo-400" />
                            <span className="text-white text-sm font-medium">Discord</span>
                          </a>
                        )}
                        {market.metadata.socialLinks.github && (
                          <a
                            href={market.metadata.socialLinks.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-gray-500/20 to-slate-500/20 hover:from-gray-500/30 hover:to-slate-500/30 border border-gray-400/30 rounded-lg transition-all hover:scale-105"
                          >
                            <Github className="w-4 h-4 text-gray-300" />
                            <span className="text-white text-sm font-medium">GitHub</span>
                          </a>
                        )}
                        {market.metadata.socialLinks.telegram && (
                          <a
                            href={market.metadata.socialLinks.telegram}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 hover:from-blue-400/30 hover:to-cyan-400/30 border border-blue-300/30 rounded-lg transition-all hover:scale-105"
                          >
                            <Send className="w-4 h-4 text-blue-400" />
                            <span className="text-white text-sm font-medium">Telegram</span>
                          </a>
                        )}
                        {market.metadata.socialLinks.linkedin && (
                          <a
                            href={market.metadata.socialLinks.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-blue-700/20 hover:from-blue-600/30 hover:to-blue-700/30 border border-blue-500/30 rounded-lg transition-all hover:scale-105"
                          >
                            <Globe className="w-4 h-4 text-blue-500" />
                            <span className="text-white text-sm font-medium">LinkedIn</span>
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Market Status and Trading Section - Side by Side */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Combined Market Status Card */}
          <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 backdrop-blur-xl border-purple-400/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-xl">Market Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Probability Trends Chart */}
            <div>
              <ProbabilityChart
                data={historyData?.data?.chartData || []}
                className="w-full"
              />
            </div>

            {/* Voting Stats Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-base text-green-400 font-medium">YES: {market.yesVotes}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-base text-red-400 font-medium">NO: {market.noVotes}</span>
                  <XCircle className="w-4 h-4 text-red-400" />
                </div>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${yesPercentage}%` }}
                ></div>
              </div>

              <div className="text-center space-y-1">
                <div>
                  <span className="text-2xl font-bold text-white">{yesPercentage}%</span>
                  <span className="text-sm text-gray-400 ml-2">in favor</span>
                </div>

                {/* Pool Progress Info */}
                {onchainData?.success && (
                  <div className="text-sm text-gray-400">
                    <span className="text-cyan-400 font-semibold">
                      {(Number(onchainData.data.poolBalance) / 1e9).toFixed(2)} / {(Number(onchainData.data.targetPool) / 1e9).toFixed(0)} SOL
                    </span>
                    <span className="mx-2">•</span>
                    <span className="text-purple-400 font-semibold">{onchainData.data.poolProgressPercentage}% funded</span>
                  </div>
                )}
              </div>
            </div>

            {/* Market Status Section */}
            {onchainData?.success && (
              <>
                <div className="border-t border-white/10 pt-4 space-y-4">
                  {/* Status Message */}
                  {onchainData.data.resolution === 'Unresolved' && !onchainData.data.isExpired && (
                    <>
                      {/* Pool Filled - Waiting for Resolution */}
                      {onchainData.data.poolProgressPercentage >= 100 ? (
                        <div className="pt-2 border-t border-white/5">
                          <div className="bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-cyan-400/30 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="text-cyan-400 text-base font-bold mb-2 flex items-center space-x-2">
                                  <span>🎯</span>
                                  <span>Pool Complete - Voting Closed</span>
                                </h4>
                                <p className="text-gray-300 text-sm mb-2">
                                  The funding target has been reached! No more votes can be placed.
                                </p>
                                <p className="text-gray-400 text-xs">
                                  {Number(onchainData.data.totalYesShares) > Number(onchainData.data.totalNoShares)
                                    ? '✅ YES is currently winning - Token launch likely!'
                                    : '❌ NO is currently winning - No token launch'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                              <div>
                                <p className="text-xs text-gray-400 mb-1">Resolution available in</p>
                                <CountdownTimer expiryTime={market.expiryTime} size="lg" />
                              </div>
                              <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                                Awaiting Expiry
                              </Badge>
                            </div>
                          </div>

                          {/* Extend Market Button - Only for founder when target reached and YES winning */}
                          {primaryWallet?.address === onchainData.data.founder &&
                           Number(onchainData.data.totalYesShares) > Number(onchainData.data.totalNoShares) && (
                            <div className="mt-4 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-cyan-500/10 border border-purple-400/30 rounded-lg p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-purple-400 text-sm font-semibold mb-1">🎯 Target Reached!</h4>
                                  <p className="text-gray-300 text-xs mb-3">
                                    Your market has reached the target pool and YES is winning. You can now extend the market to the Funding Phase to raise additional capital.
                                  </p>
                                </div>
                              </div>
                              <Button
                                onClick={handleExtend}
                                disabled={isExtending}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
                              >
                                {isExtending ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Extending...
                                  </>
                                ) : (
                                  <>
                                    🚀 Extend to Funding Phase
                                  </>
                                )}
                              </Button>
                            </div>
                          )}

                          {/* Resolve Button - Anyone can resolve when NO wins and pool is full */}
                          {Number(onchainData.data.totalNoShares) > Number(onchainData.data.totalYesShares) && (
                            <div className="mt-4 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10 border border-red-400/30 rounded-lg p-4">
                              <div className="mb-3">
                                <h4 className="text-red-400 text-sm font-semibold mb-1">❌ NO Wins - Market Failed</h4>
                                <p className="text-gray-300 text-xs mb-2">
                                  The target pool was reached but NO won the vote. This market will not launch a token.
                                </p>
                                <p className="text-gray-400 text-xs mb-2">
                                  <span className="font-semibold text-green-400">NO voters will win SOL rewards</span> (95% pool, proportional to shares).
                                </p>
                                <p className="text-gray-400 text-xs">
                                  Anyone can resolve this market now to unlock NO voter rewards.
                                </p>
                              </div>
                              <Button
                                onClick={handleResolve}
                                disabled={isResolving || !primaryWallet}
                                className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold"
                              >
                                {isResolving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resolving...
                                  </>
                                ) : (
                                  <>
                                    🔧 Resolve Market (NO Wins)
                                  </>
                                )}
                              </Button>
                              {!primaryWallet && (
                                <p className="text-yellow-400 text-xs mt-2 text-center">Connect wallet to resolve</p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Pool Not Filled - Active Market */
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pt-2 border-t border-white/5">
                            <div>
                              <h4 className="text-green-400 text-sm font-semibold">✅ Active Market</h4>
                              <p className="text-gray-300 text-xs">
                                {onchainData.data.phase === 'Prediction' ? 'Voting is open' : 'Funding in progress'}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-gray-400 text-xs">Expires in</div>
                              <CountdownTimer expiryTime={market.expiryTime} size="lg" />
                            </div>
                          </div>

                          {/* Resolve Button for Funding Phase - Founder can resolve early */}
                          {onchainData.data.phase === 'Funding' &&
                           primaryWallet?.address === onchainData.data.founder && (
                            <div className="bg-gradient-to-br from-green-500/10 via-cyan-500/10 to-blue-500/10 border border-green-400/30 rounded-lg p-4">
                              <div className="mb-3">
                                <h4 className="text-green-400 text-sm font-semibold mb-1">💰 Funding Phase Active</h4>
                                <p className="text-gray-300 text-xs">
                                  Your market is in the Funding Phase. You can continue accepting additional contributions or resolve the market now to launch the token.
                                </p>
                              </div>
                              <Button
                                onClick={handleResolve}
                                disabled={isResolving}
                                className="w-full bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold"
                              >
                                {isResolving ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Resolving...
                                  </>
                                ) : (
                                  <>
                                    🚀 Resolve Market & Launch Token
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {onchainData.data.resolution === 'Unresolved' && onchainData.data.isExpired && (
                    <div className="text-center py-4 border-t border-white/5 space-y-3">
                      <h4 className="text-orange-400 text-base font-semibold mb-1">⏳ Awaiting Resolution...</h4>
                      <p className="text-gray-300 text-xs mb-3">
                        {onchainData.data.poolProgressPercentage < 100
                          ? 'Market expired without reaching target pool. All participants will be refunded.'
                          : 'Market expired after reaching target pool. Outcome will be determined.'}
                      </p>

                      {/* Only founder or anyone can resolve - permissionless */}
                      <Button
                        onClick={handleResolve}
                        disabled={isResolving || !primaryWallet}
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-2.5 px-6"
                      >
                        {isResolving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Resolving Market...
                          </>
                        ) : (
                          <>
                            🔧 Resolve Market
                          </>
                        )}
                      </Button>
                      {!primaryWallet && (
                        <p className="text-yellow-400 text-xs mt-2">Connect wallet to resolve this market</p>
                      )}
                    </div>
                  )}

                  {onchainData.data.resolution === 'YesWins' && (
                    <div className="text-center py-2 border-t border-white/5 space-y-4">
                      <div>
                        <h4 className="text-green-400 text-lg font-bold mb-1">🎉 YES WINS - Token Launch!</h4>
                        <p className="text-gray-300 text-xs mb-3">
                          Token will be launched on Pump.fun!
                        </p>
                      </div>

                      {/* YES Voter Claim */}
                      {positionData?.success && positionData.data.hasPosition && !hasClaimed && (
                        <div className="mt-3">
                          {positionData.data.side === 'yes' ? (
                            <Button
                              onClick={handleClaim}
                              disabled={isClaiming}
                              className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold py-2.5 px-6"
                            >
                              {isClaiming ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Claiming...
                                </>
                              ) : (
                                <>
                                  🎁 Claim Token Airdrop
                                </>
                              )}
                            </Button>
                          ) : (
                            <p className="text-red-400 text-xs">You voted NO and lost this prediction</p>
                          )}
                        </div>
                      )}

                      {/* Team Vesting Section - Only for founder */}
                      {primaryWallet?.address === onchainData.data.founder && onchainData.data.tokenMint && (
                        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-400/30 rounded-lg p-4 text-left space-y-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-2 bg-amber-500/20 rounded-full">
                              <Users className="w-4 h-4 text-amber-400" />
                            </div>
                            <h4 className="text-amber-400 text-sm font-semibold">Team Token Allocation (20%)</h4>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Immediate (5%)</span>
                              <span className="text-amber-300 font-semibold">Claimable Now</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Vested (15%)</span>
                              <span className="text-orange-300 font-semibold">12 Month Linear</span>
                            </div>
                          </div>

                          {/* Initialize Vesting Button - Anyone can call to set up vesting */}
                          <Button
                            onClick={handleInitTeamVesting}
                            disabled={isInitializing}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                          >
                            {isInitializing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Initializing...
                              </>
                            ) : (
                              <>
                                🔧 Initialize Team Vesting
                              </>
                            )}
                          </Button>

                          {/* Claim Team Tokens Button - Only founder can claim */}
                          <Button
                            onClick={handleClaimTeamTokens}
                            disabled={isClaimingTeamTokens}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                          >
                            {isClaimingTeamTokens ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              <>
                                👥 Claim Team Tokens
                              </>
                            )}
                          </Button>

                          <p className="text-xs text-gray-400 italic">
                            Note: First initialize vesting, then claim your tokens (5% immediate + vested amount).
                          </p>
                        </div>
                      )}

                      {/* Platform Token Claim - Anyone can call to send to P&L wallet */}
                      {onchainData.data.tokenMint && !onchainData.data.platformTokensClaimed && (
                        <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-400/30 rounded-lg p-4 text-left">
                          <div className="flex items-center space-x-2 mb-3">
                            <div className="p-2 bg-cyan-500/20 rounded-full">
                              <Target className="w-4 h-4 text-cyan-400" />
                            </div>
                            <h4 className="text-cyan-400 text-sm font-semibold">Platform Token Allocation (1%)</h4>
                          </div>

                          <p className="text-gray-300 text-xs mb-3">
                            Platform fee tokens are available for claiming. Anyone can trigger this to send tokens to the P&L platform wallet.
                          </p>

                          <Button
                            onClick={handleClaimPlatformTokens}
                            disabled={isClaimingPlatformTokens}
                            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                          >
                            {isClaimingPlatformTokens ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              <>
                                🏦 Claim Platform Tokens
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {onchainData.data.resolution === 'NoWins' && (
                    <div className="text-center py-2 border-t border-white/5">
                      <h4 className="text-red-400 text-lg font-bold mb-1">❌ NO WINS - Project Won&apos;t Launch</h4>
                      <p className="text-gray-300 text-xs mb-3">
                        NO voters receive proportional SOL rewards.
                      </p>

                      {positionData?.success && positionData.data.hasPosition && !hasClaimed && (
                        <div className="mt-3">
                          {positionData.data.side === 'no' ? (
                            <Button
                              onClick={handleClaim}
                              disabled={isClaiming}
                              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2.5 px-6"
                            >
                              {isClaiming ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Claiming...
                                </>
                              ) : (
                                <>
                                  💰 Claim SOL Rewards
                                </>
                              )}
                            </Button>
                          ) : (
                            <p className="text-red-400 text-xs">You voted YES and lost this prediction</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {onchainData.data.resolution === 'Refund' && (
                    <div className="text-center py-2 border-t border-white/5">
                      <h4 className="text-yellow-400 text-lg font-bold mb-1">↩️ REFUND - Market Cancelled</h4>
                      <p className="text-gray-300 text-xs mb-3">
                        All participants receive full refunds.
                      </p>

                      {positionData?.success && positionData.data.hasPosition && !hasClaimed ? (
                        <div className="mt-3">
                          <Button
                            onClick={handleClaim}
                            disabled={isClaiming}
                            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-2.5 px-6"
                          >
                            {isClaiming ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Claiming...
                              </>
                            ) : (
                              <>
                                ↩️ Claim Refund ({positionData.data.totalAmount.toFixed(3)} SOL)
                              </>
                            )}
                          </Button>
                        </div>
                      ) : hasClaimed ? (
                        <div className="mt-3">
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <p className="text-green-400 font-semibold flex items-center gap-2">
                              ✅ Already Claimed
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                              Your refund has been successfully claimed and transferred to your wallet.
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Close Market Button - Only for founder after 30-day claim period */}
                  {onchainData.data.resolution !== 'Unresolved' && primaryWallet?.address === onchainData.data.founder && (
                    <div className="border-t border-white/5 pt-4 mt-4">
                      <div className="bg-gradient-to-br from-gray-500/10 via-gray-600/10 to-gray-700/10 border border-gray-400/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <div className="p-2 bg-gray-500/20 rounded-full">
                            <Target className="w-4 h-4 text-gray-400" />
                          </div>
                          <h4 className="text-gray-300 text-sm font-semibold">Market Cleanup (Founder Only)</h4>
                        </div>

                        <p className="text-gray-400 text-xs mb-3">
                          After 30 days from market expiry and when all rewards have been claimed (pool balance is empty), you can close the market to recover rent (~0.01 SOL).
                        </p>

                        <Button
                          onClick={handleCloseMarket}
                          disabled={isClosingMarket}
                          className="w-full bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white font-semibold"
                        >
                          {isClosingMarket ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Closing...
                            </>
                          ) : (
                            <>
                              🗑️ Close Market & Recover Rent
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-gray-500 italic mt-2">
                          Note: This will fail if the 30-day claim period hasn't passed or if the pool still has funds. The market account will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* User's Position Section - Show if user has position */}
            {positionData?.success && positionData.data.hasPosition && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      positionData.data.side === 'yes'
                        ? 'bg-green-500/20'
                        : 'bg-red-500/20'
                    }`}>
                      {positionData.data.side === 'yes' ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white text-base font-semibold">Your Position</h3>
                      <p className="text-gray-300 text-xs">
                        Voted <span className={`font-bold ${
                          positionData.data.side === 'yes' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {positionData.data.side.toUpperCase()}
                        </span> with {positionData.data.totalAmount.toFixed(3)} SOL
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-400 text-xs">Total Trades</div>
                    <div className="text-white text-xl font-bold">{positionData.data.tradeCount}</div>
                  </div>
                </div>

                {/* Close Position Button - Show if claimed or if market is in Refund state */}
                {onchainData?.success && (hasClaimed || onchainData.data.resolution === 'Refund') && (
                  <div className="mt-3">
                    <Button
                      onClick={handleClosePosition}
                      disabled={isClosingPosition}
                      className="w-full bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white font-semibold text-sm"
                    >
                      {isClosingPosition ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Closing...
                        </>
                      ) : (
                        <>
                          🗑️ Close Position & Recover Rent
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Optional: Close your position account to recover rent (~0.002 SOL)
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Trading Section - Unified Card */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Trade on Market</CardTitle>
            <CardDescription className="text-gray-300">
              Should we launch ${market.tokenSymbol} token?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Side Selection Tabs */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-lg">
              <button
                onClick={() => setSelectedSide('yes')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  selectedSide === 'yes'
                    ? 'bg-gradient-to-r from-green-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>YES</span>
                  <span className="text-sm opacity-75">{yesPercentage}%</span>
                </div>
              </button>
              <button
                onClick={() => setSelectedSide('no')}
                className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                  selectedSide === 'no'
                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <XCircle className="w-5 h-5" />
                  <span>NO</span>
                  <span className="text-sm opacity-75">{100 - yesPercentage}%</span>
                </div>
              </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">Amount</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={QUICK_VOTE_AMOUNT}
                  step="0.01"
                  className={`w-full px-4 py-4 bg-white/10 border-2 rounded-lg text-white text-lg font-mono focus:outline-none transition-all ${
                    selectedSide === 'yes'
                      ? 'border-green-500/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/50'
                      : 'border-red-500/30 focus:border-red-500 focus:ring-2 focus:ring-red-500/50'
                  }`}
                  placeholder="0.00"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">SOL</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[QUICK_VOTE_AMOUNT.toString(), '0.1', '0.5', '1'].map((quickAmount) => (
                  <button
                    key={quickAmount}
                    onClick={() => setAmount(quickAmount)}
                    className={`py-2 px-3 text-sm font-semibold rounded-lg border-2 transition-all ${
                      amount === quickAmount
                        ? selectedSide === 'yes'
                          ? 'border-green-500 bg-green-500/20 text-green-400'
                          : 'border-red-500 bg-red-500/20 text-red-400'
                        : 'border-white/20 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {quickAmount}
                  </button>
                ))}
              </div>
            </div>

            {/* Trade Summary */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Position</span>
                <span className={`font-semibold ${selectedSide === 'yes' ? 'text-green-400' : 'text-red-400'}`}>
                  {selectedSide.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Amount</span>
                <span className="text-white font-mono">{amount || '0.00'} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Fee (1.5%)</span>
                <span className="text-white font-mono">{(parseFloat(amount || '0') * 0.015).toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                <span className="text-gray-300 font-semibold">Total Cost</span>
                <span className="text-white font-mono font-bold">{(parseFloat(amount || '0') * 1.015).toFixed(4)} SOL</span>
              </div>
            </div>

            {/* Trade Button */}
            <Button
              onClick={() => handleVote(selectedSide)}
              className={`w-full py-6 text-lg font-bold ${
                selectedSide === 'yes'
                  ? 'bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600'
                  : 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600'
              } text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isVoting || !amount || parseFloat(amount) < QUICK_VOTE_AMOUNT || isMarketExpired()}
            >
              {isMarketExpired() ? (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Market Expired
                </>
              ) : isVoting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {selectedSide === 'yes' ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  Buy {selectedSide.toUpperCase()} for {amount || '0.00'} SOL
                </>
              )}
            </Button>

            {/* Market Information */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Market Info</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Target Pool */}
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Target Pool</div>
                  <div className="text-base font-bold text-white">{market.targetPool}</div>
                </div>

                {/* Total Votes */}
                <div className="p-3 bg-white/5 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Total Votes</div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-base font-bold text-white">{market.yesVotes + market.noVotes}</span>
                  </div>
                </div>

                {/* Market Address (PDA) */}
                <div className="p-3 bg-white/5 rounded-lg col-span-2">
                  <div className="text-xs text-gray-400 mb-1">Market Address</div>
                  <a
                    href={`https://explorer.solana.com/address/${market.marketAddress}?cluster=${SOLANA_NETWORK}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 transition-colors text-xs group"
                  >
                    <span className="font-mono">{market.marketAddress.slice(0, 8)}...{market.marketAddress.slice(-8)}</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </a>
                </div>

                {/* Creator Address */}
                {onchainData?.success && onchainData.data.founder && (
                  <div className="p-3 bg-white/5 rounded-lg col-span-2">
                    <div className="text-xs text-gray-400 mb-1">Creator</div>
                    <a
                      href={`https://explorer.solana.com/address/${onchainData.data.founder}?cluster=${SOLANA_NETWORK}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 transition-colors text-xs group"
                    >
                      <span className="font-mono">{onchainData.data.founder.slice(0, 8)}...{onchainData.data.founder.slice(-8)}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                )}

                {/* User Position PDA (if user has a position) */}
                {positionData?.success && positionData.data?.hasPosition && market && primaryWallet?.address && (() => {
                  try {
                    const [positionPda] = getPositionPDA(
                      new PublicKey(market.marketAddress),
                      new PublicKey(primaryWallet.address)
                    );
                    return (
                      <div className="p-3 bg-white/5 rounded-lg col-span-2">
                        <div className="text-xs text-gray-400 mb-1">Your Position</div>
                        <a
                          href={`https://explorer.solana.com/address/${positionPda.toBase58()}?cluster=${SOLANA_NETWORK}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-1 text-green-400 hover:text-green-300 transition-colors text-xs group"
                        >
                          <span className="font-mono">{positionPda.toBase58().slice(0, 8)}...{positionPda.toBase58().slice(-8)}</span>
                          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </a>
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}

                {/* Token Mint (if created) */}
                {onchainData?.success && onchainData.data.tokenMint && (
                  <div className="p-3 bg-white/5 rounded-lg col-span-2">
                    <div className="text-xs text-gray-400 mb-1">Token Mint</div>
                    <a
                      href={`https://explorer.solana.com/address/${onchainData.data.tokenMint}?cluster=${SOLANA_NETWORK}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-1 text-pink-400 hover:text-pink-300 transition-colors text-xs group"
                    >
                      <span className="font-mono">{onchainData.data.tokenMint.slice(0, 8)}...{onchainData.data.tokenMint.slice(-8)}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Market Holders and Live Activity Feed - Side by Side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <LiveActivityFeed
            trades={historyData?.data?.recentTrades || []}
            className="w-full"
          />
          <MarketHolders
            yesHolders={holdersData?.data?.yesHolders || []}
            noHolders={holdersData?.data?.noHolders || []}
            totalYesStake={holdersData?.data?.totalYesStake || 0}
            totalNoStake={holdersData?.data?.totalNoStake || 0}
            uniqueHolders={holdersData?.data?.uniqueHolders || 0}
            currentUserWallet={primaryWallet?.address}
            className="w-full"
          />
        </div>

        {/* Metadata Section */}
        {market.metadata && (
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Project Info Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {market.metadata.projectType && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                    <Briefcase className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">Project Type</h3>
                      <p className="text-white text-lg font-medium capitalize">{market.metadata.projectType}</p>
                    </div>
                  </div>
                )}

                {market.metadata.projectStage && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                    <Target className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">Stage</h3>
                      <p className="text-white text-lg font-medium">{formatLabel(market.metadata.projectStage)}</p>
                    </div>
                  </div>
                )}

                {market.metadata.category && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                    <Target className="w-5 h-5 text-pink-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">Category</h3>
                      <p className="text-white text-lg font-medium">{formatLabel(market.metadata.category)}</p>
                    </div>
                  </div>
                )}

                {market.metadata.location && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">Location</h3>
                      <p className="text-white text-lg font-medium">{market.metadata.location}</p>
                    </div>
                  </div>
                )}

                {market.metadata.teamSize && (
                  <div className="flex items-start space-x-3 p-4 bg-white/5 rounded-lg">
                    <Users className="w-5 h-5 text-orange-400 mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="text-gray-400 text-sm mb-1">Team Size</h3>
                      <p className="text-white text-lg font-medium">{market.metadata.teamSize} {market.metadata.teamSize === 1 ? 'member' : 'members'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {market.metadata.description && market.metadata.description !== market.description && (
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-gray-400 text-sm mb-2 font-semibold">Full Description</h3>
                  <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{market.metadata.description}</p>
                </div>
              )}

              {/* Additional Notes */}
              {market.metadata.additionalNotes && (
                <div className="p-4 bg-white/5 rounded-lg border border-cyan-500/20">
                  <h3 className="text-cyan-400 text-sm mb-2 font-semibold">Additional Information</h3>
                  <p className="text-white text-base leading-relaxed whitespace-pre-wrap">{market.metadata.additionalNotes}</p>
                </div>
              )}

            </CardContent>
          </Card>
        )}

        {/* Error Dialog */}
        <ErrorDialog
          open={errorDialog.open}
          onClose={() => setErrorDialog(prev => ({ ...prev, open: false }))}
          title={errorDialog.title}
          message={errorDialog.message}
          details={errorDialog.details}
        />

        {/* Success Dialog */}
        <SuccessDialog
          open={successDialog.open}
          onClose={() => setSuccessDialog(prev => ({ ...prev, open: false }))}
          title={successDialog.title}
          message={successDialog.message}
          signature={successDialog.signature}
          details={successDialog.details}
        />
      </div>
  );
}
