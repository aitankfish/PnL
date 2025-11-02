/**
 * Actions Protocol SDK Wrapper for PLP
 * Handles prediction market creation and management
 */

import { ActionsSDK, Connection, Keypair, PublicKey, Transaction } from '@useactions/action-protocol-markets';
import { environment, getNetworkConfig, getActionsConfig, isDevnet } from './environment';
import { createClientLogger } from './logger';
import { getSolanaConnection } from './solana';

const logger = createClientLogger();

export class PLPActionsProtocol {
  private connection: Connection;
  private sdk: ActionsSDK;

  constructor() {
    // Get environment configuration
    const envConfig = environment.getConfig();
    const networkConfig = getNetworkConfig();
    
    // Initialize Solana connection with fallback support
    this.connection = new Connection(networkConfig.rpcUrl, 'confirmed');
    
    logger.info('PLP Actions Protocol initialized', {
      network: envConfig.network,
      rpcUrl: networkConfig.rpcUrl,
      isDevelopment: envConfig.features.enableMockMode
    });

    // Initialize SDK with default Actions Protocol platform
    this.sdk = new ActionsSDK(this.connection);
    logger.info('Using default Actions Protocol platform');
  }


  /**
   * Create a prediction market for a project
   */
  async createProjectMarket(params: {
    projectName: string;
    projectDescription: string;
    tokenSymbol: string;
    metadataUri: string;
    marketDuration: number; // in days
    creatorKeypair: Keypair;
  }): Promise<{ marketAddress: string; signature: string }> {
    const { projectName, projectDescription, tokenSymbol, metadataUri, marketDuration, creatorKeypair } = params;

    try {
      // Calculate expiry time (market duration from now)
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + (marketDuration * 24 * 60 * 60); // Convert days to seconds
      const finalizationDeadline = expiryTime + (24 * 60 * 60); // 24 hours after expiry

      const marketResult = await this.sdk.createMarket({
        marketName: `${projectName} Token Launch Prediction`,
        marketDescription: `Will ${projectName} (${tokenSymbol}) successfully launch a token on pump.fun? This prediction market will resolve to YES if the token is successfully created and launched within the specified timeframe.`,
        metadataUri,
        expiryTime,
        finalizationDeadline,
        creatorKeypair
      });

      // Send the transaction
      const signature = await this.connection.sendTransaction(
        marketResult.transaction,
        [creatorKeypair]
      );

      logger.info('Project market created', {
        projectName,
        tokenSymbol,
        marketAddress: marketResult.marketAddress,
        expiryTime,
        signature
      });

      return {
        marketAddress: marketResult.marketAddress,
        signature
      };
    } catch (error) {
      logger.error('Failed to create project market', error);
      throw error;
    }
  }

  /**
   * Prepare a market creation transaction for client-side signing
   */
  async prepareMarketCreationTransaction(params: {
    projectName: string;
    projectDescription: string;
    tokenSymbol: string;
    metadataUri: string;
    marketDuration: number; // in days
    creatorWalletAddress: string;
  }): Promise<{ transaction: Transaction; marketAddress: string }> {
    const { projectName, projectDescription, tokenSymbol, metadataUri, marketDuration, creatorWalletAddress } = params;

    try {
      // Calculate expiry time (market duration from now)
      const now = Math.floor(Date.now() / 1000);
      const expiryTime = now + (marketDuration * 24 * 60 * 60); // Convert days to seconds
      const finalizationDeadline = expiryTime + (24 * 60 * 60); // 24 hours after expiry

      const creatorPublicKey = new PublicKey(creatorWalletAddress);

      // Create the market transaction without signing
      const marketResult = await this.sdk.createMarket({
        marketName: `${projectName} Token Launch Prediction`,
        marketDescription: `Will ${projectName} (${tokenSymbol}) successfully launch a token on pump.fun? This prediction market will resolve to YES if the token is successfully created and launched within the specified timeframe.`,
        metadataUri,
        expiryTime,
        finalizationDeadline,
        creatorKeypair: { publicKey: creatorPublicKey } as any // We only need the public key for transaction preparation
      });

      logger.info('Market creation transaction prepared', {
        projectName,
        tokenSymbol,
        marketAddress: marketResult.marketAddress,
        expiryTime,
        creatorWallet: creatorWalletAddress
      });


      return {
        transaction: marketResult.transaction,
        marketAddress: marketResult.marketAddress
      };

    } catch (error) {
      logger.error('Failed to prepare market creation transaction:', error);
      throw error;
    }
  }

  /**
   * Make a prediction on a market
   */
  async makePrediction(params: {
    marketAddress: string;
    option: boolean; // true = YES, false = NO
    amount: number; // in lamports
    participantKeypair: Keypair;
  }): Promise<{ signature: string }> {
    const { marketAddress, option, amount, participantKeypair } = params;

    try {
      const predictionResult = await this.sdk.makePrediction({
        marketAddress,
        option,
        amount,
        participantKeypair
      });

      // Send the transaction
      const signature = await this.connection.sendTransaction(
        predictionResult.transaction,
        [participantKeypair]
      );

      logger.info('Prediction made', {
        marketAddress,
        option: option ? 'YES' : 'NO',
        amount,
        signature
      });

      return { signature };
    } catch (error) {
      logger.error('Failed to make prediction', error);
      throw error;
    }
  }


  /**
   * Claim winnings from a resolved market
   */
  async claimWinnings(params: {
    marketAddress: string;
    participantKeypair: Keypair;
  }): Promise<{ signature: string }> {
    const { marketAddress, participantKeypair } = params;

    try {
      const claimResult = await this.sdk.claimWinnings({
        marketAddress,
        participantKeypair
      });

      // Send the transaction
      const signature = await this.connection.sendTransaction(
        claimResult.transaction,
        [participantKeypair]
      );

      logger.info('Winnings claimed', {
        marketAddress,
        participant: participantKeypair.publicKey.toString(),
        signature
      });

      return { signature };
    } catch (error) {
      logger.error('Failed to claim winnings', error);
      throw error;
    }
  }

  /**
   * Get market data
   */
  async getMarketData(marketAddress: string) {
    try {
      const marketPublicKey = new PublicKey(marketAddress);
      const marketAccount = await this.connection.getAccountInfo(marketPublicKey);
      
      if (!marketAccount) {
        throw new Error('Market not found');
      }

      // Parse market data (this would need to be implemented based on Actions Protocol account structure)
      logger.info('Market data retrieved', { marketAddress });
      
      return {
        address: marketAddress,
        exists: true,
        data: marketAccount.data
      };
    } catch (error) {
      logger.error('Failed to get market data', error);
      throw error;
    }
  }

  /**
   * Calculate NO vote cost based on current market state
   */
  calculateNoVoteCost(yesPool: number, totalPool: number): number {
    const platformFee = 500000000; // 0.5 SOL in lamports
    const remainingPool = totalPool - yesPool - platformFee;
    const maxNoVotes = Math.floor(remainingPool / 0.01 * 1000000000); // Minimum 0.01 SOL
    return remainingPool / maxNoVotes;
  }

  /**
   * Refresh connection with fallback RPC endpoints
   */
  async refreshConnection(): Promise<void> {
    try {
      const newConnection = await getSolanaConnection();
      this.connection = newConnection;
      
      // Reinitialize SDK with new connection (using default platform)
      this.sdk = new ActionsSDK(this.connection);
      logger.info('Actions Protocol SDK refreshed with default platform');
    } catch (error) {
      logger.error('Failed to refresh Actions Protocol connection', error);
      throw error;
    }
  }

  /**
   * Get connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get SDK instance
   */
  getSDK(): ActionsSDK {
    return this.sdk;
  }
}

// Export singleton instance
export const plpActionsProtocol = new PLPActionsProtocol();
