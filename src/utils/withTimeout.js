/**
 * @file withTimeout.js
 * @description Generic promise timeout wrapper using Promise.race.
 *
 * Framework-agnostic — wraps any promise-returning operation with a deadline.
 *
 * Usage:
 *   const result = await withTimeout(
 *     someAsyncCall(),
 *     30000,
 *     () => new TimeoutError('Gemini request timed out after 30000ms')
 *   )
 */

/**
 * @param {Promise}  promise          - The promise to race against the timeout
 * @param {number}   timeoutMs        - Timeout duration in milliseconds
 * @param {Function} [onTimeoutError] - Factory function returning the error to throw on timeout
 * @returns {Promise<*>}
 */
const withTimeout = (promise, timeoutMs, onTimeoutError) => {
  let timeoutHandle

  const timeoutPromise = new Promise((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      const error = onTimeoutError
        ? onTimeoutError()
        : new Error(`Operation timed out after ${timeoutMs}ms`)
      reject(error)
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle)
  })
}

export default withTimeout