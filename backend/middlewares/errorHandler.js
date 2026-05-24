// middlewares/errorHandler.js

/**
 * Central error handler.
 * Catches anything passed via next(err).
 */
function errorHandler(err, req, res, next) {          // eslint-disable-line no-unused-vars
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  }

  res.status(status).json({
    success: false,
    error:   message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}

/**
 * 404 handler – must be registered AFTER all routes.
 */
function notFound(req, res, next) {
  const err    = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.status   = 404;
  next(err);
}

module.exports = { errorHandler, notFound };
