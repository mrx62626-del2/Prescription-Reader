/**
 * @file health.routes.js
 * @description Routes for the health check endpoint.
 */

import { Router } from 'express'
import { getHealth } from '../controllers/health.controller.js'

const router = Router()

// GET /api/v1/health
router.get('/', getHealth)

export default router