/**
 * MongoDB Database Setup Script
 * Creates collections and indexes for PLP Platform
 */

// Load environment variables first
require('dotenv').config();

// Import after dotenv config
import mongoose from 'mongoose';
import { createClientLogger } from '../src/lib/logger';

const logger = createClientLogger();

async function setupMongoDB() {
  try {
    console.log('🚀 Setting up MongoDB for PLP Platform...');
    console.log('📡 MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    // Connect to database directly with environment-specific database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    // Determine database name based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const dbName = isProduction 
      ? (process.env.MONGODB_PROD_DATABASE || 'plp_platform_prod')
      : (process.env.MONGODB_DEV_DATABASE || 'plp_platform_dev');
    
    const connectionUri = `${mongoUri}/${dbName}`;
    await mongoose.connect(connectionUri);
    console.log('✅ Connected to MongoDB');
    console.log(`📊 Database: ${dbName} (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'})`);
    
    // Create collections with proper indexes
    console.log('📊 Creating collections and indexes...');
    
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

    // Create models
    const Project = mongoose.models.Project || mongoose.model('Project', ProjectSchema);
    const PredictionMarket = mongoose.models.PredictionMarket || mongoose.model('PredictionMarket', PredictionMarketSchema);
    const PredictionParticipant = mongoose.models.PredictionParticipant || mongoose.model('PredictionParticipant', PredictionParticipantSchema);

    // 1. Projects Collection
    console.log('📁 Setting up Projects collection...');
    try {
      await Project.createIndexes();
      console.log('✅ Projects collection ready');
    } catch (error) {
      console.log('⚠️  Projects collection already exists or error:', error.message);
    }
    
    // 2. Prediction Markets Collection
    console.log('📁 Setting up PredictionMarkets collection...');
    try {
      await PredictionMarket.createIndexes();
      console.log('✅ PredictionMarkets collection ready');
    } catch (error) {
      console.log('⚠️  PredictionMarkets collection already exists or error:', error.message);
    }
    
    // 3. Prediction Participants Collection
    console.log('📁 Setting up PredictionParticipants collection...');
    try {
      await PredictionParticipant.createIndexes();
      console.log('✅ PredictionParticipants collection ready');
    } catch (error) {
      console.log('⚠️  PredictionParticipants collection already exists or error:', error.message);
    }
    
    // Test database operations
    console.log('🧪 Testing database operations...');
    
    // Test creating a sample project
    const testProject = new Project({
      founderWallet: 'test_wallet_address',
      name: 'Test Project',
      description: 'This is a test project for PLP Platform',
      category: 'DeFi',
      projectType: 'Application',
      projectStage: 'MVP',
      teamSize: 3,
      tokenSymbol: 'TEST',
      socialLinks: new Map([
        ['website', 'https://testproject.com'],
        ['twitter', 'https://twitter.com/testproject']
      ]),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const savedProject = await testProject.save();
    console.log('✅ Test project created:', savedProject._id);
    
    // Test creating a sample prediction market
    const testMarket = new PredictionMarket({
      projectId: savedProject._id,
      marketAddress: 'test_market_address_123',
      actionsPlatformId: '68ifWrK99SKJvrsjRTp9JeTHK8T8wGuCb2yufBTDicYz', // Your custom platform ID
      marketName: 'Test Market',
      marketDescription: 'This is a test prediction market',
      metadataUri: 'ipfs://test-metadata-uri',
      expiryTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      finalizationDeadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      marketState: 0, // Active
      autoLaunch: true,
      launchWindowEnd: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    });
    
    const savedMarket = await testMarket.save();
    console.log('✅ Test prediction market created:', savedMarket._id);
    
    // Test creating a sample participant
    const testParticipant = new PredictionParticipant({
      marketId: savedMarket._id,
      participantWallet: 'test_participant_wallet',
      voteOption: true, // YES vote
      stakeAmount: 50000000, // 0.05 SOL in lamports
      voteCost: 50000000, // 0.05 SOL in lamports
      createdAt: new Date(),
    });
    
    const savedParticipant = await testParticipant.save();
    console.log('✅ Test participant created:', savedParticipant._id);
    
    // Test queries
    console.log('🔍 Testing database queries...');
    
    const projectCount = await Project.countDocuments();
    const marketCount = await PredictionMarket.countDocuments();
    const participantCount = await PredictionParticipant.countDocuments();
    
    console.log('📊 Database Statistics:');
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Prediction Markets: ${marketCount}`);
    console.log(`   Participants: ${participantCount}`);
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await Project.deleteOne({ _id: savedProject._id });
    await PredictionMarket.deleteOne({ _id: savedMarket._id });
    await PredictionParticipant.deleteOne({ _id: savedParticipant._id });
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 MongoDB setup complete!');
    console.log('📋 Collections created:');
    console.log('   - projects');
    console.log('   - predictionmarkets');
    console.log('   - predictionparticipants');
    console.log('📊 Indexes created for optimal performance');
    console.log('🚀 Ready for PLP Platform data!');
    
  } catch (error) {
    console.error('❌ Failed to setup MongoDB:', error);
    process.exit(1);
  }
}

setupMongoDB().catch(console.error);
