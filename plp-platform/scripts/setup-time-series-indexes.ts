/**
 * Setup Time-Series Indexes
 * Creates indexes for market_time_series collection for efficient chart queries
 *
 * Run with: npx tsx scripts/setup-time-series-indexes.ts
 */

import { config } from 'dotenv';
config(); // Load environment variables

import { MongoClient } from 'mongodb';

async function setupTimeSeriesIndexes() {
  console.log('📊 Setting up time-series indexes...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('plp-platform');

    const collection = db.collection('market_time_series');

    console.log('Creating indexes for market_time_series collection...');

    // 1. Index for querying by market and timestamp (most common query)
    await collection.createIndex(
      { marketId: 1, timestamp: -1 },
      { name: 'market_timestamp_idx', background: true }
    );
    console.log('✅ Created index: market_timestamp_idx');

    // 2. Index for timestamp-based queries (e.g., last 24 hours across all markets)
    await collection.createIndex(
      { timestamp: -1 },
      { name: 'timestamp_idx', background: true }
    );
    console.log('✅ Created index: timestamp_idx');

    // 3. TTL index to automatically delete old data after 90 days
    await collection.createIndex(
      { timestamp: 1 },
      {
        name: 'ttl_idx',
        expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
        background: true
      }
    );
    console.log('✅ Created TTL index: ttl_idx (90 days retention)');

    // List all indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📋 Current indexes:');
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Time-series indexes setup complete!');

  } catch (error) {
    console.error('❌ Failed to setup indexes:', error);
    await client.close();
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

setupTimeSeriesIndexes();
