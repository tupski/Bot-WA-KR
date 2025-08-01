import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'
import fs from 'fs'
import path from 'path'
import os from 'os'

export interface LogEntry {
  id: number
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  timestamp: string
  source?: string
  details?: any
  userId?: number
  ipAddress?: string
  userAgent?: string
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
    loadAverage: number[]
  }
  disk: {
    used: number
    total: number
    percentage: number
  }
  database: {
    connected: boolean
    responseTime: number
  }
  bot: {
    status: 'online' | 'offline' | 'error'
    lastActivity: string
    messageCount: number
    errorCount: number
  }
}

export interface BotStatus {
  isConnected: boolean
  status: 'online' | 'offline' | 'error'
  sessionStatus: 'authenticated' | 'unauthenticated' | 'loading'
  lastActivity: string
  totalMessages: number
  todayMessages: number
  errorCount: number
  uptime: number
  version: string
  qrCode?: string
}

export interface LogFilters {
  level?: string
  source?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  userId?: number
}

export class LogModel {
  static async createLog(logData: Omit<LogEntry, 'id' | 'timestamp'>): Promise<LogEntry> {
    const db = await getDatabase()
    
    try {
      const query = `
        INSERT INTO logs (level, message, source, details, user_id, ip_address, user_agent, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `

      const result = await db.query(query, [
        logData.level,
        logData.message,
        logData.source,
        logData.details ? JSON.stringify(logData.details) : null,
        logData.userId,
        logData.ipAddress,
        logData.userAgent
      ])

      const logId = result.insertId || result.lastID
      const log = await this.findById(logId)
      
      if (!log) {
        throw new Error('Failed to create log entry')
      }

      return log
    } catch (error) {
      logger.error('Error creating log entry:', error)
      throw error
    }
  }

  static async findById(id: number): Promise<LogEntry | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM logs WHERE id = ?'
      const rows = await db.query(query, [id])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToLog(rows[0])
    } catch (error) {
      logger.error('Error finding log by ID:', error)
      throw error
    }
  }

  static async findLogs(
    filters: LogFilters = {},
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: LogEntry[], total: number }> {
    const db = await getDatabase()
    
    try {
      const { whereClause, params } = this.buildWhereClause(filters)
      const offset = (page - 1) * limit

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM logs ${whereClause}`
      const countResult = await db.query(countQuery, params)
      const total = countResult[0]?.total || 0

      // Get paginated data
      const dataQuery = `
        SELECT * FROM logs 
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `
      const dataParams = [...params, limit, offset]
      const rows = await db.query(dataQuery, dataParams)

      const logs = rows.map((row: any) => this.mapRowToLog(row))

      return { logs, total }
    } catch (error) {
      logger.error('Error finding logs:', error)
      throw error
    }
  }

  static async getLogStats(dateFrom?: string, dateTo?: string): Promise<{
    totalLogs: number
    errorCount: number
    warnCount: number
    infoCount: number
    debugCount: number
    topSources: { source: string, count: number }[]
    recentErrors: LogEntry[]
  }> {
    const db = await getDatabase()
    
    try {
      let whereClause = ''
      const params: any[] = []

      if (dateFrom && dateTo) {
        whereClause = 'WHERE timestamp BETWEEN ? AND ?'
        params.push(dateFrom, dateTo)
      }

      // Get level counts
      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) as error_count,
          SUM(CASE WHEN level = 'warn' THEN 1 ELSE 0 END) as warn_count,
          SUM(CASE WHEN level = 'info' THEN 1 ELSE 0 END) as info_count,
          SUM(CASE WHEN level = 'debug' THEN 1 ELSE 0 END) as debug_count
        FROM logs ${whereClause}
      `
      
      const statsResult = await db.query(statsQuery, params)
      const stats = statsResult[0] || {}

      // Get top sources
      const sourcesQuery = `
        SELECT source, COUNT(*) as count
        FROM logs 
        ${whereClause}
        GROUP BY source
        ORDER BY count DESC
        LIMIT 10
      `
      
      const sourcesResult = await db.query(sourcesQuery, params)

      // Get recent errors
      const errorsQuery = `
        SELECT * FROM logs 
        WHERE level = 'error' ${dateFrom && dateTo ? 'AND timestamp BETWEEN ? AND ?' : ''}
        ORDER BY timestamp DESC
        LIMIT 10
      `
      
      const errorsParams = dateFrom && dateTo ? [dateFrom, dateTo] : []
      const errorsResult = await db.query(errorsQuery, errorsParams)
      const recentErrors = errorsResult.map((row: any) => this.mapRowToLog(row))

      return {
        totalLogs: stats.total_logs || 0,
        errorCount: stats.error_count || 0,
        warnCount: stats.warn_count || 0,
        infoCount: stats.info_count || 0,
        debugCount: stats.debug_count || 0,
        topSources: sourcesResult.map((row: any) => ({
          source: row.source || 'unknown',
          count: row.count || 0
        })),
        recentErrors
      }
    } catch (error) {
      logger.error('Error getting log stats:', error)
      throw error
    }
  }

  static async getSystemHealth(): Promise<SystemHealth> {
    try {
      // Memory usage
      const memUsage = process.memoryUsage()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem

      // CPU usage (simplified)
      const loadAvg = os.loadavg()
      const cpuUsage = loadAvg[0] / os.cpus().length * 100

      // Disk usage (simplified - just check if we can write to temp)
      let diskUsage = 0
      try {
        const stats = fs.statSync(os.tmpdir())
        diskUsage = 50 // Placeholder - real disk usage would need platform-specific code
      } catch {
        diskUsage = 0
      }

      // Database health
      const dbHealth = await this.checkDatabaseHealth()

      // Bot status
      const botStatus = await this.getBotStatus()

      // Determine overall status
      let status: 'healthy' | 'warning' | 'critical' = 'healthy'
      
      if (cpuUsage > 80 || (usedMem / totalMem) > 0.9 || !dbHealth.connected) {
        status = 'critical'
      } else if (cpuUsage > 60 || (usedMem / totalMem) > 0.8 || botStatus.status === 'error') {
        status = 'warning'
      }

      return {
        status,
        uptime: process.uptime(),
        memory: {
          used: usedMem,
          total: totalMem,
          percentage: (usedMem / totalMem) * 100
        },
        cpu: {
          usage: cpuUsage,
          loadAverage: loadAvg
        },
        disk: {
          used: diskUsage,
          total: 100,
          percentage: diskUsage
        },
        database: dbHealth,
        bot: {
          status: botStatus.status,
          lastActivity: botStatus.lastActivity,
          messageCount: botStatus.totalMessages,
          errorCount: botStatus.errorCount
        }
      }
    } catch (error) {
      logger.error('Error getting system health:', error)
      throw error
    }
  }

  static async getBotStatus(): Promise<BotStatus> {
    try {
      // This would integrate with the actual bot status
      // For now, return mock data based on database activity
      
      const db = await getDatabase()
      
      // Get today's message count
      const today = new Date().toISOString().split('T')[0]
      const todayQuery = `
        SELECT COUNT(*) as count 
        FROM transactions 
        WHERE date_only = ?
      `
      const todayResult = await db.query(todayQuery, [today])
      const todayMessages = todayResult[0]?.count || 0

      // Get total messages
      const totalQuery = 'SELECT COUNT(*) as count FROM transactions'
      const totalResult = await db.query(totalQuery)
      const totalMessages = totalResult[0]?.count || 0

      // Get recent error count
      const errorQuery = `
        SELECT COUNT(*) as count 
        FROM logs 
        WHERE level = 'error' AND timestamp > datetime('now', '-1 hour')
      `
      const errorResult = await db.query(errorQuery)
      const errorCount = errorResult[0]?.count || 0

      // Get last activity
      const activityQuery = `
        SELECT MAX(created_at) as last_activity 
        FROM transactions
      `
      const activityResult = await db.query(activityQuery)
      const lastActivity = activityResult[0]?.last_activity || new Date().toISOString()

      return {
        isConnected: true, // Would check actual bot connection
        status: errorCount > 0 ? 'error' : 'online',
        sessionStatus: 'authenticated', // Would check actual session
        lastActivity,
        totalMessages,
        todayMessages,
        errorCount,
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      }
    } catch (error) {
      logger.error('Error getting bot status:', error)
      return {
        isConnected: false,
        status: 'offline',
        sessionStatus: 'unauthenticated',
        lastActivity: new Date().toISOString(),
        totalMessages: 0,
        todayMessages: 0,
        errorCount: 0,
        uptime: 0,
        version: '1.0.0'
      }
    }
  }

  static async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = `
        DELETE FROM logs 
        WHERE timestamp < datetime('now', '-${daysToKeep} days')
      `
      const result = await db.query(query)
      
      const deletedCount = result.changes || result.affectedRows || 0
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old log entries`)
      }
      
      return deletedCount
    } catch (error) {
      logger.error('Error cleaning up old logs:', error)
      throw error
    }
  }

  private static async checkDatabaseHealth(): Promise<{ connected: boolean, responseTime: number }> {
    const startTime = Date.now()
    
    try {
      const db = await getDatabase()
      await db.query('SELECT 1')
      
      const responseTime = Date.now() - startTime
      return { connected: true, responseTime }
    } catch (error) {
      return { connected: false, responseTime: -1 }
    }
  }

  private static buildWhereClause(filters: LogFilters): { whereClause: string, params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.level) {
      conditions.push('level = ?')
      params.push(filters.level)
    }

    if (filters.source) {
      conditions.push('source LIKE ?')
      params.push(`%${filters.source}%`)
    }

    if (filters.dateFrom) {
      conditions.push('timestamp >= ?')
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      conditions.push('timestamp <= ?')
      params.push(filters.dateTo)
    }

    if (filters.search) {
      conditions.push('message LIKE ?')
      params.push(`%${filters.search}%`)
    }

    if (filters.userId) {
      conditions.push('user_id = ?')
      params.push(filters.userId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    return { whereClause, params }
  }

  private static mapRowToLog(row: any): LogEntry {
    return {
      id: row.id,
      level: row.level,
      message: row.message,
      timestamp: row.timestamp,
      source: row.source,
      details: row.details ? JSON.parse(row.details) : null,
      userId: row.user_id,
      ipAddress: row.ip_address,
      userAgent: row.user_agent
    }
  }
}
