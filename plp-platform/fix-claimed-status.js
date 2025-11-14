/**
 * Quick script to manually update claimed status for a user who already claimed
 * Run with: node fix-claimed-status.js <marketId> <userWallet>
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.NODE_ENV === 'production' ? 'plp_production' : 'plp_development';

async function fixClaimedStatus(marketId, userWallet) {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    
    const result = await db.collection('predictionparticipants').updateOne(
      {
        marketId: new ObjectId(marketId),
        participantWallet: userWallet,
      },
      {
        $set: {
          claimed: true,
          positionClosed: true,
          lastSyncedAt: new Date(),
        },
      }
    );
    
    console.log('✅ Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });
    
    if (result.matchedCount === 0) {
      console.log('❌ No participant record found for:', { marketId, userWallet });
    } else if (result.modifiedCount > 0) {
      console.log('✅ Successfully marked as claimed!');
    } else {
      console.log('ℹ️  Record already marked as claimed');
    }
    
  } finally {
    await client.close();
  }
}

const marketId = process.argv[2];
const userWallet = process.argv[3];

if (!marketId || !userWallet) {
  console.log('Usage: node fix-claimed-status.js <marketId> <userWallet>');
  process.exit(1);
}

fixClaimedStatus(marketId, userWallet);
