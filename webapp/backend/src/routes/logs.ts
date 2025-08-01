import { Router } from 'express'
import * as logController from '@/controllers/logController'
import { authenticateToken, requireUserOrAdmin, requireAdmin } from '@/middleware/auth'

const router = Router()

// All log routes require authentication
router.use(authenticateToken)

// Get logs with filtering and pagination (user or admin)
router.get('/',
  requireUserOrAdmin,
  logController.getLogs
)

// Get log statistics (user or admin)
router.get('/stats',
  requireUserOrAdmin,
  logController.getLogStats
)

// Get system health status (user or admin)
router.get('/system-health',
  requireUserOrAdmin,
  logController.getSystemHealth
)

// Get bot status (user or admin)
router.get('/bot-status',
  requireUserOrAdmin,
  logController.getBotStatus
)

// Get real-time stats for dashboard (user or admin)
router.get('/realtime-stats',
  requireUserOrAdmin,
  logController.getRealtimeStats
)

// Get system metrics (user or admin)
router.get('/system-metrics',
  requireUserOrAdmin,
  logController.getSystemMetrics
)

// Get available log levels (user or admin)
router.get('/levels',
  requireUserOrAdmin,
  logController.getLogLevels
)

// Get available log sources (user or admin)
router.get('/sources',
  requireUserOrAdmin,
  logController.getLogSources
)

// Create new log entry (user or admin)
router.post('/',
  requireUserOrAdmin,
  logController.createLog
)

// Export logs (admin only)
router.get('/export',
  requireAdmin,
  logController.exportLogs
)

// Cleanup old logs (admin only)
router.post('/cleanup',
  requireAdmin,
  logController.cleanupLogs
)

export default router
