/**
 * useClaiming Hook
 * Handles the claim rewards flow: prepare → sign → send → confirm
 * Uses VersionedTransaction and Privy wallet signer
 */

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { VersionedTransaction } from '@solana/web3.js';
import { sendRawTransaction, getSolanaConnection } from '@/lib/solana';
import { useSignTransaction, useWallets } from '@privy-io/react-auth/solana';

export function useClaiming() {
  const [isClaiming, setIsClaiming] = useState(false);
  const { primaryWallet } = useWallet();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const claim = async (params: {
    marketId: string;
    marketAddress: string;
  }): Promise<{ success: boolean; signature?: string; claimAmount?: number; error?: any }> => {
    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsClaiming(true);

      // Step 1: Prepare transaction
      console.log('🔧 Preparing claim rewards transaction...');
      const prepareResponse = await fetch('/api/markets/claim/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketAddress: params.marketAddress,
          userWallet: primaryWallet.address,
        }),
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        console.error('❌ Failed to prepare claim transaction:', prepareResult.error);
        return { success: false, error: prepareResult.error };
      }

      console.log('✅ Claim transaction prepared');
      console.log(`   Resolution: ${prepareResult.data.resolutionType}`);
      console.log(`   Claimable amount: ${prepareResult.data.claimableAmount} lamports (${(prepareResult.data.claimableAmount / 1e9).toFixed(4)} SOL)`);

      let signature;

      try {
        // STEP 2: Deserialize transaction
        console.log('🚀 Preparing transaction for signing...');

        // Get serialized transaction from API response
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serializedTransaction provided by server');
        }

        // Deserialize the transaction into a VersionedTransaction
        const txBuffer = Buffer.from(rawTx, 'base64');
        const properTransaction = VersionedTransaction.deserialize(txBuffer);

        console.log('🔄 VersionedTransaction ready for signing');

        // STEP 3: Sign transaction with Privy
        console.log('✍️ Signing transaction with Privy...');
        let signedTransactionData: Uint8Array;

        if (wallets && wallets.length > 0) {
          // Use the Privy hook for wallets from useWallets()
          const { signedTransaction } = await signTransaction({
            transaction: new Uint8Array(properTransaction.serialize()),
            wallet: wallets[0],
          });
          signedTransactionData = signedTransaction;
        } else {
          // Fallback: use _privyWallet and call signTransaction directly
          const privyWallet = (primaryWallet as any)?._privyWallet;
          if (!privyWallet || typeof privyWallet.signTransaction !== 'function') {
            throw new Error('No valid Solana wallet found');
          }
          const signed = await privyWallet.signTransaction(properTransaction);
          signedTransactionData = signed.serialize();
        }
        console.log('✅ Transaction signed by Privy!');

        // STEP 4: Send signed transaction to Solana via our RPC system
        console.log('📤 Sending signed transaction to Solana via our RPC...');

        try {
          // Send the signed transaction directly to Solana using our RPC fallback system
          signature = await sendRawTransaction(signedTransactionData, {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
          console.log('✅ Transaction submitted to Solana:', signature);
        } catch (rpcError: unknown) {
          const errorMessage = rpcError instanceof Error ? rpcError.message : 'Unknown error';
          console.log('⚠️ Primary RPC failed, trying fallback with skipPreflight...', errorMessage);
          // Try with skipPreflight as fallback
          signature = await sendRawTransaction(signedTransactionData, {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
          console.log('✅ Transaction submitted via fallback RPC:', signature);
        }

        // STEP 5: Wait for confirmation using our RPC system
        console.log('⏳ Waiting for transaction confirmation...');
        const connection = await getSolanaConnection();
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('✅ Transaction confirmed on blockchain!');

      } catch (signerError: unknown) {
        const errorMessage = signerError instanceof Error ? signerError.message : 'Unknown error';
        console.error('❌ Privy wallet signing failed:', errorMessage);
        throw new Error(`Failed to sign transaction: ${errorMessage}`);
      }

      console.log('🎉 Claim rewards completed successfully!');
      return {
        success: true,
        signature,
        claimAmount: prepareResult.data.claimableAmount,
      };

    } catch (error) {
      console.error('❌ Claim error:', error);
      return { success: false, error };
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    claim,
    isClaiming,
  };
}
