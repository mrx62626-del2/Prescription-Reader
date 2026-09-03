/**
 * @file auth.middleware.js
 * @description Express middleware for JWT-based route protection.
 *
 * Exports two middlewares:
 *   - requireAuth   — blocks the request with 401 if no valid token is present
 *   - optionalAuth  — attaches req.user if a valid token is present, but
 *                      never blocks the request (reserved for future routes
 *                      that behave differently for logged-in vs anonymous users)
 *
 * Both extract the Bearer token from the Authorization header, verify it
 * via tokenService, load the corresponding user, and attach it as req.user.
 */

import { verifyAccessToken } from '../services/token.service.js'
import { findUserById } from '../services/user.service.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import logger from '../utils/logger.js'

/**
 * Extracts the raw token string from an "Authorization: Bearer <token>" header.
 * @param   {import('express').Request} req
 * @returns {string|null}
 */
const extractBearerToken = (req) => {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return null
  }

  return header.slice('Bearer '.length).trim()
}

/**
 * Hard-enforces authentication. Attaches req.user on success.
 * Responds 401 if the token is missing, invalid, expired, or the user no longer exists.
 */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req)

  if (!token) {
    throw ApiError.unauthorized('Unauthorized')
  }

  const decoded = verifyAccessToken(token)
  const user = await findUserById(decoded.sub)

  if (!user) {
    logger.warn('Access token valid but user no longer exists', { userId: decoded.sub })
    throw ApiError.unauthorized('Unauthorized')
  }

  req.user = user
  next()
})

/**
 * Soft authentication. Attaches req.user if a valid token is present,
 * otherwise leaves req.user undefined and continues without error.
 * Reserved for future routes (Sprint 5+) that personalize for logged-in
 * users but still function for anonymous ones.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearerToken(req)

  if (!token) {
    return next()
  }

  try {
    const decoded = verifyAccessToken(token)
    const user = await findUserById(decoded.sub)
    if (user) req.user = user
  } catch (error) {
    // Invalid/expired token on an optional route — log and continue anonymously
    logger.info('Optional auth: ignoring invalid token', { reason: error.message })
  }

  next()
})

export { requireAuth, optionalAuth }