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

    // Fetch on-chain market account using Anchor program
    const connection = await getSolanaConnection();
    const program = getProgram(connection);

    logger.info('Fetching on-chain market account...');
    const marketAccount = await program.account.predictionMarket.fetch(marketPubkey);

    // Check if market is resolved
    // Rust enum: 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
    if (marketAccount.resolution === 0) {
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

    // Fetch on-chain position account using Anchor program
    const positionAccount = await program.account.position.fetch(positionPda);

    if (positionAccount.claimed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rewards already claimed',
        },
        { status: 400 }
      );
    }

    // Calculate claimable amount based on resolution type
    let claimableAmount = 0;
    let resolutionType = '';

    if (marketAccount.resolution === 1) {
      // YesWins - User receives tokens
      resolutionType = 'YesWins';

      if (positionAccount.yesShares > 0 && marketAccount.totalYesShares > 0) {
        // Calculate proportional token claim
        // user_tokens = (user_yes_shares / total_yes_shares) * yes_voter_tokens_allocated
        const userYesShares = BigInt(positionAccount.yesShares.toString());
        const totalYesShares = BigInt(marketAccount.totalYesShares.toString());
        const yesVoterTokens = BigInt(marketAccount.yesVoterTokensAllocated.toString());

        claimableAmount = Number((userYesShares * yesVoterTokens) / totalYesShares);
      }
    } else if (marketAccount.resolution === 2) {
      // NoWins - User receives SOL
      resolutionType = 'NoWins';

      if (positionAccount.noShares > 0 && marketAccount.totalNoShares > 0) {
        // Calculate proportional SOL payout
        // payout = (user_no_shares / total_no_shares) * pool_balance
        const userNoShares = BigInt(positionAccount.noShares.toString());
        const totalNoShares = BigInt(marketAccount.totalNoShares.toString());
        const poolBalance = BigInt(marketAccount.poolBalance.toString());

        claimableAmount = Number((userNoShares * poolBalance) / totalNoShares);
      }
    } else if (marketAccount.resolution === 3) {
      // Refund - User receives invested amount minus trading fees (98.5%)
      resolutionType = 'Refund';

      if (positionAccount.totalInvested > 0) {
        // Calculate refund: 98.5% of invested (1.5% was trading fees)
        const totalInvested = BigInt(positionAccount.totalInvested.toString());
        const TRADE_FEE_BPS = BigInt(150);
        const BPS_DIVISOR = BigInt(10000);

        claimableAmount = Number((totalInvested * (BPS_DIVISOR - TRADE_FEE_BPS)) / BPS_DIVISOR);
      }
    }

    logger.info('Claimable amount calculated', {
      resolutionType,
      claimableAmount,
      claimableAmountSOL: (claimableAmount / 1e9).toFixed(4),
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
