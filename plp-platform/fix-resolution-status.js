/**
 * Quick script to manually sync resolution status from blockchain to database
 * Run with: node fix-resolution-status.js <marketId> <marketAddress>
 */

const { MongoClient, ObjectId } = require('mongodb');
const { Connection, PublicKey } = require('@solana/web3.js');
const { AnchorProvider, Program } = require('@coral-xyz/anchor');
const NodeWallet = require('@coral-xyz/anchor/dist/cjs/nodewallet').default;
const { Keypair } = require('@solana/web3.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.NODE_ENV === 'production' ? 'plp_production' : 'plp_development';
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'HfT4uDWb7FSvb7qU2bNLqrj4c8TgqNRprQKdeCRFRCEY';

// Load IDL from file
const fs = require('fs');
const path = require('path');
const idlPath = path.join(__dirname, 'src', 'lib', 'idl', 'plp_prediction_markets.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

async function fixResolutionStatus(marketId, marketAddress) {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('🔍 Fetching market state from blockchain...');

    // Setup Solana connection
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const wallet = new NodeWallet(Keypair.generate()); // Dummy wallet for read-only operations
    const provider = new AnchorProvider(connection, wallet, {});
    const program = new Program(idl, PROGRAM_ID, provider);

    // Fetch market account from blockchain
    const marketPubkey = new PublicKey(marketAddress);
    const marketAccount = await program.account.market.fetch(marketPubkey);

    // Determine resolution outcome
    // Rust enum: 0=Unresolved, 1=YesWins, 2=NoWins, 3=Refund
    let resolutionOutcome = 'Unknown';
    if (marketAccount.resolution === 0) {
      resolutionOutcome = 'Unresolved';
    } else if (marketAccount.resolution === 1) {
      resolutionOutcome = 'YesWins';
    } else if (marketAccount.resolution === 2) {
      resolutionOutcome = 'NoWins';
    } else if (marketAccount.resolution === 3) {
      resolutionOutcome = 'Refund';
    }

    console.log('📊 Blockchain state:', {
      resolution: resolutionOutcome,
      marketState: marketAccount.marketState,
      winningOption: marketAccount.winningOption,
    });

    // Connect to MongoDB and update
    console.log('💾 Updating database...');
    await client.connect();
    const db = client.db(DB_NAME);

    const result = await db.collection('predictionmarkets').updateOne(
      { _id: new ObjectId(marketId) },
      {
        $set: {
          marketState: marketAccount.marketState,
          winningOption: marketAccount.winningOption,
          resolution: resolutionOutcome,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    console.log('✅ Update result:', {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    });

    if (result.matchedCount === 0) {
      console.log('❌ No market record found for:', { marketId });
    } else if (result.modifiedCount > 0) {
      console.log('✅ Successfully synced resolution status!');
      console.log(`   Resolution: ${resolutionOutcome}`);
    } else {
      console.log('ℹ️  Record already has the correct resolution status');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.close();
  }
}

const marketId = process.argv[2];
const marketAddress = process.argv[3];

if (!marketId || !marketAddress) {
  console.log('Usage: node fix-resolution-status.js <marketId> <marketAddress>');
  console.log('');
  console.log('Example:');
  console.log('  node fix-resolution-status.js 674ffa4c90a77612eea43764 BrJ8JyZKfhD8PdW9uVJh6oX3KGzVr7NdFxPZqYwZ5Qw5');
  process.exit(1);
}

console.log('🚀 Starting resolution status sync...');
console.log(`   Market ID: ${marketId}`);
console.log(`   Market Address: ${marketAddress}`);
console.log('');

fixResolutionStatus(marketId, marketAddress);
