/**
 * @file app.js
 * @description Express application factory.
 *
 * Creates and configures the Express app without starting the server.
 * Keeping app creation separate from server startup makes the app
 * easily testable with Supertest (no port binding required in tests).
 *
 * Middleware order:
 *   1. Security (Helmet, CORS)
 *   2. Rate limiting
 *   3. Body parsers
 *   4. Request logger
 *   5. Routes
 *   6. 404 handler
 *   7. Global error handler
 */

import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'

import config from './config/app.config.js'
import logger from './utils/logger.js'
import requestLogger from './middleware/requestLogger.js'
import errorHandler from './middleware/errorHandler.js'
import notFound from './middleware/notFound.js'
import apiRouter from './routes/index.js'

const createApp = () => {
  const app = express()

  // ── 1. Security headers ───────────────────────────────────────────────────
  app.use(helmet())

  // ── 2. CORS ───────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true)

        if (config.cors.allowedOrigins.includes(origin)) {
          return callback(null, true)
        }

        logger.warn('CORS blocked request from disallowed origin', { origin })
        return callback(new Error(`CORS policy does not allow origin: ${origin}`))
      },
      methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders:   ['Content-Type', 'Authorization'],
      exposedHeaders:   ['X-Total-Count'],
      credentials:      true,
      optionsSuccessStatus: 200,
    }),
  )

  // ── 3. Rate limiting ──────────────────────────────────────────────────────
  const limiter = rateLimit({
    windowMs:         config.rateLimit.windowMs,
    max:              config.rateLimit.maxRequests,
    standardHeaders:  true,
    legacyHeaders:    false,
    message: {
      success: false,
      message: 'Too many requests from this IP. Please try again later.',
      errors:  [],
    },
    handler: (req, res, _next, options) => {
      logger.warn('Rate limit exceeded', {
        ip:  req.ip,
        url: req.originalUrl,
      })
      res.status(options.statusCode).json(options.message)
    },
  })
  app.use(`/api/${config.app.apiVersion}`, limiter)

  // ── 4. Body parsers ───────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true, limit: '1mb' }))

  // ── 5. Request logger ─────────────────────────────────────────────────────
  app.use(requestLogger)

  // ── 6. API routes ─────────────────────────────────────────────────────────
  app.use(`/api/${config.app.apiVersion}`, apiRouter)

  // ── 7. Root route (simple sanity check) ──────────────────────────────────
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: `MediRead AI API — v${config.app.apiVersion}`,
      docs:    `/api/${config.app.apiVersion}/health`,
    })
  })

  // ── 8. 404 handler ────────────────────────────────────────────────────────
  app.use(notFound)

  // ── 9. Global error handler (must be last) ────────────────────────────────
  app.use(errorHandler)

  return app
}

export default createApp