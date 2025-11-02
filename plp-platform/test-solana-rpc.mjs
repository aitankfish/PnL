/**
 * Test if transaction exists on Solana devnet using standard RPC
 */

import { Connection } from '@solana/web3.js';

const rpcEndpoint = 'https://devnet.helius-rpc.com/?api-key=8f773bda-b37a-42ec-989c-b2318c1772d7';
const signature = '23JfwR2qzGp26AEy3nG7D6eY7GAStLLMqPLoNj8xyQzcKx7Nh4r2fQaLVS8ZRVkrLzwPp7YiMCyjxByTPHmL1UaB';

async function testRPC() {
  try {
    console.log('Connecting to Solana devnet via Helius RPC...');
    const connection = new Connection(rpcEndpoint, 'confirmed');

    console.log('Fetching transaction:', signature);
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });

    if (tx) {
      console.log('✅ Transaction EXISTS on Solana devnet!');
      console.log('Block time:', new Date(tx.blockTime * 1000).toISOString());
      console.log('Slot:', tx.slot);
      console.log('Fee:', tx.meta?.fee);
      console.log('Success:', tx.meta?.err === null);
    } else {
      console.log('❌ Transaction NOT FOUND on Solana devnet');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRPC();
