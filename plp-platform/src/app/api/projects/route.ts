/**
 * API endpoint for retrieving projects from MongoDB
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, Project, PredictionMarket } from '@/lib/mongodb';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function GET(request: NextRequest) {
  try {
    // Connect to MongoDB database
    await connectToDatabase();
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'active';
    
    // Fetch projects from MongoDB with populated market data
    const projects = await Project.find({ status })
      .populate('predictionMarkets')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    // Get total count
    const totalCount = await Project.countDocuments({ status });
    
    logger.info('Projects retrieved from MongoDB', {
      count: projects.length,
      totalCount,
      status
    });
    
    return NextResponse.json({
      success: true,
      data: {
        projects: projects.map(project => ({
          id: project._id,
          name: project.name,
          description: project.description,
          category: project.category,
          projectType: project.projectType,
          projectStage: project.projectStage,
          location: project.location,
          teamSize: project.teamSize,
          tokenSymbol: project.tokenSymbol,
          socialLinks: project.socialLinks,
          projectImageUrl: project.projectImageUrl,
          status: project.status,
          founderWallet: project.founderWallet,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
          // Include prediction market data if available
          predictionMarkets: project.predictionMarkets || []
        })),
        pagination: {
          total: totalCount,
          limit,
          status
        }
      }
    });
    
  } catch (error) {
    logger.error('Failed to retrieve projects', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'PLP Projects API',
    endpoints: {
      GET: 'Retrieve projects from MongoDB',
      POST: 'Get API information'
    },
    parameters: {
      limit: 'Number of projects to return (default: 10)',
      status: 'Filter by status (default: active)'
    }
  });
}
