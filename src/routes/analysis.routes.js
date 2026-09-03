/**
 * @file analysis.routes.js
 * @description Routes for prescription analysis via Gemini Vision.
 *
 * Reuses the exact same Multer middleware from Sprint 1's upload flow —
 * the image is validated and saved to disk identically, then handed
 * off to the analysis controller instead of (or in addition to) the
 * plain upload controller.
 */

import { Router } from 'express'
import { uploadPrescription as uploadMiddleware } from '../middleware/upload.middleware.js'
import { analyzePrescription } from '../controllers/analysis.controller.js'

const router = Router()

// POST /api/v1/prescriptions/analyze
router.post('/analyze', uploadMiddleware, analyzePrescription)

export default router