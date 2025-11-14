/**
 * List all databases and collections
 */

import { config } from 'dotenv';
config();

import { MongoClient } from 'mongodb';

async function listDatabases() {
  console.log('🔍 Listing all databases and collections...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found');
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();

    console.log(`📊 Found ${databases.length} databases:\n`);

    for (const db of databases) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Database: ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);

      // List collections in each database
      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();

      if (collections.length > 0) {
        console.log(`Collections (${collections.length}):`);
        for (const coll of collections) {
          const count = await database.collection(coll.name).estimatedDocumentCount();
          console.log(`  - ${coll.name}: ${count} documents`);
        }
      } else {
        console.log(`  No collections`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

listDatabases();
