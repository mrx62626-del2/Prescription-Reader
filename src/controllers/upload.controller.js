/**
 * @file upload.controller.js
 * @description HTTP handler for prescription image upload.
 *
 * Responsibilities (HTTP layer only):
 *   - Delegate file processing to uploadService
 *   - Return structured success response
 *   - Let asyncHandler + errorHandler manage failures
 */

import { processPrescriptionUpload } from '../services/upload.service.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * POST /api/v1/upload/prescription
 *
 * Expects multipart/form-data with field: "prescription"
 */
const uploadPrescription = asyncHandler(async (req, res) => {
  // req.file is populated by uploadPrescription middleware (Multer)
  const metadata = await processPrescriptionUpload(req.file)

  return ApiResponse.created(
    res,
    'Prescription image uploaded successfully. Ready for analysis.',
    metadata,
  )
})

export { uploadPrescription }