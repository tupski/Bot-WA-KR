import { Request, Response } from 'express'
import { CSModel } from '@/models/CS'
import { asyncHandler, BadRequestError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export const getAllCS = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo } = req.query

  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string)) {
    throw new BadRequestError('dateFrom must be in YYYY-MM-DD format')
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('dateTo must be in YYYY-MM-DD format')
  }

  const csList = await CSModel.getAllCS(dateFrom as string, dateTo as string)

  res.json({
    success: true,
    data: {
      period: dateFrom && dateTo ? { dateFrom, dateTo } : null,
      cs: csList,
      total: csList.length
    }
  })
})

export const getCSPerformance = asyncHandler(async (req: Request, res: Response) => {
  const { csName } = req.params
  const { dateFrom, dateTo } = req.query

  if (!csName) {
    throw new BadRequestError('CS name is required')
  }

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  const performance = await CSModel.getCSPerformance(
    csName,
    dateFrom as string,
    dateTo as string
  )

  // Calculate summary statistics
  const summary = performance.reduce((acc, day) => ({
    totalBookings: acc.totalBookings + day.totalBookings,
    totalRevenue: acc.totalRevenue + day.totalCash + day.totalTransfer,
    totalCommission: acc.totalCommission + day.totalCommission,
    totalCash: acc.totalCash + day.totalCash,
    totalTransfer: acc.totalTransfer + day.totalTransfer
  }), {
    totalBookings: 0,
    totalRevenue: 0,
    totalCommission: 0,
    totalCash: 0,
    totalTransfer: 0
  })

  res.json({
    success: true,
    data: {
      csName,
      period: { dateFrom, dateTo },
      summary,
      dailyPerformance: performance
    }
  })
})

export const getCSRanking = asyncHandler(async (req: Request, res: Response) => {
  const { dateFrom, dateTo, limit = 20 } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  const limitNum = parseInt(limit as string)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    throw new BadRequestError('Limit must be between 1 and 100')
  }

  const ranking = await CSModel.getCSRanking(
    dateFrom as string,
    dateTo as string,
    limitNum
  )

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo },
      limit: limitNum,
      ranking
    }
  })
})

export const getCommissionAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { csName, dateFrom, dateTo } = req.query

  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string)) {
    throw new BadRequestError('dateFrom must be in YYYY-MM-DD format')
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('dateTo must be in YYYY-MM-DD format')
  }

  const analysis = await CSModel.getCommissionAnalysis(
    csName as string,
    dateFrom as string,
    dateTo as string
  )

  res.json({
    success: true,
    data: {
      filters: { csName, dateFrom, dateTo },
      analysis
    }
  })
})

export const getCSStats = asyncHandler(async (req: Request, res: Response) => {
  const { csName } = req.params
  const { dateFrom, dateTo } = req.query

  if (!csName) {
    throw new BadRequestError('CS name is required')
  }

  // Validate date format if provided
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string)) {
    throw new BadRequestError('dateFrom must be in YYYY-MM-DD format')
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('dateTo must be in YYYY-MM-DD format')
  }

  const stats = await CSModel.getCSStats(
    csName,
    dateFrom as string,
    dateTo as string
  )

  res.json({
    success: true,
    data: {
      csName,
      period: dateFrom && dateTo ? { dateFrom, dateTo } : null,
      stats
    }
  })
})

export const compareCS = asyncHandler(async (req: Request, res: Response) => {
  const { csNames, dateFrom, dateTo } = req.body

  if (!Array.isArray(csNames) || csNames.length === 0) {
    throw new BadRequestError('CS names array is required')
  }

  if (csNames.length > 10) {
    throw new BadRequestError('Cannot compare more than 10 CS at once')
  }

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  const comparison = await CSModel.getCSComparison(csNames, dateFrom, dateTo)

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo },
      csNames,
      comparison
    }
  })
})

export const getCSLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const { 
    dateFrom, 
    dateTo, 
    metric = 'revenue',
    limit = 10 
  } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  if (!['revenue', 'commission', 'bookings'].includes(metric as string)) {
    throw new BadRequestError('Metric must be revenue, commission, or bookings')
  }

  const limitNum = parseInt(limit as string)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    throw new BadRequestError('Limit must be between 1 and 50')
  }

  // Get ranking based on selected metric
  const ranking = await CSModel.getCSRanking(
    dateFrom as string,
    dateTo as string,
    limitNum
  )

  // Sort by selected metric
  let sortedRanking = [...ranking]
  switch (metric) {
    case 'commission':
      sortedRanking.sort((a, b) => b.totalCommission - a.totalCommission)
      break
    case 'bookings':
      sortedRanking.sort((a, b) => b.totalBookings - a.totalBookings)
      break
    default: // revenue
      sortedRanking.sort((a, b) => b.totalRevenue - a.totalRevenue)
  }

  // Update ranks based on new sorting
  sortedRanking = sortedRanking.map((cs, index) => ({
    ...cs,
    rank: index + 1
  }))

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo },
      metric,
      limit: limitNum,
      leaderboard: sortedRanking
    }
  })
})

export const getCSTrends = asyncHandler(async (req: Request, res: Response) => {
  const { csName } = req.params
  const { dateFrom, dateTo, groupBy = 'day' } = req.query

  if (!csName) {
    throw new BadRequestError('CS name is required')
  }

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  if (!['day', 'week', 'month'].includes(groupBy as string)) {
    throw new BadRequestError('GroupBy must be day, week, or month')
  }

  const performance = await CSModel.getCSPerformance(
    csName,
    dateFrom as string,
    dateTo as string
  )

  // Group data based on groupBy parameter
  let groupedData = performance
  if (groupBy === 'week') {
    // Group by week (simplified - group every 7 days)
    const weeklyData: any = {}
    performance.forEach(day => {
      const weekStart = new Date(day.date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          csName: day.csName,
          date: weekKey,
          totalBookings: 0,
          totalCash: 0,
          totalTransfer: 0,
          totalCommission: 0,
          averageCommission: 0,
          transactions: []
        }
      }
      
      weeklyData[weekKey].totalBookings += day.totalBookings
      weeklyData[weekKey].totalCash += day.totalCash
      weeklyData[weekKey].totalTransfer += day.totalTransfer
      weeklyData[weekKey].totalCommission += day.totalCommission
      weeklyData[weekKey].transactions.push(...day.transactions)
    })
    
    groupedData = Object.values(weeklyData).map((week: any) => ({
      ...week,
      averageCommission: week.totalBookings > 0 ? week.totalCommission / week.totalBookings : 0
    }))
  }

  res.json({
    success: true,
    data: {
      csName,
      period: { dateFrom, dateTo },
      groupBy,
      trends: groupedData
    }
  })

  logger.info(`CS trends requested for ${csName} by user ${req.user?.email}`)
})
