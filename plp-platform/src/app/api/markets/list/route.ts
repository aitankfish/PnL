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

export async function GET(_request: NextRequest) {
  try {
    // Connect to MongoDB
    await connectToDatabase();

    // Fetch all active markets with their projects
    const markets = await PredictionMarket.find({ marketState: 0 }) // 0 = Active
      .sort({ createdAt: -1 }) // Most recent first
      .limit(50) // Limit to 50 markets
      .lean();

    // Fetch associated projects
    const projectIds = markets.map((m) => m.projectId);
    const projects = await Project.find({ _id: { $in: projectIds } }).lean();

    // Create a map of projects by ID for quick lookup
    const projectMap = new Map<string, typeof projects[0]>();
    projects.forEach((p) => {
      projectMap.set(p._id.toString(), p);
    });

    // Combine market and project data
    const marketsWithProjects = markets.map((market) => {
      const project = projectMap.get(market.projectId.toString());

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

      // Convert IPFS URL to gateway URL if needed
      let imageUrl = project?.projectImageUrl;
      if (imageUrl && process.env.PINATA_GATEWAY_URL) {
        const gatewayUrl = process.env.PINATA_GATEWAY_URL;

        // If it's an IPFS URL (ipfs://...), convert to gateway URL
        if (imageUrl.startsWith('ipfs://')) {
          const ipfsHash = imageUrl.replace('ipfs://', '');
          imageUrl = `https://${gatewayUrl}/ipfs/${ipfsHash}`;
        }
        // If it's already a full URL with a gateway, keep it as is
        else if (!imageUrl.startsWith('http')) {
          // If it's just a hash (bafyXXX or QmXXX), add gateway
          imageUrl = `https://${gatewayUrl}/ipfs/${imageUrl}`;
        }
      } else if (imageUrl && !imageUrl.startsWith('http')) {
        // If no gateway URL configured and not a full URL, log warning
        logger.warn('PINATA_GATEWAY_URL not configured, cannot convert IPFS hash to URL', { imageUrl });
        imageUrl = undefined; // Don't use invalid URL
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
        status: market.marketState === 0 ? 'active' : 'resolved',
        metadataUri: market.metadataUri,
        projectImageUrl: imageUrl,
      };
    });

    logger.info('Fetched markets', { count: marketsWithProjects.length });

    return NextResponse.json({
      success: true,
      data: {
        markets: marketsWithProjects,
        total: marketsWithProjects.length,
      }
    });

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
