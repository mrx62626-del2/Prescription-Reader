/**
 * @file auth.routes.js
 * @description Routes for authentication and user session management.
 *
 * Public:    register, login, refresh
 * Protected: me, logout (require a valid access token via requireAuth)
 */

import { Router } from 'express'
import {
  registerHandler,
  loginHandler,
  refreshHandler,
  getMeHandler,
  logoutHandler,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

// ── Public routes ──────────────────────────────────────────────────────────────
router.post('/register', registerHandler)
router.post('/login', loginHandler)
router.post('/refresh', refreshHandler)

// ── Protected routes ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, getMeHandler)
router.post('/logout', requireAuth, logoutHandler)

export default router