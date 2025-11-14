/**
 * Check both participant collections to see which one has the correct data
 */

const { MongoClient } = require('mongodb');

require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'plp-platform';

async function checkParticipants() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('\n📊 Comparing Participant Collections\n');
    console.log('='.repeat(80));

    // Check prediction_participants (with underscore)
    console.log('\n1️⃣  prediction_participants (with underscore):');
    console.log('-'.repeat(80));
    const participants1 = await db
      .collection('prediction_participants')
      .find({})
      .limit(5)
      .toArray();

    console.log(`  Total documents: ${await db.collection('prediction_participants').countDocuments()}`);
    if (participants1.length > 0) {
      console.log('\n  Sample documents:');
      participants1.forEach((p, i) => {
        console.log(`\n  Document ${i + 1}:`);
        console.log(`    _id: ${p._id}`);
        console.log(`    marketId: ${p.marketId}`);
        console.log(`    participantWallet: ${p.participantWallet}`);
        console.log(`    voteOption: ${p.voteOption}`);
        console.log(`    Has yesShares: ${!!p.yesShares}`);
        console.log(`    Has noShares: ${!!p.noShares}`);
        console.log(`    Has totalInvested: ${!!p.totalInvested}`);
        console.log(`    Has positionPdaAddress: ${!!p.positionPdaAddress}`);
      });
    }

    // Check predictionparticipants (no underscore)
    console.log('\n\n2️⃣  predictionparticipants (no underscore):');
    console.log('-'.repeat(80));
    const participants2 = await db
      .collection('predictionparticipants')
      .find({})
      .limit(5)
      .toArray();

    console.log(`  Total documents: ${await db.collection('predictionparticipants').countDocuments()}`);
    if (participants2.length > 0) {
      console.log('\n  Sample documents:');
      participants2.forEach((p, i) => {
        console.log(`\n  Document ${i + 1}:`);
        console.log(`    _id: ${p._id}`);
        console.log(`    marketId: ${p.marketId}`);
        console.log(`    participantWallet: ${p.participantWallet}`);
        console.log(`    voteOption: ${p.voteOption}`);
        console.log(`    Has yesShares: ${!!p.yesShares}`);
        console.log(`    Has noShares: ${!!p.noShares}`);
        console.log(`    Has totalInvested: ${!!p.totalInvested}`);
        console.log(`    Has positionPdaAddress: ${!!p.positionPdaAddress}`);
      });
    }

    // Recommendations
    console.log('\n\n💡 Recommendation:');
    console.log('='.repeat(80));

    const count1 = await db.collection('prediction_participants').countDocuments();
    const count2 = await db.collection('predictionparticipants').countDocuments();

    if (count2 > count1) {
      console.log(`  ✓ USE: predictionparticipants (${count2} docs) - Has more data`);
      console.log(`  ✗ IGNORE: prediction_participants (${count1} docs)`);
      console.log('\n  👉 Update models.ts line 123:');
      console.log(`     PREDICTION_PARTICIPANTS: 'predictionparticipants'`);
    } else if (count1 > count2) {
      console.log(`  ✓ USE: prediction_participants (${count1} docs) - Has more data`);
      console.log(`  ✗ IGNORE: predictionparticipants (${count2} docs)`);
      console.log('\n  👉 Current config is correct');
    } else {
      console.log('  Both collections have the same document count - need manual review');
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

checkParticipants();
