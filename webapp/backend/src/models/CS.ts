import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface CSInfo {
  name: string
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  averageCommission: number
  lastActivity: string
  isActive: boolean
}

export interface CSPerformanceDetail {
  csName: string
  date: string
  totalBookings: number
  totalCash: number
  totalTransfer: number
  totalCommission: number
  averageCommission: number
  transactions: CSTransaction[]
}

export interface CSTransaction {
  id: number
  unit: string
  location: string
  amount: number
  commission: number
  paymentMethod: string
  checkoutTime: string
  dateOnly: string
}

export interface CSRanking {
  rank: number
  csName: string
  totalRevenue: number
  totalCommission: number
  totalBookings: number
  averageCommission: number
  growthRate: number
}

export interface CommissionAnalysis {
  csName: string
  totalCommission: number
  averageCommission: number
  minCommission: number
  maxCommission: number
  commissionRate: number
  totalRevenue: number
}

export class CSModel {
  static async getAllCS(dateFrom?: string, dateTo?: string): Promise<CSInfo[]> {
    const db = await getDatabase()
    
    try {
      let query = `
        SELECT 
          cs_name,
          COUNT(*) as total_bookings,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission,
          AVG(commission) as average_commission,
          MAX(created_at) as last_activity
        FROM transactions
      `
      const params: any[] = []

      if (dateFrom && dateTo) {
        query += ' WHERE date_only BETWEEN ? AND ?'
        params.push(dateFrom, dateTo)
      }

      query += ' GROUP BY cs_name ORDER BY total_revenue DESC'

      const rows = await db.query(query, params)
      
      return rows.map((row: any) => ({
        name: row.cs_name,
        totalBookings: row.total_bookings || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalCommission: parseFloat(row.total_commission) || 0,
        averageCommission: parseFloat(row.average_commission) || 0,
        lastActivity: row.last_activity,
        isActive: true // Assume active if has recent transactions
      }))
    } catch (error) {
      logger.error('Error getting all CS:', error)
      throw error
    }
  }

  static async getCSPerformance(csName: string, dateFrom: string, dateTo: string): Promise<CSPerformanceDetail[]> {
    const db = await getDatabase()
    
    try {
      // Get daily performance summary
      const summaryQuery = `
        SELECT 
          date_only as date,
          COUNT(*) as total_bookings,
          SUM(CASE WHEN payment_method = 'Cash' THEN amount ELSE 0 END) as total_cash,
          SUM(CASE WHEN payment_method = 'Transfer' THEN amount ELSE 0 END) as total_transfer,
          SUM(commission) as total_commission,
          AVG(commission) as average_commission
        FROM transactions 
        WHERE cs_name = ? AND date_only BETWEEN ? AND ?
        GROUP BY date_only
        ORDER BY date_only ASC
      `
      
      const summaryRows = await db.query(summaryQuery, [csName, dateFrom, dateTo])
      
      // Get detailed transactions for each day
      const result: CSPerformanceDetail[] = []
      
      for (const summary of summaryRows) {
        const transactionsQuery = `
          SELECT id, unit, location, amount, commission, payment_method, checkout_time, date_only
          FROM transactions 
          WHERE cs_name = ? AND date_only = ?
          ORDER BY created_at ASC
        `
        
        const transactions = await db.query(transactionsQuery, [csName, summary.date])
        
        result.push({
          csName,
          date: summary.date,
          totalBookings: summary.total_bookings || 0,
          totalCash: parseFloat(summary.total_cash) || 0,
          totalTransfer: parseFloat(summary.total_transfer) || 0,
          totalCommission: parseFloat(summary.total_commission) || 0,
          averageCommission: parseFloat(summary.average_commission) || 0,
          transactions: transactions.map((t: any) => ({
            id: t.id,
            unit: t.unit,
            location: t.location,
            amount: parseFloat(t.amount) || 0,
            commission: parseFloat(t.commission) || 0,
            paymentMethod: t.payment_method,
            checkoutTime: t.checkout_time,
            dateOnly: t.date_only
          }))
        })
      }
      
      return result
    } catch (error) {
      logger.error('Error getting CS performance:', error)
      throw error
    }
  }

  static async getCSRanking(dateFrom: string, dateTo: string, limit: number = 20): Promise<CSRanking[]> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT 
          cs_name,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission,
          COUNT(*) as total_bookings,
          AVG(commission) as average_commission
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
        GROUP BY cs_name
        ORDER BY total_revenue DESC
        LIMIT ?
      `
      
      const rows = await db.query(query, [dateFrom, dateTo, limit])
      
      // Calculate growth rate (simplified - comparing with previous period)
      const periodDays = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24))
      const previousStart = new Date(new Date(dateFrom).getTime() - (periodDays * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      const previousEnd = new Date(new Date(dateFrom).getTime() - (24 * 60 * 60 * 1000)).toISOString().split('T')[0]
      
      const previousQuery = `
        SELECT 
          cs_name,
          SUM(amount) as total_revenue
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
        GROUP BY cs_name
      `
      
      const previousRows = await db.query(previousQuery, [previousStart, previousEnd])
      const previousData = new Map<string, number>(previousRows.map((row: any) => [row.cs_name, parseFloat(row.total_revenue) || 0]))

      return rows.map((row: any, index: number) => {
        const currentRevenue = parseFloat(row.total_revenue) || 0
        const previousRevenue = previousData.get(row.cs_name) || 0
        const growthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
        
        return {
          rank: index + 1,
          csName: row.cs_name,
          totalRevenue: currentRevenue,
          totalCommission: parseFloat(row.total_commission) || 0,
          totalBookings: row.total_bookings || 0,
          averageCommission: parseFloat(row.average_commission) || 0,
          growthRate
        }
      })
    } catch (error) {
      logger.error('Error getting CS ranking:', error)
      throw error
    }
  }

  static async getCommissionAnalysis(csName?: string, dateFrom?: string, dateTo?: string): Promise<CommissionAnalysis[]> {
    const db = await getDatabase()
    
    try {
      let query = `
        SELECT 
          cs_name,
          SUM(commission) as total_commission,
          AVG(commission) as average_commission,
          MIN(commission) as min_commission,
          MAX(commission) as max_commission,
          SUM(amount) as total_revenue,
          COUNT(*) as total_transactions
        FROM transactions
      `
      const params: any[] = []
      const conditions: string[] = []

      if (csName) {
        conditions.push('cs_name = ?')
        params.push(csName)
      }

      if (dateFrom && dateTo) {
        conditions.push('date_only BETWEEN ? AND ?')
        params.push(dateFrom, dateTo)
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }

      query += ' GROUP BY cs_name ORDER BY total_commission DESC'

      const rows = await db.query(query, params)
      
      return rows.map((row: any) => {
        const totalRevenue = parseFloat(row.total_revenue) || 0
        const totalCommission = parseFloat(row.total_commission) || 0
        
        return {
          csName: row.cs_name,
          totalCommission,
          averageCommission: parseFloat(row.average_commission) || 0,
          minCommission: parseFloat(row.min_commission) || 0,
          maxCommission: parseFloat(row.max_commission) || 0,
          commissionRate: totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0,
          totalRevenue
        }
      })
    } catch (error) {
      logger.error('Error getting commission analysis:', error)
      throw error
    }
  }

  static async getCSStats(csName: string, dateFrom?: string, dateTo?: string): Promise<{
    totalBookings: number
    totalRevenue: number
    totalCommission: number
    averageCommission: number
    averageBookingValue: number
    bestDay: { date: string, revenue: number }
    worstDay: { date: string, revenue: number }
    paymentMethodBreakdown: { cash: number, transfer: number }
    locationBreakdown: { location: string, count: number, revenue: number }[]
  }> {
    const db = await getDatabase()
    
    try {
      let whereClause = 'WHERE cs_name = ?'
      const params = [csName]

      if (dateFrom && dateTo) {
        whereClause += ' AND date_only BETWEEN ? AND ?'
        params.push(dateFrom, dateTo)
      }

      // Basic stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_bookings,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission,
          AVG(commission) as average_commission,
          AVG(amount) as average_booking_value
        FROM transactions ${whereClause}
      `
      
      const statsResult = await db.query(statsQuery, params)
      const stats = statsResult[0] || {}

      // Daily performance for best/worst day
      const dailyQuery = `
        SELECT 
          date_only,
          SUM(amount) as daily_revenue
        FROM transactions ${whereClause}
        GROUP BY date_only
        ORDER BY daily_revenue DESC
      `
      
      const dailyResults = await db.query(dailyQuery, params)
      const bestDay = dailyResults[0] || { date_only: null, daily_revenue: 0 }
      const worstDay = dailyResults[dailyResults.length - 1] || { date_only: null, daily_revenue: 0 }

      // Payment method breakdown
      const paymentQuery = `
        SELECT 
          payment_method,
          SUM(amount) as amount
        FROM transactions ${whereClause}
        GROUP BY payment_method
      `
      
      const paymentResults = await db.query(paymentQuery, params)
      const paymentBreakdown = { cash: 0, transfer: 0 }
      paymentResults.forEach((row: any) => {
        if (row.payment_method === 'Cash') {
          paymentBreakdown.cash = parseFloat(row.amount) || 0
        } else if (row.payment_method === 'Transfer') {
          paymentBreakdown.transfer = parseFloat(row.amount) || 0
        }
      })

      // Location breakdown
      const locationQuery = `
        SELECT 
          location,
          COUNT(*) as count,
          SUM(amount) as revenue
        FROM transactions ${whereClause}
        GROUP BY location
        ORDER BY revenue DESC
      `
      
      const locationResults = await db.query(locationQuery, params)
      const locationBreakdown = locationResults.map((row: any) => ({
        location: row.location,
        count: row.count || 0,
        revenue: parseFloat(row.revenue) || 0
      }))

      return {
        totalBookings: stats.total_bookings || 0,
        totalRevenue: parseFloat(stats.total_revenue) || 0,
        totalCommission: parseFloat(stats.total_commission) || 0,
        averageCommission: parseFloat(stats.average_commission) || 0,
        averageBookingValue: parseFloat(stats.average_booking_value) || 0,
        bestDay: {
          date: bestDay.date_only || '',
          revenue: parseFloat(bestDay.daily_revenue) || 0
        },
        worstDay: {
          date: worstDay.date_only || '',
          revenue: parseFloat(worstDay.daily_revenue) || 0
        },
        paymentMethodBreakdown: paymentBreakdown,
        locationBreakdown
      }
    } catch (error) {
      logger.error('Error getting CS stats:', error)
      throw error
    }
  }

  static async getCSComparison(csNames: string[], dateFrom: string, dateTo: string): Promise<{
    [csName: string]: {
      totalBookings: number
      totalRevenue: number
      totalCommission: number
      averageCommission: number
    }
  }> {
    const db = await getDatabase()
    
    try {
      const placeholders = csNames.map(() => '?').join(',')
      const query = `
        SELECT 
          cs_name,
          COUNT(*) as total_bookings,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission,
          AVG(commission) as average_commission
        FROM transactions 
        WHERE cs_name IN (${placeholders}) AND date_only BETWEEN ? AND ?
        GROUP BY cs_name
      `
      
      const params = [...csNames, dateFrom, dateTo]
      const rows = await db.query(query, params)
      
      const result: any = {}
      rows.forEach((row: any) => {
        result[row.cs_name] = {
          totalBookings: row.total_bookings || 0,
          totalRevenue: parseFloat(row.total_revenue) || 0,
          totalCommission: parseFloat(row.total_commission) || 0,
          averageCommission: parseFloat(row.average_commission) || 0
        }
      })
      
      // Fill in missing CS with zero values
      csNames.forEach(csName => {
        if (!result[csName]) {
          result[csName] = {
            totalBookings: 0,
            totalRevenue: 0,
            totalCommission: 0,
            averageCommission: 0
          }
        }
      })
      
      return result
    } catch (error) {
      logger.error('Error getting CS comparison:', error)
      throw error
    }
  }
}
