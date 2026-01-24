import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import { initJenkinsPolling, setSocketIO as setJenkinsIO } from './services/jenkinsService.js';
import { setSocketIO as setLogStreamIO, watchBuildLogs, isWatching } from './services/logStreamingService.js';

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

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Expose io to the rest of the app (controllers/services)
app.set('io', io);
setJenkinsIO(io);
setLogStreamIO(io);

io.on('connection', (socket) => {
  // Minimal connection log; namespaces/rooms can be added later
  console.log('Socket connected:', socket.id);
  // Allow clients to request log streaming for a specific build
  socket.on('logs:watch', async (payload) => {
    try {
      const n = Number(payload?.buildNumber);
      if (!Number.isFinite(n) || n <= 0) return;
      if (!isWatching(n)) {
        await watchBuildLogs(n);
      }
    } catch (e) {
      // Ignore; client can retry
    }
  });
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`DCPVAS backend listening on port ${port}`);
  console.log('Jenkins env status:', {
    hasUrl: !!process.env.JENKINS_URL,
    hasJob: !!process.env.JENKINS_JOB,
    hasUser: !!process.env.JENKINS_USER,
    hasToken: !!process.env.JENKINS_TOKEN,
  });
  // Start Live Jenkins polling / background watcher (~2.5s interval)
  initJenkinsPolling(2500);
  // Attempt initial DB connection
  connectWithRetry();
});
