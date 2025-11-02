/**
 * API endpoint for preparing vote transactions
 *
 * This endpoint builds a buy_yes or buy_no transaction and returns
 * a serialized transaction for client-side signing
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { buildBuyYesTransaction, buildBuyNoTransaction } from '@/lib/anchor-program';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketAddress, voteType, amount, userWallet } = body;

    // Validate inputs
    if (!marketAddress || !voteType || !amount || !userWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: marketAddress, voteType, amount, userWallet',
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

    // Validate amount (minimum 0.01 SOL = 10_000_000 lamports)
    const lamports = Math.floor(amount * 1_000_000_000);
    if (lamports < 10_000_000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Minimum vote amount is 0.01 SOL',
        },
        { status: 400 }
      );
    }

    logger.info('Preparing vote transaction', {
      marketAddress,
      voteType,
      amount,
      lamports,
      userWallet,
    });

    // Convert addresses to PublicKey
    const marketPubkey = new PublicKey(marketAddress);
    const userPubkey = new PublicKey(userWallet);

    // Debug: Check Treasury PDA derivation
    const { getTreasuryPDA } = await import('@/lib/anchor-program');
    const [treasuryPda] = getTreasuryPDA();
    logger.info('Treasury PDA being used:', treasuryPda.toBase58());

    // Build transaction based on vote type
    const result = voteType === 'yes'
      ? await buildBuyYesTransaction({
          market: marketPubkey,
          user: userPubkey,
          solAmount: lamports,
        })
      : await buildBuyNoTransaction({
          market: marketPubkey,
          user: userPubkey,
          solAmount: lamports,
        });

    // Serialize transaction for client-side signing
    const serializedTransaction = Buffer.from(result.transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })).toString('base64');

    logger.info('Vote transaction prepared successfully', {
      voteType,
      positionPda: result.positionPda,
      serializedLength: serializedTransaction.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        serializedTransaction,
        positionPda: result.positionPda,
        voteType,
        amount,
        lamports,
      },
    });

  } catch (error) {
    logger.error('Failed to prepare vote transaction:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to prepare vote transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
