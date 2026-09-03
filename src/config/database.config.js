/**
 * @file database.config.js
 * @description Mongoose connection options.
 *
 * Centralizes all Mongoose settings so they can be tuned
 * per environment without scattering options across the codebase.
 */

import config from './app.config.js'

const mongooseOptions = {
  dbName: config.db.dbName,

  // Connection pool — keep open connections for reuse
  maxPoolSize: 10,
  minPoolSize: 2,

  // Timeouts
  serverSelectionTimeoutMS: 5000,  // Give up selecting a server after 5s
  socketTimeoutMS:          45000, // Close idle sockets after 45s

  // Reconnect
  heartbeatFrequencyMS: 10000,
}

export default mongooseOptions