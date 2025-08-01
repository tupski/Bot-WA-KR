import { Request, Response } from 'express'
import { ReportModel } from '@/models/Report'
import { asyncHandler, BadRequestError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export const getDailyReport = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.params

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestError('Valid date in YYYY-MM-DD format is required')
  }

  const dailySummary = await ReportModel.getDailySummary(date)

  res.json({
    success: true,
    data: {
      date,
      summary: dailySummary
    }
  })
})

export const getWeeklyReport = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query

  if (!startDate || !endDate) {
    throw new BadRequestError('Start date and end date are required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate as string) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  const [dailySummaries, csPerformance, locationStats, paymentStats] = await Promise.all([
    ReportModel.getDailySummaries(startDate as string, endDate as string),
    ReportModel.getCSPerformance(startDate as string, endDate as string),
    ReportModel.getLocationStats(startDate as string, endDate as string),
    ReportModel.getPaymentMethodStats(startDate as string, endDate as string)
  ])

  // Calculate totals
  const totals = dailySummaries.reduce((acc, day) => ({
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
      period: { startDate, endDate },
      totals,
      dailySummaries,
      csPerformance,
      locationStats,
      paymentStats
    }
  })
})

export const getMonthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const { year, month } = req.params

  const yearNum = parseInt(year)
  const monthNum = parseInt(month)

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new BadRequestError('Valid year and month (1-12) are required')
  }

  // Calculate date range for the month
  const startDate = `${year}-${month.padStart(2, '0')}-01`
  const lastDay = new Date(yearNum, monthNum, 0).getDate()
  const endDate = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`

  const [revenueByDay, csPerformance, locationStats, paymentStats, topPerformers] = await Promise.all([
    ReportModel.getRevenueByPeriod(startDate, endDate, 'day'),
    ReportModel.getCSPerformance(startDate, endDate),
    ReportModel.getLocationStats(startDate, endDate),
    ReportModel.getPaymentMethodStats(startDate, endDate),
    ReportModel.getTopPerformers(startDate, endDate, 'cs', 5)
  ])

  // Calculate monthly totals
  const totals = revenueByDay.reduce((acc, day) => ({
    totalBookings: acc.totalBookings + day.totalBookings,
    totalRevenue: acc.totalRevenue + day.totalRevenue,
    totalCommission: acc.totalCommission + day.totalCommission,
    netRevenue: acc.netRevenue + day.netRevenue
  }), {
    totalBookings: 0,
    totalRevenue: 0,
    totalCommission: 0,
    netRevenue: 0
  })

  res.json({
    success: true,
    data: {
      period: { year: yearNum, month: monthNum, startDate, endDate },
      totals,
      revenueByDay,
      csPerformance,
      locationStats,
      paymentStats,
      topPerformers
    }
  })
})

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const {
    dateFrom,
    dateTo,
    groupBy = 'day',
    csName,
    location
  } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  if (!['day', 'week', 'month'].includes(groupBy as string)) {
    throw new BadRequestError('GroupBy must be day, week, or month')
  }

  const [revenueByPeriod, csPerformance, locationStats, paymentStats] = await Promise.all([
    ReportModel.getRevenueByPeriod(dateFrom as string, dateTo as string, groupBy as 'day' | 'week' | 'month'),
    ReportModel.getCSPerformance(dateFrom as string, dateTo as string, csName as string),
    ReportModel.getLocationStats(dateFrom as string, dateTo as string),
    ReportModel.getPaymentMethodStats(dateFrom as string, dateTo as string)
  ])

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo, groupBy },
      filters: { csName, location },
      revenueByPeriod,
      csPerformance,
      locationStats,
      paymentStats
    }
  })
})

export const getGrowthAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const {
    currentStart,
    currentEnd,
    previousStart,
    previousEnd
  } = req.query

  if (!currentStart || !currentEnd || !previousStart || !previousEnd) {
    throw new BadRequestError('All date parameters are required')
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (![currentStart, currentEnd, previousStart, previousEnd].every(date => dateRegex.test(date as string))) {
    throw new BadRequestError('All dates must be in YYYY-MM-DD format')
  }

  const growthAnalysis = await ReportModel.getGrowthAnalysis(
    currentStart as string,
    currentEnd as string,
    previousStart as string,
    previousEnd as string
  )

  res.json({
    success: true,
    data: {
      periods: {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd }
      },
      analysis: growthAnalysis
    }
  })
})

export const getTopPerformers = asyncHandler(async (req: Request, res: Response) => {
  const {
    dateFrom,
    dateTo,
    type = 'cs',
    limit = 10
  } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  if (!['cs', 'location'].includes(type as string)) {
    throw new BadRequestError('Type must be cs or location')
  }

  const limitNum = parseInt(limit as string)
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
    throw new BadRequestError('Limit must be between 1 and 50')
  }

  const topPerformers = await ReportModel.getTopPerformers(
    dateFrom as string,
    dateTo as string,
    type as 'cs' | 'location',
    limitNum
  )

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo },
      type,
      limit: limitNum,
      performers: topPerformers
    }
  })
})

export const getCSPerformance = asyncHandler(async (req: Request, res: Response) => {
  const {
    dateFrom,
    dateTo,
    csName
  } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFrom as string) || !/^\d{4}-\d{2}-\d{2}$/.test(dateTo as string)) {
    throw new BadRequestError('Dates must be in YYYY-MM-DD format')
  }

  const csPerformance = await ReportModel.getCSPerformance(
    dateFrom as string,
    dateTo as string,
    csName as string
  )

  res.json({
    success: true,
    data: {
      period: { dateFrom, dateTo },
      filters: { csName },
      performance: csPerformance
    }
  })
})

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  const {
    type = 'weekly',
    format = 'json',
    dateFrom,
    dateTo
  } = req.query

  if (!dateFrom || !dateTo) {
    throw new BadRequestError('Date range is required')
  }

  if (!['json', 'csv'].includes(format as string)) {
    throw new BadRequestError('Format must be json or csv')
  }

  // For now, just return JSON. CSV export can be implemented later
  const reportData = await ReportModel.getRevenueByPeriod(
    dateFrom as string,
    dateTo as string,
    'day'
  )

  if (format === 'csv') {
    // Simple CSV implementation
    const csvHeader = 'Period,Total Revenue,Total Commission,Net Revenue,Total Bookings\n'
    const csvData = reportData.map(row => 
      `${row.period},${row.totalRevenue},${row.totalCommission},${row.netRevenue},${row.totalBookings}`
    ).join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="report-${dateFrom}-${dateTo}.csv"`)
    res.send(csvHeader + csvData)
  } else {
    res.json({
      success: true,
      data: {
        type,
        period: { dateFrom, dateTo },
        report: reportData
      }
    })
  }

  logger.info(`Report exported: ${type} (${format}) for ${dateFrom} to ${dateTo} by user ${req.user?.email}`)
})
