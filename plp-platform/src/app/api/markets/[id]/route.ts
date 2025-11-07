/**
 * API endpoint for fetching individual market details
 *
 * This endpoint fetches a specific market by ID from MongoDB
 * and includes associated project data and IPFS metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, PredictionMarket, Project } from '@/lib/mongodb';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Connect to MongoDB
    await connectToDatabase();

    // Fetch market by ID
    const market = await PredictionMarket.findById(id).lean();

    if (!market) {
      return NextResponse.json(
        { success: false, error: 'Market not found' },
        { status: 404 }
      );
    }

    // Fetch associated project
    const project = await Project.findById(market.projectId).lean();

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Associated project not found' },
        { status: 404 }
      );
    }

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

      if (imageUrl.startsWith('ipfs://')) {
        const ipfsHash = imageUrl.replace('ipfs://', '');
        imageUrl = `https://${gatewayUrl}/ipfs/${ipfsHash}`;
      } else if (!imageUrl.startsWith('http')) {
        imageUrl = `https://${gatewayUrl}/ipfs/${imageUrl}`;
      }
    } else if (imageUrl && !imageUrl.startsWith('http')) {
      logger.warn('PINATA_GATEWAY_URL not configured, cannot convert IPFS hash to URL', { imageUrl });
      imageUrl = undefined;
    }

    // Fetch metadata from IPFS if available
    let metadata = null;
    if (market.metadataUri) {
      try {
        let metadataUrl = market.metadataUri;

        // Convert IPFS URI to gateway URL
        if (metadataUrl.startsWith('ipfs://') && process.env.PINATA_GATEWAY_URL) {
          const ipfsHash = metadataUrl.replace('ipfs://', '');
          metadataUrl = `https://${process.env.PINATA_GATEWAY_URL}/ipfs/${ipfsHash}`;
        }

        logger.info('Fetching metadata from IPFS', { metadataUrl });

        const metadataResponse = await fetch(metadataUrl);
        if (metadataResponse.ok) {
          metadata = await metadataResponse.json();
          logger.info('Successfully fetched metadata', { metadata });
        } else {
          logger.warn('Failed to fetch metadata', {
            status: metadataResponse.status,
            statusText: metadataResponse.statusText
          });
        }
      } catch (error) {
        logger.error('Error fetching metadata from IPFS:', error);
      }
    }

    const marketDetails = {
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
      metadata,
    };

    logger.info('Fetched market details', { marketId: id });

    return NextResponse.json(
      {
        success: true,
        data: marketDetails,
      },
      {
        headers: {
          // Cache for 15 seconds, serve stale for 30 seconds while revalidating
          'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
        },
      }
    );

  } catch (error) {
    logger.error('Failed to fetch market details:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch market details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
