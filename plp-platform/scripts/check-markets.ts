/**
 * Check Markets in MongoDB
 * Quickly check what markets exist in the database
 */

import { config } from 'dotenv';
config();

import { MongoClient } from 'mongodb';

async function checkMarkets() {
  console.log('🔍 Checking markets in MongoDB...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db('plp-platform');

    const markets = await db.collection('predictionmarkets')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log(`📊 Found ${markets.length} recent markets:\n`);

    for (const market of markets) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Name: ${market.marketName || market.name || 'Unnamed'}`);
      console.log(`Address: ${market.marketAddress}`);
      console.log(`Created: ${market.createdAt}`);
      console.log(`Synced: ${market.lastSyncedAt || 'Never'}`);
      console.log(`Status: ${market.syncStatus || 'Not synced'}`);
      console.log(`Pool: ${market.poolBalance || '0'} lamports`);
      console.log(`Yes%: ${market.yesPercentage || '0'}%`);
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

checkMarkets();
