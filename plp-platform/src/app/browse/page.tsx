'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useVoting } from '@/lib/hooks/useVoting';
import { FEES } from '@/config/solana';
import CountdownTimer from '@/components/CountdownTimer';

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

export default function BrowsePage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingState, setVotingState] = useState<{ marketId: string; voteType: 'yes' | 'no' } | null>(null);
  const { vote, isVoting } = useVoting();

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
      alert(`✅ Voted ${voteType.toUpperCase()}!\n\nTransaction: ${result.signature}\n\nYour vote has been recorded on-chain.`);
      // Refresh markets to show updated counts
      fetchMarkets();
    } else {
      alert(`❌ Vote failed: ${result.error}\n\nPlease try again.`);
    }
  };
  return (
    <AppLayout currentPage="markets">
      <div className="p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white mb-2">
            Active Prediction Markets
          </h1>
          <p className="text-white/70 text-lg">
            Browse and participate in active prediction markets. Vote YES or NO on whether projects should launch tokens.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-4xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                {loading ? '...' : markets.length}
              </CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Active Markets</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-4xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                {loading ? '...' : markets.reduce((sum, m) => sum + m.yesVotes + m.noVotes, 0)}
              </CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Total Votes</CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20 cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-4xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                {loading ? '...' : markets.reduce((sum, m) => sum + parseFloat(m.targetPool), 0).toFixed(1)} SOL
              </CardTitle>
              <CardDescription className="text-gray-300 group-hover:text-white transition-colors">Total Pool</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Projects List */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Live Markets</h2>

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
                <Link href="/create">Launch Your Project</Link>
              </Button>
            </div>
          )}

          {/* Markets Grid */}
          {!loading && !error && markets.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {markets.map((project) => (
              <Link href={`/market/${project.id}`} key={project.id} className="block">
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
                    <Badge className="bg-green-500/20 text-green-300 border-green-400/30 ml-2 flex-shrink-0">{project.status}</Badge>
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
            ))}
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
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200 hover:scale-105 cursor-pointer"
            >
              Launch Your Project
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
