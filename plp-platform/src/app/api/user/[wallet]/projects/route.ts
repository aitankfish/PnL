/**
 * GET /api/user/[wallet]/projects
 * Fetch markets created by a specific user (founder)
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // First, find all projects created by this founder
    const projects = await Project.find({ founderWallet: wallet }).lean();

    if (!projects || projects.length === 0) {
      logger.info('No projects found for founder', { wallet });
      return NextResponse.json({
        success: true,
        data: {
          projects: [],
          total: 0,
        },
      });
    }

    const projectIds = projects.map(p => p._id);

    // Fetch all markets for these projects
    const markets = await PredictionMarket.find({ projectId: { $in: projectIds } })
      .populate('projectId')
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    logger.info('Fetched projects for founder', {
      wallet,
      count: markets.length,
    });

    // Transform markets into a user-friendly format
    const userProjects = markets.map((market) => {
      const project = market.projectId as any;

      // Calculate time left or expired status
      const now = new Date();
      const expiryTime = new Date(market.expiryTime);
      const timeLeftMs = expiryTime.getTime() - now.getTime();
      const isExpired = timeLeftMs <= 0;

      let timeLeft;
      if (!isExpired) {
        const daysLeft = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (daysLeft > 0) {
          timeLeft = `${daysLeft} day${daysLeft > 1 ? 's' : ''}`;
        } else if (hoursLeft > 0) {
          timeLeft = `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;
        } else {
          timeLeft = 'Ending soon';
        }
      } else {
        timeLeft = 'Expired';
      }

      // Determine status based on resolution and market state
      let status = 'Active';
      if (market.resolution === 'YesWins') {
        status = 'Launched';
      } else if (market.resolution === 'NoWins' || market.resolution === 'Refund') {
        status = 'Not Launched';
      } else if (isExpired && market.resolution === 'Unresolved') {
        status = 'Pending Resolution';
      }

      return {
        id: market._id.toString(),
        marketAddress: market.marketAddress,
        name: project?.name || 'Unknown Project',
        description: project?.description || '',
        category: project?.category || 'Other',
        tokenSymbol: project?.tokenSymbol || 'TKN',
        projectImageUrl: convertToGatewayUrl(project?.projectImageUrl),

        // Market stats
        targetPool: market.targetPool / 1e9,
        poolBalance: market.poolBalance / 1e9,
        poolProgressPercentage: market.poolProgressPercentage || 0,

        // Vote stats
        yesVoteCount: market.yesVoteCount || 0,
        noVoteCount: market.noVoteCount || 0,
        sharesYesPercentage: market.sharesYesPercentage || 0,

        // Status
        status,
        resolution: market.resolution || 'Unresolved',
        phase: market.phase || 'Prediction',
        timeLeft,
        expiryTime: market.expiryTime,
        isExpired,

        // Token info (if launched)
        tokenAddress: (market as any).tokenAddress || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        projects: userProjects,
        total: userProjects.length,
      },
    });

  } catch (error: any) {
    logger.error('Failed to fetch user projects:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
