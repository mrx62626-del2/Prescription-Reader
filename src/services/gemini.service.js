/**
 * @file gemini.service.js
 * @description REST-based Gemini Vision client (v1 API)
 *              Replaces SDK to avoid v1beta routing issues.
 */

import fs from 'fs/promises'
import config from '../config/app.config.js'
import logger from '../utils/logger.js'
import retry from '../utils/retry.js'
import withTimeout from '../utils/withTimeout.js'
import keyManager from '../utils/keyManager.js'

import {
  AITimeoutError,
  AIRetryExhaustedError,
  AIInvalidResponseError,
  AINetworkError,
} from '../errors/AIServiceError.js'

// ── Build image payload ───────────────────────────────────────────────────────

const buildImageBase64 = async (filePath) => {
  const fileBuffer = await fs.readFile(filePath)
  return fileBuffer.toString('base64')
}

// ── Error classification ───────────────────────────────────────────────────────

const isRetryableError = (error) => {
  if (error instanceof AITimeoutError) return true

  const status = error.status || error.statusCode

  if (status === 429) {
    if (keyManager.getActiveKeyCount() > 0) return true
    return true
  }
  if (status >= 500 && status < 600) return true

  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND'
  ) {
    return true
  }

  return false
}

// ── Normalize errors ───────────────────────────────────────────────────────────

const normalizeGeminiError = (error) => {
  if (error instanceof AITimeoutError) return error

  const status = error.status || error.statusCode

  if (status === 429) {
    return new AINetworkError('Rate limited by AI service.')
  }

  if (
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT' ||
    error.code === 'ENOTFOUND'
  ) {
    return new AINetworkError('Network error while reaching AI service.')
  }

  if (status >= 500) {
    return new AINetworkError('AI service temporarily unavailable.')
  }

  return new AIInvalidResponseError(
    error.message || 'Unexpected AI response error.'
  )
}

// ── CORE GEMINI CALL (REST API v1) ─────────────────────────────────────────────

const callGeminiVision = async (imagePath, mimeType, promptText) => {
  const base64Image = await buildImageBase64(imagePath)
  const apiKey = keyManager.getNextKey()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
    }
  )

  const data = await response.json()

  if (!response.ok) {
    const err = new Error(data?.error?.message || 'Gemini API error')
    err.status = response.status
    // If rate limited, mark this key as exhausted
    if (response.status === 429) {
      keyManager.markExhausted(apiKey)
      logger.warn('Gemini API key exhausted, switching to next key', {
        keyPrefix: apiKey.substring(0, 8) + '...',
        activeKeys: keyManager.getActiveKeyCount(),
      })
      // to avoid retry counting/waiting, we can retry internally if we wanted, 
      // but sticking to throwing it back to the retry wrapper per instructions
    }
    throw err
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text || text.trim().length === 0) {
    throw new AIInvalidResponseError('Empty response from Gemini')
  }

  return text
}

// ── Public API ────────────────────────────────────────────────────────────────

const analyzeImageWithGemini = async (imagePath, mimeType, promptText) => {
  const startTime = Date.now()

  logger.info('Submitting prescription image to Gemini Vision (REST v1)', {
    model: config.gemini.model,
    mimeType,
    timeoutMs: config.gemini.timeoutMs,
  })

  try {
    const rawOutput = await retry(
      async () => {
        while (true) {
          try {
            return await withTimeout(
              callGeminiVision(imagePath, mimeType, promptText),
              config.gemini.timeoutMs,
              () => new AITimeoutError(`Gemini timeout after ${config.gemini.timeoutMs}ms`)
            )
          } catch (err) {
            if (err.status === 429 && keyManager.getActiveKeyCount() > 0) {
              // Retry immediately without counting as a retry wrapper attempt
              continue
            }
            throw err
          }
        }
      },
      {
        maxRetries: config.gemini.maxRetries,
        baseDelayMs: 2000,
        isRetryable: isRetryableError,
        onRetry: (attempt, error, delayMs) => {
          logger.warn('Retrying Gemini request', {
            attempt,
            delayMs,
            error: error.message,
          })
        },
      }
    )

    const durationMs = Date.now() - startTime

    logger.info('Gemini Vision success', {
      durationMs,
      outputLength: rawOutput.length,
    })

    return rawOutput
  } catch (error) {
    const durationMs = Date.now() - startTime

    const normalizedError = normalizeGeminiError(error)

    logger.error('Gemini Vision failed', {
      durationMs,
      errorType: normalizedError.name,
      errorMessage: normalizedError.message,
    })

    if (isRetryableError(error)) {
      throw new AIRetryExhaustedError()
    }

    throw normalizedError
  }
}

export { analyzeImageWithGemini }