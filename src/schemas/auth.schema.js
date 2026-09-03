/**
 * @file auth.schema.js
 * @description Zod validation schemas for authentication requests/responses.
 *
 * Password complexity rule: minimum 8 characters, at least one uppercase
 * letter, one lowercase letter, one digit, and one special character.
 * This is enforced once here — never duplicated in the service layer.
 */

import { z } from 'zod'

const SUPPORTED_LANGUAGES = ['en', 'ur', 'ps', 'pa', 'ar']

// ── Shared primitives ─────────────────────────────────────────────────────────

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Email is required')
  .email('Please provide a valid email address')

const passwordComplexity = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')

// ── Request schemas ────────────────────────────────────────────────────────────

export const registerRequestSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must not exceed 100 characters'),

  email: emailField,

  password: passwordComplexity,

  preferredLanguage: z
    .enum(SUPPORTED_LANGUAGES, {
      errorMap: () => ({ message: `Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` }),
    })
    .optional()
    .default('en'),
})

export const loginRequestSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
})

export const refreshTokenRequestSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
})

// ── Response schemas (used for documentation / optional runtime shaping) ───────

export const userResponseSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  preferredLanguage: z.string(),
})

export const tokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
})