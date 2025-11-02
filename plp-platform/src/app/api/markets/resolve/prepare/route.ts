/**
 * API endpoint for preparing market resolution transactions
 *
 * This endpoint builds a resolve_market transaction and returns
 * a serialized transaction for client-side signing
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { getTreasuryPDA } from '@/lib/anchor-program';
import { createClientLogger } from '@/lib/logger';
import { getSolanaConnection } from '@/lib/solana';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketAddress, callerWallet } = body;

    // Validate inputs
    if (!marketAddress || !callerWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: marketAddress, callerWallet',
        },
        { status: 400 }
      );
    }

    logger.info('Preparing market resolution transaction', {
      marketAddress,
      callerWallet,
    });

    // Convert addresses to PublicKey
    const marketPubkey = new PublicKey(marketAddress);
    const callerPubkey = new PublicKey(callerWallet);

    // Derive Treasury PDA
    const [treasuryPda] = getTreasuryPDA();

    logger.info('Treasury PDA derived', {
      treasuryPda: treasuryPda.toBase58(),
    });

    // Get connection
    const connection = await getSolanaConnection();

    // Build resolve_market instruction manually (since IDL is incomplete)
    // Calculate resolveMarket discriminator: sha256("global:resolve_market")[0..8]
    const crypto = require('crypto');
    const discriminator = crypto
      .createHash('sha256')
      .update('global:resolve_market', 'utf8')
      .digest()
      .subarray(0, 8);

    // No args for resolveMarket - just discriminator
    const data = Buffer.alloc(8);
    discriminator.copy(data, 0);

    // Get program ID
    const { PROGRAM_ID } = await import('@/config/solana');

    // Create instruction
    const { TransactionInstruction } = await import('@solana/web3.js');
    const resolveIx = new TransactionInstruction({
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },       // market
        { pubkey: treasuryPda, isSigner: false, isWritable: true },        // treasury
        { pubkey: callerPubkey, isSigner: true, isWritable: true },        // caller (anyone can resolve)
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      programId: PROGRAM_ID,
      data,
    });

    // Build compute budget instruction
    const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    });

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Create VersionedTransaction (same as create page)
    const messageV0 = new TransactionMessage({
      payerKey: callerPubkey,
      recentBlockhash: blockhash,
      instructions: [computeBudgetIx, resolveIx],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);

    // Serialize transaction for client-side signing
    const serializedTransaction = Buffer.from(transaction.serialize()).toString('base64');

    logger.info('Market resolution transaction prepared successfully', {
      marketAddress: marketPubkey.toBase58(),
      treasuryPda: treasuryPda.toBase58(),
      serializedLength: serializedTransaction.length,
      lastValidBlockHeight,
    });

    return NextResponse.json({
      success: true,
      data: {
        serializedTransaction,
        treasuryPda: treasuryPda.toBase58(),
        lastValidBlockHeight,
      },
    });

  } catch (error) {
    logger.error('Failed to prepare market resolution transaction:', error);

    // Log the full error stack for debugging
    console.error('=== FULL ERROR DETAILS ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('==========================');

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to prepare market resolution transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
