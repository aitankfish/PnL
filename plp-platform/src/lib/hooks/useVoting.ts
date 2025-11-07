/**
 * useVoting Hook
 *
 * Handles voting transactions using the same pattern as the create page:
 * 1. Prepare transaction (server-side)
 * 2. Sign with Privy wallet (client-side)
 * 3. Send to Solana (client-side)
 * 4. Confirm transaction
 * 5. Update MongoDB (server-side)
 */

import { useState, useCallback } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getSolanaConnection } from '@/lib/solana';
import { createClientLogger } from '@/lib/logger';
import { useWallets, useSignAndSendTransaction, useStandardWallets } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';

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
  const { primaryWallet } = useWallet();
  const { wallets } = useWallets(); // External wallets
  const { wallets: standardWallets } = useStandardWallets(); // Standard wallet interface (includes embedded)
  const { signAndSendTransaction } = useSignAndSendTransaction();
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

      // Step 2: Sign and send transaction with Privy (single call)
      let signature: string;

      try {
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serialized transaction provided by server');
        }

        logger.info('Signing and sending transaction with Privy...');

        // Get Solana wallet - prioritize external wallets, fallback to standard wallets (embedded)
        let solanaWallet;

        if (wallets && wallets.length > 0) {
          // Path 1: External wallet (Phantom, Solflare, etc.)
          logger.info('Using external Solana wallet');
          solanaWallet = wallets[0];
        } else if (standardWallets && standardWallets.length > 0) {
          // Path 2: Embedded wallet from standard wallets
          logger.info('Using embedded Solana wallet');
          const privyWallet = standardWallets.find((w: any) => w.isPrivyWallet || w.name === 'Privy');
          if (!privyWallet) {
            throw new Error('No Privy wallet found');
          }
          solanaWallet = privyWallet;
        } else {
          throw new Error('No Solana wallet found');
        }

        // Convert base64 transaction to Uint8Array
        const txBuffer = Buffer.from(rawTx, 'base64');

        // Use signAndSendTransaction - works for both external and embedded wallets
        const result = await signAndSendTransaction({
          transaction: txBuffer,
          wallet: solanaWallet as any,
          chain: 'solana:devnet', // or 'solana:mainnet' based on your network
        });

        // Extract signature from result and convert to base58 (Solana standard format)
        signature = bs58.encode(result.signature);
        logger.info('Transaction signed and sent', { signature });

        // Wait for confirmation
        logger.info('Waiting for confirmation...');
        const connection = await getSolanaConnection();
        await connection.confirmTransaction(signature, 'confirmed');
        logger.info('Transaction confirmed!');

      } catch (signerError: any) {
        logger.error('Privy signing/sending failed', { error: signerError.message });
        throw new Error(`Failed to sign/send transaction: ${signerError.message}`);
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
      logger.error('Vote transaction failed', { error: err });
      setError(errorMessage);
      setIsVoting(false);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [primaryWallet, wallets, standardWallets, signAndSendTransaction]);

  return {
    vote,
    isVoting,
    error,
  };
}
