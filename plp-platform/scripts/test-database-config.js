/**
 * Test script to verify database configuration
 * This checks that the environment config correctly determines the database name
 */

require('dotenv').config({ path: '.env.local' });

// Import the environment config using dynamic import
async function testConfig() {
  console.log('\n🧪 Testing Database Configuration\n');
  console.log('='.repeat(60));

  // Show environment variables
  console.log('\n📋 Environment Variables:');
  console.log(`  NEXT_PUBLIC_SOLANA_NETWORK: ${process.env.NEXT_PUBLIC_SOLANA_NETWORK || '(not set)'}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || '(not set)'}`);
  console.log(`  MONGODB_URI: ${process.env.MONGODB_URI ? '(set)' : '(not set)'}`);

  // Import and test TypeScript environment config
  try {
    // Use tsx to run TypeScript
    const { execSync } = require('child_process');
    const result = execSync('npx tsx -e "import { getDatabaseConfig } from \'./src/lib/environment\'; const config = getDatabaseConfig(); console.log(JSON.stringify(config));"', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const dbConfig = JSON.parse(result.trim());

    console.log('\n🔍 Environment Config Output:');
    console.log('='.repeat(60));
    console.log(`  Database Name: ${dbConfig.name}`);
    console.log(`  Database URI: ${dbConfig.uri ? '(set)' : '(not set)'}`);

    console.log('\n✅ Expected Results:');
    console.log('='.repeat(60));
    console.log('  If NEXT_PUBLIC_SOLANA_NETWORK=devnet → Database: plp-platform');
    console.log('  If NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta → Database: plp_platform_prod');

    console.log('\n📊 Verification:');
    console.log('='.repeat(60));

    const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
    const expectedDb = network === 'devnet' ? 'plp-platform' : 'plp_platform_prod';

    if (dbConfig.name === expectedDb) {
      console.log(`  ✓ SUCCESS: Database name is correct (${dbConfig.name})`);
    } else {
      console.log(`  ✗ FAILURE: Expected ${expectedDb}, got ${dbConfig.name}`);
    }

  } catch (error) {
    console.error('\n❌ Error testing config:', error.message);
    throw error;
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

testConfig();
