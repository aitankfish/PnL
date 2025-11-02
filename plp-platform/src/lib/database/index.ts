/**
 * Database Connection and Operations
 * Centralized database access for PLP Platform
 */

import { MongoClient, Db } from 'mongodb';
import { config } from '@/lib/config';
import { COLLECTIONS, INDEXES } from './models';

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private connectionPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.client && this.db) {
      return;
    }

    // If connection is in progress, wait for it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!config.mongodb.uri) {
      throw new Error('MongoDB URI not configured');
    }

    // Create a new connection promise
    this.connectionPromise = (async () => {
      try {
        this.client = new MongoClient(config.mongodb.uri!);
        await this.client.connect();
        this.db = this.client.db('plp-platform');

        // Create indexes for better performance
        await this.createIndexes();

        console.log('✅ Connected to MongoDB successfully');
      } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        this.client = null;
        this.db = null;
        this.connectionPromise = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.connectionPromise = null;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Create indexes for projects collection
      for (const index of INDEXES.PROJECTS) {
        await this.db.collection(COLLECTIONS.PROJECTS).createIndex(index);
      }

      // Create indexes for prediction_markets collection
      for (const index of INDEXES.PREDICTION_MARKETS) {
        await this.db.collection(COLLECTIONS.PREDICTION_MARKETS).createIndex(index);
      }

      // Create indexes for prediction_participants collection
      for (const index of INDEXES.PREDICTION_PARTICIPANTS) {
        await this.db.collection(COLLECTIONS.PREDICTION_PARTICIPANTS).createIndex(index);
      }

      // Create indexes for user_profiles collection
      for (const index of INDEXES.USER_PROFILES) {
        await this.db.collection(COLLECTIONS.USER_PROFILES).createIndex(index);
      }

      // Create indexes for transaction_history collection
      for (const index of INDEXES.TRANSACTION_HISTORY) {
        await this.db.collection(COLLECTIONS.TRANSACTION_HISTORY).createIndex(index);
      }

      console.log('📊 Database indexes created successfully');
    } catch (error) {
      console.error('❌ Failed to create database indexes:', error);
      // Don't throw here, as indexes might already exist
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) return false;
      await this.db.admin().ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();

// Export functions for easy use
export const connectToDatabase = () => databaseManager.connect();
export const disconnectFromDatabase = () => databaseManager.disconnect();
export const getDatabase = () => databaseManager.getDb();
export const isDatabaseHealthy = () => databaseManager.healthCheck();

// Export collections for easy access
export const getProjectsCollection = () => databaseManager.getDb().collection(COLLECTIONS.PROJECTS);
export const getPredictionMarketsCollection = () => databaseManager.getDb().collection(COLLECTIONS.PREDICTION_MARKETS);
export const getPredictionParticipantsCollection = () => databaseManager.getDb().collection(COLLECTIONS.PREDICTION_PARTICIPANTS);
export const getUserProfilesCollection = () => databaseManager.getDb().collection(COLLECTIONS.USER_PROFILES);
export const getTransactionHistoryCollection = () => databaseManager.getDb().collection(COLLECTIONS.TRANSACTION_HISTORY);

export default databaseManager;
