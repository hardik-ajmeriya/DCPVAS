import config from './env.js';

// Explicitly allow known frontends plus optional wildcard override
const fallbackOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5500',
  'https://dcpvas-3wks.vercel.app',
];

const allowedOrigins = [config.frontendOrigin, ...fallbackOrigins]
  .filter(Boolean)
  .map((o) => o.replace(/\/+$/u, ''));

const allowAll = process.env.CORS_ALLOW_ALL === 'true';

export const corsOptions = {
  origin(origin, callback) {
    if (allowAll) {
      return callback(null, true);
    }

    // Allow non-browser tools (no origin) and same-origin requests
    if (!origin) {
      return callback(null, true);
    }

    const normalized = origin.replace(/\/+$/u, '');
    if (allowedOrigins.includes(normalized)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`), false);
  },
  credentials: true,
};

export default corsOptions;
