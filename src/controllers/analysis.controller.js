/**
 * @file analysis.controller.js
 * @description HTTP handler for the prescription analysis endpoint.
 *
 * [Sprint 3 UPDATE] Returns the structured, validated prescription
 * object instead of raw Gemini text.
 */

import { analyzePrescriptionImage } from '../services/analysis.service.js'
import ApiResponse from '../utils/ApiResponse.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * POST /api/v1/prescriptions/analyze
 *
 * Expects multipart/form-data with field: "prescription"
 */
const analyzePrescription = asyncHandler(async (req, res) => {
  const structuredPrescription = await analyzePrescriptionImage(req.file)

  return ApiResponse.success(
    res,
    200,
    'Prescription analyzed successfully',
    structuredPrescription,
  )
})

export { analyzePrescription }