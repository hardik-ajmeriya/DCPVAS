import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { setSocketIO as setJenkinsIO } from './services/jenkinsService.js';
import { setSocketIO as setLogStreamIO, watchBuildLogs, isWatching } from './services/logStreamingService.js';
import { allowedOrigins } from './config/cors.js';
import { connectMongo } from './config/mongo.js';
import config from './config/env.js';

async function listenWithFallback(server, preferredPort) {
  const basePort = Number(preferredPort) || 4000;
  const allowFallback = process.env.NODE_ENV !== 'production';
  const maxAttempts = allowFallback ? 10 : 1;

  let attempt = 0;
  while (attempt < maxAttempts) {
    const candidatePort = basePort + attempt;

    try {
      await new Promise((resolve, reject) => {
        const onError = (err) => {
          server.off('listening', onListening);
          reject(err);
        };
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };

        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(candidatePort);
      });

      return candidatePort;
    } catch (err) {
      const isAddressInUse = err?.code === 'EADDRINUSE';
      const hasMoreAttempts = attempt + 1 < maxAttempts;

      if (!isAddressInUse || !hasMoreAttempts) {
        throw err;
      }

      console.warn(`[startup] Port ${candidatePort} is already in use; trying ${candidatePort + 1}.`);
      attempt += 1;
    }
  }

  throw new Error('Unable to bind backend server to an available port');
}

async function startServer() {
  try {
    await connectMongo();

    const socketAllowedOrigins = Array.from(new Set(allowedOrigins));

    const server = http.createServer(app);
    const io = new SocketIOServer(server, {
      cors: {
        origin: socketAllowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Expose io to the rest of the app (controllers/services)
    app.set('io', io);
    setJenkinsIO(io);
    setLogStreamIO(io);

    io.on('connection', (socket) => {
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

    const activePort = await listenWithFallback(server, config.port);
    console.log(`DCPVAS backend listening on port ${activePort}`);
    console.log('Jenkins env status:', {
      hasUrl: !!config.jenkins.url,
      hasJob: !!config.jenkins.job,
      hasUser: !!config.jenkins.user,
      hasToken: !!config.jenkins.token,
    });
  } catch (err) {
    console.error('Fatal startup error', err?.message || err);
    process.exit(1);
  }
}

startServer();
