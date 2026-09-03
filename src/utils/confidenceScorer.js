/**
 * @file confidenceScorer.js
 */

import logger from './logger.js'

const PLACEHOLDER_VALUES = new Set(['not specified', 'unknown', '', 'general physician'])

const isMeaningful = (value) => {
  if (typeof value !== 'string') return false
  return !PLACEHOLDER_VALUES.has(value.trim().toLowerCase())
}

const calculateFallbackConfidence = (prescription) => {
  const { doctor, patient, medicines, summary, specialNotes } = prescription

  let score = 0

  // Doctor name present (5%)
  if (doctor && isMeaningful(doctor.name)) score += 0.05
  // Doctor specialization present (5%)
  if (doctor && isMeaningful(doctor.specialization)) score += 0.05
  // Patient name present (5%)
  if (patient && isMeaningful(patient.name)) score += 0.05

  // Summary present (5%)
  if (isMeaningful(summary)) score += 0.05
  
  // Special notes present (5%)
  if (Array.isArray(specialNotes) && specialNotes.some(isMeaningful)) score += 0.05

  // At least 1 medicine (10%)
  if (Array.isArray(medicines) && medicines.length > 0) {
    score += 0.10

    // Medicine fields completeness (65% proportional)
    const fieldWeights = ['name', 'dosage', 'frequency', 'duration', 'purpose', 'instructions']
    const perMedicineScores = medicines.map((med) => {
      const presentCount = fieldWeights.filter((field) => isMeaningful(med[field])).length
      return presentCount / fieldWeights.length
    })

    const averageMedicineCompleteness =
      perMedicineScores.reduce((sum, s) => sum + s, 0) / perMedicineScores.length

    score += averageMedicineCompleteness * 0.65
  }

  // Clamp to [0, 1] and round to 2 decimal places
  const clamped = Math.min(1, Math.max(0, score))
  return Math.round(clamped * 100) / 100
}

const resolveConfidenceScore = (prescription) => {
  const aiProvided = prescription.confidenceScore

  if (typeof aiProvided === 'number' && aiProvided >= 0 && aiProvided <= 1) {
    logger.info('Using AI-provided confidence score', { confidenceScore: aiProvided })
    return aiProvided
  }

  const fallback = calculateFallbackConfidence(prescription)
  logger.info('AI did not provide a valid confidence score — calculated fallback', {
    confidenceScore: fallback,
  })

  return fallback
}

export { resolveConfidenceScore, calculateFallbackConfidence }