/**
 * @file ApiError.js
 * @description Custom application error class.
 *
 * Extends the native Error so it carries:
 *   - HTTP status code
 *   - Structured errors array (useful for validation failures)
 *   - Operational flag (distinguishes expected vs unexpected errors)
 *
 * Usage:
 *   throw new ApiError(404, 'Prescription not found')
 *   throw new ApiError(422, 'Validation failed', validationErrors)
 */

class ApiError extends Error {
  /**
   * @param {number} statusCode    - HTTP status code (400, 404, 422, 500…)
   * @param {string} message       - Human-readable error message
   * @param {Array}  errors        - Structured validation/field errors
   * @param {string} stack         - Optional stack trace override
   */
  constructor(
    statusCode = 500,
    message = 'An unexpected error occurred',
    errors = [],
    stack = '',
  ) {
    super(message)

    this.name       = 'ApiError'
    this.statusCode = statusCode
    this.success    = false
    this.errors     = errors
    // Operational = true means this is a known, expected error
    // Operational = false means this is a programmer/infrastructure bug
    this.isOperational = true

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  // ── Static factory helpers ─────────────────────────────────────────────────

  static badRequest(message = 'Bad request', errors = []) {
    return new ApiError(400, message, errors)
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message)
  }

  static unprocessable(message = 'Validation failed', errors = []) {
    return new ApiError(422, message, errors)
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message)
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message)
  }
}

export default ApiError