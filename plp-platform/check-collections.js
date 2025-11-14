/**
 * Debug script to check MongoDB collections and their document counts
 */

const { MongoClient } = require('mongodb');

require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DEV_DATABASE || process.env.MONGODB_PROD_DATABASE || 'plp_platform_dev';

async function checkCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`\n📊 Database: ${DB_NAME}\n`);

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections found:');
    console.log('='.repeat(50));

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name.padEnd(30)} ${count} documents`);
    }

    console.log('\n' + '='.repeat(50));

    // Check specifically for trade_history and tradehistory
    console.log('\n🔍 Trade History Collections:');
    console.log('='.repeat(50));

    try {
      const tradeHistoryUnderscore = await db.collection('trade_history').countDocuments();
      console.log(`  trade_history:                ${tradeHistoryUnderscore} documents`);
    } catch (e) {
      console.log(`  trade_history:                doesn't exist`);
    }

    try {
      const tradeHistoryNoUnderscore = await db.collection('tradehistory').countDocuments();
      console.log(`  tradehistory:                 ${tradeHistoryNoUnderscore} documents`);
    } catch (e) {
      console.log(`  tradehistory:                 doesn't exist`);
    }

    try {
      const tradeHistories = await db.collection('tradehistories').countDocuments();
      console.log(`  tradehistories:               ${tradeHistories} documents`);
    } catch (e) {
      console.log(`  tradehistories:               doesn't exist`);
    }

    console.log('\n' + '='.repeat(50));

    // Check for market collections
    console.log('\n🏪 Market Collections:');
    console.log('='.repeat(50));

    try {
      const predictionMarkets = await db.collection('prediction_markets').countDocuments();
      console.log(`  prediction_markets:           ${predictionMarkets} documents`);
    } catch (e) {
      console.log(`  prediction_markets:           doesn't exist`);
    }

    try {
      const predictionMarketsNoUnderscore = await db.collection('predictionmarkets').countDocuments();
      console.log(`  predictionmarkets:            ${predictionMarketsNoUnderscore} documents`);
    } catch (e) {
      console.log(`  predictionmarkets:            doesn't exist`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

checkCollections();
