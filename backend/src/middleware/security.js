import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

// Apply common security and performance middlewares
export function applySecurity(app) {
  // Trust proxy for rate limiting / Render / proxies
  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));

  // Skip compression for Server-Sent Events so event frames are not buffered
  const shouldCompress = (req, res) => {
    const accept = req.headers?.accept || '';
    if (typeof accept === 'string' && accept.includes('text/event-stream')) {
      return false;
    }
    return compression.filter(req, res);
  };

  app.use(compression({ filter: shouldCompress }));

  // Basic rate limiter for all API routes
  const configuredMax = Number(process.env.API_RATE_LIMIT_MAX);
  const maxRequests = Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 500;
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS',
    message: {
      message: 'Too many API requests. Please retry shortly.',
    },
  });
  app.use('/api', limiter);

  // Sanitize query/body against NoSQL injection
  app.use(mongoSanitize());

  // Basic XSS protection for string inputs
  app.use(xss());
}

export default applySecurity;
