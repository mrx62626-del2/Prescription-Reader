/**
 * @file responseNormalizer.js
 * @description Normalizes raw extracted JSON into the canonical shape
 *              expected by prescriptionSchema, before Zod validation.
 *
 * Responsibilities:
 *   - Map snake_case / alternate field names to camelCase canonical names
 *   - Normalize whitespace in strings
 *   - Ensure arrays are actually arrays (Gemini sometimes returns a
 *     single string instead of a one-item array)
 *   - Normalize each medicine entry's field names the same way
 *   - Fill missing optional fields with safe defaults handled later by Zod
 *
 * This layer NEVER throws — it always returns its best-effort normalized
 * object. Validation failures are Zod's responsibility, not this layer's.
 */

import logger from './logger.js'

// ── Field name aliasing ──────────────────────────────────────────────────────

const PRESCRIPTION_FIELD_ALIASES = {
  doctor_name: 'doctorName',
  doctorname: 'doctorName',
  physician: 'doctorName',
  physician_name: 'doctorName',
  confidence_score: 'confidenceScore',
  confidence: 'confidenceScore',
  special_notes: 'specialNotes',
  special_instructions: 'specialNotes',
  additional_instructions: 'specialNotes',
  follow_up: 'followUp',
  followup: 'followUp',
  patient_info: 'patient',
  doctor_info: 'doctor',
}

const MEDICINE_FIELD_ALIASES = {
  medicine_name: 'name',
  drug_name:     'name',
  drugname:      'name',
  medication:    'name',
  dose:          'dosage',
  dosage_amount: 'dosage',
  freq:          'frequency',
  how_often:     'frequency',
  length:        'duration',
  duration_days: 'duration',
  notes:         'instructions',
  instruction:   'instructions',
  note:          'instructions',
}

const applyFieldAliases = (obj, aliasMap) => {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = key.trim()
    const lowerKey = normalizedKey.toLowerCase()
    const canonicalKey = aliasMap[lowerKey] || normalizedKey
    result[canonicalKey] = value
  }
  return result
}

const normalizeWhitespace = (value) => {
  if (typeof value !== 'string') return value
  return value.replace(/\s+/g, ' ').trim()
}

const ensureArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

// ── Helpers ────────────────────────────────────────────────────────────────

const normalizeDoctorInfo = (data) => {
  if (data.doctor && typeof data.doctor === 'object') {
    return {
      name: normalizeWhitespace(data.doctor.name || data.doctor.doctor_name) || 'Unknown',
      specialization: normalizeWhitespace(data.doctor.specialization || data.doctor.specialty || data.doctor.speciality) || 'General Physician',
      hospital: normalizeWhitespace(data.doctor.hospital || data.doctor.clinic || data.doctor.hospital_name) || 'Not specified',
    }
  }
  return {
    name: normalizeWhitespace(data.doctorName || data.doctor_name || data.physician) || 'Unknown',
    specialization: normalizeWhitespace(data.specialization || data.specialty) || 'General Physician',
    hospital: normalizeWhitespace(data.hospital || data.clinic) || 'Not specified',
  }
}

const normalizePatientInfo = (data) => {
  if (data.patient && typeof data.patient === 'object') {
    return {
      name: normalizeWhitespace(data.patient.name || data.patient.patient_name) || 'Not specified',
      age: normalizeWhitespace(String(data.patient.age || data.patient.patient_age || '')) || 'Not specified',
      date: normalizeWhitespace(data.patient.date || data.patient.prescription_date || data.patient.visit_date) || 'Not specified',
    }
  }
  return {
    name: normalizeWhitespace(data.patientName || data.patient_name) || 'Not specified',
    age: normalizeWhitespace(String(data.patientAge || data.patient_age || '')) || 'Not specified',
    date: normalizeWhitespace(data.prescriptionDate || data.prescription_date || data.date) || 'Not specified',
  }
}

const normalizeSummary = (summary) => {
  if (!summary) return ''
  if (typeof summary === 'string') return normalizeWhitespace(summary)
  if (typeof summary === 'object') return normalizeWhitespace(summary.en || Object.values(summary)[0] || '')
  return ''
}

const normalizeSpecialNotes = (notes) => {
  if (!notes) return []
  if (Array.isArray(notes)) {
    return notes.map(n => normalizeWhitespace(typeof n === 'string' ? n : String(n))).filter(n => n.length > 0)
  }
  if (typeof notes === 'object') {
    const arr = notes.en || Object.values(notes)[0]
    if (Array.isArray(arr)) return arr.map(n => normalizeWhitespace(String(n))).filter(n => n.length > 0)
  }
  if (typeof notes === 'string') return [normalizeWhitespace(notes)].filter(n => n.length > 0)
  return []
}

// ── Medicine normalization ──────────────────────────────────────────────────────

const normalizeMedicine = (rawMedicine) => {
  if (typeof rawMedicine !== 'object' || rawMedicine === null) {
    logger.warn('Skipping malformed medicine entry during normalization', { received: typeof rawMedicine })
    return null
  }
  const aliased = applyFieldAliases(rawMedicine, MEDICINE_FIELD_ALIASES)
  return {
    name: normalizeWhitespace(aliased.name) || '',
    brandName: normalizeWhitespace(aliased.brandName || aliased.brand_name || aliased.brand) || '',
    type: normalizeWhitespace(aliased.type || aliased.category || aliased.medicine_type) || 'Medicine',
    dosage: normalizeWhitespace(aliased.dosage) || 'Not specified',
    frequency: normalizeWhitespace(aliased.frequency) || 'Not specified',
    duration: normalizeWhitespace(aliased.duration) || 'Not specified',
    purpose: normalizeWhitespace(aliased.purpose || aliased.reason || aliased.use) || '',
    instructions: normalizeWhitespace(aliased.instructions) || '',
    warnings: ensureArray(aliased.warnings).map(w => normalizeWhitespace(typeof w === 'string' ? w : String(w))).filter(w => w.length > 0),
  }
}

// ── Top-level prescription normalization ────────────────────────────────────────

const normalizePrescriptionResponse = (rawData) => {
  if (typeof rawData !== 'object' || rawData === null) {
    logger.warn('Normalizer received non-object input, returning empty shell')
    return {
      doctor: { name: 'Unknown', specialization: 'General Physician', hospital: 'Not specified' },
      patient: { name: 'Not specified', age: 'Not specified', date: 'Not specified' },
      medicines: [],
      summary: '',
      specialNotes: [],
      followUp: 'Consult doctor if symptoms persist',
      warnings: [],
      confidenceScore: undefined,
    }
  }

  const aliased = applyFieldAliases(rawData, PRESCRIPTION_FIELD_ALIASES)

  const doctor = normalizeDoctorInfo(aliased)
  const patient = normalizePatientInfo(aliased)

  const rawMedicines = ensureArray(aliased.medicines)
  const medicines = rawMedicines.map(normalizeMedicine).filter(m => m !== null && m.name.length > 0)

  if (rawMedicines.length > 0 && medicines.length < rawMedicines.length) {
    logger.warn('Some medicine entries were dropped during normalization', {
      originalCount: rawMedicines.length,
      keptCount: medicines.length,
    })
  }

  const summary = normalizeSummary(aliased.summary)
  const specialNotes = normalizeSpecialNotes(aliased.specialNotes || aliased.special_notes || aliased.additionalInstructions || aliased.additional_instructions)
  const followUp = normalizeWhitespace(aliased.followUp || aliased.follow_up || aliased.followup || '') || 'Consult doctor if symptoms persist'

  const warnings = ensureArray(aliased.warnings)
    .map(w => normalizeWhitespace(typeof w === 'string' ? w : String(w)))
    .filter(w => w.length > 0)

  let confidenceScore
  if (typeof aliased.confidenceScore === 'number' && aliased.confidenceScore >= 0 && aliased.confidenceScore <= 1) {
    confidenceScore = aliased.confidenceScore
  } else if (typeof aliased.confidenceScore === 'string') {
    const parsed = parseFloat(aliased.confidenceScore)
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) confidenceScore = parsed
  }

  return { doctor, patient, medicines, summary, specialNotes, followUp, warnings, confidenceScore }
}

export { normalizePrescriptionResponse }