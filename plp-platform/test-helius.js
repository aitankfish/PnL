/**
 * Quick test script to check if Helius API is working
 */

const  { createHelius } = require('helius-sdk');

const apiKey = '8f773bda-b37a-42ec-989c-b2318c1772d7';
const marketAddress = 'B8KqhbKz6uCjRPvvE8DgGmuyhHHtp9fzJR1P2P7YYufB';

async function testHelius() {
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
