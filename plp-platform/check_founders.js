const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkFounders() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('plp-platform');
    const markets = db.collection('predictionmarkets');
    
    // Get all markets with their founder wallets
    const allMarkets = await markets.find({}).project({ 
      founderWallet: 1, 
      marketAddress: 1,
      _id: 1 
    }).toArray();
    
    console.log('\n=== ALL MARKETS AND THEIR FOUNDERS ===');
    console.log(`Total markets: ${allMarkets.length}\n`);
    
    const founderCounts = {};
    allMarkets.forEach(m => {
      const founder = m.founderWallet || 'UNKNOWN';
      founderCounts[founder] = (founderCounts[founder] || 0) + 1;
      console.log(`Market ID: ${m._id}`);
      console.log(`  Address: ${m.marketAddress}`);
      console.log(`  Founder: ${founder}\n`);
    });
    
    console.log('\n=== MARKETS BY FOUNDER ===');
    Object.entries(founderCounts).sort((a, b) => b[1] - a[1]).forEach(([founder, count]) => {
      console.log(`${founder}: ${count} market(s)`);
    });
    
    console.log('\n=== RECENTLY CONNECTED WALLETS ===');
    console.log('AFpscpwvWLoRsFd5qMuaadxbtidnfsFBzPK6s41CpCHy: ' + 
      (founderCounts['AFpscpwvWLoRsFd5qMuaadxbtidnfsFBzPK6s41CpCHy'] || 0) + ' market(s)');
    console.log('CzwUpALnXBFEDP6CKDr9VmTnMvS3PmeHsqDxh3WsJAGY: ' + 
      (founderCounts['CzwUpALnXBFEDP6CKDr9VmTnMvS3PmeHsqDxh3WsJAGY'] || 0) + ' market(s)');
    
  } finally {
    await client.close();
  }
}

checkFounders().catch(console.error);
