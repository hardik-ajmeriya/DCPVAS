import app from './app.js';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { initJenkinsPolling, setSocketIO as setJenkinsIO } from './services/jenkinsService.js';
import { setSocketIO as setLogStreamIO, watchBuildLogs, isWatching } from './services/logStreamingService.js';
import { backfillPipelineRunsFromRawLogs } from './services/pipelineRunService.js';
import { connectMongo } from './config/mongo.js';
import config from './config/env.js';

async function startServer() {
  try {
    await connectMongo();

    try {
      const backfillResult = await backfillPipelineRunsFromRawLogs();
      if (backfillResult?.created) {
        console.log(`Backfilled ${backfillResult.created} pipeline runs from raw logs`);
      }
    } catch (err) {
      console.error('Pipeline run backfill failed:', err?.message || err);
    }

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

    server.listen(config.port, () => {
      console.log(`DCPVAS backend listening on port ${config.port}`);
      console.log('Jenkins env status:', {
        hasUrl: !!config.jenkins.url,
        hasJob: !!config.jenkins.job,
        hasUser: !!config.jenkins.user,
        hasToken: !!config.jenkins.token,
      });
      // Start Live Jenkins polling / background watcher (~2.5s interval)
      initJenkinsPolling(2500);
    });
  } catch (err) {
    console.error('Fatal startup error', err?.message || err);
    process.exit(1);
  }
}

startServer();
