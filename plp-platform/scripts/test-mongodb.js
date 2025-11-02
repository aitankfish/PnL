/**
 * MongoDB Connection Test Script
 * Tests the connection to MongoDB Atlas
 */

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env' });

async function testMongoDBConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('Make sure your .env file contains: MONGODB_URI=mongodb+srv://...');
    process.exit(1);
  }

  console.log('🔍 Testing MongoDB connection...');
  console.log('📍 URI:', uri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials

  const client = new MongoClient(uri);

  try {
    // Connect to MongoDB
    console.log('⏳ Connecting to MongoDB Atlas...');
    await client.connect();
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Successfully connected to MongoDB Atlas!');
    
    // List databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    console.log('📊 Available databases:', databases.databases.map(db => db.name));
    
    // Test database operations
    const db = client.db('plp-platform');
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections in plp-platform:', collections.map(col => col.name));
    
    // Test inserting a document
    const testCollection = db.collection('test');
    const testDoc = { 
      message: 'PLP Platform Test', 
      timestamp: new Date(),
      status: 'connected'
    };
    
    const result = await testCollection.insertOne(testDoc);
    console.log('📝 Test document inserted with ID:', result.insertedId);
    
    // Clean up test document
    await testCollection.deleteOne({ _id: result.insertedId });
    console.log('🧹 Test document cleaned up');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('💡 Check your username and password in the connection string');
    } else if (error.message.includes('network')) {
      console.log('💡 Check your network access settings in MongoDB Atlas');
    } else if (error.message.includes('serverSelectionTimeoutMS')) {
      console.log('💡 Check your IP whitelist in MongoDB Atlas');
    }
    
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 Connection closed');
  }
}

// Run the test
testMongoDBConnection();
