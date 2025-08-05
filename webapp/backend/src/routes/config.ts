import { Router } from 'express'
import * as configController from '../controllers/configController'
import { authenticateToken, requireAdmin, requireUserOrAdmin } from '../middleware/auth'

const router = Router()

// All config routes require authentication
router.use(authenticateToken)

// Get full system configuration (user or admin)
router.get('/',
  requireUserOrAdmin,
  configController.getSystemConfig
)

// Update system configuration (admin only)
router.put('/',
  requireAdmin,
  configController.updateSystemConfig
)

// Get specific configuration section (user or admin)
router.get('/section/:section',
  requireUserOrAdmin,
  configController.getConfigSection
)

// Update specific configuration section (admin only)
router.put('/section/:section',
  requireAdmin,
  configController.updateConfigSection
)

// Apartment configuration
router.get('/apartments',
  requireUserOrAdmin,
  configController.getApartments
)

router.put('/apartments',
  requireAdmin,
  configController.updateApartments
)

// Commission rates
router.get('/commission',
  requireUserOrAdmin,
  configController.getCommissionRates
)

router.put('/commission',
  requireAdmin,
  configController.updateCommissionRates
)

// Owner numbers
router.get('/owners',
  requireUserOrAdmin,
  configController.getOwnerNumbers
)

router.put('/owners',
  requireAdmin,
  configController.updateOwnerNumbers
)

// Configuration management
router.post('/reset',
  requireAdmin,
  configController.resetConfiguration
)

router.get('/export',
  requireAdmin,
  configController.exportConfiguration
)

router.post('/import',
  requireAdmin,
  configController.importConfiguration
)

router.get('/validate',
  requireUserOrAdmin,
  configController.validateConfiguration
)

export default router
