import { Router } from 'express'
import * as csController from '@/controllers/csController'
import { authenticateToken, requireUserOrAdmin } from '@/middleware/auth'

const router = Router()

// All CS routes require authentication
router.use(authenticateToken)
router.use(requireUserOrAdmin)

// Get all CS with optional date filtering
router.get('/',
  csController.getAllCS
)

// Get CS ranking/leaderboard
router.get('/ranking',
  csController.getCSRanking
)

// Get CS leaderboard with different metrics
router.get('/leaderboard',
  csController.getCSLeaderboard
)

// Get commission analysis for all or specific CS
router.get('/commission-analysis',
  csController.getCommissionAnalysis
)

// Compare multiple CS performance
router.post('/compare',
  csController.compareCS
)

// Get specific CS performance details
router.get('/:csName/performance',
  csController.getCSPerformance
)

// Get specific CS statistics
router.get('/:csName/stats',
  csController.getCSStats
)

// Get CS performance trends
router.get('/:csName/trends',
  csController.getCSTrends
)

export default router
