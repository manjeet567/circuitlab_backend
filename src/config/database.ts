import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  if (process.env.NODE_ENV === 'test') {
    // Tests can use in-memory store or mocked DB
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000, // Quick fallback if local MongoDB is not running
    });
    isConnected = true;
    logger.info(`✅ Connected to MongoDB at ${env.MONGODB_URI}`);
    return true;
  } catch (error: any) {
    logger.warn(
      `⚠️ Could not connect to MongoDB (${error.message}). Falling back to embedded local storage. Project data will be persisted in memory.`
    );
    isConnected = false;
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    try {
      await mongoose.disconnect();
      isConnected = false;
      logger.info('Closed MongoDB connection.');
    } catch (err: any) {
      logger.error('Error closing MongoDB connection:', err);
    }
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
