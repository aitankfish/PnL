/**
 * Environment-Specific Database Setup Script
 * Sets up both development and production databases
 */

// Load environment variables first
require('dotenv').config();

import mongoose from 'mongoose';
import { createClientLogger } from '../src/lib/logger';

const logger = createClientLogger();

async function setupEnvironmentDatabases() {
  try {
    console.log('🚀 Setting up Environment-Specific Databases...');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    const devDatabase = process.env.MONGODB_DEV_DATABASE || 'plp_platform_dev';
    const prodDatabase = process.env.MONGODB_PROD_DATABASE || 'plp_platform_prod';
    
    console.log('📊 Database Configuration:');
    console.log(`   Development: ${devDatabase}`);
    console.log(`   Production: ${prodDatabase}`);
    
    // Define schemas
    const ProjectSchema = new mongoose.Schema({
      founderWallet: { type: String, required: true, index: true },
      name: { type: String, required: true, maxlength: 255 },
      description: { type: String, required: true },
      category: { type: String, required: true, enum: ['DeFi', 'NFT', 'Gaming', 'Social', 'Infrastructure', 'Other'] },
      projectType: { type: String, required: true, enum: ['Application', 'Protocol', 'Platform', 'Service'] },
      projectStage: { type: String, required: true, enum: ['Idea', 'Prototype', 'MVP', 'Beta', 'Production'] },
      location: { type: String },
      teamSize: { type: Number, required: true, min: 1 },
      tokenSymbol: { type: String, required: true, maxlength: 10 },
      socialLinks: { type: Map, of: String },
      projectImageUrl: { type: String },
      status: { type: String, default: 'active', enum: ['active', 'inactive', 'launched'] },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const PredictionMarketSchema = new mongoose.Schema({
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
      marketAddress: { type: String, required: true, unique: true },
      actionsPlatformId: { type: String, required: true },
      marketName: { type: String, required: true, maxlength: 255 },
      marketDescription: { type: String, required: true },
      metadataUri: { type: String },
      expiryTime: { type: Date, required: true },
      finalizationDeadline: { type: Date, required: true },
      marketState: { type: Number, default: 0 },
      winningOption: { type: Boolean },
      pumpFunTokenAddress: { type: String },
      autoLaunch: { type: Boolean, default: true },
      launchWindowEnd: { type: Date },
      resolvedAt: { type: Date },
      createdAt: { type: Date, default: Date.now },
    });

    const PredictionParticipantSchema = new mongoose.Schema({
      marketId: { type: mongoose.Schema.Types.ObjectId, ref: 'PredictionMarket', required: true },
      participantWallet: { type: String, required: true },
      voteOption: { type: Boolean, required: true },
      stakeAmount: { type: Number, required: true },
      voteCost: { type: Number, required: true },
      createdAt: { type: Date, default: Date.now },
    });

    // Setup Development Database
    console.log('\n🔧 Setting up DEVELOPMENT database...');
    const devConnectionUri = `${mongoUri}/${devDatabase}`;
    const devConnection = await mongoose.createConnection(devConnectionUri);
    
    const DevProject = devConnection.model('Project', ProjectSchema);
    const DevPredictionMarket = devConnection.model('PredictionMarket', PredictionMarketSchema);
    const DevPredictionParticipant = devConnection.model('PredictionParticipant', PredictionParticipantSchema);
    
    await DevProject.createIndexes();
    await DevPredictionMarket.createIndexes();
    await DevPredictionParticipant.createIndexes();
    
    console.log('✅ Development database collections created');
    
    // Setup Production Database
    console.log('\n🔧 Setting up PRODUCTION database...');
    const prodConnectionUri = `${mongoUri}/${prodDatabase}`;
    const prodConnection = await mongoose.createConnection(prodConnectionUri);
    
    const ProdProject = prodConnection.model('Project', ProjectSchema);
    const ProdPredictionMarket = prodConnection.model('PredictionMarket', PredictionMarketSchema);
    const ProdPredictionParticipant = prodConnection.model('PredictionParticipant', PredictionParticipantSchema);
    
    await ProdProject.createIndexes();
    await ProdPredictionMarket.createIndexes();
    await ProdPredictionParticipant.createIndexes();
    
    console.log('✅ Production database collections created');
    
    // Test both databases
    console.log('\n🧪 Testing both databases...');
    
    // Test dev database
    const devProjectCount = await DevProject.countDocuments();
    console.log(`📊 Development database: ${devProjectCount} projects`);
    
    // Test prod database
    const prodProjectCount = await ProdProject.countDocuments();
    console.log(`📊 Production database: ${prodProjectCount} projects`);
    
    // Close connections
    await devConnection.close();
    await prodConnection.close();
    
    console.log('\n🎉 Environment-specific databases setup complete!');
    console.log('📋 Databases created:');
    console.log(`   - ${devDatabase} (Development)`);
    console.log(`   - ${prodDatabase} (Production)`);
    console.log('📊 Collections in each database:');
    console.log('   - projects');
    console.log('   - predictionmarkets');
    console.log('   - predictionparticipants');
    console.log('\n🚀 Ready for environment-specific development!');
    
  } catch (error) {
    console.error('❌ Failed to setup environment databases:', error);
    process.exit(1);
  }
}

setupEnvironmentDatabases().catch(console.error);
