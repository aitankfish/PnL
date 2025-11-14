/**
 * Cleanup Script: Remove unused/duplicate collections
 * This will delete:
 * 1. prediction_markets (0 docs) - Empty duplicate
 * 2. prediction_participants (3 docs) - Superseded by predictionparticipants
 * 3. transaction_history (0 docs) - Empty/unused
 */

const { MongoClient } = require('mongodb');

require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'plp-platform';

const COLLECTIONS_TO_DELETE = [
  'prediction_markets',      // Empty duplicate (predictionmarkets is the active one)
  'prediction_participants', // Old/incomplete (predictionparticipants has more data)
  'transaction_history',     // Empty/unused
];

async function cleanupCollections() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('\n🧹 Cleanup Unused Collections');
    console.log('='.repeat(80));
    console.log(`Database: ${DB_NAME}\n`);

    for (const collectionName of COLLECTIONS_TO_DELETE) {
      try {
        // Check if collection exists
        const collections = await db.listCollections({ name: collectionName }).toArray();

        if (collections.length === 0) {
          console.log(`⚠️  Collection "${collectionName}" not found - skipping`);
          continue;
        }

        // Get document count before deletion
        const count = await db.collection(collectionName).countDocuments();

        console.log(`\n🗑️  Deleting: ${collectionName}`);
        console.log(`   Documents: ${count}`);

        // Drop the collection
        await db.collection(collectionName).drop();

        console.log(`   ✓ Successfully deleted`);

      } catch (error) {
        console.error(`   ✗ Failed to delete ${collectionName}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Cleanup complete!\n');

    // Show remaining collections
    console.log('📊 Remaining Collections:');
    console.log('='.repeat(80));
    const remainingCollections = await db.listCollections().toArray();

    for (const coll of remainingCollections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`  ${coll.name.padEnd(30)} ${count} documents`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

cleanupCollections();
