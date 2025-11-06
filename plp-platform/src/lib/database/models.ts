/**
 * Database Models and Schemas for PLP Platform
 * MongoDB collections and their TypeScript interfaces
 */

import { ObjectId } from 'mongodb';

// Project Schema
export interface Project {
  _id?: ObjectId;
  founderWallet: string;
  name: string;
  description: string;
  category: string;
  projectType: string;
  projectStage: string;
  location?: string;
  teamSize: number;
  tokenSymbol: string;
  socialLinks: {
    website?: string;
    github?: string;
    linkedin?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
  };
  projectImageUrl?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

// Prediction Market Schema
export interface PredictionMarket {
  _id?: ObjectId;
  projectId: ObjectId;
  marketAddress: string; // On-chain market PDA
  marketName: string;
  marketDescription: string;
  metadataUri?: string;
  expiryTime: Date;
  finalizationDeadline: Date;
  marketState: number; // 0=Active, 1=Resolved, 2=Canceled, 3=AutoCanceled
  winningOption?: boolean; // true=YES wins, false=NO wins, null=unresolved
  targetPool: number; // 5 SOL in lamports
  platformFee: number; // 0.5 SOL in lamports
  yesVoteCost: number; // 0.05 SOL in lamports
  totalYesStake: number;
  totalNoStake: number;
  yesVoteCount: number;
  noVoteCount: number;
  pumpFunTokenAddress?: string; // Set when token is created
  autoLaunch: boolean;
  launchWindowEnd?: Date; // For manual launch option
  resolvedAt?: Date;
  createdAt: Date;
}

// Prediction Participant Schema
export interface PredictionParticipant {
  _id?: ObjectId;
  marketId: ObjectId;
  participantWallet: string;
  voteOption: boolean; // true=YES, false=NO
  stakeAmount: number;
  voteCost: number;
  tokensAirdropped: number; // For YES voters when token launches
  solRewarded: number; // For NO voters when NO wins
  claimed: boolean;
  createdAt: Date;
}

// User Profile Schema
export interface UserProfile {
  _id?: ObjectId;
  walletAddress: string;
  email?: string;
  username?: string;
  profilePhotoUrl?: string; // IPFS URL for profile photo
  bio?: string; // Short bio (optional)
  reputationScore: number;
  totalPredictions: number;
  correctPredictions: number;
  projectsCreated: number;
  successfulProjects: number;
  createdAt: Date;
  updatedAt: Date;
}

// Transaction History Schema
export interface TransactionHistory {
  _id?: ObjectId;
  walletAddress: string;
  transactionType: 'prediction' | 'reward' | 'airdrop' | 'fee';
  marketId?: ObjectId;
  amount: number; // in lamports
  status: 'pending' | 'completed' | 'failed';
  transactionHash?: string;
  createdAt: Date;
}

// Trade History Schema (DEPRECATED - now read from blockchain via Helius)
// Kept for backwards compatibility with existing data
export interface TradeHistory {
  _id?: ObjectId;
  marketId: ObjectId;
  marketAddress: string;
  traderWallet: string;
  voteType: 'yes' | 'no';
  amount: number; // SOL amount in lamports
  shares: number; // Shares received
  yesPrice: number; // YES probability at time of trade (0-100)
  noPrice: number; // NO probability at time of trade (0-100)
  signature: string; // Transaction signature
  createdAt: Date;
}

// Database Collection Names
export const COLLECTIONS = {
  PROJECTS: 'projects',
  PREDICTION_MARKETS: 'prediction_markets',
  PREDICTION_PARTICIPANTS: 'prediction_participants',
  USER_PROFILES: 'user_profiles',
  TRANSACTION_HISTORY: 'transaction_history',
  TRADE_HISTORY: 'trade_history',
} as const;

// Index definitions for better performance
export const INDEXES = {
  PROJECTS: [
    { founderWallet: 1 },
    { status: 1 },
    { createdAt: -1 },
    { category: 1 },
  ],
  PREDICTION_MARKETS: [
    { marketAddress: 1 },
    { projectId: 1 },
    { marketState: 1 },
    { expiryTime: 1 },
  ],
  PREDICTION_PARTICIPANTS: [
    { marketId: 1, participantWallet: 1, voteOption: 1 },
    { participantWallet: 1 },
    { marketId: 1 },
  ],
  USER_PROFILES: [
    { walletAddress: 1 },
    { reputationScore: -1 },
  ],
  TRANSACTION_HISTORY: [
    { walletAddress: 1 },
    { createdAt: -1 },
    { transactionType: 1 },
  ],
  // TRADE_HISTORY indexes removed - collection deprecated (data now from Helius)
  TRADE_HISTORY: [],
} as const;
