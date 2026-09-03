/**
 * @file errorHandler.js
 * @description Global Express error handling middleware.
 *
 * Must be registered LAST in the Express middleware chain.
 *
 * Handles:
 *   - ApiError (operational, expected errors)
 *   - Mongoose ValidationError
 *   - Mongoose CastError (invalid ObjectId etc.)
 *   - Mongoose duplicate key error (code 11000)
 *   - Multer errors
 *   - Zod validation errors
 *   - Unknown / unexpected errors
 */

import mongoose from 'mongoose'
import ApiError from '../utils/ApiError.js'
import ApiResponse from '../utils/ApiResponse.js'
import logger from '../utils/logger.js'
import config from '../config/app.config.js'

// ── Error normalizers ─────────────────────────────────────────────────────────

/**
 * Convert a Mongoose ValidationError into an ApiError.
 */
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field:   e.path,
    message: e.message,
  }))
  return ApiError.unprocessable('Validation failed', errors)
}

/**
 * Convert a Mongoose CastError (e.g. bad ObjectId) into an ApiError.
 */
const handleMongooseCastError = (err) => {
  return ApiError.badRequest(`Invalid value for field "${err.path}": ${err.value}`)
}

/**
 * Convert a MongoDB duplicate key error (code 11000) into an ApiError.
 */
const handleMongoDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue || {})[0] || 'field'
  return ApiError.badRequest(`A record with this ${field} already exists.`)
}

/**
 * Convert a Zod error into an ApiError.
 */
const handleZodError = (err) => {
  const errors = err.errors.map((e) => ({
    field:   e.path.join('.'),
    message: e.message,
  }))
  return ApiError.unprocessable('Request validation failed', errors)
}

// ── Global error handler ──────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let error = err

  // ── Normalize known error types ──────────────────────────────────────────

  if (err instanceof mongoose.Error.ValidationError) {
    error = handleMongooseValidationError(err)
  } else if (err instanceof mongoose.Error.CastError) {
    error = handleMongooseCastError(err)
  } else if (err.code === 11000) {
    error = handleMongoDuplicateKeyError(err)
  } else if (err.name === 'ZodError') {
    error = handleZodError(err)
  } else if (!(err instanceof ApiError)) {
    // Unknown error — wrap it
    error = new ApiError(
      err.statusCode || 500,
      config.app.isProd ? 'An unexpected error occurred' : err.message,
      [],
      err.stack,
    )
  }

  // ── Log ──────────────────────────────────────────────────────────────────

  const logPayload = {
    method:     req.method,
    url:        req.originalUrl,
    statusCode: error.statusCode,
    message:    error.message,
    errors:     error.errors,
  }

  if (error.statusCode >= 500) {
    logger.error('Server error', { ...logPayload, stack: error.stack })
  } else {
    logger.warn('Client error', logPayload)
  }

  // ── Respond ───────────────────────────────────────────────────────────────

  return ApiResponse.error(res, error.statusCode, error.message, error.errors)
}

export default errorHandler