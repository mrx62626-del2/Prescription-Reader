/**
 * @file AIServiceError.js
 * @description Domain-specific error types for AI/Gemini failures.
 *
 * All subclasses extend ApiError, so the existing global errorHandler.js
 * (from Sprint 1) handles them automatically with zero modification —
 * it already treats any `instanceof ApiError` as a normalized, operational error.
 */

import ApiError from '../utils/ApiError.js'

/**
 * Thrown when the Gemini API call exceeds the configured timeout.
 */
class AITimeoutError extends ApiError {
  constructor(message = 'AI analysis timed out. Please try again.') {
    super(504, message)
    this.name = 'AITimeoutError'
  }
}

/**
 * Thrown when Gemini returns a rate-limit (429) response.
 */
class AIRateLimitError extends ApiError {
  constructor(message = 'AI service is currently rate-limited. Please try again shortly.') {
    super(429, message)
    this.name = 'AIRateLimitError'
  }
}

/**
 * Thrown when all retry attempts against Gemini have been exhausted.
 */
class AIRetryExhaustedError extends ApiError {
  constructor(message = 'AI analysis failed after multiple attempts. Please try again later.') {
    super(503, message)
    this.name = 'AIRetryExhaustedError'
  }
}

/**
 * Thrown when Gemini returns an empty, malformed, or unusable response.
 */
class AIInvalidResponseError extends ApiError {
  constructor(message = 'AI service returned an invalid response.') {
    super(502, message)
    this.name = 'AIInvalidResponseError'
  }
}

/**
 * Thrown for generic network-level failures while contacting Gemini
 * (DNS failure, connection reset, etc.)
 */
class AINetworkError extends ApiError {
  constructor(message = 'Unable to reach AI service. Please check your connection and try again.') {
    super(502, message)
    this.name = 'AINetworkError'
  }
}

export {
  AITimeoutError,
  AIRateLimitError,
  AIRetryExhaustedError,
  AIInvalidResponseError,
  AINetworkError,
}