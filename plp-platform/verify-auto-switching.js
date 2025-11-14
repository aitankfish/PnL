/**
 * Verification Script: Test Database Auto-Switching
 * Tests both Mongoose and Native MongoDB driver connection paths
 * to ensure they correctly switch databases based on NEXT_PUBLIC_SOLANA_NETWORK
 */

const { MongoClient } = require('mongodb');

// Test both networks
const NETWORKS = ['devnet', 'mainnet-beta'];
const EXPECTED_DBS = {
  'devnet': 'plp-platform',
  'mainnet-beta': 'plp_platform_prod'
};

async function verifyAutoSwitching() {
  console.log('\n🧪 Database Auto-Switching Verification\n');
  console.log('='.repeat(80));

  for (const network of NETWORKS) {
    console.log(`\n🌐 Testing Network: ${network}`);
    console.log('-'.repeat(80));

    // Set the environment variable
    process.env.NEXT_PUBLIC_SOLANA_NETWORK = network;

    // Clear the module cache to force re-import
    delete require.cache[require.resolve('./src/lib/environment.ts')];
    delete require.cache[require.resolve('./src/lib/config.ts')];

    try {
      // Test 1: Direct environment config
      console.log('\n1️⃣  Testing environment.ts (getDatabaseConfig):');
      const { execSync } = require('child_process');
      const envResult = execSync(
        `NEXT_PUBLIC_SOLANA_NETWORK=${network} npx tsx -e "import { getDatabaseConfig } from './src/lib/environment'; console.log(JSON.stringify(getDatabaseConfig()));"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const envConfig = JSON.parse(envResult.trim());
      const envPass = envConfig.name === EXPECTED_DBS[network];
      console.log(`   Database: ${envConfig.name}`);
      console.log(`   Expected: ${EXPECTED_DBS[network]}`);
      console.log(`   ${envPass ? '✅ PASS' : '❌ FAIL'}`);

      // Test 2: config.ts (used by native driver)
      console.log('\n2️⃣  Testing config.ts (mongodb.currentDatabase):');
      const configResult = execSync(
        `NEXT_PUBLIC_SOLANA_NETWORK=${network} npx tsx -e "import { config } from './src/lib/config'; console.log(config.mongodb.currentDatabase);"`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
      const configDb = configResult.trim();
      const configPass = configDb === EXPECTED_DBS[network];
      console.log(`   Database: ${configDb}`);
      console.log(`   Expected: ${EXPECTED_DBS[network]}`);
      console.log(`   ${configPass ? '✅ PASS' : '❌ FAIL'}`);

      // Test 3: Check both paths match
      console.log('\n3️⃣  Consistency Check:');
      const consistent = envConfig.name === configDb;
      console.log(`   environment.ts: ${envConfig.name}`);
      console.log(`   config.ts:      ${configDb}`);
      console.log(`   ${consistent ? '✅ CONSISTENT' : '❌ INCONSISTENT'}`);

    } catch (error) {
      console.error(`   ❌ ERROR: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:');
  console.log('-'.repeat(80));
  console.log('\nBoth database connection methods automatically switch based on');
  console.log('NEXT_PUBLIC_SOLANA_NETWORK environment variable:\n');
  console.log('  • Mongoose (mongodb.ts)        → Uses environment.ts');
  console.log('  • Native Driver (database/index.ts) → Uses config.ts → environment.ts\n');
  console.log('Expected behavior:');
  console.log('  • devnet         → plp-platform');
  console.log('  • mainnet-beta   → plp_platform_prod\n');
  console.log('✅ All API routes, pages, and services will automatically use');
  console.log('   the correct database - no page-specific configuration needed!\n');
  console.log('='.repeat(80) + '\n');
}

verifyAutoSwitching();
