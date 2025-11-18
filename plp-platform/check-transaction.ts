import { Connection } from '@solana/web3.js';

const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=8f773bda-b37a-42ec-989c-b2318c1772d7', 'confirmed');
const signature = '5TnuF8qwnfGAetZL6fR9uq8Utzi17Cg4AEiJrQoB84d2PUB41pST15jJQ39S1MLNkxqeRVV1oYXiuzDUVXajCuFL';

async function checkTransaction() {
  const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });

  if (tx && tx.meta) {
    console.log('Transaction Status:', tx.meta.err ? 'FAILED' : 'SUCCESS');
    console.log('\nProgram IDs called:');
    tx.transaction.message.instructions.forEach((ix, i) => {
      console.log(`  Instruction ${i + 1}: ${ix.programId.toBase58()}`);
    });

    console.log('\nInner Instructions:');
    if (tx.meta.innerInstructions) {
      tx.meta.innerInstructions.forEach((inner) => {
        inner.instructions.forEach((ix) => {
          console.log(`  Program: ${ix.programId.toBase58()}`);
        });
      });
    }

    console.log('\nLog Messages:');
    if (tx.meta.logMessages) {
      tx.meta.logMessages.slice(0, 30).forEach((log) => console.log(`  ${log}`));
    }

    console.log('\n\n🔍 Checking for Pump.fun program...');
    const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
    const hasPumpProgram = tx.transaction.message.instructions.some(
      ix => ix.programId.toBase58() === PUMP_PROGRAM
    );
    console.log(`Pump.fun program called: ${hasPumpProgram ? 'YES ✅' : 'NO ❌'}`);
    console.log(`Expected program ID: ${PUMP_PROGRAM}`);
  } else {
    console.log('Transaction not found or not finalized yet');
  }
}

checkTransaction();
