/**
 * @file upload.middleware.js
 * @description Multer configuration for prescription image uploads.
 *
 * Responsibilities:
 *   - Configure local disk storage
 *   - Validate MIME type on upload (first layer of defence)
 *   - Enforce max file size
 *   - Generate unique, safe filenames
 *
 * Note: Extension validation is a second layer handled in upload.schema.js.
 *       Never rely on a single validation layer for file uploads.
 */

import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import config from '../config/app.config.js'
import ApiError from '../utils/ApiError.js'
import logger from '../utils/logger.js'

// ── Ensure upload directory exists ────────────────────────────────────────────

const UPLOAD_DIR = config.upload.uploadDir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  logger.info(`Upload directory created: ${UPLOAD_DIR}`)
}

// ── Storage engine ────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR)
  },

  filename: (_req, file, cb) => {
    // Generate a cryptographically random filename to prevent
    // path traversal attacks and filename collisions
    const randomId  = crypto.randomBytes(16).toString('hex')
    const timestamp = Date.now()
    const ext       = path.extname(file.originalname).toLowerCase()
    const filename  = `prescription_${timestamp}_${randomId}${ext}`
    cb(null, filename)
  },
})

// ── MIME type filter (first validation layer) ─────────────────────────────────

const fileFilter = (_req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(
      ApiError.badRequest(
        `Invalid file type "${file.mimetype}". Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`,
      ),
      false,
    )
  }
}

// ── Multer instance ────────────────────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
    files:    1, // Single file only
  },
})

// ── Named export: single prescription upload ──────────────────────────────────

/**
 * Middleware for single file upload under the field name "prescription".
 * Wraps multer to convert its errors into ApiError instances.
 */
const uploadPrescription = (req, res, next) => {
  const multerMiddleware = upload.single('prescription')

  multerMiddleware(req, res, (err) => {
    if (!err) return next()

    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        ApiError.badRequest(
          `File too large. Maximum allowed size is ${config.upload.maxFileSizeBytes / 1024 / 1024}MB.`,
        ),
      )
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Only one file can be uploaded at a time.'))
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('Unexpected field name. Use "prescription" as the field name.'))
    }

    // ApiError thrown by fileFilter
    if (err instanceof ApiError) {
      return next(err)
    }

    // Unknown multer error
    return next(ApiError.internal('File upload failed. Please try again.'))
  })
}

export { uploadPrescription }