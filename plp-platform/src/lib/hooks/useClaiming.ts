/**
 * useClaiming Hook
 * Handles the claim rewards flow: prepare → sign → send → confirm
 * Uses VersionedTransaction and Dynamic Labs signer (same as useResolution)
 */

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { VersionedTransaction } from '@solana/web3.js';
import { sendRawTransaction, getSolanaConnection } from '@/lib/solana';

// Dynamic Labs signer interface
interface DynamicSigner {
  signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
}

// Dynamic Labs wallet interface with getSigner method
interface DynamicWalletWithSigner {
  getSigner: () => Promise<DynamicSigner>;
  _connector?: {
    signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
  };
}

export function useClaiming() {
  const [isClaiming, setIsClaiming] = useState(false);
  const { primaryWallet } = useWallet();

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
        // STEP 2: Get Dynamic Labs signer (for signing only)
        console.log('🚀 Getting Dynamic Labs signer for transaction signing...');
        const signer = await (primaryWallet as unknown as DynamicWalletWithSigner).getSigner();
        console.log('✅ Got signer from Dynamic Labs');

        // Get serialized transaction from API response
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serializedTransaction provided by server');
        }

        // Deserialize the transaction into a VersionedTransaction
        const txBuffer = Buffer.from(rawTx, 'base64');
        const properTransaction = VersionedTransaction.deserialize(txBuffer);

        console.log('🔄 VersionedTransaction ready for signing');

        // STEP 3: Sign transaction with Dynamic Labs (NO sending)
        console.log('✍️ Signing transaction with Dynamic Labs...');
        const signedTransaction = await signer.signTransaction(properTransaction);
        console.log('✅ Transaction signed by Dynamic Labs!');

        // STEP 4: Send signed transaction to Solana via our RPC system
        console.log('📤 Sending signed transaction to Solana via our RPC...');

        try {
          // Send the signed transaction directly to Solana using our RPC fallback system
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
          console.log('✅ Transaction submitted to Solana:', signature);
        } catch (rpcError: unknown) {
          const errorMessage = rpcError instanceof Error ? rpcError.message : 'Unknown error';
          console.log('⚠️ Primary RPC failed, trying fallback with skipPreflight...', errorMessage);
          // Try with skipPreflight as fallback
          signature = await sendRawTransaction(signedTransaction.serialize(), {
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
        console.log('❌ Dynamic Labs signing failed:', errorMessage);

        // Fallback: Try with _connector approach
        try {
          console.log('🔄 Fallback: Trying _connector approach...');

          const connector = (primaryWallet as unknown as DynamicWalletWithSigner)._connector;
          console.log('📊 Connector type:', connector?.constructor?.name);

          // Get serialized transaction from API response
          const rawTx = prepareResult.data.serializedTransaction;
          if (!rawTx) {
            throw new Error('No serializedTransaction provided by server');
          }
          const txBuffer = Buffer.from(rawTx, 'base64');
          const properTransaction = VersionedTransaction.deserialize(txBuffer);

          // Sign with connector
          if (!connector) {
            throw new Error('Connector not available');
          }
          const signedTransaction = await connector.signTransaction(properTransaction);
          console.log('✅ Transaction signed via _connector!');

          // Send via our RPC
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
          console.log('✅ Transaction submitted via _connector + our RPC:', signature);

          // Wait for confirmation
          const connection = await getSolanaConnection();
          await connection.confirmTransaction(signature, 'confirmed');
          console.log('✅ Transaction confirmed!');

        } catch (connectorError) {
          console.error('❌ Connector fallback also failed:', connectorError);
          return { success: false, error: connectorError };
        }
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
