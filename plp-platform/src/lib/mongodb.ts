/**
 * MongoDB Connection Utility
 * Handles database connection and schema definitions
 */

import mongoose from 'mongoose';
import { config } from './config';
import logger from './logger';

// Connection state
let isConnected = false;

export const connectToDatabase = async () => {
  if (isConnected) {
    logger.debug('Database already connected');
    return;
  }

  if (!config.mongodb.uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    // Connect with environment-specific database name
    const connectionUri = `${config.mongodb.uri}/${config.mongodb.currentDatabase}`;
    await mongoose.connect(connectionUri);
    isConnected = true;
    logger.info('Connected to MongoDB successfully', { 
      database: config.mongodb.currentDatabase,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

// Project Schema
const ProjectSchema = new mongoose.Schema({
  founderWallet: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    maxlength: 255,
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  category: {
    type: String,
    required: true,
    enum: ['DeFi', 'Gaming', 'NFT', 'Infrastructure', 'AI/ML', 'Social', 'Other', 'DAO', 'nft', 'gaming', 'defi', 'social', 'infrastructure', 'ai', 'ai/ml', 'dao', 'other'],
  },
  projectType: {
    type: String,
    required: true,
    enum: ['Protocol', 'Application', 'Platform', 'Service', 'Tool', 'protocol', 'application', 'platform', 'service', 'tool'],
  },
  projectStage: {
    type: String,
    required: true,
    enum: ['Idea', 'MVP', 'Beta', 'Production', 'Scaling', 'Prototype', 'Launched', 'idea', 'mvp', 'beta', 'production', 'scaling', 'prototype', 'launched'],
  },
  location: {
    type: String,
    maxlength: 255,
  },
  teamSize: {
    type: Number,
    required: true,
    min: 1,
  },
  tokenSymbol: {
    type: String,
    required: true,
    minlength: [3, 'Token symbol must be at least 3 characters long'],
    maxlength: [10, 'Token symbol cannot exceed 10 characters'],
    uppercase: true,
  },
  socialLinks: {
    type: Map,
    of: String,
    default: {},
  },
  projectImageUrl: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'resolved', 'cancelled'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Prediction Market Schema
const PredictionMarketSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  marketAddress: {
    type: String,
    required: true,
    unique: true,
  },
  marketName: {
    type: String,
    required: true,
    maxlength: 255,
  },
  marketDescription: {
    type: String,
    required: true,
  },
  metadataUri: {
    type: String,
  },
  expiryTime: {
    type: Date,
    required: true,
  },
  finalizationDeadline: {
    type: Date,
    required: true,
  },
  marketState: {
    type: Number,
    default: 0, // 0=Active, 1=Resolved, 2=Canceled, 3=AutoCanceled
  },
  winningOption: {
    type: Boolean, // true=YES wins, false=NO wins, null=unresolved
  },
  targetPool: {
    type: Number,
    default: 5000000000, // 5 SOL in lamports
  },
  platformFee: {
    type: Number,
    default: 500000000, // 0.5 SOL in lamports
  },
  yesVoteCost: {
    type: Number,
    default: 50000000, // 0.05 SOL in lamports
  },
  totalYesStake: {
    type: Number,
    default: 0,
  },
  totalNoStake: {
    type: Number,
    default: 0,
  },
  yesVoteCount: {
    type: Number,
    default: 0,
  },
  noVoteCount: {
    type: Number,
    default: 0,
  },
  pumpFunTokenAddress: {
    type: String,
  },
  autoLaunch: {
    type: Boolean,
    default: true,
  },
  launchWindowEnd: {
    type: Date,
  },
  resolvedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prediction Participants Schema
const PredictionParticipantSchema = new mongoose.Schema({
  marketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PredictionMarket',
    required: true,
  },
  participantWallet: {
    type: String,
    required: true,
    index: true,
  },
  voteOption: {
    type: Boolean,
    required: true, // true=YES, false=NO
  },
  stakeAmount: {
    type: Number,
    required: true,
  },
  voteCost: {
    type: Number,
    required: true,
  },
  tokensAirdropped: {
    type: Number,
    default: 0,
  },
  solRewarded: {
    type: Number,
    default: 0,
  },
  claimed: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Add indexes for better performance
PredictionParticipantSchema.index({ marketId: 1, participantWallet: 1, voteOption: 1 }, { unique: true });

// Export models - Force recreation to pick up schema changes
if (mongoose.models.Project) {
  delete mongoose.models.Project;
}
if (mongoose.models.PredictionMarket) {
  delete mongoose.models.PredictionMarket;
}
if (mongoose.models.PredictionParticipant) {
  delete mongoose.models.PredictionParticipant;
}

export const Project = mongoose.model('Project', ProjectSchema);
export const PredictionMarket = mongoose.model('PredictionMarket', PredictionMarketSchema);
export const PredictionParticipant = mongoose.model('PredictionParticipant', PredictionParticipantSchema);

// Type definitions
export interface IProject {
  _id: string;
  founderWallet: string;
  name: string;
  description: string;
  category: string;
  projectType: string;
  projectStage: string;
  location?: string;
  teamSize: number;
  tokenSymbol: string;
  socialLinks: Map<string, string>;
  projectImageUrl?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPredictionMarket {
  _id: string;
  projectId: string;
  marketAddress: string;
  marketName: string;
  marketDescription: string;
  metadataUri?: string;
  expiryTime: Date;
  finalizationDeadline: Date;
  marketState: number;
  winningOption?: boolean;
  targetPool: number;
  platformFee: number;
  yesVoteCost: number;
  totalYesStake: number;
  totalNoStake: number;
  yesVoteCount: number;
  noVoteCount: number;
  pumpFunTokenAddress?: string;
  autoLaunch: boolean;
  launchWindowEnd?: Date;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface IPredictionParticipant {
  _id: string;
  marketId: string;
  participantWallet: string;
  voteOption: boolean;
  stakeAmount: number;
  voteCost: number;
  tokensAirdropped: number;
  solRewarded: number;
  claimed: boolean;
  createdAt: Date;
}
