/**
 * @file asyncHandler.js
 * @description Wraps async Express route handlers to eliminate
 *              try/catch boilerplate and forward errors to the
 *              global error handler automatically.
 *
 * Usage:
 *   router.get('/health', asyncHandler(async (req, res) => {
 *     const data = await someAsyncCall()
 *     res.json(data)
 *   }))
 */

/**
 * @param {Function} fn - Async Express handler (req, res, next)
 * @returns {Function}  - Express middleware that catches rejections
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default asyncHandler