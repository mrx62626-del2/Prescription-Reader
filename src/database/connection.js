/**
 * @file connection.js
 * @description Manages the Mongoose connection lifecycle.
 *
 * Responsibilities:
 *   - Connect to MongoDB
 *   - Emit structured logs on connection events
 *   - Expose a graceful disconnect helper for shutdown
 */

import mongoose from 'mongoose'
import config from '../config/app.config.js'
import mongooseOptions from '../config/database.config.js'
import logger from '../utils/logger.js'

// ── Connection event listeners ─────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected', {
    host:   mongoose.connection.host,
    dbName: mongoose.connection.name,
  })
})

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message })
})

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected')
})

// ── Connect ────────────────────────────────────────────────────────────────

/**
 * Establish a Mongoose connection.
 * Throws on failure so the calling code (server.js) can decide
 * whether to abort startup.
 */
const connectDB = async () => {
  try {
    logger.info('Connecting to MongoDB…', { uri: config.db.uri.replace(/:\/\/.*@/, '://***@') })
    await mongoose.connect(config.db.uri, mongooseOptions)
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message })
    throw error
  }
}

// ── Disconnect ─────────────────────────────────────────────────────────────

/**
 * Gracefully close the Mongoose connection.
 * Called during SIGTERM / SIGINT handling in server.js.
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close()
    logger.info('MongoDB connection closed gracefully')
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error: error.message })
    throw error
  }
}

/**
 * Returns the current Mongoose connection state as a readable string.
 * Used by the health endpoint.
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }
  return states[mongoose.connection.readyState] || 'unknown'
}

export { connectDB, disconnectDB, getConnectionStatus }