/**
 * Test Helius Enhanced Transactions API on MAINNET
 * Using a popular program address to verify it works in production
 */

import { createHelius } from 'helius-sdk';

const apiKey = '8f773bda-b37a-42ec-989c-b2318c1772d7';

// Test with Jupiter Aggregator V6 - one of the most active programs on Solana
const jupiterV6 = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';

// Test with a popular token address (USDC)
const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function testMainnet() {
  try {
    console.log('Creating Helius client for MAINNET...\n');
    const helius = createHelius({ apiKey, network: 'mainnet' });

    console.log('Test 1: Fetching transactions for Jupiter V6 program');
    console.log('Address:', jupiterV6);
    console.log('This is one of the most active programs on Solana\n');

    const jupiterTxs = await helius.enhanced.getTransactionsByAddress({
      address: jupiterV6,
      limit: 5,
      commitment: 'confirmed',
    });

    if (jupiterTxs.length > 0) {
      console.log(`✅ SUCCESS! Found ${jupiterTxs.length} transactions\n`);
      console.log('First transaction details:');
      console.log('- Signature:', jupiterTxs[0].signature);
      console.log('- Fee Payer:', jupiterTxs[0].feePayer);
      console.log('- Timestamp:', new Date(jupiterTxs[0].timestamp * 1000).toISOString());
      console.log('- Type:', jupiterTxs[0].type);
      console.log('- Description:', jupiterTxs[0].description?.substring(0, 100) + '...');
      console.log('- Native Transfers:', jupiterTxs[0].nativeTransfers?.length || 0);
      console.log('- Token Transfers:', jupiterTxs[0].tokenTransfers?.length || 0);
    } else {
      console.log('❌ FAILED: No transactions found');
    }

    console.log('\n' + '='.repeat(60) + '\n');

    console.log('Test 2: Fetching transactions for USDC token');
    console.log('Address:', usdcMint);
    console.log('This is the most traded stablecoin on Solana\n');

    const usdcTxs = await helius.enhanced.getTransactionsByAddress({
      address: usdcMint,
      limit: 5,
      commitment: 'confirmed',
    });

    if (usdcTxs.length > 0) {
      console.log(`✅ SUCCESS! Found ${usdcTxs.length} transactions\n`);
      console.log('Most recent transaction:');
      console.log('- Signature:', usdcTxs[0].signature);
      console.log('- Timestamp:', new Date(usdcTxs[0].timestamp * 1000).toISOString());
      console.log('- How recent:', Math.floor((Date.now() - usdcTxs[0].timestamp * 1000) / 1000), 'seconds ago');
    } else {
      console.log('❌ FAILED: No transactions found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('CONCLUSION:');
    if (jupiterTxs.length > 0 || usdcTxs.length > 0) {
      console.log('✅ Helius Enhanced Transactions API WORKS on mainnet!');
      console.log('You can confidently use it in production.');
    } else {
      console.log('❌ Helius Enhanced Transactions API FAILED on mainnet');
      console.log('Consider alternative approaches.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMainnet();
