/**
 * @file token.service.js
 * @description Pure JWT operations — no database access, no Express references.
 *
 * Responsibilities:
 *   - Sign access tokens (short-lived, used on every protected request)
 *   - Sign refresh tokens (long-lived, used only to obtain new access tokens)
 *   - Verify and decode both token types
 *   - Normalize jsonwebtoken errors into ApiError instances
 *
 * Access and refresh tokens use SEPARATE secrets, so a leaked access
 * token secret cannot be used to forge refresh tokens, and vice versa.
 */

import jwt from 'jsonwebtoken'
import config from '../config/app.config.js'
import ApiError from '../utils/ApiError.js'
import logger from '../utils/logger.js'

/**
 * Builds the JWT payload for a given user. Kept minimal —
 * only the user ID is embedded; everything else is fetched
 * fresh from the DB when needed (e.g. in auth middleware).
 *
 * @param {object} user - Mongoose User document or plain object with `_id`
 * @returns {object}
 */
const buildPayload = (user) => ({
  sub: user._id.toString(),
})

/**
 * Signs a new access token for the given user.
 * @param   {object} user
 * @returns {string}
 */
const generateAccessToken = (user) => {
  return jwt.sign(buildPayload(user), config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  })
}

/**
 * Signs a new refresh token for the given user.
 * @param   {object} user
 * @returns {string}
 */
const generateRefreshToken = (user) => {
  return jwt.sign(buildPayload(user), config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  })
}

/**
 * Converts a JWT expiresIn string/duration into an absolute Date,
 * used when persisting RefreshToken documents with an `expiresAt` field.
 *
 * Supports the same units jsonwebtoken accepts: s, m, h, d.
 *
 * @param   {string} expiresIn - e.g. "7d", "15m"
 * @returns {Date}
 */
const calculateExpiryDate = (expiresIn) => {
  const match = /^(\d+)([smhd])$/.exec(expiresIn)

  if (!match) {
    // Fallback: treat as seconds if it's a plain number, else default to 7 days
    const seconds = parseInt(expiresIn, 10)
    const fallbackMs = !isNaN(seconds) ? seconds * 1000 : 7 * 24 * 60 * 60 * 1000
    return new Date(Date.now() + fallbackMs)
  }

  const [, amountStr, unit] = match
  const amount = parseInt(amountStr, 10)

  const unitToMs = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return new Date(Date.now() + amount * unitToMs[unit])
}

/**
 * Verifies an access token and returns its decoded payload.
 *
 * @param   {string} token
 * @returns {{sub: string}}
 * @throws  {ApiError} 401 — invalid signature, malformed token, or expired
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.accessSecret)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.info('Access token expired')
      throw ApiError.unauthorized('Token has expired')
    }
    logger.warn('Access token verification failed', { reason: error.message })
    throw ApiError.unauthorized('Invalid access token')
  }
}

/**
 * Verifies a refresh token signature/expiry and returns its decoded payload.
 * Does NOT check the database — that is the caller's responsibility
 * (token.service.js stays framework/DB-independent by design).
 *
 * @param   {string} token
 * @returns {{sub: string}}
 * @throws  {ApiError} 401 — invalid signature, malformed token, or expired
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      logger.info('Refresh token expired')
      throw ApiError.unauthorized('Refresh token has expired')
    }
    logger.warn('Refresh token verification failed', { reason: error.message })
    throw ApiError.badRequest('Invalid refresh token')
  }
}

export {
  generateAccessToken,
  generateRefreshToken,
  calculateExpiryDate,
  verifyAccessToken,
  verifyRefreshToken,
}