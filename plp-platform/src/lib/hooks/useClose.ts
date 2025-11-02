/**
 * useClose Hook
 * Handles close operations: close_position and close_market
 * Uses VersionedTransaction and Dynamic Labs signer
 */

import { useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
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

export function useClose() {
  const [isClosingPosition, setIsClosingPosition] = useState(false);
  const [isClosingMarket, setIsClosingMarket] = useState(false);
  const { primaryWallet } = useDynamicContext();
  const { network } = useNetwork();

  const closePosition = async (params: {
    marketAddress: string;
  }): Promise<{ success: boolean; signature?: string; error?: any }> => {
    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsClosingPosition(true);

      console.log('🔧 Preparing close position transaction...');
      const prepareResponse = await fetch('/api/markets/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketAddress: params.marketAddress,
          userWallet: primaryWallet.address,
          network,
        }),
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        console.error('❌ Failed to prepare close position transaction:', prepareResult.error);
        return { success: false, error: prepareResult.error };
      }

      console.log('✅ Close position transaction prepared');

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

      console.log('🎉 Position closed successfully!');
      return {
        success: true,
        signature,
      };

    } catch (error) {
      console.error('❌ Close position error:', error);
      return { success: false, error };
    } finally {
      setIsClosingPosition(false);
    }
  };

  const closeMarket = async (params: {
    marketAddress: string;
  }): Promise<{ success: boolean; signature?: string; error?: any }> => {
    if (!primaryWallet) {
      return { success: false, error: 'No wallet connected' };
    }

    try {
      setIsClosingMarket(true);

      console.log('🔧 Preparing close market transaction...');
      const prepareResponse = await fetch('/api/markets/close-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketAddress: params.marketAddress,
          founderWallet: primaryWallet.address,
          network,
        }),
      });

      const prepareResult = await prepareResponse.json();

      if (!prepareResult.success) {
        console.error('❌ Failed to prepare close market transaction:', prepareResult.error);
        return { success: false, error: prepareResult.error };
      }

      console.log('✅ Close market transaction prepared');

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

      console.log('🎉 Market closed successfully!');
      return {
        success: true,
        signature,
      };

    } catch (error) {
      console.error('❌ Close market error:', error);
      return { success: false, error };
    } finally {
      setIsClosingMarket(false);
    }
  };

  return {
    closePosition,
    isClosingPosition,
    closeMarket,
    isClosingMarket,
  };
}
