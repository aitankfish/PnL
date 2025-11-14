/**
 * Initial Sync Script
 * Syncs all existing markets from blockchain to MongoDB
 *
 * Run with: npx tsx scripts/initial-sync.ts
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig(); // Load environment variables

import { Connection, PublicKey } from '@solana/web3.js';
import { MongoClient } from 'mongodb';
import { parseMarketAccount, calculateDerivedFields } from '../src/services/blockchain-sync/account-parser';

async function initialSync() {
  console.log('🔄 Starting initial sync of markets from blockchain...\n');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not found in environment variables');
  }

  const client = new MongoClient(mongoUri);

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    const db = client.db('plp-platform');

    // Get all markets from MongoDB
    const markets = await db.collection('predictionmarkets').find({}).toArray();

    console.log(`📊 Found ${markets.length} markets in database\n`);

    if (markets.length === 0) {
      console.log('⚠️  No markets found in database. Create some markets first!');
      process.exit(0);
    }

    // Setup Solana connection
    const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as 'devnet' | 'mainnet') || 'devnet';
    const rpcUrl = network === 'devnet'
      ? process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC || 'https://api.devnet.solana.com'
      : process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');
    console.log(`🔗 Connected to Solana ${network}\n`);

    let syncedCount = 0;
    let errorCount = 0;

    // Sync each market
    for (const market of markets) {
      try {
        console.log(`\n🔄 Syncing market: ${market.marketAddress.slice(0, 8)}...`);
        console.log(`   Name: ${market.marketName}`);

        // Fetch account from blockchain
        const marketPubkey = new PublicKey(market.marketAddress);
        const accountInfo = await connection.getAccountInfo(marketPubkey);

        if (!accountInfo) {
          console.log(`   ⚠️  Account not found on blockchain (may not be created yet)`);
          continue;
        }

        // Parse account data
        const base64Data = accountInfo.data.toString('base64');
        const marketData = parseMarketAccount(base64Data);
        const derived = calculateDerivedFields(marketData);

        // Update MongoDB
        const updateData = {
          // Blockchain fields
          poolBalance: marketData.poolBalance,
          distributionPool: marketData.distributionPool,
          yesPool: marketData.yesPool,
          noPool: marketData.noPool,
          totalYesShares: marketData.totalYesShares,
          totalNoShares: marketData.totalNoShares,
          phase: marketData.phase,
          resolution: getResolutionString(marketData.resolution),

          // Derived fields
          poolProgressPercentage: derived.poolProgressPercentage,
          yesPercentage: derived.yesPercentage,
          sharesYesPercentage: derived.sharesYesPercentage,
          totalYesStake: derived.totalYesStake,
          totalNoStake: derived.totalNoStake,
          availableActions: derived.availableActions,

          // Token fields
          tokenMint: marketData.tokenMint,
          platformTokensAllocated: marketData.platformTokensAllocated,
          platformTokensClaimed: marketData.platformTokensClaimed,
          yesVoterTokensAllocated: marketData.yesVoterTokensAllocated,

          // Sync metadata
          lastSyncedAt: new Date(),
          syncStatus: 'synced',
        };

        await db.collection('predictionmarkets').updateOne(
          { _id: market._id },
          { $set: updateData }
        );

        console.log(`   ✅ Synced successfully`);
        console.log(`      Pool: ${derived.poolProgressPercentage}%`);
        console.log(`      YES: ${derived.yesPercentage}% (SOL) | ${derived.sharesYesPercentage}% (shares)`);
        console.log(`      Resolution: ${getResolutionString(marketData.resolution)}`);

        syncedCount++;

      } catch (error) {
        console.error(`   ❌ Error syncing market:`, error);
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Sync Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total markets: ${markets.length}`);
    console.log(`   ✅ Synced: ${syncedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏭️  Skipped: ${markets.length - syncedCount - errorCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (syncedCount > 0) {
      console.log('✅ Initial sync completed successfully!');
      console.log('💡 You can now start the real-time sync system with:');
      console.log('   npx ts-node scripts/start-sync-system.ts\n');
    }

  } catch (error) {
    console.error('❌ Initial sync failed:', error);
    await client.close();
    process.exit(1);
  } finally {
    await client.close();
    process.exit(0);
  }
}

function getResolutionString(resolution: number): string {
  switch (resolution) {
    case 0: return 'Unresolved';
    case 1: return 'YesWins';
    case 2: return 'NoWins';
    case 3: return 'Refund';
    default: return 'Unknown';
  }
}

initialSync();
