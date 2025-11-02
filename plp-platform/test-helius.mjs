/**
 * Quick test script to check if Helius API is working
 */

import { createHelius } from 'helius-sdk';

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
    if (transactions.length > 0) {
      console.log('\nFirst transaction sample:');
      console.log('- Signature:', transactions[0].signature);
      console.log('- Fee Payer:', transactions[0].feePayer);
      console.log('- Timestamp:', transactions[0].timestamp);
      console.log('- Type:', transactions[0].type);
      console.log('- Description:', transactions[0].description);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testHelius();
