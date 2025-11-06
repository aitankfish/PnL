/**
 * usePlatformTokens Hook
 * Handles platform token claiming (1% allocation)
 * Uses VersionedTransaction and Dynamic Labs signer
 */

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { VersionedTransaction } from '@solana/web3.js';
import { sendRawTransaction, getSolanaConnection } from '@/lib/solana';
import { useNetwork } from './useNetwork';

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

export function usePlatformTokens() {
  const [isClaiming, setIsClaiming] = useState(false);
  const { primaryWallet } = useWallet();
  const { network } = useNetwork();

  const claimPlatformTokens = async (params: {
    marketAddress: string;
    tokenMint: string;
  }): Promise<{ success: boolean; signature?: string; error?: any }> => {
    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsClaiming(true);

      console.log('🔧 Preparing claim platform tokens transaction...');
      const prepareResponse = await fetch('/api/markets/platform-tokens/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketAddress: params.marketAddress,
          callerWallet: primaryWallet.address,
          tokenMint: params.tokenMint,
          network,
        }),
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        console.error('❌ Failed to prepare claim platform tokens transaction:', prepareResult.error);
        return { success: false, error: prepareResult.error };
      }

      console.log('✅ Claim platform tokens transaction prepared');

      let signature;

      try {
        const signer = await (primaryWallet as unknown as DynamicWalletWithSigner).getSigner();
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serializedTransaction provided by server');
        }

        const txBuffer = Buffer.from(rawTx, 'base64');
        const properTransaction = VersionedTransaction.deserialize(txBuffer);

        const signedTransaction = await signer.signTransaction(properTransaction);

        try {
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
        } catch (rpcError: unknown) {
          signature = await sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: true,
            maxRetries: 3,
            preflightCommitment: 'confirmed'
          });
        }

        const connection = await getSolanaConnection(network);
        await connection.confirmTransaction(signature, 'confirmed');

      } catch (signerError: unknown) {
        const connector = (primaryWallet as unknown as DynamicWalletWithSigner)._connector;
        const rawTx = prepareResult.data.serializedTransaction;
        if (!rawTx) {
          throw new Error('No serializedTransaction provided by server');
        }
        const txBuffer = Buffer.from(rawTx, 'base64');
        const properTransaction = VersionedTransaction.deserialize(txBuffer);

        if (!connector) {
          throw new Error('Connector not available');
        }
        const signedTransaction = await connector.signTransaction(properTransaction);

        signature = await sendRawTransaction(signedTransaction.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
          preflightCommitment: 'confirmed'
        });

        const connection = await getSolanaConnection(network);
        await connection.confirmTransaction(signature, 'confirmed');
      }

      console.log('🎉 Platform tokens claimed successfully!');
      return {
        success: true,
        signature,
      };

    } catch (error) {
      console.error('❌ Claim platform tokens error:', error);
      return { success: false, error };
    } finally {
      setIsClaiming(false);
    }
  };

  return {
    claimPlatformTokens,
    isClaiming,
  };
}
