/**
 * Fix Stake Field Types
 * Converts totalYesStake and totalNoStake from strings to numbers
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import { MongoClient } from 'mongodb';

async function fixStakeTypes() {
  console.log('🔧 Starting stake field type conversion...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db('plp-platform');
    const collection = db.collection('predictionmarkets');

    // Find all markets with string stake fields
    const markets = await collection.find({}).toArray();

    console.log(`📊 Found ${markets.length} markets\n`);

    let fixedCount = 0;
    let skippedCount = 0;

    for (const market of markets) {
      const updates: any = {};
      let needsUpdate = false;

      // Check and convert totalYesStake
      if (typeof market.totalYesStake === 'string') {
        const numValue = parseInt(market.totalYesStake, 10);
        if (!isNaN(numValue)) {
          updates.totalYesStake = numValue;
          needsUpdate = true;
        }
      } else if (market.totalYesStake === undefined || market.totalYesStake === null) {
        updates.totalYesStake = 0;
        needsUpdate = true;
      }

      // Check and convert totalNoStake
      if (typeof market.totalNoStake === 'string') {
        const numValue = parseInt(market.totalNoStake, 10);
        if (!isNaN(numValue)) {
          updates.totalNoStake = numValue;
          needsUpdate = true;
        }
      } else if (market.totalNoStake === undefined || market.totalNoStake === null) {
        updates.totalNoStake = 0;
        needsUpdate = true;
      }

      // Check and initialize vote counts if needed
      if (market.yesVoteCount === undefined || market.yesVoteCount === null) {
        updates.yesVoteCount = 0;
        needsUpdate = true;
      }

      if (market.noVoteCount === undefined || market.noVoteCount === null) {
        updates.noVoteCount = 0;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await collection.updateOne(
          { _id: market._id },
          { $set: updates }
        );

        console.log(`✅ Fixed: ${market.marketName || market._id}`);
        if (updates.totalYesStake !== undefined) {
          console.log(`   totalYesStake: "${market.totalYesStake}" → ${updates.totalYesStake}`);
        }
        if (updates.totalNoStake !== undefined) {
          console.log(`   totalNoStake: "${market.totalNoStake}" → ${updates.totalNoStake}`);
        }
        if (updates.yesVoteCount !== undefined) {
          console.log(`   yesVoteCount: initialized to ${updates.yesVoteCount}`);
        }
        if (updates.noVoteCount !== undefined) {
          console.log(`   noVoteCount: initialized to ${updates.noVoteCount}`);
        }
        console.log();

        fixedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Conversion Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total markets: ${markets.length}`);
    console.log(`   ✅ Fixed: ${fixedCount}`);
    console.log(`   ⏭️  Skipped (already correct): ${skippedCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('✅ Stake field type conversion completed!');

  } catch (error) {
    console.error('❌ Failed to fix stake types:', error);
    throw error;
  } finally {
    await client.close();
  }
}

fixStakeTypes();
