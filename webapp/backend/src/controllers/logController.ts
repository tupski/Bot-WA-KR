import { Request, Response } from 'express'
import { LogModel, LogFilters } from '@/models/Log'
import { asyncHandler, BadRequestError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export const getLogs = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 50,
    level,
    source,
    dateFrom,
    dateTo,
    search,
    userId
  } = req.query

  // Validate pagination parameters
  const pageNum = parseInt(page as string)
  const limitNum = parseInt(limit as string)

  if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
    throw new BadRequestError('Invalid pagination parameters')
  }

  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}/.test(dateFrom as string)) {
    throw new BadRequestError('dateFrom must be in YYYY-MM-DD format')
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}/.test(dateTo as string)) {
    throw new BadRequestError('dateTo must be in YYYY-MM-DD format')
  }

  // Build filters
  const filters: LogFilters = {}
  if (level) filters.level = level as string
  if (source) filters.source = source as string
  if (dateFrom) filters.dateFrom = dateFrom as string
  if (dateTo) filters.dateTo = dateTo as string
  if (search) filters.search = search as string
  if (userId) filters.userId = parseInt(userId as string)

  const { logs, total } = await LogModel.findLogs(filters, pageNum, limitNum)

  const totalPages = Math.ceil(total / limitNum)

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      filters
    }
  })
})

export const getLogStats = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query

  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}/.test(dateFrom as string)) {
    throw new BadRequestError('dateFrom must be in YYYY-MM-DD format')
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}/.test(dateTo as string)) {
    throw new BadRequestError('dateTo must be in YYYY-MM-DD format')
  }

  const stats = await LogModel.getLogStats(dateFrom as string, dateTo as string)

  res.json({
    success: true,
    data: {
      period: dateFrom && dateTo ? { dateFrom, dateTo } : null,
      stats
    }
  })
})

export const getSystemHealth = asyncHandler(async (req: Request, res: Response) => {
  const health = await LogModel.getSystemHealth()

  res.json({
    success: true,
    data: {
      health,
      timestamp: new Date().toISOString()
    }
  })
})

export const getBotStatus = asyncHandler(async (req: Request, res: Response) => {
  const status = await LogModel.getBotStatus()

  res.json({
    success: true,
    data: {
      status,
      timestamp: new Date().toISOString()
    }
  })
})

export const createLog = asyncHandler(async (req: Request, res: Response) => {
  const { level, message, source, details } = req.body

  if (!level || !message) {
    throw new BadRequestError('Level and message are required')
  }

  if (!['error', 'warn', 'info', 'debug'].includes(level)) {
    throw new BadRequestError('Level must be error, warn, info, or debug')
  }

  const logEntry = await LogModel.createLog({
    level,
    message,
    source,
    details,
    userId: req.user?.id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  })

  res.status(201).json({
    success: true,
    data: logEntry,
    message: 'Log entry created successfully'
  })
})

export const cleanupLogs = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can cleanup logs
  if (req.user?.role !== 'admin') {
    throw new BadRequestError('Only admin can cleanup logs')
  }

  const { daysToKeep = 30 } = req.body

  if (typeof daysToKeep !== 'number' || daysToKeep < 1 || daysToKeep > 365) {
    throw new BadRequestError('daysToKeep must be between 1 and 365')
  }

  const deletedCount = await LogModel.cleanupOldLogs(daysToKeep)

  logger.info(`Log cleanup performed by user ${req.user?.email}: ${deletedCount} entries deleted`)

  res.json({
    success: true,
    data: {
      deletedCount,
      daysToKeep
    },
    message: `Cleaned up ${deletedCount} old log entries`
  })
})

export const getLogLevels = asyncHandler(async (req: Request, res: Response) => {
  const levels = [
    { value: 'error', label: 'Error', color: '#ef4444' },
    { value: 'warn', label: 'Warning', color: '#f59e0b' },
    { value: 'info', label: 'Info', color: '#3b82f6' },
    { value: 'debug', label: 'Debug', color: '#6b7280' }
  ]

  res.json({
    success: true,
    data: {
      levels
    }
  })
})

export const getLogSources = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query

  const stats = await LogModel.getLogStats(dateFrom as string, dateTo as string)
  const sources = stats.topSources.map(s => s.source)

  res.json({
    success: true,
    data: {
      sources
    }
  })
})

export const exportLogs = asyncHandler(async (req: Request, res: Response) => {
  const {
    format = 'json',
    level,
    source,
    dateFrom,
    dateTo,
    search,
    limit = 1000
  } = req.query

  if (!['json', 'csv'].includes(format as string)) {
    throw new BadRequestError('Format must be json or csv')
  }

  const limitNum = parseInt(limit as string)
  if (limitNum > 10000) {
    throw new BadRequestError('Export limit cannot exceed 10,000 records')
  }

  // Build filters
  const filters: LogFilters = {}
  if (level) filters.level = level as string
  if (source) filters.source = source as string
  if (dateFrom) filters.dateFrom = dateFrom as string
  if (dateTo) filters.dateTo = dateTo as string
  if (search) filters.search = search as string

  const { logs } = await LogModel.findLogs(filters, 1, limitNum)

  if (format === 'csv') {
    // Simple CSV implementation
    const csvHeader = 'Timestamp,Level,Source,Message,User ID,IP Address\n'
    const csvData = logs.map(log => 
      `"${log.timestamp}","${log.level}","${log.source || ''}","${log.message.replace(/"/g, '""')}","${log.userId || ''}","${log.ipAddress || ''}"`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csvHeader + csvData)
  } else {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="logs-${new Date().toISOString().split('T')[0]}.json"`)
    
    res.json({
      success: true,
      data: {
        logs,
        exportedAt: new Date().toISOString(),
        filters,
        total: logs.length
      }
    })
  }

  logger.info(`Logs exported (${format}) by user ${req.user?.email}: ${logs.length} entries`)
})

export const getRealtimeStats = asyncHandler(async (req: Request, res: Response) => {
  // Get real-time statistics for dashboard
  const [health, botStatus, recentStats] = await Promise.all([
    LogModel.getSystemHealth(),
    LogModel.getBotStatus(),
    LogModel.getLogStats(
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 24 hours
      new Date().toISOString().split('T')[0]
    )
  ])

  res.json({
    success: true,
    data: {
      health,
      botStatus,
      recentStats,
      timestamp: new Date().toISOString()
    }
  })
})

export const getSystemMetrics = asyncHandler(async (req: Request, res: Response) => {
  const { hours = 24 } = req.query

  const hoursNum = parseInt(hours as string)
  if (hoursNum < 1 || hoursNum > 168) { // Max 1 week
    throw new BadRequestError('Hours must be between 1 and 168')
  }

  // Get metrics for the specified time period
  const startTime = new Date(Date.now() - hoursNum * 60 * 60 * 1000).toISOString()
  const endTime = new Date().toISOString()

  const stats = await LogModel.getLogStats(startTime, endTime)
  const health = await LogModel.getSystemHealth()

  res.json({
    success: true,
    data: {
      period: { hours: hoursNum, startTime, endTime },
      metrics: {
        ...stats,
        systemHealth: health
      }
    }
  })
})
