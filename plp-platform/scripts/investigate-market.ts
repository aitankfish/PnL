/**
 * Script to investigate market account state and claim transactions
 * Usage: npx ts-node scripts/investigate-market.ts
 */

import { PublicKey, Connection } from '@solana/web3.js';

const MARKET_ADDRESS = 'GiEen1ugRJRSo6cBVYjFtfhcWssGckr7VFEHqQjandE7';

async function investigateMarket() {
  try {
    console.log('🔍 Investigating market:', MARKET_ADDRESS);
    console.log('');

    // Connect to devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    const marketPubkey = new PublicKey(MARKET_ADDRESS);

    // Fetch market account
    console.log('📊 Fetching market account data...');
    const accountInfo = await connection.getAccountInfo(marketPubkey);

    if (!accountInfo) {
      console.log('❌ Market account not found');
      return;
    }

    const data = accountInfo.data;

    console.log('');
    console.log('=== ACCOUNT BALANCE ===');
    console.log('Account lamports:', accountInfo.lamports);
    console.log('Account SOL:', (accountInfo.lamports / 1e9).toFixed(9));
    console.log('Data size:', data.length, 'bytes');
    console.log('');

    // Fetch recent transaction signatures
    console.log('=== RECENT TRANSACTIONS ===');
    const signatures = await connection.getSignaturesForAddress(marketPubkey, { limit: 20 });

    console.log(`Found ${signatures.length} recent transactions:`);
    console.log('');

    // Analyze each transaction
    for (const sigInfo of signatures) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta) {
        // Try to determine transaction type from logs
        const logs = tx.meta.logMessages || [];
        let txType = 'Unknown';

        if (logs.some(log => log.includes('vote_yes') || log.includes('vote_no'))) {
          txType = 'VOTE';
        } else if (logs.some(log => log.includes('resolve_market'))) {
          txType = 'RESOLVE';
        } else if (logs.some(log => log.includes('claim_rewards'))) {
          txType = 'CLAIM';
        }

        // Extract claim details
        if (txType === 'CLAIM') {
          const claimLogs = logs.filter(log =>
            log.includes('NO WINS') ||
            log.includes('SOL payout') ||
            log.includes('Remaining pool')
          );

          console.log(`📝 ${txType} - ${sigInfo.signature.substring(0, 8)}...`);
          console.log(`   Block time: ${new Date((sigInfo.blockTime || 0) * 1000).toISOString()}`);
          console.log(`   Status: ${tx.meta.err ? 'FAILED' : 'SUCCESS'}`);

          if (claimLogs.length > 0) {
            console.log('   Claim details:');
            claimLogs.forEach(log => console.log(`     ${log}`));
          }
          console.log('');
        } else {
          console.log(`📝 ${txType} - ${sigInfo.signature.substring(0, 8)}... (${tx.meta.err ? 'FAILED' : 'SUCCESS'})`);
        }
      }
    }

    // Try to find and analyze all position accounts for this market
    console.log('');
    console.log('=== SEARCHING FOR POSITIONS ===');

    // We can't easily enumerate all positions without knowing the user public keys
    // But we can check if there are any hints in the transaction data
    const positionSignatures = signatures.filter((_, idx) => idx < 10);
    const userWallets = new Set<string>();

    for (const sigInfo of positionSignatures) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.transaction) {
        // Extract account keys to find user wallets
        const accountKeys = tx.transaction.message.getAccountKeys();
        accountKeys.staticAccountKeys.forEach(key => {
          userWallets.add(key.toBase58());
        });
      }
    }

    console.log(`Found ${userWallets.size} unique wallets in recent transactions`);
    console.log('');

  } catch (error) {
    console.error('❌ Error investigating market:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

investigateMarket();
