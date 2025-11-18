/**
 * Quick Balance Checker
 * Run this to check if SOL has arrived in the test wallet
 */

import { Connection, PublicKey } from '@solana/web3.js';

const RPC = process.env.NEXT_PUBLIC_HELIUS_MAINNET_RPC || 'https://api.mainnet-beta.solana.com';
const WALLET = 'E8rAN3JpiNWFTBveJjrPQSwJ3mXLocvu8Myosr1y3PPd';

async function checkBalance() {
  console.log('Checking wallet balance...');
  console.log(`Address: ${WALLET}`);
  console.log('');

  const connection = new Connection(RPC, 'confirmed');
  const balance = await connection.getBalance(new PublicKey(WALLET));

  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);

  if (balance === 0) {
    console.log('');
    console.log('⏳ Waiting for SOL to arrive...');
    console.log('   Send 0.1 SOL to the address above');
  } else if (balance < 0.02 * 1e9) {
    console.log('');
    console.log('⚠️  Balance too low for testing');
    console.log('   Need at least 0.02 SOL');
  } else {
    console.log('');
    console.log('✅ Sufficient balance!');
    console.log('   Ready to run the Pump.fun test');
    console.log('');
    console.log('Run: source .env.pumpfun-test && npx tsx test-pumpfun-launch.ts');
  }
}

checkBalance();
