import { Request, Response } from 'express'
import { TransactionModel, TransactionFilters, PaginationParams } from '@/models/Transaction'
import { asyncHandler, BadRequestError, NotFoundError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC',
    location,
    csName,
    paymentMethod,
    dateFrom,
    dateTo,
    search,
    skipFinancial
  } = req.query

  // Validate pagination parameters
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    throw new BadRequestError('Invalid pagination parameters')
  }

  // Build filters
  const filters: TransactionFilters = {}
  if (location) filters.location = location as string
  if (csName) filters.csName = csName as string
  if (paymentMethod) filters.paymentMethod = paymentMethod as string
  if (dateFrom) filters.dateFrom = dateFrom as string
  if (dateTo) filters.dateTo = dateTo as string
  if (search) filters.search = search as string
  if (skipFinancial !== undefined) filters.skipFinancial = skipFinancial === 'true'

  // Build pagination
  const pagination: PaginationParams = {
    page: pageNum,
    limit: limitNum,
    sortBy: sortBy as string,
    sortOrder: (sortOrder as string).toUpperCase() as 'ASC' | 'DESC'
  }

  const result = await TransactionModel.findAll(filters, pagination)

  res.json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    filters
  })
})

export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const transactionId = parseInt(id)

  if (isNaN(transactionId)) {
    throw new BadRequestError('Invalid transaction ID')
  }

  const transaction = await TransactionModel.findById(transactionId)

  if (!transaction) {
    throw new NotFoundError('Transaction not found')
  }

  res.json({
    success: true,
    data: transaction
  })
})

export const createTransaction = asyncHandler(async (req: Request, res: Response) => {
  const {
    messageId,
    location,
    unit,
    checkoutTime,
    duration,
    paymentMethod,
    csName,
    commission,
    amount,
    netAmount,
    skipFinancial,
    dateOnly
  } = req.body

  // Validation
  if (!messageId || !location || !unit || !checkoutTime || !duration || !paymentMethod || !csName || !dateOnly) {
    throw new BadRequestError('Missing required fields')
  }

  if (commission === undefined || amount === undefined) {
    throw new BadRequestError('Commission and amount are required')
  }

  if (!['Cash', 'Transfer'].includes(paymentMethod)) {
    throw new BadRequestError('Payment method must be Cash or Transfer')
  }

  // Check if transaction with same message ID already exists
  const existingTransaction = await TransactionModel.findByMessageId(messageId)
  if (existingTransaction) {
    throw new BadRequestError('Transaction with this message ID already exists')
  }

  const transaction = await TransactionModel.create({
    messageId,
    location,
    unit,
    checkoutTime,
    duration,
    paymentMethod,
    csName,
    commission: parseFloat(commission),
    amount: parseFloat(amount),
    netAmount: netAmount ? parseFloat(netAmount) : undefined,
    skipFinancial: Boolean(skipFinancial),
    dateOnly
  })

  logger.info(`Transaction created via API: ID ${transaction.id} by user ${req.user?.email}`)

  res.status(201).json({
    success: true,
    data: transaction,
    message: 'Transaction created successfully'
  })
})

export const updateTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const transactionId = parseInt(id)

  if (isNaN(transactionId)) {
    throw new BadRequestError('Invalid transaction ID')
  }

  // Check if transaction exists
  const existingTransaction = await TransactionModel.findById(transactionId)
  if (!existingTransaction) {
    throw new NotFoundError('Transaction not found')
  }

  const {
    location,
    unit,
    checkoutTime,
    duration,
    paymentMethod,
    csName,
    commission,
    amount,
    netAmount,
    skipFinancial
  } = req.body

  // Validate payment method if provided
  if (paymentMethod && !['Cash', 'Transfer'].includes(paymentMethod)) {
    throw new BadRequestError('Payment method must be Cash or Transfer')
  }

  const updateData: any = {}
  if (location !== undefined) updateData.location = location
  if (unit !== undefined) updateData.unit = unit
  if (checkoutTime !== undefined) updateData.checkoutTime = checkoutTime
  if (duration !== undefined) updateData.duration = duration
  if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod
  if (csName !== undefined) updateData.csName = csName
  if (commission !== undefined) updateData.commission = parseFloat(commission)
  if (amount !== undefined) updateData.amount = parseFloat(amount)
  if (netAmount !== undefined) updateData.netAmount = parseFloat(netAmount)
  if (skipFinancial !== undefined) updateData.skipFinancial = Boolean(skipFinancial)

  const transaction = await TransactionModel.update(transactionId, updateData)

  logger.info(`Transaction updated via API: ID ${transactionId} by user ${req.user?.email}`)

  res.json({
    success: true,
    data: transaction,
    message: 'Transaction updated successfully'
  })
})

export const deleteTransaction = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const transactionId = parseInt(id)

  if (isNaN(transactionId)) {
    throw new BadRequestError('Invalid transaction ID')
  }

  // Check if transaction exists
  const existingTransaction = await TransactionModel.findById(transactionId)
  if (!existingTransaction) {
    throw new NotFoundError('Transaction not found')
  }

  const deleted = await TransactionModel.delete(transactionId)

  if (!deleted) {
    throw new Error('Failed to delete transaction')
  }

  logger.info(`Transaction deleted via API: ID ${transactionId} by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Transaction deleted successfully'
  })
})

export const getTransactionStats = asyncHandler(async (req: Request, res: Response) => {
  const {
    location,
    csName,
    paymentMethod,
    dateFrom,
    dateTo,
    skipFinancial
  } = req.query

  // Build filters
  const filters: TransactionFilters = {}
  if (location) filters.location = location as string
  if (csName) filters.csName = csName as string
  if (paymentMethod) filters.paymentMethod = paymentMethod as string
  if (dateFrom) filters.dateFrom = dateFrom as string
  if (dateTo) filters.dateTo = dateTo as string
  if (skipFinancial !== undefined) filters.skipFinancial = skipFinancial === 'true'

  const stats = await TransactionModel.getStats(filters)

  res.json({
    success: true,
    data: stats,
    filters
  })
})

export const bulkDeleteTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError('Transaction IDs array is required')
  }

  if (ids.length > 100) {
    throw new BadRequestError('Cannot delete more than 100 transactions at once')
  }

  const results = {
    deleted: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const id of ids) {
    try {
      const transactionId = parseInt(id)
      if (isNaN(transactionId)) {
        results.failed++
        results.errors.push(`Invalid ID: ${id}`)
        continue
      }

      const deleted = await TransactionModel.delete(transactionId)
      if (deleted) {
        results.deleted++
      } else {
        results.failed++
        results.errors.push(`Transaction not found: ${id}`)
      }
    } catch (error: any) {
      results.failed++
      results.errors.push(`Error deleting ${id}: ${error.message}`)
    }
  }

  logger.info(`Bulk delete completed by user ${req.user?.email}: ${results.deleted} deleted, ${results.failed} failed`)

  res.json({
    success: true,
    data: results,
    message: `Bulk delete completed: ${results.deleted} deleted, ${results.failed} failed`
  })
})
