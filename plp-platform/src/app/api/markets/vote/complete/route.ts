/**
 * API endpoint for completing vote transactions
 *
 * This endpoint updates MongoDB vote counts after a successful on-chain vote
 * Trade history is written to MongoDB for devnet (Helius doesn't index devnet)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase as connectMongoose, PredictionMarket, Notification } from '@/lib/mongodb';
import { connectToDatabase, getDatabase } from '@/lib/database/index';
import { COLLECTIONS, TradeHistory } from '@/lib/database/models';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, voteType, amount, signature, traderWallet } = body;

    // Validate inputs
    if (!marketId || !voteType || !amount || !signature || !traderWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: marketId, voteType, amount, signature, traderWallet',
        },
        { status: 400 }
      );
    }

    // Validate vote type
    if (voteType !== 'yes' && voteType !== 'no') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid vote type. Must be "yes" or "no"',
        },
        { status: 400 }
      );
    }

    logger.info('Completing vote transaction', {
      marketId,
      voteType,
      amount,
      signature,
    });

    // Connect to MongoDB (Mongoose for market models)
    await connectMongoose();

    // Convert SOL to lamports for stake tracking
    const lamports = Math.floor(amount * 1_000_000_000);

    // Update vote counts and stakes based on vote type
    const updateFields = voteType === 'yes'
      ? {
          $inc: {
            yesVoteCount: 1,
            totalYesStake: lamports,
          }
        }
      : {
          $inc: {
            noVoteCount: 1,
            totalNoStake: lamports,
          }
        };

    // Update market in database
    const updatedMarket = await PredictionMarket.findByIdAndUpdate(
      marketId,
      updateFields,
      { new: true }
    );

    if (!updatedMarket) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market not found',
        },
        { status: 404 }
      );
    }

    // Write trade history to MongoDB for devnet
    // (Helius Enhanced API doesn't index devnet, only mainnet)
    try {
      await connectToDatabase();
      const db = getDatabase();

      const tradeRecord: TradeHistory = {
        marketId: updatedMarket._id,
        marketAddress: updatedMarket.marketAddress,
        traderWallet,
        voteType,
        amount: lamports,
        shares: lamports, // 1:1 for simplicity
        yesPrice: updatedMarket.totalYesStake / (updatedMarket.totalYesStake + updatedMarket.totalNoStake) * 100 || 50,
        noPrice: updatedMarket.totalNoStake / (updatedMarket.totalYesStake + updatedMarket.totalNoStake) * 100 || 50,
        signature,
        createdAt: new Date(),
      };

      await db.collection(COLLECTIONS.TRADE_HISTORY).insertOne(tradeRecord);
      logger.info('Trade recorded in MongoDB', { signature });
    } catch (error) {
      logger.error('Failed to record trade in MongoDB (non-fatal)', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't fail the request if trade history write fails
    }

    // Create notification for the voter
    try {
      await Notification.create({
        userId: traderWallet,
        type: 'vote_result',
        title: `Vote Recorded - ${updatedMarket.marketName}`,
        message: `Your ${voteType.toUpperCase()} vote of ${amount} SOL was successfully recorded!`,
        priority: 'medium',
        marketId: updatedMarket._id,
        actionUrl: `/market/${updatedMarket._id}`,
        metadata: {
          voteType,
          amount: lamports,
          signature,
          action: 'view_project',
        },
      });
      logger.info('Vote notification created', { traderWallet, marketId });
    } catch (error) {
      logger.error('Failed to create vote notification (non-fatal)', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't fail the request if notification creation fails
    }

    logger.info('Vote completed successfully', {
      marketId,
      voteType,
      signature,
      newYesCount: updatedMarket.yesVoteCount,
      newNoCount: updatedMarket.noVoteCount,
      newYesStake: updatedMarket.totalYesStake,
      newNoStake: updatedMarket.totalNoStake,
    });

    return NextResponse.json({
      success: true,
      data: {
        marketId,
        voteType,
        signature,
        yesVoteCount: updatedMarket.yesVoteCount,
        noVoteCount: updatedMarket.noVoteCount,
        totalYesStake: updatedMarket.totalYesStake,
        totalNoStake: updatedMarket.totalNoStake,
      },
    });

  } catch (error) {
    logger.error('Failed to complete vote transaction:', {
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete vote transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
