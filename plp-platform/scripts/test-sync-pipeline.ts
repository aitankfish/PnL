/**
 * Test Complete Sync Pipeline
 * Tests: Helius → Redis → Event Processor → MongoDB
 *
 * Run with: npx ts-node scripts/test-sync-pipeline.ts
 */

import { startBlockchainSync, stopBlockchainSync, getSyncManager } from '../src/services/blockchain-sync/sync-manager';
import { disconnectRedis } from '../src/lib/redis/client';

async function testSyncPipeline() {
  console.log('🧪 Testing complete sync pipeline...\n');
  console.log('This will:');
  console.log('  1. Connect to Helius WebSocket');
  console.log('  2. Subscribe to program accounts');
  console.log('  3. Start event processor');
  console.log('  4. Listen for blockchain updates');
  console.log('  5. Process and save to MongoDB\n');

  try {
    // 1. Start the sync system
    console.log('🚀 Starting blockchain sync...');
    await startBlockchainSync();
    console.log('✅ Sync started\n');

    // 2. Show status
    const manager = getSyncManager();
    const status = await manager.getStatus();

    console.log('📊 Initial Status:');
    console.log(`   Helius connected: ${status.heliusConnected}`);
    console.log(`   Processor running: ${status.processorRunning}`);
    console.log(`   Subscriptions: ${status.subscriptionCount}`);
    console.log(`   Queue length: ${status.queueStats.queueLength}`);
    console.log('');

    // 3. Run for 60 seconds
    console.log('👂 Listening for blockchain updates for 60 seconds...');
    console.log('   (Create a market or vote to see real-time sync!)\n');

    let lastQueueLength = 0;
    const checkInterval = setInterval(async () => {
      const currentStatus = await manager.getStatus();

      // Show update if queue length changed
      if (currentStatus.queueStats.queueLength !== lastQueueLength) {
        console.log(`📥 Queue: ${currentStatus.queueStats.queueLength} | Processing: ${currentStatus.queueStats.processingCount}`);
        lastQueueLength = currentStatus.queueStats.queueLength;
      }
    }, 2000);

    // Wait 60 seconds
    await new Promise(resolve => setTimeout(resolve, 60000));

    clearInterval(checkInterval);

    // 4. Final status
    const finalStatus = await manager.getStatus();
    console.log('\n📊 Final Status:');
    console.log(`   Events queued: ${finalStatus.queueStats.queueLength}`);
    console.log(`   Events processing: ${finalStatus.queueStats.processingCount}`);
    console.log(`   Failed events (DLQ): ${finalStatus.queueStats.dlqLength}`);

    if (finalStatus.queueStats.queueLength === 0 && finalStatus.queueStats.processingCount === 0) {
      console.log('\n⚠️  No events received during test period.');
      console.log('   This is normal if there was no blockchain activity.');
      console.log('   Try creating a market or voting, then run this test again!');
    } else {
      console.log('\n🎉 Success! Events were received and processed!');
      console.log('   Check your MongoDB to see the synced data.');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    console.log('\n⏹️  Stopping sync manager...');
    await stopBlockchainSync();
    await disconnectRedis();
    console.log('✅ Cleanup complete');
    process.exit(0);
  }
}

testSyncPipeline();
