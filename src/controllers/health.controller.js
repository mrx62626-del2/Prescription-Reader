/**
 * @file health.controller.js
 * @description HTTP handler for the health check endpoint.
 *
 * Returns:
 *   - API status
 *   - Current environment
 *   - MongoDB connection state
 *   - Server timestamp
 *
 * Kept simple and dependency-light so it remains reliable
 * even when other parts of the system are degraded.
 */

import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'
import { getConnectionStatus } from '../database/connection.js'
import config from '../config/app.config.js'

/**
 * GET /api/v1/health
 */
const getHealth = asyncHandler(async (_req, res) => {
  const dbStatus = getConnectionStatus()

  const healthData = {
    status:      'ok',
    environment: config.app.env,
    apiVersion:  config.app.apiVersion,
    database: {
      status: dbStatus,
      connected: dbStatus === 'connected',
    },
    timestamp: new Date().toISOString(),
    uptime:    `${Math.floor(process.uptime())}s`,
  }

  // Use 200 even if DB is disconnected — the API itself is running.
  // Consumers can inspect healthData.database.connected for DB status.
  return ApiResponse.success(res, 200, 'MediRead AI is running', healthData)
})

export { getHealth }