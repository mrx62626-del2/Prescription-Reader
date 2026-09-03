/**
 * @file upload.routes.js
 * @description Routes for prescription image upload.
 *
 * Middleware order matters:
 *   1. uploadPrescription (Multer) — parse multipart form, save file, validate MIME
 *   2. uploadPrescriptionController — call service, send response
 */

import { Router } from 'express'
import { uploadPrescription as uploadMiddleware } from '../middleware/upload.middleware.js'
import { uploadPrescription } from '../controllers/upload.controller.js'

const router = Router()

// POST /api/v1/upload/prescription
router.post('/prescription', uploadMiddleware, uploadPrescription)

export default router