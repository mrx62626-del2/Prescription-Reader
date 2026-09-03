/**
 * @file auth.service.js
 * @description Orchestrates registration, login, token refresh, and logout.
 *
 * Composes userService (DB) and tokenService (JWT) — contains the
 * actual business rules for what happens during each auth flow step.
 * Framework-independent: no req/res, accepts/returns plain objects.
 */

import RefreshToken from '../models/refreshToken.model.js'
import {
  createUser,
  findUserByEmailWithPassword,
  findUserById,
  verifyPassword,
  updateLastLogin,
} from './user.service.js'
import {
  generateAccessToken,
  generateRefreshToken,
  calculateExpiryDate,
  verifyRefreshToken,
} from './token.service.js'
import config from '../config/app.config.js'
import ApiError from '../utils/ApiError.js'
import logger from '../utils/logger.js'

/**
 * Shapes a Mongoose User document into the safe public response shape.
 * @param   {object} user
 * @returns {{id: string, fullName: string, email: string, preferredLanguage: string}}
 */
const toUserResponse = (user) => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  preferredLanguage: user.preferredLanguage,
})

/**
 * Persists a freshly generated refresh token to the database.
 * @param   {string} userId
 * @param   {string} token
 * @returns {Promise<void>}
 */
const persistRefreshToken = async (userId, token) => {
  const expiresAt = calculateExpiryDate(config.jwt.refreshExpiresIn)
  await RefreshToken.create({ userId, token, expiresAt })
}

/**
 * Registers a new user.
 *
 * @param   {object} input - { fullName, email, password, preferredLanguage }
 * @returns {Promise<{user: object}>}
 */
const register = async (input) => {
  logger.info('Registration attempt', { email: input.email })

  const user = await createUser(input)

  logger.info('Registration successful', { userId: user._id.toString() })

  return { user: toUserResponse(user) }
}

/**
 * Authenticates a user and issues a new token pair.
 *
 * @param   {object} input - { email, password }
 * @returns {Promise<{accessToken: string, refreshToken: string, user: object}>}
 * @throws  {ApiError} 401 — invalid credentials
 */
const login = async (input) => {
  const { email, password } = input

  logger.info('Login attempt', { email })

  const user = await findUserByEmailWithPassword(email)

  if (!user) {
    logger.warn('Login failed — user not found', { email })
    throw ApiError.unauthorized('Invalid email or password')
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash)

  if (!isPasswordValid) {
    logger.warn('Login failed — incorrect password', { userId: user._id.toString() })
    throw ApiError.unauthorized('Invalid email or password')
  }

  const accessToken = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user)

  await persistRefreshToken(user._id, refreshToken)
  await updateLastLogin(user._id)

  logger.info('Login successful', { userId: user._id.toString() })

  return {
    accessToken,
    refreshToken,
    user: toUserResponse(user),
  }
}

/**
 * Rotates a refresh token: validates the old one, deletes it,
 * issues a brand new access + refresh token pair.
 *
 * @param   {string} oldRefreshToken
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 * @throws  {ApiError} 401/400 — invalid, expired, or revoked refresh token
 */
const refresh = async (oldRefreshToken) => {
  // 1. Verify JWT signature/expiry (no DB hit yet)
  const decoded = verifyRefreshToken(oldRefreshToken)

  // 2. Confirm the token still exists in the DB (not logged out / already rotated)
  const storedToken = await RefreshToken.findOne({ token: oldRefreshToken })

  if (!storedToken) {
    logger.warn('Refresh attempt with unknown/revoked token', { userId: decoded.sub })
    throw ApiError.badRequest('Invalid refresh token')
  }

  // 3. Load the user the token belongs to
  const user = await findUserById(decoded.sub)

  if (!user) {
    logger.warn('Refresh attempt for non-existent user', { userId: decoded.sub })
    // Clean up the orphaned token
    await RefreshToken.deleteOne({ _id: storedToken._id })
    throw ApiError.unauthorized('Unauthorized')
  }

  // 4. Rotate: delete old token, issue new pair
  await RefreshToken.deleteOne({ _id: storedToken._id })

  const newAccessToken = generateAccessToken(user)
  const newRefreshToken = generateRefreshToken(user)

  await persistRefreshToken(user._id, newRefreshToken)

  logger.info('Refresh token rotated successfully', { userId: user._id.toString() })

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  }
}

/**
 * Logs out a user by deleting their refresh token from the database,
 * immediately invalidating it regardless of its remaining JWT expiry.
 *
 * @param   {string} refreshTokenValue
 * @returns {Promise<void>}
 */
const logout = async (refreshTokenValue) => {
  const result = await RefreshToken.deleteOne({ token: refreshTokenValue })

  if (result.deletedCount === 0) {
    logger.warn('Logout attempted with refresh token that was not found')
    throw ApiError.badRequest('Invalid refresh token')
  }

  logger.info('Logout successful — refresh token revoked')
}

/**
 * Retrieves the current authenticated user's public profile.
 *
 * @param   {string} userId
 * @returns {Promise<object>}
 * @throws  {ApiError} 404 — user no longer exists
 */
const getCurrentUser = async (userId) => {
  const user = await findUserById(userId)

  if (!user) {
    throw ApiError.notFound('User not found')
  }

  return toUserResponse(user)
}

export { register, login, refresh, logout, getCurrentUser, toUserResponse }