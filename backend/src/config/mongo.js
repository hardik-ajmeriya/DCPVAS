import mongoose from 'mongoose';
import config from './env.js';

let isConnected = false;

export async function connectMongo({ retries = 5, delayMs = 5000 } = {}) {
  if (isConnected) return mongoose.connection;

  if (!config.mongoUri) {
    throw new Error('MONGO_URI environment variable is not defined');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.mongoUri, {
        autoIndex: config.nodeEnv !== 'production',
      });
      isConnected = true;
      console.log('MongoDB connected');
      return mongoose.connection;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err?.message || err);
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
