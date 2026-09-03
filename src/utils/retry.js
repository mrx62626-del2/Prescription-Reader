/**
 * @file retry.js
 * @description Generic exponential-backoff retry wrapper.
 *
 * Framework-agnostic — can wrap any async function, not just Gemini calls.
 *
 * Usage:
 *   const result = await retry(
 *     () => callSomeFlakyApi(),
 *     {
 *       maxRetries: 3,
 *       baseDelayMs: 500,
 *       isRetryable: (err) => err.statusCode >= 500,
 *       onRetry: (attempt, err) => logger.warn('Retrying...', { attempt, error: err.message }),
 *     }
 *   )
 */

import logger from './logger.js'

/**
 * @param {Function} fn                     - Async function to execute
 * @param {object}   options
 * @param {number}   options.maxRetries     - Maximum retry attempts (not counting the first try)
 * @param {number}   options.baseDelayMs    - Base delay for exponential backoff
 * @param {Function} options.isRetryable    - Predicate (err) => boolean — decides if a retry should happen
 * @param {Function} [options.onRetry]      - Optional callback (attempt, err, delayMs) for custom logging
 * @returns {Promise<*>}                    - Resolves with the function's result
 * @throws  {Error}                         - The last error if all retries are exhausted
 */
const retry = async (fn, options) => {
  const {
    maxRetries  = 3,
    baseDelayMs = 500,
    isRetryable = () => true,
    onRetry     = null,
  } = options || {}

  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt === maxRetries
      const canRetry = !isLastAttempt && isRetryable(error)

      if (!canRetry) {
        if (isLastAttempt && attempt > 0) {
          logger.warn('Retry attempts exhausted', {
            totalAttempts: attempt + 1,
            error: error.message,
          })
        }
        throw error
      }

      // Exponential backoff: baseDelay * 2^attempt, e.g. 500ms, 1000ms, 2000ms…
      const delayMs = baseDelayMs * 2 ** attempt

      if (onRetry) {
        onRetry(attempt + 1, error, delayMs)
      } else {
        logger.warn('Retrying operation after failure', {
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: error.message,
        })
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  // Unreachable, but keeps linters happy
  throw lastError
}

export default retry