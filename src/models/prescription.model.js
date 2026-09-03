/**
 * @file prescription.model.js
 * @description Mongoose schema for persisted prescription analysis records.
 *
 * Stores both the raw AI output (for audit/debugging) and the final
 * structured/validated prescription, decoupled from the in-flight
 * Zod schema so database documents remain stable even if the Zod
 * schema evolves in later sprints.
 */

import mongoose from 'mongoose'

const { Schema } = mongoose

// ── Sub-schema: Medicine ──────────────────────────────────────────────────────

const medicineSubSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      trim: true,
      default: 'Medicine',
    },
    dosage: {
      type: String,
      trim: true,
      default: 'Not specified',
    },
    frequency: {
      type: String,
      trim: true,
      default: 'Not specified',
    },
    duration: {
      type: String,
      trim: true,
      default: 'Not specified',
    },
    purpose: {
      type: String,
      trim: true,
      default: '',
    },
    instructions: {
      type: String,
      trim: true,
      default: '',
    },
    warnings: {
      type: [String],
      default: [],
    },
  },
  { _id: false },
)

// ── Top-level schema: Prescription ─────────────────────────────────────────────

const prescriptionSchema = new Schema(
  {
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },

    extractedPrescription: {
      doctor: {
        name: { type: String, trim: true, default: 'Unknown' },
        specialization: { type: String, trim: true, default: 'General Physician' },
        hospital: { type: String, trim: true, default: 'Not specified' },
      },
      patient: {
        name: { type: String, trim: true, default: 'Not specified' },
        age: { type: String, trim: true, default: 'Not specified' },
        date: { type: String, trim: true, default: 'Not specified' },
      },
      medicines: {
        type: [medicineSubSchema],
        default: [],
      },
      summary: {
        type: String,
        trim: true,
        default: '',
      },
      specialNotes: {
        type: [String],
        default: [],
      },
      followUp: {
        type: String,
        trim: true,
        default: 'Consult doctor if symptoms persist',
      },
      warnings: {
        type: [String],
        default: [],
      },
    },

    rawAiOutput: {
      type: String,
      required: true,
    },

    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  {
    timestamps: true,
  },
)

// ── Indexes ────────────────────────────────────────────────────────────────────

prescriptionSchema.index({ createdAt: -1 })
prescriptionSchema.index({ confidenceScore: 1 })

const Prescription = mongoose.model('Prescription', prescriptionSchema)

export default Prescription