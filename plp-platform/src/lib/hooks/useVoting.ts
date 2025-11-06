/**
 * useVoting Hook
 *
 * Handles voting transactions using the same pattern as the create page:
 * 1. Prepare transaction (server-side)
 * 2. Sign with Dynamic wallet (client-side)
 * 3. Send to Solana (client-side)
 * 4. Confirm transaction
 * 5. Update MongoDB (server-side)
 */

import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { VersionedTransaction } from '@solana/web3.js';
import { sendRawTransaction, getSolanaConnection } from '@/lib/solana';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export interface VoteParams {
  marketId: string;          // MongoDB _id
  marketAddress: string;     // On-chain market PDA address
  voteType: 'yes' | 'no';    // Vote direction
  amount: number;            // SOL amount (e.g., 0.01)
}

export interface VoteResult {
  success: boolean;
  signature?: string;        // Transaction signature
  yesVoteCount?: number;     // Updated vote counts
  noVoteCount?: number;
  error?: string;
}

export function useVoting() {
  const { primaryWallet, user } = useWallet();
  const [isVoting, setIsVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = useCallback(async (params: VoteParams): Promise<VoteResult> => {
    // Validate wallet connection
    if (!primaryWallet) {
      const errorMsg = 'Please connect your wallet first';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsVoting(true);
    setError(null);

    try {
      logger.info('Starting vote transaction', {
        marketId: params.marketId,
        voteType: params.voteType,
        amount: params.amount,
        userWallet: primaryWallet.address,
      });

      // Step 1: Prepare transaction (server-side)
      logger.info('Preparing transaction...');
      const prepareResponse = await fetch('/api/markets/vote/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketAddress: params.marketAddress,
          voteType: params.voteType,
          amount: params.amount,
          userWallet: primaryWallet.address,
        }),
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        throw new Error(prepareResult.error || 'Failed to prepare vote transaction');
      }

      logger.info('Transaction prepared successfully', {
        positionPda: prepareResult.data.positionPda,
      });

      // Step 2: Sign transaction with Dynamic wallet (same pattern as create page)
      let signature: string;

      try {
        // Get Dynamic Labs signer
        logger.info('Getting Dynamic Labs signer...');
        // Get Privy wallet for signing
        const privyWallet = (primaryWallet as any)._privyWallet;
        if (!privyWallet) {
          throw new Error('Privy wallet not found');
        }

        // Deserialize transaction
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serialized transaction provided by server');
        }

        const txBuffer = Buffer.from(rawTx, 'base64');
        const transaction = VersionedTransaction.deserialize(txBuffer);

        logger.info('Transaction deserialized, signing...');

        // Sign with Privy wallet
        const signedTransaction = await privyWallet.signTransaction(transaction);
        logger.info('Transaction signed successfully');

        // Step 3: Send to Solana (with fallback)
        logger.info('Sending transaction to Solana...');

        try {
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
          logger.info('Transaction sent:', signature);
        } catch (rpcError: any) {
          logger.warn('Primary RPC failed, trying with skipPreflight...', rpcError.message);
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'confirmed',
          });
          logger.info('Transaction sent via fallback:', signature);
        }

        // Step 4: Wait for confirmation
        logger.info('Waiting for confirmation...');
        const connection = await getSolanaConnection();
        await connection.confirmTransaction(signature, 'confirmed');
        logger.info('Transaction confirmed!');

      } catch (signerError: any) {
        logger.error('Privy wallet signing failed:', signerError.message);
        throw new Error(`Failed to sign transaction: ${signerError.message}`);
      }

      // Step 5: Complete vote in MongoDB
      logger.info('Updating database...');
      const completeResponse = await fetch('/api/markets/vote/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: params.marketId,
          voteType: params.voteType,
          amount: params.amount,
          signature,
          traderWallet: primaryWallet.address,
          shares: 0, // TODO: Get actual shares from on-chain transaction
        }),
      });

      const completeResult = await completeResponse.json();

      if (!completeResult.success) {
        logger.warn('Database update failed, but on-chain vote succeeded', {
          signature,
          error: completeResult.error,
        });
        // Don't throw - the vote succeeded on-chain
      }

      logger.info('Vote completed successfully!', {
        signature,
        yesVoteCount: completeResult.data?.yesVoteCount,
        noVoteCount: completeResult.data?.noVoteCount,
      });

      setIsVoting(false);
      return {
        success: true,
        signature,
        yesVoteCount: completeResult.data?.yesVoteCount,
        noVoteCount: completeResult.data?.noVoteCount,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Vote transaction failed:', err);
      setError(errorMessage);
      setIsVoting(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [primaryWallet, user]);

  return {
    vote,
    isVoting,
    error,
  };
}
