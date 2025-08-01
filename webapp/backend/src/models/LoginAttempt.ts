import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface LoginAttempt {
  id: number
  email: string
  ipAddress: string
  userAgent?: string
  success: boolean
  failureReason?: string
  attemptedAt: string
}

export interface CreateLoginAttemptData {
  email: string
  ipAddress: string
  userAgent?: string
  success: boolean
  failureReason?: string
}

export class LoginAttemptModel {
  static async create(attemptData: CreateLoginAttemptData): Promise<LoginAttempt> {
    const db = await getDatabase()
    
    try {
      const query = `
        INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason, attempted_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `

      const result = await db.query(query, [
        attemptData.email,
        attemptData.ipAddress,
        attemptData.userAgent,
        attemptData.success,
        attemptData.failureReason
      ])

      const attemptId = result.insertId || result.lastID
      const attempt = await this.findById(attemptId)
      
      if (!attempt) {
        throw new Error('Failed to create login attempt record')
      }

      return attempt

    } catch (error) {
      logger.error('Error creating login attempt:', error)
      throw error
    }
  }

  static async findById(id: number): Promise<LoginAttempt | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM login_attempts WHERE id = ?'
      const rows = await db.query(query, [id])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToAttempt(rows[0])
    } catch (error) {
      logger.error('Error finding login attempt by ID:', error)
      throw error
    }
  }

  static async getRecentFailedAttempts(email: string, minutes: number = 15): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM login_attempts 
        WHERE email = ? 
        AND success = 0 
        AND attempted_at > datetime('now', '-${minutes} minutes')
      `
      const rows = await db.query(query, [email])
      return rows[0]?.count || 0
    } catch (error) {
      logger.error('Error getting recent failed attempts:', error)
      throw error
    }
  }

  static async getRecentFailedAttemptsByIP(ipAddress: string, minutes: number = 15): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM login_attempts 
        WHERE ip_address = ? 
        AND success = 0 
        AND attempted_at > datetime('now', '-${minutes} minutes')
      `
      const rows = await db.query(query, [ipAddress])
      return rows[0]?.count || 0
    } catch (error) {
      logger.error('Error getting recent failed attempts by IP:', error)
      throw error
    }
  }

  static async isAccountLocked(email: string, maxAttempts: number = 5, lockoutMinutes: number = 15): Promise<boolean> {
    const failedAttempts = await this.getRecentFailedAttempts(email, lockoutMinutes)
    return failedAttempts >= maxAttempts
  }

  static async isIPBlocked(ipAddress: string, maxAttempts: number = 10, lockoutMinutes: number = 15): Promise<boolean> {
    const failedAttempts = await this.getRecentFailedAttemptsByIP(ipAddress, lockoutMinutes)
    return failedAttempts >= maxAttempts
  }

  static async getLastSuccessfulLogin(email: string): Promise<LoginAttempt | null> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT * FROM login_attempts 
        WHERE email = ? AND success = 1 
        ORDER BY attempted_at DESC 
        LIMIT 1
      `
      const rows = await db.query(query, [email])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToAttempt(rows[0])
    } catch (error) {
      logger.error('Error getting last successful login:', error)
      throw error
    }
  }

  static async getLoginHistory(email: string, limit: number = 10): Promise<LoginAttempt[]> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT * FROM login_attempts 
        WHERE email = ? 
        ORDER BY attempted_at DESC 
        LIMIT ?
      `
      const rows = await db.query(query, [email, limit])
      
      return rows.map((row: any) => this.mapRowToAttempt(row))
    } catch (error) {
      logger.error('Error getting login history:', error)
      throw error
    }
  }

  static async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = `
        DELETE FROM login_attempts 
        WHERE attempted_at < datetime('now', '-${daysToKeep} days')
      `
      const result = await db.query(query)
      
      const deletedCount = result.changes || result.affectedRows || 0
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old login attempts`)
      }
      
      return deletedCount
    } catch (error) {
      logger.error('Error cleaning up old login attempts:', error)
      throw error
    }
  }

  static async getFailureReasonStats(days: number = 7): Promise<Array<{reason: string, count: number}>> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT failure_reason as reason, COUNT(*) as count
        FROM login_attempts 
        WHERE success = 0 
        AND failure_reason IS NOT NULL
        AND attempted_at > datetime('now', '-${days} days')
        GROUP BY failure_reason
        ORDER BY count DESC
      `
      const rows = await db.query(query)
      
      return rows.map((row: any) => ({
        reason: row.reason,
        count: row.count
      }))
    } catch (error) {
      logger.error('Error getting failure reason stats:', error)
      throw error
    }
  }

  static async getLoginStats(days: number = 7): Promise<{
    totalAttempts: number
    successfulLogins: number
    failedAttempts: number
    uniqueUsers: number
    uniqueIPs: number
  }> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT 
          COUNT(*) as total_attempts,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_logins,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_attempts,
          COUNT(DISTINCT email) as unique_users,
          COUNT(DISTINCT ip_address) as unique_ips
        FROM login_attempts 
        WHERE attempted_at > datetime('now', '-${days} days')
      `
      const rows = await db.query(query)
      const row = rows[0] || {}
      
      return {
        totalAttempts: row.total_attempts || 0,
        successfulLogins: row.successful_logins || 0,
        failedAttempts: row.failed_attempts || 0,
        uniqueUsers: row.unique_users || 0,
        uniqueIPs: row.unique_ips || 0
      }
    } catch (error) {
      logger.error('Error getting login stats:', error)
      throw error
    }
  }

  private static mapRowToAttempt(row: any): LoginAttempt {
    return {
      id: row.id,
      email: row.email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      success: Boolean(row.success),
      failureReason: row.failure_reason,
      attemptedAt: row.attempted_at
    }
  }
}
