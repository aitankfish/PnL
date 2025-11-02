/**
 * Test if Helius can find a specific devnet transaction by signature
 */

import { createHelius } from 'helius-sdk';

const apiKey = '8f773bda-b37a-42ec-989c-b2318c1772d7';
const signature = '23JfwR2qzGp26AEy3nG7D6eY7GAStLLMqPLoNj8xyQzcKx7Nh4r2fQaLVS8ZRVkrLzwPp7YiMCyjxByTPHmL1UaB';

async function testBySignature() {
  try {
    console.log('Creating Helius client for devnet...');
    const helius = createHelius({ apiKey, network: 'devnet' });

    console.log('Fetching transaction by signature:', signature);

    // Try the enhanced transaction fetch
    try {
      const tx = await helius.enhanced.getTransaction({ signature });
      console.log('✅ Enhanced API found transaction!');
      console.log('Transaction data:', JSON.stringify(tx, null, 2));
    } catch (error) {
      console.log('❌ Enhanced API failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testBySignature();
