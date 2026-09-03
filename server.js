/**
 * @file server.js
 * @description Application entry point.
 *
 * Responsibilities:
 *   1. Load environment configuration
 *   2. Connect to MongoDB
 *   3. Create the Express app
 *   4. Start the HTTP server
 *   5. Handle graceful shutdown on SIGTERM / SIGINT
 *
 * This file intentionally contains NO business logic.
 * All application setup belongs in app.js or lower layers.
 */

import 'dotenv/config'
import createApp from './src/app.js'
import { connectDB, disconnectDB } from './src/database/connection.js'
import config from './src/config/app.config.js'
import logger from './src/utils/logger.js'

// ── Bootstrap ─────────────────────────────────────────────────────────────────

const bootstrap = async () => {
  try {
    // 1. Connect to MongoDB before accepting any traffic
    await connectDB()

    // 2. Create Express application
    const app = createApp()

    // 3. Start HTTP server
    const server = app.listen(config.app.port, () => {
      logger.info('MediRead AI server started', {
        port:        config.app.port,
        environment: config.app.env,
        apiBase:     `/api/${config.app.apiVersion}`,
        healthCheck: `http://localhost:${config.app.port}/api/${config.app.apiVersion}/health`,
      })
    })

    // ── Graceful shutdown ───────────────────────────────────────────────────

    /**
     * Gracefully shuts down the HTTP server and DB connection.
     * Allows in-flight requests to complete before closing.
     */
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received — initiating graceful shutdown`)

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed')

        try {
          await disconnectDB()
          logger.info('Graceful shutdown complete')
          process.exit(0)
        } catch (err) {
          logger.error('Error during shutdown', { error: err.message })
          process.exit(1)
        }
      })

      // Force exit if graceful shutdown takes too long (10s safety net)
      setTimeout(() => {
        logger.error('Graceful shutdown timed out — forcing exit')
        process.exit(1)
      }, 10_000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT',  () => gracefulShutdown('SIGINT'))

    // ── Unhandled rejection / exception guards ──────────────────────────────

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        promise,
      })
      // Do not exit — let the error handler deal with in-flight requests
    })

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception — shutting down', { error: err.message, stack: err.stack })
      // Uncaught exceptions leave the process in an undefined state — exit
      process.exit(1)
    })

  } catch (error) {
    logger.error('Failed to start server', { error: error.message })
    process.exit(1)
  }
}

bootstrap()