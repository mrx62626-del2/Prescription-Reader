/**
 * @file requestLogger.js
 * @description Express middleware that logs every incoming request
 *              and its corresponding response using Winston.
 *
 * Logs:
 *   - method, url, status code, response time, content-length
 *   - User-Agent and IP (useful for debugging and audit trails)
 */

import logger from '../utils/logger.js'

const requestLogger = (req, res, next) => {
  const startTime = Date.now()

  // Capture the original res.end to hook into response completion
  const originalEnd = res.end.bind(res)

  res.end = (...args) => {
    const responseTime = Date.now() - startTime

    logger.http('Incoming request', {
      method:        req.method,
      url:           req.originalUrl,
      statusCode:    res.statusCode,
      responseTime:  `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0,
      ip:            req.ip || req.connection?.remoteAddress,
      userAgent:     req.get('User-Agent'),
    })

    // Call the original end
    return originalEnd(...args)
  }

  next()
}

// Add 'http' as a valid level if not already (Winston has it at priority 3)
// winston.addColors({ http: 'magenta' })

export default requestLogger