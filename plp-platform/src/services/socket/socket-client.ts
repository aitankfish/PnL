/**
 * Socket.IO Client for Blockchain Sync
 * Connects to the Socket.IO server to broadcast updates
 */

import { io, Socket } from 'socket.io-client';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;

  /**
   * Connect to Socket.IO server
   */
  connect(): void {
    if (this.socket) {
      logger.warn('Socket.IO client already connected');
      return;
    }

    const socketPort = process.env.SOCKET_PORT || '3001';
    const socketUrl = `http://localhost:${socketPort}`;

    logger.info(`🔌 Connecting to Socket.IO server at ${socketUrl}...`);

    this.socket = io(socketUrl, {
      path: '/api/socket/io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO client connected to server');
      logger.info('✅ Connected to Socket.IO server');
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      logger.warn(`🔌 Disconnected from Socket.IO server: ${reason}`);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      logger.error(`🔌 Connection error: ${error.message}`);
      this.isConnected = false;
    });
  }

  /**
   * Broadcast market update
   */
  broadcastMarketUpdate(marketAddress: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      logger.warn('Socket.IO client not connected, skipping broadcast');
      return;
    }

    logger.info(`📤 Broadcasting market update: ${marketAddress.slice(0, 8)}...`);

    // Emit to server, which will broadcast to all connected clients
    this.socket.emit('broadcast:market', {
      marketAddress,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast position update
   */
  broadcastPositionUpdate(userWallet: string, marketAddress: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      logger.warn('Socket.IO client not connected, skipping broadcast');
      return;
    }

    logger.info(`📤 Broadcasting position update for ${userWallet.slice(0, 8)}...`);

    this.socket.emit('broadcast:position', {
      userWallet,
      marketAddress,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Send notification
   */
  sendNotification(userWallet: string, notification: any): void {
    if (!this.socket || !this.isConnected) {
      logger.warn('Socket.IO client not connected, skipping notification');
      return;
    }

    logger.info(`🔔 Sending notification to ${userWallet.slice(0, 8)}...`);

    this.socket.emit('broadcast:notification', {
      userWallet,
      notification,
      timestamp: Date.now(),
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      logger.info('🔌 Disconnected from Socket.IO server');
    }
  }
}

// Export singleton instance
export const socketClient = new SocketClient();
