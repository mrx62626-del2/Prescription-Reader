/**
 * @file prescription.schema.js
 * @description Zod validation schemas for structured prescription data.
 *
 * Single source of truth for the shape of a "Medicine" and a "Prescription".
 * Used by:
 *   - prescription.parser.js (validating normalized AI output)
 *   - prescription.model.js  (keeping Mongoose schema in sync conceptually)
 *
 * Design notes:
 *   - Fields that are commonly missing from imperfect AI output are optional
 *     with safe defaults, so a partially-correct reading can still pass
 *     validation rather than being rejected outright (handled in the parser's
 *     recovery layer).
 *   - confidenceScore is NOT required from the AI — it is computed/validated
 *     separately by confidenceScorer.js and merged in before final validation.
 */

import { z } from 'zod'

// ── Doctor schema ──────────────────────────────────────────────────────────
export const doctorSchema = z.object({
  name: z.string().trim().default('Unknown'),
  specialization: z.string().trim().default('General Physician'),
  hospital: z.string().trim().default('Not specified'),
})

// ── Patient schema ─────────────────────────────────────────────────────────
export const patientSchema = z.object({
  name: z.string().trim().default('Not specified'),
  age: z.string().trim().default('Not specified'),
  date: z.string().trim().default('Not specified'),
})

// ── Medicine schema ────────────────────────────────────────────────────────
export const medicineSchema = z.object({
  name: z.string().trim().min(1, 'Medicine name cannot be empty'),
  brandName: z.string().trim().default(''),
  type: z.string().trim().default('Medicine'),
  dosage: z.string().trim().default('Not specified'),
  frequency: z.string().trim().default('Not specified'),
  duration: z.string().trim().default('Not specified'),
  purpose: z.string().trim().default(''),
  instructions: z.string().trim().default(''),
  warnings: z.array(z.string().trim()).default([]),
})

// ── Prescription schema ───────────────────────────────────────────────────
export const prescriptionSchema = z.object({
  doctor: doctorSchema.default({}),
  patient: patientSchema.default({}),
  medicines: z.array(medicineSchema).default([]),
  summary: z.string().trim().default(''),
  specialNotes: z.array(z.string().trim()).default([]),
  followUp: z.string().trim().default('Consult doctor if symptoms persist'),
  warnings: z.array(z.string().trim()).default([]),
  confidenceScore: z.number().min(0).max(1).default(0),
})

export const prescriptionPreScoreSchema = prescriptionSchema.omit({ confidenceScore: true }).extend({
  confidenceScore: z.number().min(0).max(1).optional(),
})