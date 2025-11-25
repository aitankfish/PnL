/**
 * Production Start Script
 * Starts both Next.js server and Blockchain Sync in a single process
 * Used for production deployment (Render.com, etc.)
 */

import { config as dotenvConfig } from 'dotenv';
dotenvConfig(); // Load .env file

import { spawn } from 'child_process';
import { startBlockchainSync, stopBlockchainSync, getSyncManager } from '../src/services/blockchain-sync/sync-manager';

const logger = {
  info: (...args: any[]) => console.log('[PROD]', ...args),
  error: (...args: any[]) => console.error('[PROD]', ...args),
  warn: (...args: any[]) => console.warn('[PROD]', ...args),
};

async function startProduction() {
  logger.info('🚀 Starting PLP Platform in PRODUCTION mode...\n');

  try {
    // 1. Start Next.js production server
    logger.info('📦 Starting Next.js production server...');
    const nextServer = spawn('npm', ['run', 'start'], {
      stdio: 'inherit',
      shell: true,
    });

    nextServer.on('error', (error) => {
      logger.error('Failed to start Next.js server:', error);
      process.exit(1);
    });

    // Wait for Next.js to be ready (give it 5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));
    logger.info('✅ Next.js server started\n');

    // 2. Check if AUTO_START_SYNC is enabled (default true for production)
    const autoStartSync = process.env.AUTO_START_SYNC !== 'false';

    if (!autoStartSync) {
      logger.warn('⚠️  AUTO_START_SYNC is disabled. Blockchain sync will NOT start.');
      logger.info('✅ Production server running without sync');
      return;
    }

    // 3. Start blockchain sync system
    logger.info('🔗 Starting blockchain sync system...');
    await startBlockchainSync();
    logger.info('✅ Blockchain sync started\n');

    // 4. Show system status
    const manager = getSyncManager();
    if (manager) {
      const status = await manager.getStatus();
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info('📊 System Status:');
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`   ✓ Next.js:           🟢 Running`);
      logger.info(`   ✓ Socket.IO:         🟢 Port 3001`);
      logger.info(`   ✓ Helius WebSocket:  ${status.heliusConnected ? '🟢 Connected' : '🔴 Disconnected'}`);
      logger.info(`   ✓ Event Processor:   ${status.processorRunning ? '🟢 Running' : '🔴 Stopped'}`);
      logger.info(`   ✓ Subscriptions:     ${status.subscriptionCount}`);
      logger.info(`   ✓ Queue Length:      ${status.queueStats.queueLength}`);
      logger.info(`   ✓ Network:           ${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta'}`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    logger.info('✅ Production system fully operational!');
    logger.info('💡 Server running at http://localhost:3000');
    logger.info('💡 Real-time sync active\n');

    // 5. Monitor sync health every 60 seconds
    setInterval(async () => {
      try {
        if (manager) {
          const currentStatus = await manager.getStatus();
          logger.info(`[${new Date().toLocaleTimeString()}] Health: Helius ${currentStatus.heliusConnected ? '✓' : '✗'} | Queue: ${currentStatus.queueStats.queueLength} | Processing: ${currentStatus.queueStats.processingCount}`);
        }
      } catch (error) {
        logger.error('Health check failed:', error);
      }
    }, 60000);

  } catch (error) {
    logger.error('❌ Failed to start production system:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('\n\n⏹️  Shutting down production system...');

  try {
    await stopBlockchainSync();
    logger.info('✅ Blockchain sync stopped');
    logger.info('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the system
startProduction();
