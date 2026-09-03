/**
 * @file upload.service.js
 * @description Business logic for prescription file uploads.
 *
 * Responsibilities:
 *   - Validate the uploaded file using Zod schema
 *   - Build and return structured file metadata
 *   - (Sprint 2) Will trigger Gemini analysis pipeline
 *
 * Intentionally framework-agnostic: no req/res references.
 * Accepts plain data objects so it can be tested independently.
 */

import path from 'path'
import { uploadedFileSchema } from '../schemas/upload.schema.js'
import ApiError from '../utils/ApiError.js'
import logger from '../utils/logger.js'

/**
 * Process and validate an uploaded prescription file.
 *
 * @param   {object} file - The Multer file object (req.file)
 * @returns {object}      - Structured file metadata
 * @throws  {ApiError}    - On validation failure
 */
const processPrescriptionUpload = async (file) => {
  // Guard: ensure a file was actually uploaded
  if (!file) {
    throw ApiError.badRequest('No file uploaded. Please attach a prescription image.')
  }

  // ── Validate using Zod schema ─────────────────────────────────────────────
  const validation = uploadedFileSchema.safeParse(file)

  if (!validation.success) {
    const errors = validation.error.errors.map((e) => ({
      field:   e.path.join('.'),
      message: e.message,
    }))
    throw ApiError.unprocessable('Uploaded file failed validation', errors)
  }

  const validatedFile = validation.data

  logger.info('Prescription image uploaded successfully', {
    originalName: validatedFile.originalname,
    storedName:   validatedFile.filename,
    size:         validatedFile.size,
    mimeType:     validatedFile.mimetype,
  })

  // ── Build response metadata ───────────────────────────────────────────────
  const metadata = {
    fileId:       path.parse(validatedFile.filename).name, // filename without ext
    originalName: validatedFile.originalname,
    storedName:   validatedFile.filename,
    mimeType:     validatedFile.mimetype,
    sizeBytes:    validatedFile.size,
    sizeMB:       parseFloat((validatedFile.size / 1024 / 1024).toFixed(3)),
    extension:    path.extname(validatedFile.originalname).toLowerCase(),
    uploadedAt:   new Date().toISOString(),
    // Sprint 2: analysisStatus will be populated after Gemini processes this file
    analysisStatus: 'pending',
  }

  return metadata
}

export { processPrescriptionUpload }