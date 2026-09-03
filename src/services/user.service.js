/**
 * @file user.service.js
 * @description Database operations for the User collection.
 *
 * Responsibilities:
 *   - Create users with hashed passwords
 *   - Look up users by email or ID
 *   - Detect duplicate emails before insertion
 *   - Verify plaintext passwords against stored hashes
 *
 * Framework-independent: accepts/returns plain data, no req/res.
 */

import bcrypt from 'bcrypt'
import User from '../models/user.model.js'
import ApiError from '../utils/ApiError.js'
import config from '../config/app.config.js'
import logger from '../utils/logger.js'

/**
 * Hashes a plaintext password using bcrypt with the configured salt rounds.
 * @param   {string} plainPassword
 * @returns {Promise<string>}
 */
const hashPassword = async (plainPassword) => {
  return bcrypt.hash(plainPassword, config.bcrypt.saltRounds)
}

/**
 * Compares a plaintext password against a stored bcrypt hash.
 * @param   {string} plainPassword
 * @param   {string} passwordHash
 * @returns {Promise<boolean>}
 */
const verifyPassword = async (plainPassword, passwordHash) => {
  return bcrypt.compare(plainPassword, passwordHash)
}

/**
 * Creates a new user. Throws if the email is already registered.
 *
 * @param   {object} params
 * @param   {string} params.fullName
 * @param   {string} params.email
 * @param   {string} params.password          - Plaintext, will be hashed here
 * @param   {string} params.preferredLanguage
 * @returns {Promise<object>}                  - Mongoose User document
 * @throws  {ApiError} 400 — email already exists
 */
const createUser = async ({ fullName, email, password, preferredLanguage }) => {
  const existing = await User.findOne({ email }).lean()

  if (existing) {
    logger.warn('Registration attempt with already-registered email')
    throw ApiError.badRequest('Email already exists')
  }

  const passwordHash = await hashPassword(password)

  const user = await User.create({
    fullName,
    email,
    passwordHash,
    preferredLanguage,
  })

  logger.info('New user created', { userId: user._id.toString() })

  return user
}

/**
 * Finds a user by email, INCLUDING the passwordHash field
 * (which is excluded by default via `select: false` on the schema).
 * Used only during login, where the hash is needed for comparison.
 *
 * @param   {string} email
 * @returns {Promise<object|null>}
 */
const findUserByEmailWithPassword = async (email) => {
  return User.findOne({ email }).select('+passwordHash')
}

/**
 * Finds a user by ID. Does NOT include passwordHash (default exclusion applies).
 * Used by auth middleware to attach req.user, and by the "current user" endpoint.
 *
 * @param   {string} userId
 * @returns {Promise<object|null>}
 */
const findUserById = async (userId) => {
  return User.findById(userId)
}

/**
 * Updates a user's lastLogin timestamp to now.
 * @param   {string} userId
 * @returns {Promise<void>}
 */
const updateLastLogin = async (userId) => {
  await User.findByIdAndUpdate(userId, { lastLogin: new Date() })
}

export {
  hashPassword,
  verifyPassword,
  createUser,
  findUserByEmailWithPassword,
  findUserById,
  updateLastLogin,
}