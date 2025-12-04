/**
 * API endpoint for completing vote transactions
 *
 * This endpoint updates MongoDB vote counts after a successful on-chain vote
 * Trade history is written to MongoDB for devnet (Helius doesn't index devnet)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase as connectMongoose, PredictionMarket, PredictionParticipant, Notification } from '@/lib/mongodb';
import { connectToDatabase, getDatabase } from '@/lib/database/index';
import { COLLECTIONS, TradeHistory } from '@/lib/database/models';
import { createClientLogger } from '@/lib/logger';
import { updateMarketVoteCounts } from '@/lib/vote-counts';
import { broadcastMarketUpdate } from '@/services/socket/socket-server';

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

    logger.info('📥 [API] Received vote completion request', {
      marketId,
      voteType,
      amount,
      signature,
      traderWallet: traderWallet.slice(0, 8) + '...',
    });

    // Connect to MongoDB (Mongoose for market models)
    await connectMongoose();
    logger.info('✅ [API] Connected to MongoDB');

    // Convert SOL to lamports for stake tracking
    const lamports = Math.floor(amount * 1_000_000_000);

    // Get market for trade history and notifications
    const market = await PredictionMarket.findById(marketId);

    if (!market) {
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
        marketId: market._id,
        marketAddress: market.marketAddress,
        traderWallet,
        voteType,
        amount: lamports,
        shares: lamports, // 1:1 for simplicity
        yesPrice: market.totalYesStake / (market.totalYesStake + market.totalNoStake) * 100 || 50,
        noPrice: market.totalNoStake / (market.totalYesStake + market.totalNoStake) * 100 || 50,
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

    // Create/update participant record for vote counting
    // This ensures vote counts work immediately without relying on blockchain sync
    try {
      const participant = await PredictionParticipant.findOne({
        marketId: market._id,
        participantWallet: traderWallet,
      });

      if (participant) {
        // Update existing participant
        const currentYesShares = BigInt(participant.yesShares || '0');
        const currentNoShares = BigInt(participant.noShares || '0');
        const currentTotalInvested = BigInt(participant.totalInvested || '0');

        // Add new shares to appropriate side
        if (voteType === 'yes') {
          participant.yesShares = (currentYesShares + BigInt(lamports)).toString();
        } else {
          participant.noShares = (currentNoShares + BigInt(lamports)).toString();
        }

        participant.totalInvested = (currentTotalInvested + BigInt(lamports)).toString();
        await participant.save();

        logger.info('✅ [MONGODB] Updated participant record', {
          participantWallet: traderWallet.slice(0, 8) + '...',
          marketId: market._id.toString(),
          yesShares: participant.yesShares,
          noShares: participant.noShares,
        });
      } else {
        // Create new participant
        await PredictionParticipant.create({
          marketId: market._id,
          participantWallet: traderWallet,
          voteOption: voteType === 'yes', // true=YES, false=NO (legacy field)
          stakeAmount: lamports, // Legacy field
          voteCost: lamports, // Legacy field
          yesShares: voteType === 'yes' ? lamports.toString() : '0',
          noShares: voteType === 'no' ? lamports.toString() : '0',
          totalInvested: lamports.toString(),
        });

        logger.info('Created participant record', {
          participantWallet: traderWallet,
          marketId: market._id.toString(),
          voteType,
          amount: lamports,
        });
      }
    } catch (error) {
      logger.error('Failed to create/update participant record:', {
        error: error instanceof Error ? error.message : String(error),
        participantWallet: traderWallet,
        marketId: market._id.toString(),
      });
      // Don't fail the request if participant creation fails
    }

    // Create notification for the voter
    try {
      await Notification.create({
        userId: traderWallet,
        type: 'vote_result',
        title: `Vote Recorded - ${market.marketName}`,
        message: `Your ${voteType.toUpperCase()} vote of ${amount} SOL was successfully recorded!`,
        priority: 'medium',
        marketId: market._id,
        actionUrl: `/market/${market._id}`,
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

    // Update vote counts from MongoDB as a fallback
    // (blockchain sync via WebSocket is primary, this is backup)
    try {
      const voteCounts = await updateMarketVoteCounts(marketId);
      logger.info('✅ [MONGODB] Vote counts updated', {
        marketId,
        yesVoteCount: voteCounts.yesVoteCount,
        noVoteCount: voteCounts.noVoteCount,
      });

      // Recalculate stakes from participants (fresh, accurate data)
      const participants = await PredictionParticipant.find({ marketId: market._id });
      let totalYesStake = 0;
      let totalNoStake = 0;

      for (const participant of participants) {
        const yesShares = BigInt(participant.yesShares || '0');
        const noShares = BigInt(participant.noShares || '0');
        totalYesStake += Number(yesShares);
        totalNoStake += Number(noShares);
      }

      // Calculate percentages based on actual stakes
      const totalStake = totalYesStake + totalNoStake;
      const yesPercentage = totalStake > 0 ? Math.round((totalYesStake / totalStake) * 100) : 50;
      const noPercentage = totalStake > 0 ? Math.round((totalNoStake / totalStake) * 100) : 50;

      // Calculate pool progress percentage
      const targetPoolLamports = market.targetPool; // Already in lamports
      const currentPoolLamports = totalYesStake + totalNoStake;
      const poolProgressPercentage = targetPoolLamports > 0
        ? Math.min(100, Math.round((currentPoolLamports / targetPoolLamports) * 100))
        : 0;

      // Store calculated values in MongoDB for consistency across all pages
      await PredictionMarket.updateOne(
        { _id: market._id },
        {
          $set: {
            totalYesStake,
            totalNoStake,
            yesPercentage,
            noPercentage,
            poolProgressPercentage,
          }
        }
      );

      logger.info('✅ [MONGODB] Updated market with calculated stakes and percentages', {
        marketId: market._id.toString(),
        totalYesStake,
        totalNoStake,
        yesPercentage,
        noPercentage,
        poolProgressPercentage,
      });

      // Refetch market to get all updated fields
      const updatedMarket = await PredictionMarket.findById(marketId);
      if (!updatedMarket) {
        throw new Error('Market not found after update');
      }

      logger.info('📡 [SOCKET] Broadcasting market update', {
        marketAddress: market.marketAddress.slice(0, 8) + '...',
        yesVotes: voteCounts.yesVoteCount,
        noVotes: voteCounts.noVoteCount,
        totalYesStake: updatedMarket.totalYesStake,
        totalNoStake: updatedMarket.totalNoStake,
        yesPercentage: yesPercentage.toFixed(2),
        noPercentage: noPercentage.toFixed(2),
      });

      broadcastMarketUpdate(market.marketAddress, {
        yesVotes: voteCounts.yesVoteCount,
        noVotes: voteCounts.noVoteCount,
        totalYesStake: updatedMarket.totalYesStake,
        totalNoStake: updatedMarket.totalNoStake,
        yesPercentage,
        noPercentage,
      });

      logger.info('✅ [SOCKET] Market update broadcasted successfully');
    } catch (error) {
      logger.error('Failed to update vote counts (non-fatal)', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't fail the request if vote count update fails
    }

    logger.info('Vote transaction completed', {
      marketId,
      voteType,
      signature,
    });

    return NextResponse.json({
      success: true,
      data: {
        marketId,
        voteType,
        signature,
        message: 'Vote recorded on-chain and database updated.',
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
