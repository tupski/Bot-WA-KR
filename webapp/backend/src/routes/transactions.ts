import { Router } from 'express'
import * as transactionController from '@/controllers/transactionController'
import { authenticateToken, requireUserOrAdmin, requireAdmin } from '@/middleware/auth'
import {
  validateCreateTransaction,
  validateUpdateTransaction,
  validateBulkDelete
} from '@/middleware/validation'

const router = Router()

// All transaction routes require authentication
router.use(authenticateToken)

// Get transactions with filtering and pagination
router.get('/',
  requireUserOrAdmin,
  transactionController.getTransactions
)

// Get transaction statistics
router.get('/stats',
  requireUserOrAdmin,
  transactionController.getTransactionStats
)

// Get transaction by ID
router.get('/:id',
  requireUserOrAdmin,
  transactionController.getTransactionById
)

// Create new transaction (admin only)
router.post('/',
  requireAdmin,
  validateCreateTransaction,
  transactionController.createTransaction
)

// Update transaction (admin only)
router.put('/:id',
  requireAdmin,
  validateUpdateTransaction,
  transactionController.updateTransaction
)

// Delete transaction (admin only)
router.delete('/:id',
  requireAdmin,
  transactionController.deleteTransaction
)

// Bulk delete transactions (admin only)
router.post('/bulk-delete',
  requireAdmin,
  validateBulkDelete,
  transactionController.bulkDeleteTransactions
)

export default router
