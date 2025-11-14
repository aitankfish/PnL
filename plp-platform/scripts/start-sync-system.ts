/**
 * Start Complete Sync System
 * Starts: Helius WebSocket → Redis Queue → Event Processor → MongoDB → Socket.IO
 *
 * Run with: npx tsx scripts/start-sync-system.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig(); // Load environment variables

import { startBlockchainSync, getSyncManager } from '../src/services/blockchain-sync/sync-manager';
import { getRedisClient, disconnectRedis } from '../src/lib/redis/client';
import { MongoClient } from 'mongodb';

async function startSyncSystem() {
  console.log('🚀 Starting PLP Blockchain Sync System...\n');

  try {
    // 1. Test MongoDB connection
    console.log('📊 Testing MongoDB connection...');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }
    const mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    await mongoClient.close();
    console.log('✅ MongoDB connected\n');

    // 2. Test Redis connection
    console.log('📦 Testing Redis connection...');
    const redis = getRedisClient();
    await redis.ping();
    console.log('✅ Redis connected\n');

    // 3. Start blockchain sync
    console.log('🔗 Starting blockchain sync...');
    await startBlockchainSync();
    console.log('✅ Blockchain sync started\n');

    // 4. Show initial status
    const manager = getSyncManager();
    const status = await manager.getStatus();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 System Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   ✓ Helius WebSocket:  ${status.heliusConnected ? '🟢 Connected' : '🔴 Disconnected'}`);
    console.log(`   ✓ Event Processor:   ${status.processorRunning ? '🟢 Running' : '🔴 Stopped'}`);
    console.log(`   ✓ Subscriptions:     ${status.subscriptionCount}`);
    console.log(`   ✓ Queue Length:      ${status.queueStats.queueLength}`);
    console.log(`   ✓ Processing:        ${status.queueStats.processingCount}`);
    console.log(`   ✓ Failed (DLQ):      ${status.queueStats.dlqLength}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ System running successfully!');
    console.log('💡 Listening for blockchain events...\n');
    console.log('Press Ctrl+C to stop\n');

    // 5. Monitor stats every 30 seconds
    setInterval(async () => {
      const currentStatus = await manager.getStatus();
      console.log(`📊 [${new Date().toLocaleTimeString()}] Queue: ${currentStatus.queueStats.queueLength} | Processing: ${currentStatus.queueStats.processingCount} | DLQ: ${currentStatus.queueStats.dlqLength}`);
    }, 30000);

  } catch (error) {
    console.error('❌ Failed to start sync system:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n⏹️  Shutting down sync system...');

  try {
    const { stopBlockchainSync } = await import('../src/services/blockchain-sync/sync-manager');
    await stopBlockchainSync();
    await disconnectRedis();
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

startSyncSystem();
