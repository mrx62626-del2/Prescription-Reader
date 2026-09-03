/**
 * @file logger.js
 * @description Centralized Winston logger instance.
 *
 * Two transports:
 *   1. Console  — colorized, human-readable (all environments)
 *   2. File     — JSON structured logs split by level (non-test environments)
 *
 * Usage:
 *   import logger from '../utils/logger.js'
 *   logger.info('Server started', { port: 5000 })
 *   logger.error('DB connection failed', { error: err.message })
 */

import winston from 'winston'
import path from 'path'
import fs from 'fs'

const { combine, timestamp, printf, colorize, errors, json } = winston.format

// ── Ensure log directory exists ─────────────────────────────────────────────
const LOG_DIR = process.env.LOG_DIR || 'logs'
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// ── Human-readable format for console ───────────────────────────────────────
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : ''
  const stackStr = stack ? `\n${stack}` : ''
  return `${timestamp} [${level}]: ${message}${stackStr}${metaStr}`
})

// ── Transports ───────────────────────────────────────────────────────────────
const transports = [
  new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      errors({ stack: true }),
      consoleFormat,
    ),
  }),
]

// Add file transports in non-test environments
if (process.env.NODE_ENV !== 'test') {
  transports.push(
    // All logs >= info level
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
    // Error logs only
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
    }),
  )
}

// ── Logger instance ───────────────────────────────────────────────────────────
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports,
  // Do not exit on uncaught exceptions — let the process handler decide
  exitOnError: false,
})

export default logger