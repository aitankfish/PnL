/**
 * Initialize Treasury Script
 *
 * This script initializes the treasury PDA on devnet.
 * This is a ONE-TIME operation that must be done before any markets can be created.
 *
 * Usage:
 *   node scripts/init-treasury.js
 */

const { Connection, PublicKey, Keypair, SystemProgram } = require('@solana/web3.js');
const { AnchorProvider, Program, Wallet } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Load IDL
const IDL_PATH = path.join(__dirname, '../plp_program/target/idl/errors.json');
const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));

// Configuration
const PROGRAM_ID = new PublicKey('2CjwEvY3gkErkEmM5wnLpRv9fq3msHjnPDVPQmaWhF3G');
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR_PATH ||
  path.join(__dirname, '../plp_program/devnet-deploy-wallet.json');

async function initTreasury() {
  console.log('🚀 Initializing Treasury on Devnet...\n');

  try {
    // Load keypair
    console.log(`📂 Loading keypair from: ${KEYPAIR_PATH}`);
    const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf-8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log(`✅ Loaded keypair: ${keypair.publicKey.toBase58()}\n`);

    // Create connection
    console.log(`🔗 Connecting to: ${RPC_URL}`);
    const connection = new Connection(RPC_URL, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(keypair.publicKey);
    console.log(`💰 Wallet balance: ${balance / 1e9} SOL`);

    if (balance < 0.01e9) {
      throw new Error('Insufficient balance. Need at least 0.01 SOL for treasury initialization.');
    }
    console.log('');

    // Create provider and program
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    const program = new Program(idl, provider);

    // Derive treasury PDA
    const [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );

    console.log(`🏦 Treasury PDA: ${treasuryPda.toBase58()}`);
    console.log(`📍 Treasury Bump: ${treasuryBump}\n`);

    // Check if treasury already exists
    console.log('🔍 Checking if treasury already exists...');
    try {
      const treasuryAccount = await connection.getAccountInfo(treasuryPda);
      if (treasuryAccount) {
        console.log('⚠️  Treasury already initialized!');
        console.log(`✅ Treasury PDA: ${treasuryPda.toBase58()}`);
        console.log(`💰 Balance: ${treasuryAccount.lamports / 1e9} SOL`);
        console.log(`📊 Owner: ${treasuryAccount.owner.toBase58()}`);
        return;
      }
    } catch (error) {
      // Account doesn't exist, continue with initialization
      console.log('✅ Treasury not yet initialized, proceeding...\n');
    }

    // Build init_treasury transaction
    console.log('🔨 Building init_treasury transaction...');
    const tx = await program.methods
      .initTreasury()
      .accounts({
        treasury: treasuryPda,
        admin: keypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    console.log('✅ Transaction built\n');

    // Send transaction
    console.log('📤 Sending transaction...');
    const signature = await connection.sendTransaction(tx, [keypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`✅ Transaction sent: ${signature}\n`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('✅ Transaction confirmed!\n');

    // Verify treasury account
    console.log('🔍 Verifying treasury account...');
    const treasuryAccount = await connection.getAccountInfo(treasuryPda);

    if (!treasuryAccount) {
      throw new Error('Treasury account was not created!');
    }

    console.log('✅ Treasury successfully initialized!\n');

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Treasury Initialization Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Treasury PDA:    ${treasuryPda.toBase58()}`);
    console.log(`Transaction:     ${signature}`);
    console.log(`Explorer:        https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log(`Account Balance: ${treasuryAccount.lamports / 1e9} SOL`);
    console.log(`Account Owner:   ${treasuryAccount.owner.toBase58()}`);
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('✅ You can now create prediction markets on devnet!');
    console.log('🚀 Visit http://localhost:3000/create to test market creation\n');

  } catch (error) {
    console.error('\n❌ Error initializing treasury:', error);

    if (error instanceof Error) {
      console.error('Details:', error.message);

      if (error.message.includes('Attempt to debit an account but found no record of a prior credit')) {
        console.error('\n💡 Hint: Your wallet might need more SOL. Try running:');
        console.error('   solana airdrop 2');
      }
    }

    process.exit(1);
  }
}

// Run the script
initTreasury().catch(console.error);
