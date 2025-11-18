/**
 * Vanity Address Generator for PLP Platform
 *
 * Generates token mint addresses ending with "pnl" to brand
 * tokens launched from the PLP platform.
 */

import { Keypair } from '@solana/web3.js';

interface VanityOptions {
  suffix?: string;  // e.g., "pnl"
  prefix?: string;  // e.g., "PLP"
  caseSensitive?: boolean;
  maxAttempts?: number;
}

/**
 * Generate a vanity keypair with a specific suffix or prefix
 */
export function generateVanityKeypair(options: VanityOptions = {}): Keypair | null {
  const {
    suffix = 'pnl',
    prefix,
    caseSensitive = false,
    maxAttempts = 10_000_000, // 10M attempts (safety limit)
  } = options;

  const targetSuffix = caseSensitive ? suffix : suffix.toLowerCase();
  const targetPrefix = prefix ? (caseSensitive ? prefix : prefix.toLowerCase()) : undefined;

  let attempts = 0;
  const startTime = Date.now();

  console.log('🔍 Generating vanity address...');
  console.log(`   Target suffix: "...${suffix}"`);
  if (targetPrefix) {
    console.log(`   Target prefix: "${prefix}..."`);
  }
  console.log(`   Max attempts: ${maxAttempts.toLocaleString()}`);
  console.log('');

  // Progress updates every N attempts
  const progressInterval = 100_000;
  let lastProgress = 0;

  while (attempts < maxAttempts) {
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const checkAddress = caseSensitive ? address : address.toLowerCase();

    // Show progress
    if (attempts - lastProgress >= progressInterval) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = Math.round(attempts / (Date.now() - startTime) * 1000);
      console.log(`   ${attempts.toLocaleString()} attempts (${elapsed}s, ${rate.toLocaleString()}/s)`);
      lastProgress = attempts;
    }

    // Check if matches pattern
    const matchesSuffix = !suffix || checkAddress.endsWith(targetSuffix);
    const matchesPrefix = !targetPrefix || checkAddress.startsWith(targetPrefix);

    if (matchesSuffix && matchesPrefix) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      const rate = Math.round(attempts / (Date.now() - startTime) * 1000);

      console.log('');
      console.log('✅ VANITY ADDRESS FOUND!');
      console.log(`   Address: ${address}`);
      console.log(`   Attempts: ${attempts.toLocaleString()}`);
      console.log(`   Time: ${elapsed}s`);
      console.log(`   Rate: ${rate.toLocaleString()} addresses/second`);
      console.log('');

      return keypair;
    }

    attempts++;
  }

  console.log('');
  console.log('❌ Max attempts reached without finding match');
  console.log(`   Tried ${attempts.toLocaleString()} addresses`);
  console.log('');

  return null;
}

/**
 * Test the vanity generator
 */
async function testVanityGenerator() {
  console.log('═══════════════════════════════════════════════════');
  console.log('🎯 VANITY ADDRESS GENERATOR TEST');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  // Test 1: Generate address ending with "pnl"
  const keypair = generateVanityKeypair({
    suffix: 'pnl',
    caseSensitive: false,
    maxAttempts: 10_000_000, // Usually finds within 1-2 million for 3 chars
  });

  if (keypair) {
    console.log('Example usage in token creation:');
    console.log(`const mintKeypair = Keypair.fromSecretKey(new Uint8Array([...]));`);
    console.log(`// Mint: ${keypair.publicKey.toBase58()}`);
    console.log('');
    console.log('Private key (base58):');
    console.log(Buffer.from(keypair.secretKey).toString('base64'));
  }

  console.log('═══════════════════════════════════════════════════');
}

// Run test if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testVanityGenerator();
}
