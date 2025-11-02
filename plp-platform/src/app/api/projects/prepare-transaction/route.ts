/**
 * API endpoint for preparing Actions Protocol market creation transaction
 * Returns unsigned transaction for client-side wallet signing
 */

import { NextRequest, NextResponse } from 'next/server';
import { plpActionsProtocol } from '@/lib/actions-protocol';
import { createClientLogger } from '@/lib/logger';
import { Transaction, PublicKey, Connection, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { getSolanaConnection } from '@/lib/solana';

const logger = createClientLogger();

export async function POST(request: NextRequest) {
  try {
    logger.info('🚀 Preparing Actions Protocol transaction for client-side signing');
    
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['projectName', 'projectDescription', 'tokenSymbol', 'metadataUri', 'marketDuration', 'creatorWalletAddress'];
    for (const field of requiredFields) {
      if (!body[field]) {
        logger.error(`Missing required field: ${field}`);
        return NextResponse.json({ success: false, error: `Missing required field: ${field}` }, { status: 400 });
      }
    }
    
    logger.info('Preparing market creation transaction', {
      projectName: body.projectName,
      tokenSymbol: body.tokenSymbol,
      creatorWallet: body.creatorWalletAddress
    });
    
    // Prepare the transaction (without signing)
    // Try with current connection first, then refresh if needed
    let transactionResult;
    try {
      transactionResult = await plpActionsProtocol.prepareMarketCreationTransaction({
        projectName: body.projectName,
        projectDescription: body.projectDescription,
        tokenSymbol: body.tokenSymbol,
        metadataUri: body.metadataUri,
        marketDuration: parseInt(body.marketDuration),
        creatorWalletAddress: body.creatorWalletAddress
      });
    } catch (error) {
      logger.warn('Transaction preparation failed, refreshing connection...', error);
      // Refresh connection and try again
      await plpActionsProtocol.refreshConnection();
      transactionResult = await plpActionsProtocol.prepareMarketCreationTransaction({
        projectName: body.projectName,
        projectDescription: body.projectDescription,
        tokenSymbol: body.tokenSymbol,
        metadataUri: body.metadataUri,
        marketDuration: parseInt(body.marketDuration),
        creatorWalletAddress: body.creatorWalletAddress
      });
    }
    
    logger.info('Raw transaction prepared', {
      marketAddress: transactionResult.marketAddress,
      hasInstructions: transactionResult.transaction?.instructions?.length || 0
    });

    // Convert Actions Protocol raw transaction to proper Solana Transaction object
    // Use RPC fallback system for better reliability
    const connection = await getSolanaConnection();
    const properTransaction = await convertRawTransactionToProperTransaction(
      transactionResult.transaction as unknown as RawTransaction,
      body.creatorWalletAddress,
      connection
    );
    
    logger.info('Transaction converted successfully', {
      marketAddress: transactionResult.marketAddress,
      hasSerialize: typeof properTransaction.serialize === 'function'
    });
    
    // Serialize the transaction for transmission
    const serializedTransaction = properTransaction.serialize();
    
    return NextResponse.json({
      success: true,
      data: {
        serializedTransaction: Buffer.from(serializedTransaction).toString('base64'),
        marketAddress: transactionResult.marketAddress,
        message: 'Transaction prepared for client-side signing'
      }
    });
    
  } catch (error) {
    logger.error('❌ Failed to prepare transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to prepare transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Convert Actions Protocol raw transaction data to proper Solana Transaction object
 */
interface RawTransaction {
  recentBlockhash: string | null;
  feePayer: string | null;
  nonceInfo: unknown;
  instructions: RawInstruction[];
  signers: unknown[];
}

interface RawInstruction {
  keys: RawAccountMeta[];
  programId: string;
  data: number[];
}

interface RawAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

async function convertRawTransactionToProperTransaction(
  rawTransaction: RawTransaction,
  creatorWalletAddress: string,
  connection: Connection
): Promise<VersionedTransaction> {
  try {
    // Create a new Transaction object
    const transaction = new Transaction();
    
    // Set fee payer
    transaction.feePayer = new PublicKey(creatorWalletAddress);
    
    // Get fresh recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Add instructions from raw transaction
    if (rawTransaction.instructions && Array.isArray(rawTransaction.instructions)) {
      for (const rawInstruction of rawTransaction.instructions) {
        // Convert raw instruction to proper TransactionInstruction
        const instruction = {
          programId: new PublicKey(rawInstruction.programId),
          keys: rawInstruction.keys.map((key: RawAccountMeta) => ({
            pubkey: new PublicKey(key.pubkey),
            isSigner: key.isSigner,
            isWritable: key.isWritable
          })),
          data: Buffer.from(rawInstruction.data)
        };
        
        transaction.add(instruction);
      }
    }
    
    // Convert to VersionedTransaction
    const messageV0 = new TransactionMessage({
      payerKey: transaction.feePayer!,
      recentBlockhash: transaction.recentBlockhash!,
      instructions: transaction.instructions
    });
    const versionedTransaction = new VersionedTransaction(messageV0.compileToV0Message());
    
    logger.info('Transaction converted to VersionedTransaction', {
      instructionsCount: transaction.instructions.length,
      feePayer: transaction.feePayer.toString(),
      recentBlockhash: transaction.recentBlockhash
    });
    
    return versionedTransaction;
  } catch (error) {
    logger.error('Failed to convert raw transaction:', error);
    throw new Error(`Transaction conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
