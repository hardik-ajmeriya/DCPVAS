import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from './app.js';
import mongoose from 'mongoose';
import { initJenkinsPolling } from './services/jenkinsService.js';

// Default to IPv4 loopback to avoid ::1 issues on Windows
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dcpvas';
let mongoConnected = false;

async function connectWithRetry() {
  try {
    await mongoose.connect(mongoUri, { autoIndex: true });
    mongoConnected = true;
    console.log('Connected to MongoDB');
  } catch (e) {
    mongoConnected = false;
    console.error('MongoDB connection failed:', e?.message || e);
    console.log('Retrying MongoDB connection in 5s...');
    setTimeout(connectWithRetry, 5000);
  }
}

// Start server regardless; DB connection will retry in background
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`DCPVAS backend listening on port ${port}`);
  console.log('Jenkins env status:', {
    hasUrl: !!process.env.JENKINS_URL,
    hasJob: !!process.env.JENKINS_JOB,
    hasUser: !!process.env.JENKINS_USER,
    hasToken: !!process.env.JENKINS_TOKEN,
  });
  // Start Live Jenkins polling (near real-time monitoring)
  initJenkinsPolling();
  // Attempt initial DB connection
  connectWithRetry();
});
