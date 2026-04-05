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

  app.use(compression());

  // Basic rate limiter for all API routes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', limiter);

  // Sanitize query/body against NoSQL injection
  app.use(mongoSanitize());

  // Basic XSS protection for string inputs
  app.use(xss());
}

export default applySecurity;
