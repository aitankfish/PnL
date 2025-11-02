/**
 * API endpoint for completing market creation after client-side signing
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientLogger } from '@/lib/logger';
import { connectToDatabase, Project, PredictionMarket } from '@/lib/mongodb';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    logger.info('🚀 API: Completing market creation after client-side signing');
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['projectId', 'marketAddress', 'transactionSignature'];
    for (const field of requiredFields) {
      if (!body[field]) {
        logger.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const { projectId, marketAddress, transactionSignature, metadataUri, marketDuration } = body;

    // Connect to MongoDB database
    logger.info('📊 API: Connecting to MongoDB database');
    await connectToDatabase();
    logger.info('📊 API: MongoDB connection successful');

    // Find the project
    const project = await Project.findById(projectId);
    if (!project) {
      logger.error(`Project not found: ${projectId}`);
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    // Create prediction market document
    const expiryTime = new Date(Date.now() + ((marketDuration || 30) * 24 * 60 * 60 * 1000));
    const finalizationDeadline = new Date(Date.now() + (((marketDuration || 30) + 1) * 24 * 60 * 60 * 1000));
    
    const marketDoc = new PredictionMarket({
      projectId: project._id,
      marketAddress,
      actionsPlatformId: 'plp-platform', // Using custom PLP platform
      marketName: `${project.name} Token Launch Prediction`,
      marketDescription: `Will ${project.name} (${project.tokenSymbol}) successfully launch a token on pump.fun? This prediction market will resolve to YES if the token is successfully created and launched within the specified timeframe.`,
      metadataUri,
      expiryTime,
      finalizationDeadline,
      marketState: 0, // Active
      autoLaunch: true,
      launchWindowEnd: finalizationDeadline,
      createdAt: new Date(),
    });
    
    // Save market to MongoDB
    const savedMarket = await marketDoc.save();
    logger.info('Prediction market saved to MongoDB', {
      marketId: savedMarket._id,
      marketAddress: savedMarket.marketAddress,
      expiryTime: savedMarket.expiryTime
    });

    logger.info('Market creation completed successfully', {
      projectId: project._id,
      marketId: savedMarket._id,
      marketAddress,
      transactionSignature
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: project._id,
        marketId: savedMarket._id,
        marketAddress,
        transactionSignature,
        projectData: {
          id: project._id,
          name: project.name,
          tokenSymbol: project.tokenSymbol,
          category: project.category,
          status: project.status,
          createdAt: project.createdAt
        },
        marketData: {
          id: savedMarket._id,
          marketAddress: savedMarket.marketAddress,
          expiryTime: savedMarket.expiryTime,
          marketState: savedMarket.marketState
        }
      }
    });

  } catch (error) {
    logger.error('❌ API: Failed to complete market creation:', error);
    logger.error('❌ API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete market creation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
