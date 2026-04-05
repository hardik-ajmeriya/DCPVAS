// 404 handler
export function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

// Global error handler
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    // Log server errors with stack in development
    console.error('[ERROR]', message, err.stack || '');
  }

  res.status(statusCode).json({
    message,
  });
}

export default { notFound, errorHandler };
