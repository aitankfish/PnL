/**
 * Debug script to check trade_history documents and their market IDs
 */

const { MongoClient, ObjectId } = require('mongodb');

require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DEV_DATABASE || process.env.MONGODB_PROD_DATABASE || 'plp_platform_dev';

async function checkTrades() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log(`\n📊 Database: ${DB_NAME}\n`);

    // Get sample trades
    const trades = await db
      .collection('trade_history')
      .find({})
      .limit(5)
      .toArray();

    console.log('Sample trades:');
    console.log('='.repeat(80));
    trades.forEach((trade, i) => {
      console.log(`\nTrade ${i + 1}:`);
      console.log(`  marketId: ${trade.marketId} (type: ${typeof trade.marketId})`);
      console.log(`  marketAddress: ${trade.marketAddress}`);
      console.log(`  traderWallet: ${trade.traderWallet}`);
      console.log(`  voteType: ${trade.voteType}`);
      console.log(`  amount: ${trade.amount}`);
      console.log(`  shares: ${trade.shares}`);
    });

    // Get unique market IDs
    const uniqueMarketIds = await db
      .collection('trade_history')
      .distinct('marketId');

    console.log('\n' + '='.repeat(80));
    console.log(`\n🔍 Unique Market IDs in trade_history: ${uniqueMarketIds.length}`);
    console.log('='.repeat(80));
    uniqueMarketIds.forEach((id, i) => {
      console.log(`  ${i + 1}. ${id} (type: ${typeof id})`);
    });

    // Try to find these markets in predictionmarkets collection
    console.log('\n' + '='.repeat(80));
    console.log('\n🏪 Checking if markets exist in predictionmarkets collection:');
    console.log('='.repeat(80));

    for (const marketId of uniqueMarketIds) {
      let market;

      // Try as string
      market = await db.collection('predictionmarkets').findOne({ _id: marketId });
      if (market) {
        console.log(`  ✓ Found market ${marketId} (searched as string)`);
        continue;
      }

      // Try as ObjectId
      try {
        const objectId = new ObjectId(marketId);
        market = await db.collection('predictionmarkets').findOne({ _id: objectId });
        if (market) {
          console.log(`  ✓ Found market ${marketId} (searched as ObjectId)`);
          continue;
        }
      } catch (e) {
        // Not a valid ObjectId
      }

      // Try by marketAddress
      const tradeWithAddress = await db.collection('trade_history').findOne({ marketId });
      if (tradeWithAddress?.marketAddress) {
        market = await db.collection('predictionmarkets').findOne({
          marketAddress: tradeWithAddress.marketAddress
        });
        if (market) {
          console.log(`  ✓ Found market ${marketId} by marketAddress (${tradeWithAddress.marketAddress})`);
          console.log(`    BUT market._id is ${market._id}, not ${marketId}`);
          continue;
        }
      }

      console.log(`  ✗ Market ${marketId} NOT FOUND`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

checkTrades();
