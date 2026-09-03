/**
 * @file auth.controller.js
 * @description HTTP handlers for all authentication endpoints.
 *
 * Responsibilities (HTTP layer only):
 *   - Validate request bodies against Zod schemas
 *   - Delegate to authService for business logic
 *   - Shape responses via ApiResponse
 */

import {
  registerRequestSchema,
  loginRequestSchema,
  refreshTokenRequestSchema,
} from '../schemas/auth.schema.js'
import { register, login, refresh, logout, getCurrentUser } from '../services/auth.service.js'
import ApiResponse from '../utils/ApiResponse.js'
import ApiError from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'

/**
 * Validates req.body against a Zod schema, throwing a structured
 * ApiError (422) on failure so the global errorHandler formats it
 * consistently with every other validation error in the app.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {object} body
 * @returns {object} parsed/validated data
 */
const validateBody = (schema, body) => {
  const result = schema.safeParse(body)

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }))
    throw ApiError.unprocessable('Validation failed', errors)
  }

  return result.data
}

/**
 * POST /api/v1/auth/register
 */
const registerHandler = asyncHandler(async (req, res) => {
  const validated = validateBody(registerRequestSchema, req.body)
  const { user } = await register(validated)

  return ApiResponse.created(res, 'User registered successfully', { user })
})

/**
 * POST /api/v1/auth/login
 */
const loginHandler = asyncHandler(async (req, res) => {
  const validated = validateBody(loginRequestSchema, req.body)
  const result = await login(validated)

  return ApiResponse.success(res, 200, 'Login successful', result)
})

/**
 * POST /api/v1/auth/refresh
 */
const refreshHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = validateBody(refreshTokenRequestSchema, req.body)
  const tokens = await refresh(refreshToken)

  return ApiResponse.success(res, 200, 'Token refreshed successfully', tokens)
})

/**
 * GET /api/v1/auth/me
 * Protected — requires requireAuth middleware to have run first.
 */
const getMeHandler = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.user._id.toString())

  return ApiResponse.success(res, 200, 'Current user retrieved successfully', { user })
})

/**
 * POST /api/v1/auth/logout
 * Protected — requires requireAuth middleware to have run first.
 */
const logoutHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = validateBody(refreshTokenRequestSchema, req.body)
  await logout(refreshToken)

  return ApiResponse.success(res, 200, 'Logout successful', null)
})

export { registerHandler, loginHandler, refreshHandler, getMeHandler, logoutHandler }