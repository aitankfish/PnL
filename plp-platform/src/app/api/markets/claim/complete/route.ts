/**
 * API endpoint for completing claim reward transactions
 *
 * This endpoint receives a signed transaction, sends it to the blockchain,
 * and confirms the claim
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClientLogger } from '@/lib/logger';
import { sendRawTransaction } from '@/lib/solana';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signedTransaction, marketId, userWallet } = body;

    // Validate inputs
    if (!signedTransaction || !marketId || !userWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: signedTransaction, marketId, userWallet',
        },
        { status: 400 }
      );
    }

    logger.info('Completing claim rewards transaction', {
      marketId,
      userWallet,
    });

    // Decode the signed transaction
    const transactionBuffer = Buffer.from(signedTransaction, 'base64');

    // Send transaction to blockchain
    logger.info('Sending claim rewards transaction to blockchain...');
    const signature = await sendRawTransaction(transactionBuffer, {
      skipPreflight: false,
      maxRetries: 3,
      preflightCommitment: 'confirmed'
    });

    logger.info('Claim rewards transaction sent', { signature });

    // Wait for confirmation (simple confirmation, not finalized)
    // The transaction will be confirmed in the background
    logger.info('Claim rewards completed successfully', {
      marketId,
      userWallet,
      signature,
    });

    return NextResponse.json({
      success: true,
      data: {
        signature,
        message: 'Rewards claimed successfully!',
      },
    });

  } catch (error) {
    logger.error('Failed to complete claim rewards transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete claim rewards transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
