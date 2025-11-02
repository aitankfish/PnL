/**
 * Test endpoint for Actions Protocol integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { plpActionsProtocol } from '@/lib/actions-protocol';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function GET() {
  try {
    logger.info('Testing Actions Protocol integration');

    // Test basic SDK initialization
    const connection = plpActionsProtocol.getConnection();
    const sdk = plpActionsProtocol.getSDK();

    // Get connection info
    const version = await connection.getVersion();
    const blockHeight = await connection.getBlockHeight();

    logger.info('Actions Protocol test successful', {
      version,
      blockHeight,
      network: connection.rpcEndpoint
    });

    return NextResponse.json({
      success: true,
      message: 'Actions Protocol integration working',
      data: {
        version,
        blockHeight,
        rpcEndpoint: connection.rpcEndpoint,
        platformConfigured: !!sdk
      }
    });

  } catch (error) {
    logger.error('Actions Protocol test failed', error);
    
    return NextResponse.json({
      success: false,
      error: 'Actions Protocol test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'Actions Protocol Test API',
    endpoints: {
      GET: 'Test basic Actions Protocol integration',
      POST: 'Get API information'
    },
    note: 'This endpoint tests the Actions Protocol SDK initialization and basic connection functionality.'
  });
}
