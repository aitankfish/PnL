'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useVoting } from '@/lib/hooks/useVoting';
import { FEES } from '@/config/solana';
import CountdownTimer from '@/components/CountdownTimer';
import ErrorDialog from '@/components/ErrorDialog';
import { parseError } from '@/lib/utils/errorParser';

interface Market {
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
  timeLeft: string;
  expiryTime: string;
  status: string;
  metadataUri?: string;
  projectImageUrl?: string;
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

// Determine detailed market status based on expiry time, pool, and resolution
function getMarketStatus(market: Market): { status: string; badgeClass: string } {
  const now = new Date().getTime();
  const expiryTime = new Date(market.expiryTime).getTime();
  const isExpired = now > expiryTime;

  // Parse target pool (remove " SOL" and convert to number)
  const targetPoolValue = parseFloat(market.targetPool.replace(' SOL', ''));
  const currentPool = (market.totalYesStake + market.totalNoStake) / 1_000_000_000; // Convert lamports to SOL
  const isPoolFull = currentPool >= targetPoolValue;
  const poolProgressPercentage = (currentPool / targetPoolValue) * 100;

  // Check resolution status from database (if market has been resolved and synced)
  if (market.status && market.status !== 'Unresolved' && market.status !== 'active') {
    const statusLower = market.status.toLowerCase();

    if (statusLower === 'yeswins' || (statusLower.includes('yes') && statusLower.includes('win'))) {
      return {
        status: '🎉 YES Wins',
        badgeClass: 'bg-green-500/20 text-green-300 border-green-400/30'
      };
    }

    if (statusLower === 'nowins' || (statusLower.includes('no') && statusLower.includes('win'))) {
      return {
        status: '❌ NO Wins',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-400/30'
      };
    }

    if (statusLower === 'refund' || statusLower.includes('refund') || statusLower.includes('cancelled')) {
      return {
        status: '↩️ Refund',
        badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      };
    }
  }

  // Market expired but not yet resolved/synced
  if (isExpired) {
    return {
      status: '⏳ Awaiting Resolution',
      badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-400/30'
    };
  }

  // Pool is full but not expired yet
  if (isPoolFull || poolProgressPercentage >= 100) {
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

export default function BrowsePage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingState, setVotingState] = useState<{ marketId: string; voteType: 'yes' | 'no' } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const { vote, isVoting } = useVoting();

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

  // Categories for filtering
  const categories = ['All', 'DeFi', 'Gaming', 'NFT', 'AI/ML', 'Social', 'Infrastructure', 'DAO', 'Other'];

  // Minimum vote amount from config
  const QUICK_VOTE_AMOUNT = FEES.MINIMUM_INVESTMENT / 1_000_000_000; // 0.01 SOL

  useEffect(() => {
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/markets/list');
      const result = await response.json();

      if (result.success) {
        setMarkets(result.data.markets);
      } else {
        setError(result.error || 'Failed to load markets');
      }
    } catch (err) {
      console.error('Error fetching markets:', err);
      setError('Failed to load markets');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickVote = async (market: Market, voteType: 'yes' | 'no') => {
    setVotingState({ marketId: market.id, voteType });

    const result = await vote({
      marketId: market.id,
      marketAddress: market.marketAddress,
      voteType,
      amount: QUICK_VOTE_AMOUNT,
    });

    setVotingState(null);

    if (result.success) {
      // Success - silently refresh the markets list
      fetchMarkets();
    } else {
      // Error - show error dialog
      const parsedError = parseError(result.error);
      setErrorDialog({
        open: true,
        title: parsedError.title,
        message: parsedError.message,
        details: parsedError.details,
      });
    }
  };
  // Get hot projects - prioritize live/active markets, top 2 by votes
  const getHotProjects = () => {
    if (markets.length === 0) return [];

    // First try to get active/live markets
    const activeMarkets = markets.filter(m => {
      const status = getMarketStatus(m);
      return status.status === '✅ Active' || status.status === '🎯 Pool Complete';
    });

    // Sort by total votes
    const sortByVotes = (a: Market, b: Market) => {
      const aVotes = a.yesVotes + a.noVotes;
      const bVotes = b.yesVotes + b.noVotes;
      return bVotes - aVotes;
    };

    // If we have active markets, use them. Otherwise use all markets
    const marketsToUse = activeMarkets.length > 0 ? activeMarkets : markets;

    // Return top 2
    return marketsToUse.sort(sortByVotes).slice(0, 2);
  };

  const hotProjects = getHotProjects();

  // Filter out hot projects from regular markets list
  const hotProjectIds = hotProjects.map(p => p.id);
  let regularMarkets = markets.filter(m => !hotProjectIds.includes(m.id));

  // Apply category filter
  if (selectedCategory !== 'All') {
    regularMarkets = regularMarkets.filter(m => {
      const categoryLower = m.category.toLowerCase();
      const selectedLower = selectedCategory.toLowerCase();
      return categoryLower === selectedLower ||
             (selectedCategory === 'AI/ML' && (categoryLower === 'ai/ml' || categoryLower === 'ai'));
    });
  }

  return (
    <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 tracking-tight">
            Vote on projects. Earn rewards. Shape Web3.
          </h1>
        </div>

        {/* Hot Projects Section */}
        {!loading && hotProjects.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 flex items-center space-x-2 animate-pulse">
                <span>🔥</span>
                <span>Hottest Markets</span>
                <span>🔥</span>
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {hotProjects.map((hotProject, index) => {
                // First card: Orange/Red theme, Second card: Purple/Blue theme
                const isFirstCard = index === 0;
                const cardColors = isFirstCard ? {
                  gradient: 'from-orange-500/10 via-red-500/10 to-pink-500/10',
                  border: 'border-orange-500/50',
                  borderHover: 'hover:border-orange-400',
                  shadow: 'shadow-orange-500/20',
                  cornerBorder: 'border-orange-400',
                  imageBg: 'bg-orange-500',
                  imageRing: 'ring-orange-400',
                  imageRingHover: 'group-hover:ring-orange-300',
                  titleHover: 'group-hover:text-orange-300',
                  fallbackGradient: 'from-orange-500/20 to-pink-500/20'
                } : {
                  gradient: 'from-purple-500/10 via-blue-500/10 to-cyan-500/10',
                  border: 'border-purple-500/50',
                  borderHover: 'hover:border-purple-400',
                  shadow: 'shadow-purple-500/20',
                  cornerBorder: 'border-purple-400',
                  imageBg: 'bg-purple-500',
                  imageRing: 'ring-purple-400',
                  imageRingHover: 'group-hover:ring-purple-300',
                  titleHover: 'group-hover:text-purple-300',
                  fallbackGradient: 'from-purple-500/20 to-cyan-500/20'
                };

                return (
                <Link href={`/market/${hotProject.id}`} key={hotProject.id} prefetch={true} className="block">
              <Card className={`relative bg-gradient-to-br ${cardColors.gradient} backdrop-blur-xl border-2 ${cardColors.border} text-white ${cardColors.borderHover} transition-all duration-500 hover:scale-[1.02] group cursor-pointer overflow-hidden shadow-2xl ${cardColors.shadow}`}>
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>

                {/* Pulsing corners */}
                <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${cardColors.cornerBorder} animate-pulse`}></div>
                <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 ${cardColors.cornerBorder} animate-pulse`}></div>
                <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 ${cardColors.cornerBorder} animate-pulse`}></div>
                <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${cardColors.cornerBorder} animate-pulse`}></div>

                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Project Image */}
                      {hotProject.projectImageUrl ? (
                        <div className="flex-shrink-0 relative">
                          <div className={`absolute inset-0 ${cardColors.imageBg} rounded-lg blur-md opacity-50 animate-pulse`}></div>
                          <img
                            src={hotProject.projectImageUrl}
                            alt={hotProject.name}
                            className={`relative w-16 h-16 rounded-lg object-cover ring-2 ${cardColors.imageRing} ${cardColors.imageRingHover} transition-all transform group-hover:scale-110`}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className={`hidden w-16 h-16 rounded-lg bg-gradient-to-br ${cardColors.fallbackGradient} items-center justify-center ring-2 ${cardColors.imageRing} ${cardColors.imageRingHover} transition-all flex-shrink-0`}>
                            <span className="text-2xl font-bold text-white/70">{hotProject.name.charAt(0)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${cardColors.fallbackGradient} flex items-center justify-center ring-2 ${cardColors.imageRing} ${cardColors.imageRingHover} transition-all flex-shrink-0`}>
                          <span className="text-2xl font-bold text-white/70">{hotProject.name.charAt(0)}</span>
                        </div>
                      )}

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <CardTitle className={`text-2xl text-white ${cardColors.titleHover} transition-colors truncate`}>{hotProject.name}</CardTitle>
                          <Badge className={`${getMarketStatus(hotProject).badgeClass} ml-2 flex-shrink-0`}>{getMarketStatus(hotProject).status}</Badge>
                        </div>
                        <CardDescription className="text-gray-300 group-hover:text-white transition-colors line-clamp-2">{hotProject.description}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Category:</span>
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">{formatLabel(hotProject.category)}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Stage:</span>
                      <span className="text-white">{formatLabel(hotProject.stage)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Token:</span>
                      <span className="font-mono font-bold text-white">${hotProject.tokenSymbol}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Pool:</span>
                      <span className="font-bold text-white">{hotProject.targetPool}</span>
                    </div>
                  </div>

                  {/* Voting Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">YES: {hotProject.yesVotes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-red-400">NO: {hotProject.noVotes}</span>
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(hotProject.yesVotes / (hotProject.yesVotes + hotProject.noVotes)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-white">
                        {Math.round((hotProject.yesVotes / (hotProject.yesVotes + hotProject.noVotes)) * 100)}%
                      </span>
                      <span className="text-sm text-gray-400 ml-1">YES</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-gray-400">Time Left:</span>
                    <CountdownTimer expiryTime={hotProject.expiryTime} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickVote(hotProject, 'yes');
                      }}
                      disabled={votingState !== null}
                      className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      {votingState?.marketId === hotProject.id && votingState?.voteType === 'yes' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Vote YES'
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickVote(hotProject, 'no');
                      }}
                      disabled={votingState !== null}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      {votingState?.marketId === hotProject.id && votingState?.voteType === 'no' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Vote NO'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
                </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-3xl font-bold text-white">Live Markets</h2>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`
                    px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300
                    ${selectedCategory === category
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white hover:scale-105'
                    }
                  `}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="ml-3 text-white">Loading markets...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={fetchMarkets} variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Retry
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && markets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg mb-4">No active markets yet.</p>
              <p className="text-white/50 mb-6">Be the first to launch a prediction market!</p>
              <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Link href="/create" prefetch={true}>Launch Your Project</Link>
              </Button>
            </div>
          )}

          {/* Show empty state for regular markets if only hot project exists */}
          {!loading && !error && markets.length > 0 && regularMarkets.length === 0 && (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg mb-4">All markets are featured above!</p>
              <p className="text-white/50 mb-6">Check back soon for more exciting projects.</p>
              <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                <Link href="/create" prefetch={true}>Launch Your Project</Link>
              </Button>
            </div>
          )}

          {/* Markets Grid */}
          {!loading && !error && regularMarkets.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {regularMarkets.map((project) => {
                const marketStatus = getMarketStatus(project);

                return (
              <Link href={`/market/${project.id}`} key={project.id} prefetch={true} className="block">
              <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-102 group cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start space-x-3 flex-1">
                      {/* Project Image */}
                      {project.projectImageUrl ? (
                        <div className="flex-shrink-0">
                          <img
                            src={project.projectImageUrl}
                            alt={project.name}
                            className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/10 group-hover:ring-cyan-300/50 transition-all"
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          <div className="hidden w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 items-center justify-center ring-2 ring-white/10 group-hover:ring-cyan-300/50 transition-all flex-shrink-0">
                            <span className="text-lg font-bold text-white/70">{project.name.charAt(0)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center ring-2 ring-white/10 group-hover:ring-cyan-300/50 transition-all flex-shrink-0">
                          <span className="text-lg font-bold text-white/70">{project.name.charAt(0)}</span>
                        </div>
                      )}

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl text-white group-hover:text-cyan-300 transition-colors truncate">{project.name}</CardTitle>
                        <CardDescription className="mt-1 text-gray-300 group-hover:text-white transition-colors line-clamp-2">{project.description}</CardDescription>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <Badge className={`${marketStatus.badgeClass} ml-2 flex-shrink-0`}>{marketStatus.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Category:</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">{formatLabel(project.category)}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Stage:</span>
                    <span className="text-white">{formatLabel(project.stage)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Token:</span>
                    <span className="font-mono font-bold text-white">${project.tokenSymbol}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Pool:</span>
                    <span className="font-bold text-white">{project.targetPool}</span>
                  </div>
                  
                  {/* Voting Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">YES: {project.yesVotes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-red-400">NO: {project.noVotes}</span>
                        <XCircle className="w-4 h-4 text-red-400" />
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(project.yesVotes / (project.yesVotes + project.noVotes)) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-white">
                        {Math.round((project.yesVotes / (project.yesVotes + project.noVotes)) * 100)}%
                      </span>
                      <span className="text-sm text-gray-400 ml-1">YES</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Time Left:</span>
                    <CountdownTimer expiryTime={project.expiryTime} />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickVote(project, 'yes');
                      }}
                      disabled={votingState !== null}
                      className="flex-1 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      {votingState?.marketId === project.id && votingState?.voteType === 'yes' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Vote YES'
                      )}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleQuickVote(project, 'no');
                      }}
                      disabled={votingState !== null}
                      variant="outline"
                      className="flex-1 border-white/20 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="sm"
                    >
                      {votingState?.marketId === project.id && votingState?.voteType === 'no' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Vote NO'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </Link>
                );
              })}
          </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-4 py-12">
          <h2 className="text-3xl font-bold text-white">Don&apos;t See Your Project?</h2>
          <p className="text-white/70">
            Launch your own prediction market and let the community decide if your project should get a token.
          </p>
          <div className="flex justify-center">
            <Link
              href="/create"
              prefetch={true}
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              Launch Your Project
            </Link>
          </div>
        </div>

        {/* Error Dialog */}
        <ErrorDialog
          open={errorDialog.open}
          onClose={() => setErrorDialog({ ...errorDialog, open: false })}
          title={errorDialog.title}
          message={errorDialog.message}
          details={errorDialog.details}
        />
      </div>
  );
}
