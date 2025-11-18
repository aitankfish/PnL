/**
 * Standalone Pump.fun Token Launch Test
 *
 * This script tests creating a token on Pump.fun directly
 * to verify the SDK works before integrating into our platform.
 *
 * IMPORTANT: This will use REAL SOL on MAINNET!
 * Only run this when you're ready to spend ~0.02-0.05 SOL (~$5-10)
 *
 * Usage:
 *   WALLET_PRIVATE_KEY="your_base58_private_key" npx tsx test-pumpfun-launch.ts
 */

import { Connection, Keypair, Transaction } from '@solana/web3.js';
import { PumpSdk } from '@pump-fun/pump-sdk';
import bs58 from 'bs58';
import { generateVanityKeypair } from './src/lib/vanity';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NETWORK = 'mainnet-beta'; // Change to 'mainnet-beta' when ready to test for real
const RPC_ENDPOINT = NETWORK === 'devnet'
  ? 'https://api.devnet.solana.com'
  : 'https://mainnet.helius-rpc.com/?api-key=8f773bda-b37a-42ec-989c-b2318c1772d7';

// Test token metadata
const TEST_TOKEN = {
  name: 'testPLP',
  symbol: 'testPLP',
  description: 'Test token created from PLP platform to verify Pump.fun integration',
  imageUrl: 'https://via.placeholder.com/300', // Replace with real image URL
};

// ============================================================================
// MAIN TEST FUNCTION
// ============================================================================

async function testPumpfunLaunch() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🧪 PUMP.FUN TOKEN LAUNCH TEST');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log(`Network: ${NETWORK.toUpperCase()}`);
  console.log(`RPC: ${RPC_ENDPOINT}`);
  console.log('');
  console.log('Token Details:');
  console.log(`  Name: ${TEST_TOKEN.name}`);
  console.log(`  Symbol: ${TEST_TOKEN.symbol}`);
  console.log(`  Description: ${TEST_TOKEN.description}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  try {
    // Step 1: Setup connection
    console.log('📡 Step 1: Connecting to Solana...');
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');

    // Test connection
    const blockHeight = await connection.getBlockHeight();
    console.log(`✅ Connected! Current block height: ${blockHeight}`);
    console.log('');

    // Step 2: Load wallet
    console.log('👛 Step 2: Loading wallet...');
    const privateKeyEnv = process.env.WALLET_PRIVATE_KEY;

    if (!privateKeyEnv) {
      throw new Error('WALLET_PRIVATE_KEY environment variable not set!\n\nUsage:\n  WALLET_PRIVATE_KEY="your_base58_key" npx tsx test-pumpfun-launch.ts');
    }

    const wallet = Keypair.fromSecretKey(bs58.decode(privateKeyEnv));
    console.log(`✅ Wallet loaded: ${wallet.publicKey.toBase58()}`);

    // Check balance
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`   Balance: ${(balance / 1e9).toFixed(4)} SOL`);

    if (balance < 0.02 * 1e9) {
      console.warn('⚠️  WARNING: Low balance! You need at least 0.02 SOL for testing');
      console.warn('   Please add more SOL to your wallet before continuing');
      return;
    }
    console.log('');

    // Step 3: Initialize Pump.fun SDK
    console.log('🚀 Step 3: Initializing Pump.fun SDK...');
    const pumpSdk = new PumpSdk(connection);
    console.log('✅ SDK initialized');
    console.log('');

    // Step 4: Generate vanity token mint (ending with "pnl")
    console.log('🎫 Step 4: Generating vanity token mint (ending with "pnl")...');
    console.log('   This may take 10-60 seconds...');
    console.log('');

    const mintKeypair = generateVanityKeypair({
      suffix: 'pnl',
      maxAttempts: 10_000_000,
    });

    if (!mintKeypair) {
      throw new Error('Failed to generate vanity address within max attempts');
    }

    console.log(`✅ Vanity mint generated: ${mintKeypair.publicKey.toBase58()}`);
    console.log(`   ↳ Branded with PNL platform signature!`);
    console.log('');

    // Step 5: Upload metadata to IPFS
    console.log('📝 Step 5: Uploading metadata to Pump.fun IPFS...');
    console.log('   This creates proper metadata for Pump.fun website');
    console.log('');

    const metadata = {
      name: TEST_TOKEN.name,
      symbol: TEST_TOKEN.symbol,
      description: TEST_TOKEN.description,
      image: TEST_TOKEN.imageUrl,
      showName: true,
      createdOn: 'https://pump.fun',
    };

    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
    formData.append('name', TEST_TOKEN.name);
    formData.append('symbol', TEST_TOKEN.symbol);
    formData.append('description', TEST_TOKEN.description);
    formData.append('twitter', '');
    formData.append('telegram', '');
    formData.append('website', '');
    formData.append('showName', 'true');

    console.log('📤 Uploading to https://pump.fun/api/ipfs...');
    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData,
    });

    if (!ipfsResponse.ok) {
      throw new Error(`IPFS upload failed: ${ipfsResponse.status} ${ipfsResponse.statusText}`);
    }

    const ipfsResult = await ipfsResponse.json();
    const metadataUri = ipfsResult.metadataUri;
    console.log(`✅ Metadata uploaded to IPFS!`);
    console.log(`   URI: ${metadataUri}`);
    console.log('');

    // Step 6: Create token on Pump.fun
    console.log('📝 Step 6: Creating token on Pump.fun...');
    console.log('   This will:');
    console.log('   • Create the token');
    console.log('   • Set up bonding curve');
    console.log('   • Make it tradeable on Pump.fun');
    console.log('');

    // Create the token instruction (using V2 - Token2022)
    console.log('🔧 Building create V2 instruction (Token2022)...');
    const createInstruction = await pumpSdk.createV2Instruction({
      mint: mintKeypair.publicKey,
      name: TEST_TOKEN.name,
      symbol: TEST_TOKEN.symbol,
      uri: metadataUri, // Use proper IPFS metadata URI
      creator: wallet.publicKey,
      user: wallet.publicKey, // Fee payer
      mayhemMode: false, // Set to true for "mayhem mode" (volatile bonding curve)
    });

    console.log('✅ Instruction built (Token2022 format)');
    console.log('');

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Build transaction
    console.log('🔨 Building transaction...');
    const transaction = new Transaction()
      .add(createInstruction);

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Sign with both wallet and mint keypair
    transaction.sign(wallet, mintKeypair);
    console.log('✅ Transaction signed');
    console.log('');

    // Send transaction
    console.log('📤 Sending transaction to blockchain...');
    console.log('   This may take 10-30 seconds...');
    console.log('');

    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    });

    console.log(`✅ Transaction sent!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    console.log('');

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Transaction confirmed!');
    console.log('');

    // Success!
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 SUCCESS! TOKEN CREATED ON PUMP.FUN');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Token Information:');
    console.log(`   Name: ${TEST_TOKEN.name}`);
    console.log(`   Symbol: ${TEST_TOKEN.symbol}`);
    console.log(`   Mint: ${mintKeypair.publicKey.toBase58()}`);
    console.log('');
    console.log('🔗 Links:');
    console.log(`   Pump.fun: https://pump.fun/${mintKeypair.publicKey.toBase58()}`);
    console.log(`   Solscan: https://solscan.io/token/${mintKeypair.publicKey.toBase58()}`);
    console.log(`   Transaction: https://solscan.io/tx/${signature}`);
    console.log('');
    console.log('✅ Next Steps:');
    console.log('   1. Visit the Pump.fun link to see your token');
    console.log('   2. Try buying/selling to test the bonding curve');
    console.log('   3. If everything works, integrate this into the platform!');
    console.log('');
    console.log('═══════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════');
    console.error('❌ ERROR OCCURRED');
    console.error('═══════════════════════════════════════════════════');
    console.error('');
    console.error('Error:', error.message);

    if (error.logs) {
      console.error('');
      console.error('Transaction Logs:');
      error.logs.forEach((log: string) => console.error(`  ${log}`));
    }

    console.error('');
    console.error('Common Issues:');
    console.error('  • Insufficient SOL balance');
    console.error('  • Network congestion (try again in a few minutes)');
    console.error('  • Invalid image URL (must be accessible)');
    console.error('  • RPC endpoint issues (try different RPC)');
    console.error('');
    console.error('═══════════════════════════════════════════════════');

    process.exit(1);
  }
}

// ============================================================================
// RUN THE TEST
// ============================================================================

// Safety check
if (NETWORK === 'mainnet-beta') {
  console.log('');
  console.log('⚠️  WARNING: MAINNET MODE ⚠️');
  console.log('');
  console.log('This will use REAL SOL on mainnet!');
  console.log('Estimated cost: ~0.02-0.05 SOL (~$5-10)');
  console.log('');
  console.log('Make sure you:');
  console.log('  1. Have enough SOL in your wallet');
  console.log('  2. Are ready to spend it on a test token');
  console.log('  3. Have set WALLET_PRIVATE_KEY environment variable');
  console.log('');
  console.log('Starting in 5 seconds... (Ctrl+C to cancel)');
  console.log('');

  setTimeout(() => {
    testPumpfunLaunch();
  }, 5000);
} else {
  // Devnet - go immediately
  testPumpfunLaunch();
}
