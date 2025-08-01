import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface DailySummary {
  id: number
  date: string
  totalBookings: number
  totalCash: number
  totalTransfer: number
  totalGross: number
  totalCommission: number
  createdAt: string
}

export interface CSSummary {
  id: number
  date: string
  csName: string
  totalBookings: number
  totalCash: number
  totalTransfer: number
  totalCommission: number
  createdAt: string
}

export interface LocationStats {
  location: string
  totalBookings: number
  totalRevenue: number
  percentage: number
}

export interface CSPerformance {
  csName: string
  totalBookings: number
  totalCash: number
  totalTransfer: number
  totalCommission: number
  averageCommission: number
  date?: string
}

export interface RevenueByPeriod {
  period: string
  totalRevenue: number
  totalCommission: number
  netRevenue: number
  totalBookings: number
}

export interface PaymentMethodStats {
  cash: {
    count: number
    amount: number
    percentage: number
  }
  transfer: {
    count: number
    amount: number
    percentage: number
  }
}

export class ReportModel {
  static async getDailySummary(date: string): Promise<DailySummary | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM daily_summary WHERE date = ?'
      const rows = await db.query(query, [date])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToDailySummary(rows[0])
    } catch (error) {
      logger.error('Error getting daily summary:', error)
      throw error
    }
  }

  static async getDailySummaries(dateFrom: string, dateTo: string): Promise<DailySummary[]> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT * FROM daily_summary 
        WHERE date BETWEEN ? AND ? 
        ORDER BY date ASC
      `
      const rows = await db.query(query, [dateFrom, dateTo])
      
      return rows.map((row: any) => this.mapRowToDailySummary(row))
    } catch (error) {
      logger.error('Error getting daily summaries:', error)
      throw error
    }
  }

  static async getCSPerformance(dateFrom: string, dateTo: string, csName?: string): Promise<CSPerformance[]> {
    const db = await getDatabase()
    
    try {
      let query = `
        SELECT 
          cs_name,
          SUM(total_bookings) as total_bookings,
          SUM(total_cash) as total_cash,
          SUM(total_transfer) as total_transfer,
          SUM(total_commission) as total_commission,
          AVG(total_commission / NULLIF(total_bookings, 0)) as average_commission
        FROM cs_summary 
        WHERE date BETWEEN ? AND ?
      `
      const params = [dateFrom, dateTo]

      if (csName) {
        query += ' AND cs_name = ?'
        params.push(csName)
      }

      query += ' GROUP BY cs_name ORDER BY total_commission DESC'

      const rows = await db.query(query, params)
      
      return rows.map((row: any) => ({
        csName: row.cs_name,
        totalBookings: row.total_bookings || 0,
        totalCash: parseFloat(row.total_cash) || 0,
        totalTransfer: parseFloat(row.total_transfer) || 0,
        totalCommission: parseFloat(row.total_commission) || 0,
        averageCommission: parseFloat(row.average_commission) || 0
      }))
    } catch (error) {
      logger.error('Error getting CS performance:', error)
      throw error
    }
  }

  static async getLocationStats(dateFrom: string, dateTo: string): Promise<LocationStats[]> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT 
          location,
          COUNT(*) as total_bookings,
          SUM(amount) as total_revenue
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
        GROUP BY location
        ORDER BY total_revenue DESC
      `
      const rows = await db.query(query, [dateFrom, dateTo])
      
      // Calculate total for percentage
      const totalRevenue = rows.reduce((sum: number, row: any) => sum + (parseFloat(row.total_revenue) || 0), 0)
      
      return rows.map((row: any) => {
        const revenue = parseFloat(row.total_revenue) || 0
        return {
          location: row.location,
          totalBookings: row.total_bookings || 0,
          totalRevenue: revenue,
          percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0
        }
      })
    } catch (error) {
      logger.error('Error getting location stats:', error)
      throw error
    }
  }

  static async getRevenueByPeriod(
    dateFrom: string, 
    dateTo: string, 
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueByPeriod[]> {
    const db = await getDatabase()
    
    try {
      let dateFormat: string
      switch (groupBy) {
        case 'week':
          dateFormat = "strftime('%Y-W%W', date_only)"
          break
        case 'month':
          dateFormat = "strftime('%Y-%m', date_only)"
          break
        default:
          dateFormat = 'date_only'
      }

      const query = `
        SELECT 
          ${dateFormat} as period,
          SUM(amount) as total_revenue,
          SUM(commission) as total_commission,
          SUM(net_amount) as net_revenue,
          COUNT(*) as total_bookings
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
        GROUP BY ${dateFormat}
        ORDER BY period ASC
      `
      
      const rows = await db.query(query, [dateFrom, dateTo])
      
      return rows.map((row: any) => ({
        period: row.period,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalCommission: parseFloat(row.total_commission) || 0,
        netRevenue: parseFloat(row.net_revenue) || 0,
        totalBookings: row.total_bookings || 0
      }))
    } catch (error) {
      logger.error('Error getting revenue by period:', error)
      throw error
    }
  }

  static async getPaymentMethodStats(dateFrom: string, dateTo: string): Promise<PaymentMethodStats> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT 
          payment_method,
          COUNT(*) as count,
          SUM(amount) as amount
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
        GROUP BY payment_method
      `
      
      const rows = await db.query(query, [dateFrom, dateTo])
      
      const totalCount = rows.reduce((sum: number, row: any) => sum + (row.count || 0), 0)
      const totalAmount = rows.reduce((sum: number, row: any) => sum + (parseFloat(row.amount) || 0), 0)
      
      const stats: PaymentMethodStats = {
        cash: { count: 0, amount: 0, percentage: 0 },
        transfer: { count: 0, amount: 0, percentage: 0 }
      }
      
      rows.forEach((row: any) => {
        const count = row.count || 0
        const amount = parseFloat(row.amount) || 0
        const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        
        if (row.payment_method === 'Cash') {
          stats.cash = { count, amount, percentage }
        } else if (row.payment_method === 'Transfer') {
          stats.transfer = { count, amount, percentage }
        }
      })
      
      return stats
    } catch (error) {
      logger.error('Error getting payment method stats:', error)
      throw error
    }
  }

  static async getTopPerformers(
    dateFrom: string, 
    dateTo: string, 
    type: 'cs' | 'location' = 'cs',
    limit: number = 10
  ): Promise<any[]> {
    const db = await getDatabase()
    
    try {
      let query: string
      
      if (type === 'cs') {
        query = `
          SELECT 
            cs_name as name,
            COUNT(*) as total_bookings,
            SUM(amount) as total_revenue,
            SUM(commission) as total_commission
          FROM transactions 
          WHERE date_only BETWEEN ? AND ?
          GROUP BY cs_name
          ORDER BY total_revenue DESC
          LIMIT ?
        `
      } else {
        query = `
          SELECT 
            location as name,
            COUNT(*) as total_bookings,
            SUM(amount) as total_revenue,
            SUM(commission) as total_commission
          FROM transactions 
          WHERE date_only BETWEEN ? AND ?
          GROUP BY location
          ORDER BY total_revenue DESC
          LIMIT ?
        `
      }
      
      const rows = await db.query(query, [dateFrom, dateTo, limit])
      
      return rows.map((row: any) => ({
        name: row.name,
        totalBookings: row.total_bookings || 0,
        totalRevenue: parseFloat(row.total_revenue) || 0,
        totalCommission: parseFloat(row.total_commission) || 0
      }))
    } catch (error) {
      logger.error('Error getting top performers:', error)
      throw error
    }
  }

  static async getGrowthAnalysis(
    currentPeriodStart: string,
    currentPeriodEnd: string,
    previousPeriodStart: string,
    previousPeriodEnd: string
  ): Promise<{
    current: { revenue: number, bookings: number, commission: number }
    previous: { revenue: number, bookings: number, commission: number }
    growth: { revenue: number, bookings: number, commission: number }
  }> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT 
          SUM(amount) as total_revenue,
          COUNT(*) as total_bookings,
          SUM(commission) as total_commission
        FROM transactions 
        WHERE date_only BETWEEN ? AND ?
      `
      
      const [currentResult, previousResult] = await Promise.all([
        db.query(query, [currentPeriodStart, currentPeriodEnd]),
        db.query(query, [previousPeriodStart, previousPeriodEnd])
      ])
      
      const current = {
        revenue: parseFloat(currentResult[0]?.total_revenue) || 0,
        bookings: currentResult[0]?.total_bookings || 0,
        commission: parseFloat(currentResult[0]?.total_commission) || 0
      }
      
      const previous = {
        revenue: parseFloat(previousResult[0]?.total_revenue) || 0,
        bookings: previousResult[0]?.total_bookings || 0,
        commission: parseFloat(previousResult[0]?.total_commission) || 0
      }
      
      const growth = {
        revenue: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
        bookings: previous.bookings > 0 ? ((current.bookings - previous.bookings) / previous.bookings) * 100 : 0,
        commission: previous.commission > 0 ? ((current.commission - previous.commission) / previous.commission) * 100 : 0
      }
      
      return { current, previous, growth }
    } catch (error) {
      logger.error('Error getting growth analysis:', error)
      throw error
    }
  }

  private static mapRowToDailySummary(row: any): DailySummary {
    return {
      id: row.id,
      date: row.date,
      totalBookings: row.total_bookings || 0,
      totalCash: parseFloat(row.total_cash) || 0,
      totalTransfer: parseFloat(row.total_transfer) || 0,
      totalGross: parseFloat(row.total_gross) || 0,
      totalCommission: parseFloat(row.total_commission) || 0,
      createdAt: row.created_at
    }
  }
}
