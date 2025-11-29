const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkFields() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('plp-platform');
    const markets = db.collection('predictionmarkets');
    
    // Get one market to see all fields
    const sampleMarket = await markets.findOne({});
    
    console.log('\n=== ALL FIELDS IN MARKET DOCUMENT ===');
    console.log(JSON.stringify(sampleMarket, null, 2));
    
    console.log('\n=== FIELDS THAT MIGHT CONTAIN WALLET ADDRESS ===');
    Object.keys(sampleMarket).forEach(key => {
      if (key.toLowerCase().includes('founder') || 
          key.toLowerCase().includes('creator') || 
          key.toLowerCase().includes('owner') ||
          key.toLowerCase().includes('wallet')) {
        console.log(`${key}: ${sampleMarket[key]}`);
      }
    });
    
  } finally {
    await client.close();
  }
}

checkFields().catch(console.error);
