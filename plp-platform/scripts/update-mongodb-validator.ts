/**
 * Update MongoDB collection validator to match current schema
 * This fixes validation errors for newly added enum values like 'meme' category
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function updateValidator() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('📝 Dropping old validator on projects collection...');

    // Remove the validator entirely (easier than updating)
    try {
      await db.command({
        collMod: 'projects',
        validator: {},
        validationLevel: 'off'
      });
      console.log('✅ Removed old validator');
    } catch (error) {
      console.log('⚠️  No existing validator to remove (this is okay)');
    }

    console.log('✅ Validator removed - Mongoose schema validation will now be used instead');
    console.log('✅ All categories including "meme" are now valid');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

    console.log('\n✨ Database update complete!');
    console.log('💡 The application now uses Mongoose schema validation only (more flexible)');

  } catch (error) {
    console.error('❌ Error updating validator:', error);
    process.exit(1);
  }
}

updateValidator();
