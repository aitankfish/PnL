/**
 * Quick test script to check if Helius API is working
 *
 * Usage:
 *   HELIUS_API_KEY="your_api_key" node test-helius.js
 */

const  { createHelius } = require('helius-sdk');

const apiKey = process.env.HELIUS_API_KEY;
const marketAddress = 'B8KqhbKz6uCjRPvvE8DgGmuyhHHtp9fzJR1P2P7YYufB';

async function testHelius() {
  if (!apiKey) {
    console.error('❌ Error: HELIUS_API_KEY environment variable not set!');
    console.error('Usage: HELIUS_API_KEY="your_api_key" node test-helius.js');
    process.exit(1);
  }

  try {
    console.log('Creating Helius client...');
    const helius = createHelius({ apiKey, network: 'devnet' });

    console.log('Fetching transactions for market:', marketAddress);
    const transactions = await helius.enhanced.getTransactionsByAddress({
      address: marketAddress,
      limit: 10,
      commitment: 'confirmed',
    });

    console.log(`✅ Success! Found ${transactions.length} transactions`);
    console.log('First transaction:', JSON.stringify(transactions[0], null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHelius();
