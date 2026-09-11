/**
 * errorHandler.js — Centralized Express error middleware
 *
 * Catches all errors thrown inside route handlers and formats
 * them into a consistent JSON response matching the API spec.
 */

const errorHandler = (err, req, res, next) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`❌ [${req.method}] ${req.url} —`, err.message);
    if (err.stack) console.error(err.stack);
  }

  // PostgreSQL specific errors
  if (err.code) {
    // Foreign key violation
    if (err.code === '23503') {
      return res.status(400).json({
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Referenced record does not exist',
          details: err.detail || null,
        },
      });
    }
    // Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          details: err.detail || null,
        },
      });
    }
    // Not null violation
    if (err.code === '23502') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Field "${err.column}" is required`,
          details: err.detail || null,
        },
      });
    }
    // Check constraint violation
    if (err.code === '23514') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Value violates a database constraint (invalid enum or check)',
          details: err.detail || null,
        },
      });
    }
  }

  // Custom application errors (thrown with .statusCode)
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'APPLICATION_ERROR',
        message: err.message,
        details: err.details || null,
      },
    });
  }

  // Default 500
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? err.message : null,
    },
  });
};

/**
 * createError — Helper to throw structured app errors from routes
 * Usage: throw createError(404, 'NOT_FOUND', 'Scenario not found')
 */
const createError = (statusCode, code, message, details = null) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
};

export { errorHandler, createError };
export default { errorHandler, createError };
