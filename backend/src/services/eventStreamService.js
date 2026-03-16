// Lightweight Server-Sent Events broadcaster for pipeline and analysis updates
// Keeps an in-memory list of subscribers per process

const clients = new Set();
const HEARTBEAT_MS = 25000;

export function registerClient(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

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

  res.on('close', () => {
    clearInterval(interval);
    clients.delete(client);
  });
}

export function broadcastEvent(event) {
  if (!event) return;
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of Array.from(clients)) {
    try {
      client.res.write(payload);
    } catch (err) {
      clients.delete(client);
    }
  }
}

export default { registerClient, broadcastEvent };
