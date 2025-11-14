/**
 * Check both plp-platform and plp_platform_dev databases
 */

const { MongoClient } = require('mongodb');

require('dotenv').config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';

async function checkBothDatabases() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();

    // Check plp-platform database (old hardcoded name)
    console.log('\n📊 Database: plp-platform');
    console.log('='.repeat(60));
    try {
      const db1 = client.db('plp-platform');
      const collections1 = await db1.listCollections().toArray();

      if (collections1.length === 0) {
        console.log('  No collections found');
      } else {
        for (const coll of collections1) {
          const count = await db1.collection(coll.name).countDocuments();
          console.log(`  ${coll.name.padEnd(30)} ${count} documents`);
        }
      }
    } catch (e) {
      console.log(`  Error accessing database: ${e.message}`);
    }

    // Check plp_platform_dev database (correct name)
    const DB_NAME = process.env.MONGODB_DEV_DATABASE || 'plp_platform_dev';
    console.log(`\n📊 Database: ${DB_NAME}`);
    console.log('='.repeat(60));
    try {
      const db2 = client.db(DB_NAME);
      const collections2 = await db2.listCollections().toArray();

      if (collections2.length === 0) {
        console.log('  No collections found');
      } else {
        for (const coll of collections2) {
          const count = await db2.collection(coll.name).countDocuments();
          console.log(`  ${coll.name.padEnd(30)} ${count} documents`);
        }
      }
    } catch (e) {
      console.log(`  Error accessing database: ${e.message}`);
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

checkBothDatabases();
