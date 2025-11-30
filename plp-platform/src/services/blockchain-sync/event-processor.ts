/**
 * Event Processor
 * Processes blockchain events from Redis queue and updates MongoDB
 */

import { popEvent, markProcessed, retryEvent, BlockchainEvent } from '@/lib/redis/queue';
import { parseMarketAccount, parsePositionAccount, calculateDerivedFields } from './account-parser';
import { createClientLogger } from '@/lib/logger';
import { MongoClient, Db, ObjectId } from 'mongodb';
import { socketClient } from '../socket/socket-client';
import { getDatabaseConfig } from '@/lib/environment';

const logger = createClientLogger();

export class EventProcessor {
  private isRunning = false;
  private stopRequested = false;
  private mongoClient: MongoClient | null = null;
  private db: Db | null = null;

  /**
   * Start processing events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Event processor already running');
      return;
    }

    this.isRunning = true;
    this.stopRequested = false;
    logger.info('🚀 Event processor started');

    // Ensure MongoDB connection using environment config
    const dbConfig = getDatabaseConfig();
    if (!dbConfig.uri) {
      throw new Error('MONGODB_URI not configured');
    }

    this.mongoClient = new MongoClient(dbConfig.uri);
    await this.mongoClient.connect();
    this.db = this.mongoClient.db(dbConfig.name);
    logger.info('✅ Event processor connected to MongoDB', { database: dbConfig.name });

    // Main processing loop
    while (!this.stopRequested) {
      try {
        // Pop event from queue (blocks for 5 seconds if empty)
        const event = await popEvent(5);

        if (!event) {
          // No events, continue loop
          continue;
        }

        logger.info(`📋 Processing event: ${event.type} - ${event.address}`);

        // Process based on account type
        try {
          if (event.accountType === 'market') {
            await this.processMarketUpdate(event);
          } else if (event.accountType === 'position') {
            await this.processPositionUpdate(event);
          } else {
            logger.warn(`Unknown account type: ${event.accountType}`);
          }

          // Mark as processed
          await markProcessed(event.id);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error(`Failed to process event ${event.id}:`, errorMessage);

          // Retry event
          await retryEvent(event, errorMessage);
        }

      } catch (error) {
        logger.error('Error in processing loop:', error);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isRunning = false;
    logger.info('⏹️  Event processor stopped');
  }

  /**
   * Stop processing events
   */
  stop(): void {
    logger.info('Stopping event processor...');
    this.stopRequested = true;
  }

  /**
   * Check if processor is running
   */
  isProcessorRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Process market account update
   */
  private async processMarketUpdate(event: BlockchainEvent): Promise<void> {
    // 1. Parse account data
    const marketData = parseMarketAccount(event.data);
    const derived = calculateDerivedFields(marketData);

    logger.info(`Market update: ${event.address.slice(0, 8)}... Resolution: ${marketData.resolution}`);

    // 2. Find market in database
    if (!this.db) {
      logger.error('Database not connected');
      return;
    }
    const market = await this.db.collection('predictionmarkets').findOne({
      marketAddress: event.address,
    });

    if (!market) {
      logger.warn(`Market not found in database: ${event.address}`);
      // Could create market here, but for now just skip
      return;
    }

    // 3. Prepare update data
    const updateData: any = {
      // Blockchain fields
      poolBalance: marketData.poolBalance,
      distributionPool: marketData.distributionPool,
      yesPool: marketData.yesPool,
      noPool: marketData.noPool,
      totalYesShares: marketData.totalYesShares,
      totalNoShares: marketData.totalNoShares,
      phase: marketData.phase,
      resolution: this.getResolutionString(marketData.resolution),

      // Derived fields
      poolProgressPercentage: derived.poolProgressPercentage,
      yesPercentage: derived.yesPercentage, // SOL-based
      sharesYesPercentage: derived.sharesYesPercentage, // Shares-based
      totalYesStake: derived.totalYesStake,
      totalNoStake: derived.totalNoStake,
      availableActions: derived.availableActions,

      // Token fields (save to pumpFunTokenAddress for consistency with schema)
      pumpFunTokenAddress: marketData.tokenMint,
      tokenMint: marketData.tokenMint, // Keep both for backwards compatibility
      platformTokensAllocated: marketData.platformTokensAllocated,
      platformTokensClaimed: marketData.platformTokensClaimed,
      yesVoterTokensAllocated: marketData.yesVoterTokensAllocated,

      // Sync metadata
      lastSyncedAt: new Date(),
      lastSlot: event.slot,
      syncStatus: 'synced',
    };

    // Check if resolved (update resolvedAt timestamp)
    if (marketData.resolution !== 0 && !market.resolvedAt) {
      updateData.resolvedAt = new Date();
      logger.info(`✅ Market resolved: ${this.getResolutionString(marketData.resolution)}`);
    }

    // 4. Update MongoDB
    await this.db.collection('predictionmarkets').updateOne(
      { _id: market._id },
      {
        $set: updateData,
        $inc: { syncCount: 1 } // Track number of syncs
      }
    );

    // 5. Record time-series data
    await this.recordTimeSeries(market._id, marketData, derived);

    // 6. Broadcast update to connected clients
    socketClient.broadcastMarketUpdate(event.address, {
      marketAddress: event.address,
      poolProgressPercentage: derived.poolProgressPercentage,
      yesPercentage: derived.yesPercentage,
      sharesYesPercentage: derived.sharesYesPercentage,
      totalYesStake: derived.totalYesStake,
      totalNoStake: derived.totalNoStake,
      availableActions: derived.availableActions,
      resolution: this.getResolutionString(marketData.resolution),
      phase: marketData.phase,
      pumpFunTokenAddress: marketData.tokenMint,
      tokenMint: marketData.tokenMint, // Keep for backwards compatibility
      lastSyncedAt: new Date(),
    });

    logger.info(`✅ Market updated: ${event.address.slice(0, 8)}...`);
  }

  /**
   * Process position account update
   */
  private async processPositionUpdate(event: BlockchainEvent): Promise<void> {
    // 1. Parse account data
    const positionData = parsePositionAccount(event.data);

    logger.info(`Position update: ${positionData.user.slice(0, 8)}... Market: ${positionData.market.slice(0, 8)}...`);

    // 2. Find market in database
    if (!this.db) {
      logger.error('Database not connected');
      return;
    }
    const market = await this.db.collection('predictionmarkets').findOne({
      marketAddress: positionData.market,
    });

    if (!market) {
      logger.warn(`Market not found for position: ${positionData.market}`);
      return;
    }

    // 3. Update or create participant record
    const updateResult = await this.db.collection('prediction_participants').updateOne(
      {
        marketId: market._id,
        participantWallet: positionData.user,
      },
      {
        $set: {
          yesShares: positionData.yesShares,
          noShares: positionData.noShares,
          totalInvested: positionData.totalInvested,
          claimed: positionData.claimed,
          positionPdaAddress: event.address,
          lastSyncedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    // 4. Update vote counts if this is a new voter
    let updatedMarket = market;
    if (updateResult.upsertedCount > 0) {
      // Determine vote type based on which shares are greater than 0
      const voteType = BigInt(positionData.yesShares) > BigInt(0) ? 'yes' : 'no';
      const incrementField = voteType === 'yes' ? 'yesVoteCount' : 'noVoteCount';

      await this.db.collection('predictionmarkets').updateOne(
        { _id: market._id },
        { $inc: { [incrementField]: 1 } }
      );

      logger.info(`📊 Incremented ${voteType} vote count for market ${market.marketAddress.slice(0, 8)}...`);

      // Fetch updated market with new vote counts for broadcast
      updatedMarket = await this.db.collection('predictionmarkets').findOne({
        _id: market._id,
      }) || market;

      // Broadcast market update with new vote counts
      socketClient.broadcastMarketUpdate(positionData.market, {
        marketAddress: positionData.market,
        yesVoteCount: updatedMarket.yesVoteCount,
        noVoteCount: updatedMarket.noVoteCount,
        lastSyncedAt: new Date(),
      });
    }

    // 5. Broadcast position update to user
    socketClient.broadcastPositionUpdate(positionData.user, positionData.market, {
      yesShares: positionData.yesShares,
      noShares: positionData.noShares,
      totalInvested: positionData.totalInvested,
      claimed: positionData.claimed,
      lastSyncedAt: new Date(),
    });

    logger.info(`✅ Position updated: ${event.address.slice(0, 8)}...`);
  }

  /**
   * Record time-series data for charts
   */
  private async recordTimeSeries(
    marketId: ObjectId,
    marketData: any,
    derived: any
  ): Promise<void> {
    try {
      if (!this.db) {
        logger.error('Database not connected');
        return;
      }

      const timeSeriesData = {
        marketId,
        timestamp: new Date(),
        slot: 0, // We'll set this if available

        // Price data (percentages)
        yesPrice: derived.yesPercentage,
        noPrice: 100 - derived.yesPercentage,

        // Volume data (SOL staked)
        totalVolume: (BigInt(derived.totalYesStake) + BigInt(derived.totalNoStake)).toString(),
        yesVolume: derived.totalYesStake,
        noVolume: derived.totalNoStake,

        // Pool state
        yesPool: marketData.yesPool,
        noPool: marketData.noPool,
        poolBalance: marketData.poolBalance,

        // Share data
        totalYesShares: marketData.totalYesShares,
        totalNoShares: marketData.totalNoShares,
      };

      await this.db.collection('market_time_series').insertOne(timeSeriesData);

    } catch (error) {
      // Don't fail the whole update if time-series fails
      logger.error('Failed to record time-series data:', error);
    }
  }

  /**
   * Convert resolution number to string
   */
  private getResolutionString(resolution: number): string {
    switch (resolution) {
      case 0: return 'Unresolved';
      case 1: return 'YesWins';
      case 2: return 'NoWins';
      case 3: return 'Refund';
      default: return 'Unknown';
    }
  }
}

// Singleton instance
let processorInstance: EventProcessor | null = null;

/**
 * Get event processor instance
 */
export function getEventProcessor(): EventProcessor {
  if (!processorInstance) {
    processorInstance = new EventProcessor();
  }
  return processorInstance;
}

/**
 * Start event processor
 */
export async function startEventProcessor(): Promise<void> {
  const processor = getEventProcessor();
  await processor.start();
}

/**
 * Stop event processor
 */
export function stopEventProcessor(): void {
  const processor = getEventProcessor();
  processor.stop();
}
