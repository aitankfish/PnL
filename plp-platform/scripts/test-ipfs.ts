/**
 * Test script for IPFS integration with Pinata
 * This script tests the updated IPFS functionality with groups
 */

// Load environment variables
require('dotenv').config();

import { IPFSUtils } from '../src/lib/ipfs';
import { createClientLogger } from '../src/lib/logger';

const logger = createClientLogger();

// Create a new instance after loading environment variables
const ipfsUtils = new IPFSUtils();

async function testIPFSIntegration() {
  console.log('🧪 Testing IPFS Integration with Pinata Groups...\n');

  try {
    // Test 1: Check configuration
    console.log('1️⃣ Testing IPFS Configuration...');
    console.log('Environment variables:');
    console.log(`- PINATA_JWT: ${process.env.PINATA_JWT ? '✅ Set' : '❌ Not set'}`);
    console.log(`- PINATA_API_KEY: ${process.env.PINATA_API_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`- PINATA_SECRET_KEY: ${process.env.PINATA_SECRET_KEY ? '✅ Set' : '❌ Not set'}`);
    console.log(`- PINATA_GATEWAY_URL: ${process.env.PINATA_GATEWAY_URL || 'Using default'}\n`);

    // Test 2: List existing groups
    console.log('2️⃣ Testing Group Management...');
    const groups = await ipfsUtils.getGroups();
    console.log(`Found ${groups.length} existing groups:`);
    groups.forEach(group => {
      console.log(`  - ${group.name} (ID: ${group.id})`);
    });
    console.log();

    // Test 3: Test metadata upload
    console.log('3️⃣ Testing Metadata Upload...');
    const testMetadata = {
      name: 'Test Project',
      description: 'This is a test project for IPFS integration',
      category: 'DeFi',
      projectType: 'Protocol',
      projectStage: 'MVP',
      teamSize: 5,
      tokenSymbol: 'TEST',
      marketDuration: 30,
      minimumStake: 0.1,
      socialLinks: {
        website: 'https://testproject.com',
        twitter: 'https://twitter.com/testproject'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const metadataUri = await ipfsUtils.uploadProjectMetadata(testMetadata);
    console.log(`✅ Metadata uploaded: ${metadataUri}\n`);

    // Test 4: Test image upload (mock file)
    console.log('4️⃣ Testing Image Upload...');
    const mockImageContent = 'Mock image content for testing';
    const mockImageFile = new File([mockImageContent], 'test-image.png', { type: 'image/png' });
    
    const imageUri = await ipfsUtils.uploadImage(mockImageFile);
    console.log(`✅ Image uploaded: ${imageUri}\n`);

    // Test 5: Test document upload (mock file)
    console.log('5️⃣ Testing Document Upload...');
    const mockDocContent = 'Mock document content for testing';
    const mockDocFile = new File([mockDocContent], 'test-document.pdf', { type: 'application/pdf' });
    
    const documentUri = await ipfsUtils.uploadDocument(mockDocFile);
    console.log(`✅ Document uploaded: ${documentUri}\n`);

    // Test 6: Test metadata retrieval
    console.log('6️⃣ Testing Metadata Retrieval...');
    const retrievedMetadata = await ipfsUtils.retrieveProjectMetadata(metadataUri);
    if (retrievedMetadata) {
      console.log(`✅ Metadata retrieved successfully: ${retrievedMetadata.name}`);
    } else {
      console.log('❌ Failed to retrieve metadata');
    }

    console.log('\n🎉 IPFS Integration Test Complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('IPFS test failed', error);
  }
}

// Run the test
testIPFSIntegration().catch(console.error);
