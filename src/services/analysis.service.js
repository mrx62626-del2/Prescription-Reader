/**
 * @file analysis.service.js
 * @description Orchestration layer for prescription analysis.
 *
 * [Sprint 3 UPDATE] Extends the Sprint 2 flow: after receiving raw
 * Gemini output, the response is now parsed into structured data,
 * validated, scored for confidence, and persisted to MongoDB before
 * being returned to the controller.
 *
 * Persistence failures are logged but do NOT fail the request — the
 * AI analysis itself succeeded, which is the primary value delivered
 * to the user. This keeps the API resilient to transient DB issues.
 */

import config from '../config/app.config.js'
import ApiError from '../utils/ApiError.js'
import logger from '../utils/logger.js'
import { analyzeImageWithGemini } from './gemini.service.js'
import { buildPrescriptionAnalysisPrompt } from '../prompts/prescription.prompt.js'
import { parsePrescriptionResponse } from '../parsers/prescription.parser.js'
import { savePrescriptionAnalysis } from './prescription.service.js'

/**
 * Analyzes an uploaded prescription image and returns a structured,
 * validated prescription object.
 *
 * @param   {object} file - Multer file object (req.file): { path, mimetype, originalname, size }
 * @returns {Promise<object>} - { doctorName, medicines, warnings, confidenceScore }
 * @throws  {ApiError}
 */
const analyzePrescriptionImage = async (file) => {
  if (!file) {
    throw ApiError.badRequest('No file uploaded. Please attach a prescription image to analyze.')
  }

  if (!config.gemini.supportedMimeTypes.includes(file.mimetype)) {
    throw ApiError.badRequest(
      `Unsupported image type for analysis: ${file.mimetype}. Supported types: ${config.gemini.supportedMimeTypes.join(', ')}`,
    )
  }

  logger.info('Starting prescription analysis', {
    originalName: file.originalname,
    mimeType:     file.mimetype,
    sizeBytes:    file.size,
  })

  const startTime = Date.now()
  const promptText = buildPrescriptionAnalysisPrompt()

  // ── Step 1: Gemini Vision call (Sprint 2) ────────────────────────────────────
  const rawOutput = await analyzeImageWithGemini(file.path, file.mimetype, promptText)

  // ── Step 2: Parse raw output into structured prescription (Sprint 3) ─────────
  const structuredPrescription = await parsePrescriptionResponse(rawOutput)

  const durationMs = Date.now() - startTime

  logger.info('Prescription analysis completed', {
    originalName: file.originalname,
    durationMs,
    medicineCount: structuredPrescription.medicines.length,
    confidenceScore: structuredPrescription.confidenceScore,
  })

  // ── Step 3: Persist to MongoDB (non-blocking for the response) ───────────────
  try {
    await savePrescriptionAnalysis({
      originalFileName: file.originalname,
      structuredPrescription,
      rawAiOutput: rawOutput,
      confidenceScore: structuredPrescription.confidenceScore,
    })
  } catch (persistError) {
    // Log and continue — do not fail the user-facing request over a DB issue
    logger.error('Failed to persist prescription analysis to MongoDB', {
      originalName: file.originalname,
      error: persistError.message,
    })
  }

  return structuredPrescription
}

export { analyzePrescriptionImage }