/**
 * Test Helius WebSocket Connection
 * Run with: npx ts-node scripts/test-helius-websocket.ts
 */

import { HeliusClient } from '../src/services/blockchain-sync/helius-client';
import { getQueueStats } from '../src/lib/redis/queue';
import { disconnectRedis } from '../src/lib/redis/client';

async function testHeliusWebSocket() {
  console.log('🧪 Testing Helius WebSocket connection...\n');

  const programId = process.env.NEXT_PUBLIC_PLP_PROGRAM_ID_DEVNET;

  if (!programId) {
    console.error('❌ NEXT_PUBLIC_PLP_PROGRAM_ID_DEVNET not found in environment');
    process.exit(1);
  }

  const client = new HeliusClient('devnet', programId);

  try {
    // 1. Connect to Helius
    console.log('🔌 Connecting to Helius WebSocket...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // 2. Subscribe to program (all markets/positions)
    console.log('📡 Subscribing to program:', programId);
    await client.subscribeToProgram();
    console.log('✅ Subscribed to program\n');

    // 3. Check connection status
    console.log('📊 Connection status:', client.isConnected() ? 'CONNECTED' : 'DISCONNECTED');
    console.log('📊 Subscription count:', client.getSubscriptionCount());
    console.log('');

    // 4. Listen for updates for 30 seconds
    console.log('👂 Listening for account updates for 30 seconds...');
    console.log('   (Make a vote or create a market to see updates)\n');

    await new Promise((resolve) => setTimeout(resolve, 30000));

    // 5. Check queue stats
    const stats = await getQueueStats();
    console.log('\n📊 Event queue stats after 30 seconds:');
    console.log(`   - Queue length: ${stats.queueLength}`);
    console.log(`   - Processing: ${stats.processingCount}`);
    console.log(`   - Failed (DLQ): ${stats.dlqLength}`);

    if (stats.queueLength > 0) {
      console.log('\n🎉 Success! Events were received and queued!');
    } else {
      console.log('\n⚠️  No events received. This is normal if no on-chain activity occurred.');
      console.log('   Try creating a market or voting, then run this test again.');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    client.disconnect();
    await disconnectRedis();
    process.exit(0);
  }
}

testHeliusWebSocket();
