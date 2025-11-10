/**
 * Manual script to check claim status without Anchor
 */

import { PublicKey, Connection } from '@solana/web3.js';
import { getPositionPDA } from '../src/lib/anchor-program';

const MARKET_ADDRESS = 'GiEen1ugRJRSo6cBVYjFtfhcWssGckr7VFEHqQjandE7';
const WALLETS = [
  { address: '4LzGLorksn9k8XpSUrDVeutCixgEDRK3FtAS99SMMAdV', type: 'NO' },
  { address: 'GzLHhzS3xjRSnPFCuubXyJP9nCfuCdw441sMjwY8L4TX', type: 'NO' },
  { address: 'CzwUpALnXBFEDP6CKDr9VmTnMvS3PmeHsqDxh3WsJAGY', type: 'YES' },
  { address: 'AFpscpwvWLoRsFd5qMuaadxbtidnfsFBzPK6s41CpCHy', type: 'YES' },
];

async function checkClaims() {
  console.log('🔍 Checking claim status for all wallets...\n');

  const connection = new Connection('https://devnet.helius-rpc.com/?api-key=8f773bda-b37a-42ec-989c-b2318c1772d7', 'confirmed');
  const marketPubkey = new PublicKey(MARKET_ADDRESS);

  // First, check market account balance
  const marketAccount = await connection.getAccountInfo(marketPubkey);
  console.log('=== MARKET ACCOUNT ===');
  console.log(`Address: ${MARKET_ADDRESS}`);
  console.log(`Balance: ${marketAccount?.lamports || 0} lamports (${((marketAccount?.lamports || 0) / 1e9).toFixed(9)} SOL)`);
  console.log('');

  // Check each wallet's position
  console.log('=== POSITION ACCOUNTS ===\n');

  for (const wallet of WALLETS) {
    const userPubkey = new PublicKey(wallet.address);
    const [positionPda] = getPositionPDA(marketPubkey, userPubkey);

    console.log(`Wallet: ${wallet.address} (${wallet.type} voter)`);
    console.log(`Position PDA: ${positionPda.toBase58()}`);

    try {
      const positionAccount = await connection.getAccountInfo(positionPda);

      if (!positionAccount) {
        console.log(`Status: ❌ Position account DOES NOT EXIST (never voted OR claimed and closed)`);
      } else {
        console.log(`Status: ✅ Position account EXISTS`);
        console.log(`   Lamports: ${positionAccount.lamports}`);
        console.log(`   Data size: ${positionAccount.data.length} bytes`);
        console.log(`   Note: Position exists, so either NOT claimed yet OR claimed but not closed`);
      }
    } catch (error) {
      console.log(`Status: ⚠️  Error fetching position: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

    console.log('');
  }

  // Get recent transaction signatures for the market
  console.log('=== ALL RECENT TRANSACTIONS ===\n');
  const signatures = await connection.getSignaturesForAddress(marketPubkey, { limit: 30 });

  let claimCount = 0;
  let voteCount = 0;
  let resolveCount = 0;

  for (const sigInfo of signatures) {
    const tx = await connection.getTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (tx && tx.meta) {
      const logs = tx.meta.logMessages || [];
      const success = !tx.meta.err;

      if (logs.some(log => log.toLowerCase().includes('claim'))) {
        claimCount++;
        console.log(`\n📋 CLAIM #${claimCount}: ${sigInfo.signature}`);
        console.log(`   Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Time: ${new Date((sigInfo.blockTime || 0) * 1000).toISOString()}`);
        console.log(`   All logs:`);
        logs.forEach(log => console.log(`     ${log}`));
      } else if (logs.some(log => log.toLowerCase().includes('vote'))) {
        voteCount++;
      } else if (logs.some(log => log.toLowerCase().includes('resolve'))) {
        resolveCount++;
        console.log(`\n⚖️  RESOLVE: ${sigInfo.signature}`);
        console.log(`   Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        console.log(`   Time: ${new Date((sigInfo.blockTime || 0) * 1000).toISOString()}`);
      }
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Total votes: ${voteCount}`);
  console.log(`Total resolves: ${resolveCount}`);
  console.log(`Total claims: ${claimCount}`);
}

checkClaims().catch(console.error);
