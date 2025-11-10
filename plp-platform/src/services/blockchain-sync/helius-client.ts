/**
 * Helius WebSocket Client
 * Connects to Helius and subscribes to account updates
 */

import WebSocket from 'ws';
import { createClientLogger } from '@/lib/logger';
import { pushEvent } from '@/lib/redis/queue';

const logger = createClientLogger();

type SubscriptionType = 'accountSubscribe' | 'programSubscribe';

interface AccountUpdateNotification {
  jsonrpc: string;
  method: string;
  params: {
    result: {
      context: {
        slot: number;
      };
      value: {
        account: {
          data: [string, string]; // [base64 data, encoding]
          executable: boolean;
          lamports: number;
          owner: string;
          rentEpoch: number;
        };
        pubkey: string;
      };
    };
    subscription: number;
  };
}

export class HeliusClient {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private subscriptions: Map<string, number> = new Map();
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;
  private isIntentionallyClosed = false;
  private programId: string;

  constructor(network: 'devnet' | 'mainnet', programId: string) {
    this.programId = programId;
    const apiKey = process.env.HELIUS_API_KEY;

    if (!apiKey) {
      throw new Error('HELIUS_API_KEY not found in environment');
    }

    this.wsUrl = network === 'devnet'
      ? `wss://devnet.helius-rpc.com/?api-key=${apiKey}`
      : `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`;

    logger.info(`Helius client initialized for ${network}`);
  }

  /**
   * Connect to Helius WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      logger.warn('WebSocket already connected');
      return;
    }

    if (this.isConnecting) {
      logger.warn('Connection already in progress');
      return;
    }

    this.isConnecting = true;
    this.isIntentionallyClosed = false;

    return new Promise((resolve, reject) => {
      try {
        logger.info('Connecting to Helius WebSocket...');
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          logger.info('✅ Helius WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          logger.error('❌ Helius WebSocket error:', error);
          this.isConnecting = false;
          if (this.reconnectAttempts === 0) {
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          logger.warn(`⚠️ Helius WebSocket closed: ${code} - ${reason}`);
          this.isConnecting = false;
          this.ws = null;

          if (!this.isIntentionallyClosed) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('ping', () => {
          this.ws?.pong();
        });

      } catch (error) {
        this.isConnecting = false;
        logger.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        // Resubscribe to all previous subscriptions
        await this.resubscribeAll();
      } catch (error) {
        logger.error('Reconnection failed:', error);
      }
    }, delay);
  }

  /**
   * Resubscribe to all previous subscriptions after reconnection
   */
  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions.keys());
    this.subscriptions.clear();

    for (const key of subscriptions) {
      if (key.startsWith('program:')) {
        const programId = key.replace('program:', '');
        await this.subscribeToProgram(programId);
      } else if (key.startsWith('account:')) {
        const address = key.replace('account:', '');
        await this.subscribeToAccount(address);
      }
    }

    logger.info(`Resubscribed to ${subscriptions.length} subscriptions`);
  }

  /**
   * Subscribe to a specific account (market or position PDA)
   */
  async subscribeToAccount(address: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const subscriptionKey = `account:${address}`;

    if (this.subscriptions.has(subscriptionKey)) {
      logger.warn(`Already subscribed to account: ${address}`);
      return;
    }

    const subscribeRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'accountSubscribe',
      params: [
        address,
        {
          encoding: 'base64',
          commitment: 'confirmed',
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeRequest));
    logger.info(`📡 Subscribed to account: ${address}`);
  }

  /**
   * Subscribe to all program accounts (catch all markets/positions)
   */
  async subscribeToProgram(programId?: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    const targetProgramId = programId || this.programId;
    const subscriptionKey = `program:${targetProgramId}`;

    if (this.subscriptions.has(subscriptionKey)) {
      logger.warn(`Already subscribed to program: ${targetProgramId}`);
      return;
    }

    const subscribeRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'programSubscribe',
      params: [
        targetProgramId,
        {
          encoding: 'base64',
          commitment: 'confirmed',
        },
      ],
    };

    this.ws.send(JSON.stringify(subscribeRequest));
    logger.info(`📡 Subscribed to program: ${targetProgramId}`);
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());

      // Handle subscription confirmation
      if (message.id && message.result && typeof message.result === 'number') {
        logger.info(`✅ Subscription confirmed: ${message.result}`);
        return;
      }

      // Handle account updates
      if (message.method === 'accountNotification' || message.method === 'programNotification') {
        this.handleAccountUpdate(message as AccountUpdateNotification);
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle account update notification
   */
  private async handleAccountUpdate(notification: AccountUpdateNotification): Promise<void> {
    try {
      const { slot } = notification.params.result.context;
      const { account, pubkey } = notification.params.result.value;

      const accountData = account.data[0]; // Base64 encoded data
      const encoding = account.data[1];

      if (encoding !== 'base64') {
        logger.warn(`Unexpected encoding: ${encoding}`);
        return;
      }

      // Determine account type by checking discriminator or size
      const accountType = this.detectAccountType(accountData);

      logger.info(`📥 Account update received: ${pubkey.slice(0, 8)}... (${accountType})`);

      // Push to Redis queue
      await pushEvent({
        type: 'account_update',
        accountType,
        address: pubkey,
        data: accountData,
        slot,
        timestamp: Date.now(),
      });

    } catch (error) {
      logger.error('Error handling account update:', error);
    }
  }

  /**
   * Detect account type (market or position) from data
   * This is a simple heuristic - you can improve based on your account structure
   */
  private detectAccountType(base64Data: string): 'market' | 'position' | 'unknown' {
    try {
      const buffer = Buffer.from(base64Data, 'base64');

      // Skip 8-byte discriminator
      const dataSize = buffer.length - 8;

      // Market accounts are larger (~500+ bytes)
      // Position accounts are smaller (~100-200 bytes)
      // These are rough estimates - adjust based on your actual struct sizes

      if (dataSize > 400) {
        return 'market';
      } else if (dataSize > 50 && dataSize < 300) {
        return 'position';
      }

      return 'unknown';
    } catch (error) {
      logger.error('Error detecting account type:', error);
      return 'unknown';
    }
  }

  /**
   * Unsubscribe from account
   */
  async unsubscribeFromAccount(address: string): Promise<void> {
    const subscriptionKey = `account:${address}`;
    const subscriptionId = this.subscriptions.get(subscriptionKey);

    if (!subscriptionId) {
      logger.warn(`No subscription found for: ${address}`);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const unsubscribeRequest = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'accountUnsubscribe',
        params: [subscriptionId],
      };

      this.ws.send(JSON.stringify(unsubscribeRequest));
      this.subscriptions.delete(subscriptionKey);
      logger.info(`🔕 Unsubscribed from account: ${address}`);
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      logger.info('Disconnecting from Helius WebSocket...');
      this.ws.close();
      this.ws = null;
    }

    this.subscriptions.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get subscription count
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }
}
