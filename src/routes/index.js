/**
 * @file routes/index.js
 * @description Root router — mounts all feature routers under /api/v1.
 *
 * Adding a new resource in a future sprint:
 *   1. Create src/routes/myFeature.routes.js
 *   2. Import it here
 *   3. router.use('/my-feature', myFeatureRouter)
 *
 * That's all — no changes required anywhere else.
 */

import { Router } from 'express'
import healthRouter from './health.routes.js'
import uploadRouter from './upload.routes.js'
import analysisRouter from './analysis.routes.js'
import authRouter from './auth.routes.js'

const router = Router()

// ── Mount feature routers ─────────────────────────────────────────────────────
router.use('/health', healthRouter)
router.use('/upload', uploadRouter)
router.use('/prescriptions', analysisRouter)
router.use('/auth', authRouter)

export default router