import { Router } from 'express'
import * as reportController from '@/controllers/reportController'
import { authenticateToken, requireUserOrAdmin } from '@/middleware/auth'

const router = Router()

// All report routes require authentication
router.use(authenticateToken)
router.use(requireUserOrAdmin)

// Daily report for specific date
router.get('/daily/:date',
  reportController.getDailyReport
)

// Weekly report with date range
router.get('/weekly',
  reportController.getWeeklyReport
)

// Monthly report for specific year/month
router.get('/monthly/:year/:month',
  reportController.getMonthlyReport
)

// General analytics with flexible filtering
router.get('/analytics',
  reportController.getAnalytics
)

// Growth analysis comparing two periods
router.get('/growth',
  reportController.getGrowthAnalysis
)

// Top performers (CS or locations)
router.get('/top-performers',
  reportController.getTopPerformers
)

// CS performance analysis
router.get('/cs-performance',
  reportController.getCSPerformance
)

// Export reports in various formats
router.get('/export',
  reportController.exportReport
)

export default router
