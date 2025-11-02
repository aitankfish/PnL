/**
 * API endpoint for updating database after market resolution
 *
 * This endpoint updates the database with the resolution outcome
 * Transaction is already sent by the client (useResolution hook)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientLogger } from '@/lib/logger';
import { getSolanaConnection } from '@/lib/solana';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '@/lib/anchor-program';
import { connectToDatabase, getDatabase } from '@/lib/database/index';
import { COLLECTIONS } from '@/lib/database/models';
import { ObjectId } from 'mongodb';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketId, marketAddress, signature } = body;

    // Validate inputs
    if (!marketId || !marketAddress || !signature) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: marketId, marketAddress, signature',
        },
        { status: 400 }
      );
    }

    logger.info('Updating database after market resolution', {
      marketId,
      marketAddress,
      signature,
    });

    // Fetch the updated market state from blockchain
    const connection = await getSolanaConnection();
    const program = getProgram();
    const marketPubkey = new PublicKey(marketAddress);

    logger.info('Fetching updated market state from blockchain...');
    const marketAccount = await program.account.predictionMarket.fetch(marketPubkey);

    // Determine resolution outcome
    // Rust enum: 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
    let resolutionOutcome = 'Unknown';
    if (marketAccount.resolution === 0) {
      resolutionOutcome = 'Unresolved';
    } else if (marketAccount.resolution === 1) {
      resolutionOutcome = 'YesWins';
    } else if (marketAccount.resolution === 2) {
      resolutionOutcome = 'NoWins';
    } else if (marketAccount.resolution === 3) {
      resolutionOutcome = 'Refund';
    }

    logger.info('Market resolved', {
      marketAddress,
      resolution: resolutionOutcome,
      winningOption: marketAccount.winningOption,
    });

    // Update database with resolution
    await connectToDatabase();
    const db = await getDatabase();

    await db.collection(COLLECTIONS.PREDICTION_MARKETS).updateOne(
      { _id: new ObjectId(marketId) },
      {
        $set: {
          marketState: marketAccount.marketState,
          winningOption: marketAccount.winningOption,
          resolution: resolutionOutcome,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        }
      }
    );

    logger.info('Database updated with resolution', {
      marketId,
      resolution: resolutionOutcome,
    });

    return NextResponse.json({
      success: true,
      data: {
        signature,
        resolution: resolutionOutcome,
        winningOption: marketAccount.winningOption,
        message: 'Market resolved successfully!',
      },
    });

  } catch (error) {
    logger.error('Failed to update database after resolution:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update database after resolution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
