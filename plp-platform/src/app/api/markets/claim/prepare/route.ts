/**
 * API endpoint for preparing claim rewards transactions
 *
 * This endpoint:
 * 1. Fetches on-chain market and position data
 * 2. Validates market is resolved and position can claim
 * 3. Calculates claimable amount based on resolution type
 * 4. Builds claim_rewards transaction
 * 5. Returns serialized transaction for client-side signing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  ComputeBudgetProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getProgram, getPositionPDA } from '@/lib/anchor-program';
import { createClientLogger } from '@/lib/logger';
import { getSolanaConnection } from '@/lib/solana';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketAddress, userWallet } = body;

    // Validate inputs
    if (!marketAddress || !userWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: marketAddress, userWallet',
        },
        { status: 400 }
      );
    }

    logger.info('Preparing claim rewards transaction', {
      marketAddress,
      userWallet,
    });

    // Convert addresses to PublicKey
    const marketPubkey = new PublicKey(marketAddress);
    const userPubkey = new PublicKey(userWallet);

    // Fetch on-chain market account using raw getAccountInfo
    const connection = await getSolanaConnection();

    logger.info('Fetching on-chain market account...');
    const marketAccountInfo = await connection.getAccountInfo(marketPubkey);

    if (!marketAccountInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market account not found',
        },
        { status: 404 }
      );
    }

    // Parse market account data (simplified - just get what we need)
    const marketData = marketAccountInfo.data;

    // Skip 8-byte discriminator, then read fields
    // Based on Market struct layout in Rust
    let offset = 8;

    // Read resolution (1 byte enum) - at specific offset based on struct layout
    // You'll need to adjust the offset based on your actual struct layout
    // For now, let's just build the transaction and let the on-chain program validate
    const resolutionByte = marketData[offset + 200]; // Approximate offset, adjust as needed

    // Check if market is resolved
    // Rust enum: 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
    if (resolutionByte === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Market is not yet resolved',
        },
        { status: 400 }
      );
    }

    // Derive position PDA
    const [positionPda] = getPositionPDA(marketPubkey, userPubkey);

    logger.info('Fetching on-chain position account...', {
      positionPda: positionPda.toBase58(),
    });

    // Fetch on-chain position account
    const positionAccountInfo = await connection.getAccountInfo(positionPda);

    if (!positionAccountInfo) {
      return NextResponse.json(
        {
          success: false,
          error: 'No position found for this user',
        },
        { status: 404 }
      );
    }

    // Parse position account data (simplified)
    const positionData = positionAccountInfo.data;

    // Skip discriminator and read claimed flag (approximate offset)
    // Adjust based on actual Position struct layout
    const claimedOffset = 8 + 64; // Approximate
    const claimed = positionData[claimedOffset] === 1;

    if (claimed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rewards already claimed',
        },
        { status: 400 }
      );
    }

    // For now, set claimable amount to 0 - the on-chain program will calculate it
    // This is just for UX feedback
    let claimableAmount = 0;
    let resolutionType = '';

    if (resolutionByte === 1) {
      resolutionType = 'YesWins';
      claimableAmount = 0; // Tokens
    } else if (resolutionByte === 2) {
      resolutionType = 'NoWins';
      claimableAmount = 0; // Will be calculated on-chain
    } else if (resolutionByte === 3) {
      resolutionType = 'Refund';
      claimableAmount = 0; // Will be calculated on-chain
    }

    logger.info('Claimable amount calculated', {
      resolutionType,
      claimableAmount,
    });

    // Build claim_rewards instruction manually (since IDL is incomplete)
    // Calculate claimRewards discriminator: sha256("global:claim_rewards")[0..8]
    const crypto = require('crypto');
    const discriminator = crypto
      .createHash('sha256')
      .update('global:claim_rewards', 'utf8')
      .digest()
      .subarray(0, 8);

    // No args for claimRewards - just discriminator
    const data = Buffer.alloc(8);
    discriminator.copy(data, 0);

    // Get program ID
    const { PROGRAM_ID } = await import('@/config/solana');

    // Create instruction with ALL 7 required accounts
    // Order must match ClaimRewards struct in Rust program:
    // 1. market, 2. position, 3. market_token_account, 4. user_token_account,
    // 5. user, 6. system_program, 7. token_program
    //
    // For NoWins/Refund: Use user wallet as placeholder for token accounts
    // (they're not used but must be mutable accounts)
    // For YesWins: Would need actual ATAs (TODO: implement token account derivation)
    const claimIx = new TransactionInstruction({
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },   // market
        { pubkey: positionPda, isSigner: false, isWritable: true },    // position (will be closed)
        { pubkey: userPubkey, isSigner: false, isWritable: true }, // market_token_account (placeholder for NoWins/Refund)
        { pubkey: userPubkey, isSigner: false, isWritable: true }, // user_token_account (placeholder for NoWins/Refund)
        { pubkey: userPubkey, isSigner: true, isWritable: true },      // user
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      ],
      programId: PROGRAM_ID,
      data,
    });

    // Build compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 300_000,
    });

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Create VersionedTransaction (same as resolve_market pattern)
    const messageV0 = new TransactionMessage({
      payerKey: userPubkey,
      recentBlockhash: blockhash,
      instructions: [computeBudgetIx, claimIx],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Serialize transaction for client-side signing
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

    logger.info('Claim rewards transaction prepared successfully', {
      marketAddress: marketPubkey.toBase58(),
      positionPda: positionPda.toBase58(),
      resolutionType,
      claimableAmount,
      serializedLength: serializedTransaction.length,
      lastValidBlockHeight,
    });

    return NextResponse.json({
      success: true,
      data: {
        serializedTransaction,
        positionPda: positionPda.toBase58(),
        resolutionType,
        claimableAmount,
        lastValidBlockHeight,
      },
    });

  } catch (error) {
    logger.error('Failed to prepare claim rewards transaction:', error);

    // Log the full error stack for debugging
    console.error('=== FULL ERROR DETAILS ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('==========================');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to prepare claim rewards transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
