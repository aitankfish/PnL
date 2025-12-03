/**
 * Socket.IO Server
 * Manages real-time connections and broadcasts updates to clients
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createClientLogger } from '@/lib/logger';

const logger = createClientLogger();

export class SocketServer {
  private io: SocketIOServer | null = null;
  private httpServer: HTTPServer | null = null;

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      console.log('⚠️  Socket.IO server already initialized');
      logger.warn('Socket.IO server already initialized');
      return;
    }

    console.log('🔌 Initializing Socket.IO server...');
    logger.info('🔌 Initializing Socket.IO server...');

    this.httpServer = httpServer;
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/api/socket/io',
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();

    console.log('✅ Socket.IO server initialized on path /api/socket/io');
    logger.info('✅ Socket.IO server initialized');
  }

  /**
   * Setup connection handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.info(`🔗 Client connected: ${socket.id}`);

      // Handle market subscriptions
      socket.on('subscribe:market', (marketAddress: string) => {
        logger.info(`📡 Client ${socket.id} subscribing to market: ${marketAddress}`);
        socket.join(`market:${marketAddress}`);
        socket.emit('subscribed', { marketAddress });
      });

      // Handle market unsubscriptions
      socket.on('unsubscribe:market', (marketAddress: string) => {
        logger.info(`📡 Client ${socket.id} unsubscribing from market: ${marketAddress}`);
        socket.leave(`market:${marketAddress}`);
        socket.emit('unsubscribed', { marketAddress });
      });

      // Handle all markets subscription
      socket.on('subscribe:all-markets', () => {
        logger.info(`📡 Client ${socket.id} subscribing to all markets`);
        socket.join('all-markets');
        socket.emit('subscribed', { room: 'all-markets' });
      });

      // Handle user-specific subscriptions (for notifications)
      socket.on('subscribe:user', (walletAddress: string) => {
        logger.info(`📡 Client ${socket.id} subscribing to user updates: ${walletAddress}`);
        socket.join(`user:${walletAddress}`);
        socket.emit('subscribed', { walletAddress });
      });

      // Handle broadcast requests from blockchain sync (server-to-server)
      socket.on('broadcast:market', (payload: { marketAddress: string; data: any; timestamp: number }) => {
        logger.info(`📥 Received broadcast request for market: ${payload.marketAddress.slice(0, 8)}...`);
        this.broadcastMarketUpdate(payload.marketAddress, payload.data);
      });

      socket.on('broadcast:position', (payload: { userWallet: string; marketAddress: string; data: any; timestamp: number }) => {
        logger.info(`📥 Received broadcast request for position: ${payload.userWallet.slice(0, 8)}...`);
        this.broadcastPositionUpdate(payload.userWallet, payload.marketAddress, payload.data);
      });

      socket.on('broadcast:notification', (payload: { userWallet: string; notification: any; timestamp: number }) => {
        logger.info(`📥 Received broadcast request for notification: ${payload.userWallet.slice(0, 8)}...`);
        this.broadcastNotification(payload.userWallet, payload.notification);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  /**
   * Broadcast market update to subscribed clients
   */
  broadcastMarketUpdate(marketAddress: string, data: any): void {
    if (!this.io) {
      // Silently skip if server not initialized yet (expected during startup)
      return;
    }

    logger.info(`📤 Broadcasting market update: ${marketAddress.slice(0, 8)}...`);

    // Broadcast to specific market room
    this.io.to(`market:${marketAddress}`).emit('market:update', {
      marketAddress,
      data,
      timestamp: Date.now(),
    });

    // Also broadcast to all-markets room
    this.io.to('all-markets').emit('market:update', {
      marketAddress,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast position update to user
   */
  broadcastPositionUpdate(walletAddress: string, marketAddress: string, data: any): void {
    if (!this.io) {
      // Silently skip if server not initialized yet (expected during startup)
      return;
    }

    logger.info(`📤 Broadcasting position update for ${walletAddress.slice(0, 8)}...`);

    this.io.to(`user:${walletAddress}`).emit('position:update', {
      walletAddress,
      marketAddress,
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast notification to user
   */
  broadcastNotification(walletAddress: string, notification: any): void {
    if (!this.io) {
      // Silently skip if server not initialized yet (expected during startup)
      return;
    }

    logger.info(`🔔 Broadcasting notification to ${walletAddress.slice(0, 8)}...`);

    this.io.to(`user:${walletAddress}`).emit('notification', {
      notification,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.io?.sockets.sockets.size || 0;
  }

  /**
   * Get room subscriber count
   */
  getRoomSize(room: string): number {
    if (!this.io) return 0;
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets?.size || 0;
  }

  /**
   * Get all active rooms
   */
  getActiveRooms(): string[] {
    if (!this.io) return [];
    return Array.from(this.io.sockets.adapter.rooms.keys()).filter(
      (room) => !this.io!.sockets.sockets.has(room) // Exclude socket IDs
    );
  }

  /**
   * Shutdown server
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      logger.info('⏹️  Shutting down Socket.IO server...');
      await this.io.close();
      this.io = null;
      logger.info('✅ Socket.IO server shut down');
    }
  }
}

// Singleton instance
let socketServerInstance: SocketServer | null = null;

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketServer {
  if (!socketServerInstance) {
    socketServerInstance = new SocketServer();
  }
  return socketServerInstance;
}

/**
 * Initialize Socket.IO server
 */
export function initializeSocketServer(httpServer: HTTPServer): void {
  console.log('📞 initializeSocketServer() called');
  const server = getSocketServer();
  server.initialize(httpServer);
}

/**
 * Broadcast helpers (convenience functions)
 */
export function broadcastMarketUpdate(marketAddress: string, data: any): void {
  const server = getSocketServer();
  server.broadcastMarketUpdate(marketAddress, data);
}

export function broadcastPositionUpdate(
  walletAddress: string,
  marketAddress: string,
  data: any
): void {
  const server = getSocketServer();
  server.broadcastPositionUpdate(walletAddress, marketAddress, data);
}

export function broadcastNotification(walletAddress: string, notification: any): void {
  const server = getSocketServer();
  server.broadcastNotification(walletAddress, notification);
}
