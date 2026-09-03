/**
 * @file notFound.js
 * @description Catch-all middleware for unmatched routes.
 *
 * Registered after all route definitions so it only fires
 * when no other route has matched the request.
 */

import ApiError from '../utils/ApiError.js'

const notFound = (req, _res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}

export default notFound