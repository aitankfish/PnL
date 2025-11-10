/**
 * Test Redis Connection
 * Run with: npx ts-node scripts/test-redis.ts
 */

import { getRedisClient, disconnectRedis } from '../src/lib/redis/client';
import { pushEvent, popEvent, getQueueStats, markProcessed } from '../src/lib/redis/queue';

async function testRedis() {
  console.log('🧪 Testing Redis connection...\n');

  try {
    // 1. Test basic connection
    const redis = getRedisClient();
    await redis.ping();
    console.log('✅ Redis PING successful\n');

    // 2. Test basic operations
    await redis.set('test:key', 'hello redis');
    const value = await redis.get('test:key');
    console.log(`✅ Redis SET/GET: ${value}\n`);

    // 3. Test event queue
    console.log('📤 Testing event queue...');
    const eventId = await pushEvent({
      type: 'account_update',
      accountType: 'market',
      address: 'test123',
      data: Buffer.from('test data').toString('base64'),
      slot: 123456,
      timestamp: Date.now(),
    });
    console.log(`✅ Event pushed: ${eventId}\n`);

    // 4. Test queue stats
    const stats = await getQueueStats();
    console.log('📊 Queue stats:', stats);
    console.log('');

    // 5. Test pop event
    console.log('📥 Popping event from queue...');
    const event = await popEvent(1);
    if (event) {
      console.log(`✅ Event popped: ${event.type} - ${event.address}`);
      await markProcessed(event.id);
      console.log(`✅ Event marked as processed\n`);
    }

    // 6. Final stats
    const finalStats = await getQueueStats();
    console.log('📊 Final queue stats:', finalStats);

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await disconnectRedis();
    process.exit(0);
  }
}

testRedis();
