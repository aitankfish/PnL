/**
 * Simple Treasury Initialization Script
 * Initializes the treasury PDA for the new program
 */

import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const PROGRAM_ID = new PublicKey('D1UuFTcsRSNHMEgF9UT4ae6BuVVrUj1VqQvZKjHs4CKS');
const RPC_URL = process.env.NEXT_PUBLIC_HELIUS_DEVNET_RPC || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.SOLANA_KEYPAIR_PATH ||
  path.join(process.env.HOME || '', '.config/solana/id.json');

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

    // Derive treasury PDA
    const [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );

    console.log(`🏦 Treasury PDA: ${treasuryPda.toBase58()}`);
    console.log(`📍 Treasury Bump: ${treasuryBump}\n`);

    // Check if treasury already exists
    console.log('🔍 Checking if treasury already exists...');
    const treasuryAccountInfo = await connection.getAccountInfo(treasuryPda);
    if (treasuryAccountInfo) {
      console.log('⚠️  Treasury already initialized!');
      console.log(`✅ Treasury PDA: ${treasuryPda.toBase58()}`);
      console.log(`💰 Balance: ${treasuryAccountInfo.lamports / 1e9} SOL`);
      console.log(`📊 Owner: ${treasuryAccountInfo.owner.toBase58()}`);
      return;
    }
    console.log('✅ Treasury not yet initialized, proceeding...\n');

    // Build init_treasury instruction
    console.log('🔨 Building init_treasury instruction...');

    // Instruction discriminator for init_treasury (first 8 bytes of SHA256 hash of "global:init_treasury")
    const discriminator = Buffer.from([0xab, 0x1d, 0x5f, 0x5e, 0x6b, 0x3a, 0x3c, 0x3d]);

    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: treasuryPda, isSigner: false, isWritable: true },
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data: discriminator,
    });

    const transaction = new Transaction().add(instruction);
    console.log('✅ Instruction built\n');

    // Send transaction
    console.log('📤 Sending transaction...');
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      {
        commitment: 'confirmed',
        skipPreflight: false,
      }
    );

    console.log(`✅ Transaction confirmed: ${signature}\n`);

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
        console.error('   solana airdrop 2 --url devnet');
      }
    }

    process.exit(1);
  }
}

// Run the script
initTreasury().catch(console.error);
