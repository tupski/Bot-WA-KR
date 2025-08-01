import bcrypt from 'bcryptjs'
import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface User {
  id: number
  username: string
  email: string
  passwordHash: string
  role: 'admin' | 'user' | 'viewer'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserData {
  username: string
  email: string
  password: string
  role?: 'admin' | 'user' | 'viewer'
  isActive?: boolean
}

export interface UpdateUserData {
  username?: string
  email?: string
  role?: 'admin' | 'user' | 'viewer'
  isActive?: boolean
  lastLogin?: string
}

export class UserModel {
  private static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12')
    return bcrypt.hash(password, saltRounds)
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  static async create(userData: CreateUserData): Promise<User> {
    const db = await getDatabase()
    
    try {
      // Check if user already exists
      const existingUser = await this.findByEmail(userData.email)
      if (existingUser) {
        throw new Error('User with this email already exists')
      }

      const existingUsername = await this.findByUsername(userData.username)
      if (existingUsername) {
        throw new Error('User with this username already exists')
      }

      // Hash password
      const passwordHash = await this.hashPassword(userData.password)

      // Insert user
      const query = `
        INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `

      const result = await db.query(query, [
        userData.username,
        userData.email,
        passwordHash,
        userData.role || 'user',
        userData.isActive !== false
      ])

      // Get the created user
      const userId = result.insertId || result.lastID
      const user = await this.findById(userId)
      
      if (!user) {
        throw new Error('Failed to create user')
      }

      logger.info(`User created: ${user.email} (ID: ${user.id})`)
      return user

    } catch (error) {
      logger.error('Error creating user:', error)
      throw error
    }
  }

  static async findById(id: number): Promise<User | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM users WHERE id = ?'
      const rows = await db.query(query, [id])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToUser(rows[0])
    } catch (error) {
      logger.error('Error finding user by ID:', error)
      throw error
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM users WHERE email = ?'
      const rows = await db.query(query, [email])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToUser(rows[0])
    } catch (error) {
      logger.error('Error finding user by email:', error)
      throw error
    }
  }

  static async findByUsername(username: string): Promise<User | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM users WHERE username = ?'
      const rows = await db.query(query, [username])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToUser(rows[0])
    } catch (error) {
      logger.error('Error finding user by username:', error)
      throw error
    }
  }

  static async update(id: number, userData: UpdateUserData): Promise<User | null> {
    const db = await getDatabase()
    
    try {
      const updates: string[] = []
      const values: any[] = []

      if (userData.username !== undefined) {
        updates.push('username = ?')
        values.push(userData.username)
      }

      if (userData.email !== undefined) {
        updates.push('email = ?')
        values.push(userData.email)
      }

      if (userData.role !== undefined) {
        updates.push('role = ?')
        values.push(userData.role)
      }

      if (userData.isActive !== undefined) {
        updates.push('is_active = ?')
        values.push(userData.isActive)
      }

      if (userData.lastLogin !== undefined) {
        updates.push('last_login = ?')
        values.push(userData.lastLogin)
      }

      if (updates.length === 0) {
        return this.findById(id)
      }

      updates.push('updated_at = datetime(\'now\')')
      values.push(id)

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
      await db.query(query, values)

      logger.info(`User updated: ID ${id}`)
      return this.findById(id)

    } catch (error) {
      logger.error('Error updating user:', error)
      throw error
    }
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'DELETE FROM users WHERE id = ?'
      const result = await db.query(query, [id])
      
      const deleted = (result.changes || result.affectedRows) > 0
      if (deleted) {
        logger.info(`User deleted: ID ${id}`)
      }
      
      return deleted
    } catch (error) {
      logger.error('Error deleting user:', error)
      throw error
    }
  }

  static async findAll(limit?: number, offset?: number): Promise<User[]> {
    const db = await getDatabase()
    
    try {
      let query = 'SELECT * FROM users ORDER BY created_at DESC'
      const params: any[] = []

      if (limit) {
        query += ' LIMIT ?'
        params.push(limit)
        
        if (offset) {
          query += ' OFFSET ?'
          params.push(offset)
        }
      }

      const rows = await db.query(query, params)
      return rows.map((row: any) => this.mapRowToUser(row))
    } catch (error) {
      logger.error('Error finding all users:', error)
      throw error
    }
  }

  static async count(): Promise<number> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT COUNT(*) as count FROM users'
      const rows = await db.query(query)
      return rows[0]?.count || 0
    } catch (error) {
      logger.error('Error counting users:', error)
      throw error
    }
  }

  static async updatePassword(id: number, newPassword: string): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const passwordHash = await this.hashPassword(newPassword)
      const query = 'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
      const result = await db.query(query, [passwordHash, id])
      
      const updated = (result.changes || result.affectedRows) > 0
      if (updated) {
        logger.info(`Password updated for user ID: ${id}`)
      }
      
      return updated
    } catch (error) {
      logger.error('Error updating password:', error)
      throw error
    }
  }

  private static mapRowToUser(row: any): User {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role,
      isActive: Boolean(row.is_active),
      lastLogin: row.last_login,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
}
