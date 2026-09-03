/**
 * @file prescription.parser.js
 * @description Framework-independent orchestrator that converts raw
 *              Gemini text output into a validated, structured
 *              Prescription object.
 *
 * Pipeline:
 *   1. Extract JSON from raw text (handles markdown/fences/prose)
 *   2. Normalize field names and value shapes
 *   3. Resolve confidence score (AI-provided or fallback)
 *   4. Validate the final shape against prescriptionSchema
 *   5. On validation failure, attempt one recovery pass (strip bad
 *      medicines, retry with safe defaults) before failing hard
 *
 * Never touches Express, MongoDB, or HTTP — pure transformation logic,
 * fully unit-testable with a raw string in, structured object out.
 */

import { extractJson } from '../utils/jsonExtractor.js'
import { normalizePrescriptionResponse } from '../utils/responseNormalizer.js'
import { resolveConfidenceScore } from '../utils/confidenceScorer.js'
import { prescriptionSchema } from '../schemas/prescription.schema.js'
import { AIInvalidResponseError } from '../errors/AIServiceError.js'
import logger from '../utils/logger.js'

/**
 * Attempts a recovery pass when initial validation fails:
 * drops medicines that don't satisfy the schema rather than
 * rejecting the entire prescription, and re-validates.
 *
 * @param   {object} normalized - The normalized (pre-validation) object
 * @returns {object|null}       - A validated object, or null if recovery is impossible
 */
const attemptRecovery = (normalized) => {
  logger.warn('Attempting recovery after initial validation failure', {
    medicineCount: normalized.medicines?.length || 0,
  })

  const recoverableMedicines = (normalized.medicines || []).filter((med) => {
    return typeof med.name === 'string' && med.name.trim().length > 0
  })

  const recoveredCandidate = {
    ...normalized,
    medicines: recoverableMedicines,
    confidenceScore: resolveConfidenceScore({ ...normalized, medicines: recoverableMedicines }),
  }

  const result = prescriptionSchema.safeParse(recoveredCandidate)

  if (result.success) {
    logger.info('Recovery succeeded — prescription validated with reduced data', {
      finalMedicineCount: recoverableMedicines.length,
    })
    return result.data
  }

  logger.error('Recovery attempt failed — prescription cannot be validated', {
    zodErrors: result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
  })

  return null
}

/**
 * Parses raw Gemini text output into a validated Prescription object.
 *
 * @param   {string} rawOutput - Raw text response from Gemini (Sprint 2 output)
 * @returns {Promise<object>}  - Validated prescription matching prescriptionSchema
 * @throws  {AIInvalidResponseError} - If parsing/validation fails even after recovery
 */
const parsePrescriptionResponse = async (rawOutput) => {
  // ── Step 1: Extract JSON ────────────────────────────────────────────────────
  let extracted
  try {
    extracted = extractJson(rawOutput)
  } catch (error) {
    logger.error('JSON extraction failed', { error: error.message })
    throw new AIInvalidResponseError(
      'Could not extract structured data from the AI response. The prescription may be unclear.',
    )
  }

  // ── Step 2: Normalize ────────────────────────────────────────────────────────
  const normalized = normalizePrescriptionResponse(extracted)

  logger.info('Prescription response normalized', {
    doctorNamePresent: normalized.doctorName !== 'Unknown',
    medicineCount: normalized.medicines.length,
    warningCount: normalized.warnings.length,
  })

  // ── Step 3: Resolve confidence score ──────────────────────────────────────────
  const confidenceScore = resolveConfidenceScore(normalized)
  const candidate = { ...normalized, confidenceScore }

  // ── Step 4: Validate ─────────────────────────────────────────────────────────
  const validation = prescriptionSchema.safeParse(candidate)

  if (validation.success) {
    return validation.data
  }

  logger.warn('Initial prescription validation failed', {
    zodErrors: validation.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
  })

  // ── Step 5: Recovery attempt ────────────────────────────────────────────────
  const recovered = attemptRecovery(candidate)

  if (recovered) {
    return recovered
  }

  // ── All recovery exhausted ───────────────────────────────────────────────────
  throw new AIInvalidResponseError(
    'The AI response could not be structured into a valid prescription. Please try uploading a clearer image.',
  )
}

export { parsePrescriptionResponse }