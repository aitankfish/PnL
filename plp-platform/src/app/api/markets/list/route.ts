/**
 * API endpoint for listing active prediction markets
 *
 * This endpoint fetches all active markets from MongoDB
 * and returns them with their associated project data
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, PredictionMarket, Project } from '@/lib/mongodb';
import { createClientLogger } from '@/lib/logger';

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

    // Fetch all active markets with their projects in a single query using populate
    const markets = await PredictionMarket.find({ marketState: 0 }) // 0 = Active
      .populate('projectId') // Populate project data in one query
      .sort({ createdAt: -1 }) // Most recent first
      .limit(50) // Limit to 50 markets
      .lean();

    // Combine market and project data
    const marketsWithProjects = markets.map((market) => {
      const project = market.projectId as any; // populated project

      // Calculate time left
      const now = new Date();
      const expiryTime = new Date(market.expiryTime);
      const timeLeftMs = expiryTime.getTime() - now.getTime();
      const daysLeft = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      let timeLeft;
      if (daysLeft > 0) {
        timeLeft = `${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
      } else if (hoursLeft > 0) {
        timeLeft = `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;
      } else {
        timeLeft = 'Ending soon';
      }

      return {
        id: market._id.toString(),
        marketAddress: market.marketAddress,
        name: project?.name || 'Unknown Project',
        description: project?.description || '',
        category: project?.category || 'Other',
        stage: project?.projectStage || 'Unknown',
        tokenSymbol: project?.tokenSymbol || 'TKN',
        targetPool: `${market.targetPool / 1e9} SOL`,
        yesVotes: market.yesVoteCount || 0,
        noVotes: market.noVoteCount || 0,
        totalYesStake: market.totalYesStake || 0,
        totalNoStake: market.totalNoStake || 0,
        timeLeft,
        expiryTime: market.expiryTime,
        status: market.resolution || (market.marketState === 0 ? 'active' : 'resolved'),
        metadataUri: market.metadataUri,
        projectImageUrl: convertToGatewayUrl(project?.projectImageUrl),
      };
    });

    logger.info('Fetched markets', { count: marketsWithProjects.length });

    return NextResponse.json(
      {
        success: true,
        data: {
          markets: marketsWithProjects,
          total: marketsWithProjects.length,
        }
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        },
      }
    );

  } catch (error) {
    logger.error('Failed to fetch markets:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch markets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
