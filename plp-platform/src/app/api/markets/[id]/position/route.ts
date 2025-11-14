/**
 * API endpoint to check user's position on a market
 *
 * Returns whether the user has an existing position and which side they voted on
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase as connectNative, getDatabase } from '@/lib/database/index';
import { connectToDatabase, PredictionParticipant } from '@/lib/mongodb';
import { COLLECTIONS } from '@/lib/database/models';
import { ObjectId } from 'mongodb';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: marketId } = await params;
    const { searchParams } = new URL(request.url);
    const userWallet = searchParams.get('wallet');

    if (!userWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet address required',
        },
        { status: 400 }
      );
    }

    logger.info('Checking user position', { marketId, userWallet });

    // Connect to database
    await connectNative();
    const db = await getDatabase();

    // Check if user has any trade history on this market
    const userTrades = await db
      .collection(COLLECTIONS.TRADE_HISTORY)
      .find({
        marketId: new ObjectId(marketId),
        traderWallet: userWallet,
      })
      .toArray();

    if (userTrades.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          hasPosition: false,
          side: null,
          totalAmount: 0,
          tradeCount: 0,
        },
      });
    }

    // Determine which side they voted on (first vote determines the side)
    const firstTrade = userTrades[0];
    const side = firstTrade.voteType;

    // Calculate total amount invested
    const totalAmount = userTrades.reduce((sum, trade) => sum + trade.amount, 0);

    // Check if user has claimed rewards
    await connectToDatabase();
    const participant = await PredictionParticipant.findOne({
      marketId: new ObjectId(marketId),
      participantWallet: userWallet,
    });

    const claimed = participant?.claimed || false;

    logger.info('User position found', {
      marketId,
      userWallet,
      side,
      tradeCount: userTrades.length,
      totalAmount,
      claimed,
    });

    return NextResponse.json({
      success: true,
      data: {
        hasPosition: true,
        side,
        totalAmount: totalAmount / 1_000_000_000, // Convert to SOL
        tradeCount: userTrades.length,
        claimed,
      },
    });
  } catch (error) {
    logger.error('Failed to check user position:', { error: error instanceof Error ? error.message : String(error) });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check user position',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
