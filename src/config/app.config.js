/**
 * @file app.config.js
 * @description Centralized, validated application configuration.
 *
 * All environment variables are read here exactly once.
 * The rest of the application imports from this module — never from process.env directly.
 * This makes configuration testable, type-safe, and easy to audit.
 */

import dotenv from 'dotenv'

// Load .env file as early as possible
dotenv.config()

// ── Validation helpers ────────────────────────────────────────────────────────

const requireEnv = (key) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const optionalEnv = (key, defaultValue) => process.env[key] || defaultValue

const parseIntEnv = (key, defaultValue) => {
  const raw = process.env[key]
  const parsed = parseInt(raw, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

// ── Config object ─────────────────────────────────────────────────────────────

const config = {
  // ── Application ────────────────────────────────────────────────────────────
  app: {
    env:        optionalEnv('NODE_ENV', 'development'),
    port:       parseIntEnv('PORT', 5000),
    apiVersion: optionalEnv('API_VERSION', 'v1'),
    isDev:      optionalEnv('NODE_ENV', 'development') === 'development',
    isProd:     optionalEnv('NODE_ENV', 'development') === 'production',
    isTest:     optionalEnv('NODE_ENV', 'development') === 'test',
  },

  // ── Database ───────────────────────────────────────────────────────────────
  db: {
    uri:    requireEnv('MONGODB_URI'),
    dbName: optionalEnv('MONGODB_DB_NAME', 'mediread'),
  },

  // ── CORS ───────────────────────────────────────────────────────────────────
  cors: {
    allowedOrigins: optionalEnv('ALLOWED_ORIGINS', 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim()),
  },

  // ── Rate Limiting ──────────────────────────────────────────────────────────
  rateLimit: {
    windowMs:    parseIntEnv('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
    maxRequests: parseIntEnv('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // ── File Upload ────────────────────────────────────────────────────────────
  upload: {
    maxFileSizeBytes: parseIntEnv('MAX_FILE_SIZE_MB', 10) * 1024 * 1024,
    uploadDir:        optionalEnv('UPLOAD_DIR', 'uploads'),
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },

  // ── Logging ────────────────────────────────────────────────────────────────
  logging: {
    level:  optionalEnv('LOG_LEVEL', 'info'),
    logDir: optionalEnv('LOG_DIR', 'logs'),
  },

  // ── Gemini Vision AI ───────────────────────────────────────────────────────
  gemini: {
    apiKeys: (() => {
      // Support both GEMINI_API_KEYS (comma-separated) and legacy GEMINI_API_KEY (single)
      const multiKeys = process.env.GEMINI_API_KEYS
      if (multiKeys) {
        return multiKeys.split(',').map(k => k.trim()).filter(k => k.length > 0)
      }
      const singleKey = process.env.GEMINI_API_KEY
      if (singleKey) return [singleKey]
      throw new Error('Missing required environment variable: GEMINI_API_KEYS or GEMINI_API_KEY')
    })(),
    model:      optionalEnv('GEMINI_MODEL', 'gemini-2.0-flash'),
    timeoutMs:  parseIntEnv('GEMINI_TIMEOUT_MS', 90000),
    maxRetries: parseIntEnv('GEMINI_MAX_RETRIES', 3),
    keyCooldownMs: parseIntEnv('GEMINI_KEY_COOLDOWN_MS', 60000),
    supportedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  },

  // ── Authentication (JWT + bcrypt) ────────────────────────────────────────────
  jwt: {
    accessSecret:     requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret:    requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn:  optionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  bcrypt: {
    saltRounds: parseIntEnv('BCRYPT_SALT_ROUNDS', 12),
  },
}

export default config
