/**
 * Check if Treasury PDA exists and is initialized
 */

const { Connection, PublicKey } = require('@solana/web3.js');

// Configuration
const PROGRAM_ID = '2CjwEvY3gkErkEmM5wnLpRv9fq3msHjnPDVPQmaWhF3G';
const RPC_ENDPOINT = 'https://devnet.helius-rpc.com/?api-key=8f773bda-b37a-42ec-989c-b2318c1772d7';

async function checkTreasury() {
  console.log('🔍 Checking Treasury PDA...\n');

  const connection = new Connection(RPC_ENDPOINT, 'confirmed');
  const programId = new PublicKey(PROGRAM_ID);

  // Derive Treasury PDA (same as frontend)
  const [treasuryPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('treasury')],
    programId
  );

  console.log('Program ID:', PROGRAM_ID);
  console.log('Treasury PDA:', treasuryPda.toBase58());
  console.log('Bump:', bump);
  console.log('');

  try {
    // Fetch account info
    const accountInfo = await connection.getAccountInfo(treasuryPda);

    if (!accountInfo) {
      console.log('❌ Treasury PDA does NOT exist');
      console.log('');
      console.log('📝 Next Steps:');
      console.log('   1. You need to call the initTreasury instruction');
      console.log('   2. This is a one-time operation done by the program deployer');
      console.log('   3. Run: node init-treasury.js (script needed)');
      return false;
    }

    console.log('✅ Treasury PDA EXISTS');
    console.log('');
    console.log('Account Details:');
    console.log('  Owner:', accountInfo.owner.toBase58());
    console.log('  Lamports:', accountInfo.lamports / 1e9, 'SOL');
    console.log('  Data Length:', accountInfo.data.length, 'bytes');
    console.log('  Executable:', accountInfo.executable);
    console.log('');

    // Check if owned by correct program
    if (accountInfo.owner.toBase58() === PROGRAM_ID) {
      console.log('✅ Treasury is owned by the correct program');
      console.log('');
      console.log('Treasury is INITIALIZED and ready to use! 🎉');
      return true;
    } else {
      console.log('❌ Treasury is owned by wrong program');
      console.log('   Expected:', PROGRAM_ID);
      console.log('   Actual:', accountInfo.owner.toBase58());

      if (accountInfo.owner.toBase58() === '11111111111111111111111111111111') {
        console.log('   (System Program = uninitialized account)');
        console.log('');
        console.log('📝 You need to call initTreasury instruction!');
      }
      return false;
    }

  } catch (error) {
    console.error('❌ Error checking Treasury:', error.message);
    return false;
  }
}

// Run the check
checkTreasury()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
