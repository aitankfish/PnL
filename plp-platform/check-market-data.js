/**
 * Check market data in database
 * This script checks if trade history exists for the market shown in the screenshot
 */

const { MongoClient } = require('mongodb');

async function checkMarketData() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DEV_DATABASE || 'plp-platform';

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db(dbName);
    console.log(`📊 Using database: ${dbName}`);
    console.log('');

    // Get the market address from the screenshot: SLF3geWs...xfz8XvbG
    // We need to find markets that match this partial address

    // First, let's see all markets
    console.log('=== ALL MARKETS ===');
    const markets = await db.collection('prediction_markets').find({}).toArray();
    console.log(`Found ${markets.length} markets total`);

    if (markets.length > 0) {
      console.log('\nMarket details:');
      markets.forEach((market, index) => {
        console.log(`\n${index + 1}. Market: ${market.question || market.name || 'Unnamed'}`);
        console.log(`   ID: ${market._id}`);
        console.log(`   Address: ${market.marketAddress || 'No address'}`);
        console.log(`   YES votes: ${market.yesVotes || 0}`);
        console.log(`   NO votes: ${market.noVotes || 0}`);
        console.log(`   Status: ${market.status || 'unknown'}`);
      });
    }

    console.log('\n');
    console.log('=== TRADE_HISTORY COLLECTION ===');
    const tradeHistory = await db.collection('trade_history').find({}).toArray();
    console.log(`Found ${tradeHistory.length} trade history records`);

    if (tradeHistory.length > 0) {
      console.log('\nTrade history details:');
      tradeHistory.forEach((trade, index) => {
        console.log(`\n${index + 1}. Trade:`);
        console.log(`   Market Address: ${trade.marketAddress}`);
        console.log(`   Voter: ${trade.voter}`);
        console.log(`   Position: ${trade.position}`);
        console.log(`   Amount: ${trade.amount}`);
        console.log(`   Created: ${trade.createdAt}`);
      });
    } else {
      console.log('⚠️  No trade history records found!');
    }

    console.log('\n');
    console.log('=== CHECKING FOR SPECIFIC MARKET (SLF3geWs) ===');
    const targetMarket = markets.find(m => m.marketAddress && m.marketAddress.startsWith('SLF3geWs'));

    if (targetMarket) {
      console.log('✅ Found the market from screenshot!');
      console.log(`   Market ID: ${targetMarket._id}`);
      console.log(`   Address: ${targetMarket.marketAddress}`);
      console.log(`   YES votes: ${targetMarket.yesVotes || 0}`);
      console.log(`   NO votes: ${targetMarket.noVotes || 0}`);

      // Check trade history for this market
      const trades = await db.collection('trade_history').find({
        marketAddress: targetMarket.marketAddress
      }).toArray();

      console.log(`\n   Trade history entries: ${trades.length}`);

      if (trades.length === 0) {
        console.log('   ❌ NO TRADE HISTORY RECORDS FOUND FOR THIS MARKET!');
        console.log('   This explains why the chart and activity feed are empty.');
      } else {
        console.log('   ✅ Trade history exists:');
        trades.forEach((trade, i) => {
          console.log(`      ${i + 1}. ${trade.position} vote by ${trade.voter}`);
        });
      }
    } else {
      console.log('⚠️  Could not find market with address starting with SLF3geWs');
      console.log('   Checking for the most recent market...');

      const recentMarket = markets.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      if (recentMarket) {
        console.log(`\n   Most recent market: ${recentMarket.question || recentMarket.name}`);
        console.log(`   Address: ${recentMarket.marketAddress || 'No address'}`);
        console.log(`   YES votes: ${recentMarket.yesVotes || 0}`);
        console.log(`   NO votes: ${recentMarket.noVotes || 0}`);

        if (recentMarket.marketAddress) {
          const trades = await db.collection('trade_history').find({
            marketAddress: recentMarket.marketAddress
          }).toArray();
          console.log(`   Trade history entries: ${trades.length}`);
        }
      }
    }

    console.log('\n');
    console.log('=== DATABASE COLLECTIONS ===');
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkMarketData();
