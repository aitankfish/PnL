const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkProjects() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('plp-platform');
    const projects = db.collection('projects');
    
    // Get one project to see all fields
    const sampleProject = await projects.findOne({});
    
    console.log('\n=== SAMPLE PROJECT DOCUMENT ===');
    console.log(JSON.stringify(sampleProject, null, 2));
    
    console.log('\n=== CREATOR/WALLET FIELDS ===');
    if (sampleProject) {
      Object.keys(sampleProject).forEach(key => {
        if (key.toLowerCase().includes('founder') || 
            key.toLowerCase().includes('creator') || 
            key.toLowerCase().includes('owner') ||
            key.toLowerCase().includes('wallet')) {
          console.log(`${key}: ${sampleProject[key]}`);
        }
      });
    }
    
  } finally {
    await client.close();
  }
}

checkProjects().catch(console.error);
