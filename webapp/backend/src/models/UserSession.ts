import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface UserSession {
  id: number
  userId: number
  refreshToken: string
  expiresAt: string
  ipAddress?: string
  userAgent?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSessionData {
  userId: number
  refreshToken: string
  expiresAt: string
  ipAddress?: string
  userAgent?: string
}

export class UserSessionModel {
  static async create(sessionData: CreateSessionData): Promise<UserSession> {
    const db = await getDatabase()
    
    try {
      const query = `
        INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `

      const result = await db.query(query, [
        sessionData.userId,
        sessionData.refreshToken,
        sessionData.expiresAt,
        sessionData.ipAddress,
        sessionData.userAgent,
        true
      ])

      const sessionId = result.insertId || result.lastID
      const session = await this.findById(sessionId)
      
      if (!session) {
        throw new Error('Failed to create session')
      }

      logger.info(`Session created for user ID: ${sessionData.userId}`)
      return session

    } catch (error) {
      logger.error('Error creating session:', error)
      throw error
    }
  }

  static async findById(id: number): Promise<UserSession | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM user_sessions WHERE id = ?'
      const rows = await db.query(query, [id])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToSession(rows[0])
    } catch (error) {
      logger.error('Error finding session by ID:', error)
      throw error
    }
  }

  static async findByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM user_sessions WHERE refresh_token = ? AND is_active = 1'
      const rows = await db.query(query, [refreshToken])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToSession(rows[0])
    } catch (error) {
      logger.error('Error finding session by refresh token:', error)
      throw error
    }
  }

  static async findByUserId(userId: number): Promise<UserSession[]> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM user_sessions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
      const rows = await db.query(query, [userId])
      
      return rows.map((row: any) => this.mapRowToSession(row))
    } catch (error) {
      logger.error('Error finding sessions by user ID:', error)
      throw error
    }
  }

  static async invalidate(id: number): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'UPDATE user_sessions SET is_active = 0, updated_at = datetime(\'now\') WHERE id = ?'
      const result = await db.query(query, [id])
      
      const updated = (result.changes || result.affectedRows) > 0
      if (updated) {
        logger.info(`Session invalidated: ID ${id}`)
      }
      
      return updated
    } catch (error) {
      logger.error('Error invalidating session:', error)
      throw error
    }
  }

  static async invalidateByRefreshToken(refreshToken: string): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'UPDATE user_sessions SET is_active = 0, updated_at = datetime(\'now\') WHERE refresh_token = ?'
      const result = await db.query(query, [refreshToken])
      
      const updated = (result.changes || result.affectedRows) > 0
      if (updated) {
        logger.info('Session invalidated by refresh token')
      }
      
      return updated
    } catch (error) {
      logger.error('Error invalidating session by refresh token:', error)
      throw error
    }
  }

  static async invalidateAllUserSessions(userId: number): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'UPDATE user_sessions SET is_active = 0, updated_at = datetime(\'now\') WHERE user_id = ?'
      const result = await db.query(query, [userId])
      
      const updated = (result.changes || result.affectedRows) > 0
      if (updated) {
        logger.info(`All sessions invalidated for user ID: ${userId}`)
      }
      
      return updated
    } catch (error) {
      logger.error('Error invalidating all user sessions:', error)
      throw error
    }
  }

  static async cleanupExpiredSessions(): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = 'DELETE FROM user_sessions WHERE expires_at < datetime(\'now\')'
      const result = await db.query(query)
      
      const deletedCount = result.changes || result.affectedRows || 0
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired sessions`)
      }
      
      return deletedCount
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error)
      throw error
    }
  }

  static async isValidSession(refreshToken: string): Promise<boolean> {
    const session = await this.findByRefreshToken(refreshToken)
    
    if (!session || !session.isActive) {
      return false
    }

    // Check if session is expired
    const now = new Date()
    const expiresAt = new Date(session.expiresAt)
    
    if (now > expiresAt) {
      // Invalidate expired session
      await this.invalidate(session.id)
      return false
    }

    return true
  }

  static async updateActivity(id: number): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'UPDATE user_sessions SET updated_at = datetime(\'now\') WHERE id = ?'
      const result = await db.query(query, [id])
      
      return (result.changes || result.affectedRows) > 0
    } catch (error) {
      logger.error('Error updating session activity:', error)
      throw error
    }
  }

  static async getActiveSessionsCount(userId: number): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM user_sessions 
        WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
      `
      const rows = await db.query(query, [userId])
      return rows[0]?.count || 0
    } catch (error) {
      logger.error('Error counting active sessions:', error)
      throw error
    }
  }

  private static mapRowToSession(row: any): UserSession {
    return {
      id: row.id,
      userId: row.user_id,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
