/**
 * @file prescription.service.js
 * @description Persistence layer for prescription analysis records.
 *
 * Isolates Mongoose/MongoDB specifics from the rest of the application.
 * The analysis service calls this layer without knowing anything about
 * Mongoose schemas or connection state.
 */

import Prescription from '../models/prescription.model.js'
import logger from '../utils/logger.js'

/**
 * Persists a completed prescription analysis to MongoDB.
 *
 * Intentionally does NOT throw on failure to the caller in the normal
 * flow — the analysis service decides whether a persistence failure
 * should affect the HTTP response (Sprint 3: it should not, since the
 * valuable AI result has already succeeded).
 *
 * @param   {object} params
 * @param   {string} params.originalFileName
 * @param   {object} params.structuredPrescription - Validated prescription (doctorName, medicines, warnings)
 * @param   {string} params.rawAiOutput             - Raw Gemini text output
 * @param   {number} params.confidenceScore
 * @returns {Promise<object>} - The saved Mongoose document (plain object)
 * @throws  {Error}            - Propagates DB errors to the caller for explicit handling
 */
const savePrescriptionAnalysis = async ({
  originalFileName,
  structuredPrescription,
  rawAiOutput,
  confidenceScore,
}) => {
  const document = new Prescription({
    originalFileName,
    extractedPrescription: {
      doctor: structuredPrescription.doctor,
      patient: structuredPrescription.patient,
      medicines: structuredPrescription.medicines,
      summary: structuredPrescription.summary,
      specialNotes: structuredPrescription.specialNotes,
      followUp: structuredPrescription.followUp,
      warnings: structuredPrescription.warnings,
    },
    rawAiOutput,
    confidenceScore,
  })

  const saved = await document.save()

  logger.info('Prescription analysis persisted to MongoDB', {
    id: saved._id.toString(),
    confidenceScore: saved.confidenceScore,
    medicineCount: saved.extractedPrescription.medicines.length,
  })

  return saved.toObject()
}

export { savePrescriptionAnalysis }