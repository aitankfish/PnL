const fs = require('fs');
const { Keypair } = require('@solana/web3.js');
const bip39 = require('bip39');

const SEED_PHRASE = 'gravity bottom expire gentle treat process merit bus comfort sketch supreme about';

// Convert seed phrase to seed (512 bits)
const seed = bip39.mnemonicToSeedSync(SEED_PHRASE, '');

// DIRECT DERIVATION: Use first 32 bytes of the seed
const keypairSeed = seed.slice(0, 32);

// Create keypair
const keypair = Keypair.fromSeed(keypairSeed);

console.log('Recovered Address (Direct Derivation):', keypair.publicKey.toBase58());

// Save to file
const keypairArray = Array.from(keypair.secretKey);
fs.writeFileSync(
  'plp_program/target/deploy/payer-keypair.json',
  JSON.stringify(keypairArray)
);

console.log('✅ Keypair saved to plp_program/target/deploy/payer-keypair.json');
