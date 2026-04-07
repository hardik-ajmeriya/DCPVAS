// Lightweight Server-Sent Events broadcaster for unified dashboard state
// Keeps an in-memory list of subscribers per process and pushes a full
// dashboard snapshot on each relevant backend event.

import { buildDashboardState } from './dashboardStateService.js';

const clients = new Set();
const HEARTBEAT_MS = 25000;

<<<<<<< HEAD
export function registerClient(req, res) {
=======
async function pushStateToClient(client, eventMeta) {
  try {
    const state = await buildDashboardState(eventMeta);
    const payload = `data: ${JSON.stringify(state)}\n\n`;
    client.res.write(payload);
  } catch (err) {
    console.error('[SSE] Failed to push dashboard state:', err?.message || err);
  }
}

export function registerClient(res) {
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial heartbeat so proxies keep the connection alive
  res.write(`event: ping\n` + `data: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  const client = { res };
  clients.add(client);

  const interval = setInterval(() => {
    try {
      res.write(`event: ping\n` + `data: ${JSON.stringify({ ts: Date.now() })}\n\n`);
    } catch (err) {
      clients.delete(client);
      clearInterval(interval);
    }
  }, HEARTBEAT_MS);

<<<<<<< HEAD
  const cleanup = () => {
=======
  // Push an initial full dashboard snapshot as soon as the client connects
  void pushStateToClient(client, { type: 'initial_connect' });

  res.on('close', () => {
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
    clearInterval(interval);
    clients.delete(client);
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
}

export function broadcastEvent(event) {
  if (!event) return;
<<<<<<< HEAD

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of Array.from(clients)) {
=======
  // Compute unified dashboard state and broadcast it to all clients.
  // Errors are logged but do not crash the process.
  void (async () => {
>>>>>>> 526fa79 (fix: scalaton loading & jenkins config)
    try {
      const state = await buildDashboardState(event);
      const payload = `data: ${JSON.stringify(state)}\n\n`;
      for (const client of Array.from(clients)) {
        try {
          client.res.write(payload);
        } catch (err) {
          clients.delete(client);
        }
      }
    } catch (err) {
      console.error('[SSE] Failed to broadcast dashboard state:', err?.message || err);
    }
  })();
}

export default { registerClient, broadcastEvent };
