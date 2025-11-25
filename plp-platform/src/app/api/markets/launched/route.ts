/**
 * API endpoint for fetching successfully launched tokens
 *
 * Returns markets that were resolved with YES outcome and have pump.fun tokens created
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, PredictionMarket, Project } from '@/lib/mongodb';
import { createClientLogger } from '@/lib/logger';
import { calculateVoteCountsForMarkets } from '@/lib/vote-counts';

const logger = createClientLogger();

// Helper function to convert IPFS URL to gateway URL
function convertToGatewayUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined;

  const gatewayUrl = process.env.PINATA_GATEWAY_URL;
  if (!gatewayUrl) return imageUrl.startsWith('http') ? imageUrl : undefined;

  // If it's an IPFS URL (ipfs://...), convert to gateway URL
  if (imageUrl.startsWith('ipfs://')) {
    const ipfsHash = imageUrl.replace('ipfs://', '');
    return `https://${gatewayUrl}/ipfs/${ipfsHash}`;
  }

  // If it's already a full URL, keep it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // If it's just a hash (bafyXXX or QmXXX), add gateway
  return `https://${gatewayUrl}/ipfs/${imageUrl}`;
}

export async function GET(_request: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Fetch all resolved markets with YES outcome and pump.fun token address
    const markets = await PredictionMarket.find({
      marketState: 1, // 1 = Resolved
      resolution: 'YesWins', // YES won the prediction
      pumpFunTokenAddress: { $exists: true, $ne: null, $ne: '' } // Has token address
    })
      .populate('projectId') // Populate project data
      .sort({ resolvedAt: -1 }) // Most recent launches first
      .lean();

    if (markets.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            launched: [],
            total: 0,
          }
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        }
      );
    }

    // Calculate vote counts from MongoDB for all markets
    const marketIds = markets.map(m => m._id);
    const voteCountsMap = await calculateVoteCountsForMarkets(marketIds);

    // Transform data for frontend
    const launchedTokens = markets.map((market) => {
      const project = market.projectId as any; // populated project

      // Get calculated vote counts (fallback to MongoDB fields if calculation failed)
      const voteCounts = voteCountsMap.get(market._id.toString()) || {
        yesVoteCount: market.yesVoteCount || 0,
        noVoteCount: market.noVoteCount || 0,
      };

      const totalVotes = voteCounts.yesVoteCount + voteCounts.noVoteCount;
      const yesPercentage = totalVotes > 0 ? Math.round((voteCounts.yesVoteCount / totalVotes) * 100) : 0;

      // Calculate pool amount raised (from target pool or pool balance)
      const poolRaised = market.poolBalance
        ? (market.poolBalance / 1_000_000_000).toFixed(2) // Convert lamports to SOL
        : (market.targetPool / 1_000_000_000).toFixed(2);

      return {
        id: market._id.toString(),
        marketAddress: market.marketAddress,
        name: project?.name || 'Unknown Project',
        symbol: project?.tokenSymbol || 'TKN',
        description: project?.description || '',
        category: project?.category || 'Other',
        launchDate: market.resolvedAt ? new Date(market.resolvedAt).toISOString().split('T')[0] : 'Unknown',
        tokenAddress: market.pumpFunTokenAddress,
        projectImageUrl: convertToGatewayUrl(project?.projectImageUrl),

        // Vote statistics
        totalVotes,
        yesVotes: voteCounts.yesVoteCount,
        noVotes: voteCounts.noVoteCount,
        yesPercentage,

        // Pool information
        launchPool: `${poolRaised} SOL`,
        targetPool: market.targetPool,

        // Social links
        website: project?.website || null,
        twitter: project?.twitter || null,
        telegram: project?.telegram || null,
        discord: project?.discord || null,
      };
    });

    logger.info('Fetched launched tokens', { count: launchedTokens.length });

    return NextResponse.json(
      {
        success: true,
        data: {
          launched: launchedTokens,
          total: launchedTokens.length,
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );

  } catch (error) {
    logger.error('Failed to fetch launched tokens:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch launched tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
