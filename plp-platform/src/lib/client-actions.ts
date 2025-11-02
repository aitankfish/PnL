/**
 * Client-side Actions Protocol integration for PLP
 * Handles prediction market creation using user's connected wallet
 */

import { ActionsSDK, Connection, PublicKey } from '@useactions/action-protocol-markets';
import { config } from './config';
import { createClientLogger } from './logger';

const logger = createClientLogger();

export class ClientActionsProtocol {
  private connection: Connection;
  private sdk: ActionsSDK;

  constructor() {
    // Initialize Solana connection
    const rpcUrl = config.isDevelopment ? config.solana.devnetRpc : config.solana.mainnetRpc;
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    logger.info('Client Actions Protocol initialized', {
      network: config.solana.network,
      rpcUrl,
      isDevelopment: config.isDevelopment
    });

    // Initialize SDK with actions.fun platform (default)
    this.sdk = new ActionsSDK(this.connection);
    logger.info('Using default actions.fun platform for client-side operations');
  }

  /**
   * Create a prediction market for a project using user's wallet
   */
  async createProjectMarket(params: {
    projectName: string;
    projectDescription: string;
    tokenSymbol: string;
    metadataUri: string;
    marketDuration: number; // in days
    userWallet: any; // Dynamic wallet object
  }): Promise<{ marketAddress: string; signature: string }> {
    const { projectName, projectDescription, tokenSymbol, metadataUri, marketDuration, userWallet } = params;

    try {
      // Calculate expiry time (market duration from now)
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + (marketDuration * 24 * 60 * 60); // Convert days to seconds
      const finalizationDeadline = expiryTime + (24 * 60 * 60); // 24 hours after expiry

      // Create the market transaction
      const marketResult = await this.sdk.createMarket({
        marketName: `${projectName} Token Launch Prediction`,
        marketDescription: `Will ${projectName} (${tokenSymbol}) successfully launch a token on pump.fun? This prediction market will resolve to YES if the token is successfully created and launched within the specified timeframe.`,
        metadataUri,
        expiryTime,
        finalizationDeadline,
        creatorKeypair: userWallet // Dynamic wallet should work as keypair
      });

      // Send the transaction using user's wallet
      const signature = await userWallet.sendTransaction(marketResult.transaction);

      logger.info('Project market created successfully', {
        projectName,
        marketAddress: marketResult.marketAddress.toBase58(),
        signature,
        userWallet: userWallet.address
      });

      return {
        marketAddress: marketResult.marketAddress.toBase58(),
        signature
      };
    } catch (error) {
      logger.error('Failed to create project market', error);
      throw error;
    }
  }

  /**
   * Get connection for balance checks, etc.
   */
  getConnection(): Connection {
    return this.connection;
  }
}

export const clientActionsProtocol = new ClientActionsProtocol();
