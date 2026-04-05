import config from './env.js';

const fallbackOrigins = ['http://localhost:5173', 'http://localhost:3000'];

const allowedOrigins = [config.frontendOrigin, ...fallbackOrigins].filter(Boolean);

export const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools (no origin) and same-origin requests
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
};

export default corsOptions;
