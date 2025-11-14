/**
 * Sync Manager
 * Orchestrates Helius WebSocket client and Event Processor
 */

import { HeliusClient } from './helius-client';
import { getEventProcessor } from './event-processor';
import { createClientLogger } from '@/lib/logger';
import { getQueueStats } from '@/lib/redis/queue';
import { MongoClient } from 'mongodb';
import { socketClient } from '../socket/socket-client';

const logger = createClientLogger();

export class SyncManager {
  private heliusClient: HeliusClient | null = null;
  private eventProcessor = getEventProcessor();
  private isRunning = false;
  private network: 'devnet' | 'mainnet';
  private programId: string;
  private statsInterval: NodeJS.Timeout | null = null;

  constructor(network: 'devnet' | 'mainnet', programId: string) {
    this.network = network;
    this.programId = programId;
  }

  /**
   * Start the sync system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Sync manager already running');
      return;
    }

    logger.info('🚀 Starting blockchain sync manager...');
    this.isRunning = true;

    try {
      // 0. Connect to Socket.IO server for broadcasting updates
      logger.info('🔌 Connecting to Socket.IO server...');
      socketClient.connect();

      // 1. Initialize Helius WebSocket client
      logger.info('📡 Initializing Helius WebSocket...');
      this.heliusClient = new HeliusClient(this.network, this.programId);
      await this.heliusClient.connect();

      // 2. Subscribe to program (all markets and positions)
      logger.info('📡 Subscribing to program accounts...');
      await this.heliusClient.subscribeToProgram();

      // 2b. Subscribe to individual markets as fallback (programSubscribe may not work reliably)
      await this.subscribeToExistingMarkets();

      // 3. Start event processor
      logger.info('⚙️  Starting event processor...');
      // Run in background
      this.eventProcessor.start().catch(error => {
        logger.error('Event processor failed:', error);
      });

      // 4. Start stats monitoring
      this.startStatsMonitoring();

      logger.info('✅ Blockchain sync manager started successfully!');
      logger.info(`   Network: ${this.network}`);
      logger.info(`   Program: ${this.programId}`);

    } catch (error) {
      logger.error('Failed to start sync manager:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the sync system
   */
  async stop(): Promise<void> {
    logger.info('⏹️  Stopping blockchain sync manager...');

    // Stop stats monitoring
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Stop event processor
    this.eventProcessor.stop();

    // Disconnect Helius
    if (this.heliusClient) {
      this.heliusClient.disconnect();
      this.heliusClient = null;
    }

    this.isRunning = false;
    logger.info('✅ Blockchain sync manager stopped');
  }

  /**
   * Subscribe to all existing markets in database
   */
  private async subscribeToExistingMarkets(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        logger.warn('MongoDB URI not configured, skipping individual market subscriptions');
        return;
      }

      const client = new MongoClient(mongoUri);
      await client.connect();
      const db = client.db('plp-platform');

      const markets = await db.collection('predictionmarkets')
        .find({}, { projection: { marketAddress: 1 } })
        .toArray();

      await client.close();

      logger.info(`📡 Subscribing to ${markets.length} individual market accounts...`);

      for (const market of markets) {
        if (market.marketAddress) {
          await this.subscribeToMarket(market.marketAddress);
        }
      }

      logger.info(`✅ Subscribed to ${markets.length} market accounts`);

    } catch (error) {
      logger.error('Failed to subscribe to existing markets:', error);
      // Don't throw - this is a fallback, not critical
    }
  }

  /**
   * Subscribe to a specific market
   */
  async subscribeToMarket(marketAddress: string): Promise<void> {
    if (!this.heliusClient) {
      throw new Error('Helius client not initialized');
    }

    await this.heliusClient.subscribeToAccount(marketAddress);
  }

  /**
   * Unsubscribe from a specific market
   */
  async unsubscribeFromMarket(marketAddress: string): Promise<void> {
    if (!this.heliusClient) {
      throw new Error('Helius client not initialized');
    }

    await this.heliusClient.unsubscribeFromAccount(marketAddress);
  }

  /**
   * Get sync status
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    heliusConnected: boolean;
    processorRunning: boolean;
    subscriptionCount: number;
    queueStats: any;
  }> {
    const queueStats = await getQueueStats();

    return {
      isRunning: this.isRunning,
      heliusConnected: this.heliusClient?.isConnected() || false,
      processorRunning: this.eventProcessor.isProcessorRunning(),
      subscriptionCount: this.heliusClient?.getSubscriptionCount() || 0,
      queueStats,
    };
  }

  /**
   * Start monitoring stats (logs every 30 seconds)
   */
  private startStatsMonitoring(): void {
    this.statsInterval = setInterval(async () => {
      try {
        const status = await this.getStatus();

        logger.info('📊 Sync Stats:', {
          heliusConnected: status.heliusConnected,
          processorRunning: status.processorRunning,
          subscriptions: status.subscriptionCount,
          queueLength: status.queueStats.queueLength,
          processing: status.queueStats.processingCount,
          dlq: status.queueStats.dlqLength,
        });

        // Alert if queue is building up
        if (status.queueStats.queueLength > 100) {
          logger.warn(`⚠️  Queue backlog: ${status.queueStats.queueLength} events`);
        }

        // Alert if DLQ has failed events
        if (status.queueStats.dlqLength > 0) {
          logger.error(`❌ Dead letter queue has ${status.queueStats.dlqLength} failed events`);
        }

      } catch (error) {
        logger.error('Error fetching stats:', error);
      }
    }, 30000); // Every 30 seconds
  }
}

// Singleton instance
let syncManagerInstance: SyncManager | null = null;

/**
 * Get sync manager instance
 */
export function getSyncManager(network?: 'devnet' | 'mainnet', programId?: string): SyncManager {
  if (!syncManagerInstance) {
    const net = network || (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet') || 'devnet';
    const pid = programId || process.env.NEXT_PUBLIC_PLP_PROGRAM_ID_DEVNET || '';

    if (!pid) {
      throw new Error('Program ID not found in environment');
    }

    syncManagerInstance = new SyncManager(net, pid);
  }
  return syncManagerInstance;
}

/**
 * Start blockchain sync
 */
export async function startBlockchainSync(): Promise<void> {
  const manager = getSyncManager();
  await manager.start();
}

/**
 * Stop blockchain sync
 */
export async function stopBlockchainSync(): Promise<void> {
  if (syncManagerInstance) {
    await syncManagerInstance.stop();
  }
}
