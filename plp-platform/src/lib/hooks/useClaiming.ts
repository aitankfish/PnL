/**
 * useClaiming Hook
 * Handles the claim rewards flow: prepare → sign → send → confirm
 * Uses VersionedTransaction and Privy wallet signer
 */

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { getSolanaConnection } from '@/lib/solana';
import { useWallets, useSignAndSendTransaction, useStandardWallets } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';

export function useClaiming() {
  const [isClaiming, setIsClaiming] = useState(false);
  const { primaryWallet } = useWallet();
  const { wallets } = useWallets();
  const { standardWallets } = useStandardWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

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

      let signature: string;

      try {
        // STEP 2: Get serialized transaction
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serializedTransaction provided by server');
        }

        console.log('✍️ Signing and sending transaction with Privy...');

        // Get Solana wallet - prioritize external wallets, fallback to embedded wallets
        let solanaWallet;

        if (wallets && wallets.length > 0) {
          // Path 1: External wallet (Phantom, Solflare, etc.)
          console.log('   Using external Solana wallet');
          solanaWallet = wallets[0];
        } else if (standardWallets && standardWallets.length > 0) {
          // Path 2: Embedded wallet from standard wallets
          console.log('   Using embedded Solana wallet');
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
        console.log('✅ Transaction signed and sent:', signature);

        // STEP 3: Wait for confirmation
        console.log('⏳ Waiting for transaction confirmation...');
        const connection = await getSolanaConnection();
        await connection.confirmTransaction(signature, 'confirmed');
        console.log('✅ Transaction confirmed on blockchain!');

      } catch (signerError: unknown) {
        const errorMessage = signerError instanceof Error ? signerError.message : 'Unknown error';
        console.error('❌ Privy signing/sending failed:', errorMessage);
        throw new Error(`Failed to sign/send transaction: ${errorMessage}`);
      }

      // STEP 4: Update database to mark claim as completed
      console.log('💾 Updating database...');
      try {
        await fetch('/api/markets/claim/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketId: params.marketId,
            userWallet: primaryWallet.address,
            signature,
            claimAmount: prepareResult.data.claimableAmount,
          }),
        });
        console.log('✅ Database updated');
      } catch (dbError) {
        console.warn('⚠️ Database update failed (non-fatal):', dbError);
        // Don't fail the whole claim if database update fails
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
