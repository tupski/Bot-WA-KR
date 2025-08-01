import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'

export interface Transaction {
  id: number
  messageId: string
  location: string
  unit: string
  checkoutTime: string
  duration: string
  paymentMethod: 'Cash' | 'Transfer'
  csName: string
  commission: number
  amount: number
  netAmount: number
  skipFinancial: boolean
  createdAt: string
  dateOnly: string
}

export interface CreateTransactionData {
  messageId: string
  location: string
  unit: string
  checkoutTime: string
  duration: string
  paymentMethod: 'Cash' | 'Transfer'
  csName: string
  commission: number
  amount: number
  netAmount?: number
  skipFinancial?: boolean
  dateOnly: string
}

export interface UpdateTransactionData {
  location?: string
  unit?: string
  checkoutTime?: string
  duration?: string
  paymentMethod?: 'Cash' | 'Transfer'
  csName?: string
  commission?: number
  amount?: number
  netAmount?: number
  skipFinancial?: boolean
}

export interface TransactionFilters {
  location?: string
  csName?: string
  paymentMethod?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  skipFinancial?: boolean
}

export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class TransactionModel {
  static async create(transactionData: CreateTransactionData): Promise<Transaction> {
    const db = await getDatabase()
    
    try {
      // Calculate net amount if not provided
      const netAmount = transactionData.netAmount || (transactionData.amount - transactionData.commission)

      const query = `
        INSERT INTO transactions (
          message_id, location, unit, checkout_time, duration, payment_method,
          cs_name, commission, amount, net_amount, skip_financial, date_only, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `

      const result = await db.query(query, [
        transactionData.messageId,
        transactionData.location,
        transactionData.unit,
        transactionData.checkoutTime,
        transactionData.duration,
        transactionData.paymentMethod,
        transactionData.csName,
        transactionData.commission,
        transactionData.amount,
        netAmount,
        transactionData.skipFinancial || false,
        transactionData.dateOnly
      ])

      const transactionId = result.insertId || result.lastID
      const transaction = await this.findById(transactionId)
      
      if (!transaction) {
        throw new Error('Failed to create transaction')
      }

      logger.info(`Transaction created: ID ${transaction.id}, Unit: ${transaction.unit}`)
      return transaction

    } catch (error) {
      logger.error('Error creating transaction:', error)
      throw error
    }
  }

  static async findById(id: number): Promise<Transaction | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM transactions WHERE id = ?'
      const rows = await db.query(query, [id])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToTransaction(rows[0])
    } catch (error) {
      logger.error('Error finding transaction by ID:', error)
      throw error
    }
  }

  static async findByMessageId(messageId: string): Promise<Transaction | null> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT * FROM transactions WHERE message_id = ?'
      const rows = await db.query(query, [messageId])
      
      if (!rows || rows.length === 0) {
        return null
      }

      return this.mapRowToTransaction(rows[0])
    } catch (error) {
      logger.error('Error finding transaction by message ID:', error)
      throw error
    }
  }

  static async findAll(
    filters: TransactionFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginatedResponse<Transaction>> {
    const db = await getDatabase()
    
    try {
      const { whereClause, params } = this.buildWhereClause(filters)
      const { sortBy = 'created_at', sortOrder = 'DESC' } = pagination
      const offset = (pagination.page - 1) * pagination.limit

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM transactions ${whereClause}`
      const countResult = await db.query(countQuery, params)
      const total = countResult[0]?.total || 0

      // Get paginated data
      const dataQuery = `
        SELECT * FROM transactions 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `
      const dataParams = [...params, pagination.limit, offset]
      const rows = await db.query(dataQuery, dataParams)

      const transactions = rows.map((row: any) => this.mapRowToTransaction(row))
      const totalPages = Math.ceil(total / pagination.limit)

      return {
        data: transactions,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      }

    } catch (error) {
      logger.error('Error finding transactions:', error)
      throw error
    }
  }

  static async update(id: number, updateData: UpdateTransactionData): Promise<Transaction | null> {
    const db = await getDatabase()
    
    try {
      const updates: string[] = []
      const values: any[] = []

      const allowedFields = [
        'location', 'unit', 'checkout_time', 'duration', 'payment_method',
        'cs_name', 'commission', 'amount', 'net_amount', 'skip_financial'
      ]

      for (const [key, value] of Object.entries(updateData)) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase()
        if (allowedFields.includes(dbField) && value !== undefined) {
          updates.push(`${dbField} = ?`)
          values.push(value)
        }
      }

      if (updates.length === 0) {
        return this.findById(id)
      }

      values.push(id)
      const query = `UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`
      await db.query(query, values)

      logger.info(`Transaction updated: ID ${id}`)
      return this.findById(id)

    } catch (error) {
      logger.error('Error updating transaction:', error)
      throw error
    }
  }

  static async delete(id: number): Promise<boolean> {
    const db = await getDatabase()
    
    try {
      const query = 'DELETE FROM transactions WHERE id = ?'
      const result = await db.query(query, [id])
      
      const deleted = (result.changes || result.affectedRows) > 0
      if (deleted) {
        logger.info(`Transaction deleted: ID ${id}`)
      }
      
      return deleted
    } catch (error) {
      logger.error('Error deleting transaction:', error)
      throw error
    }
  }

  static async getStats(filters: TransactionFilters = {}): Promise<{
    totalTransactions: number
    totalAmount: number
    totalCommission: number
    totalNetAmount: number
    cashTransactions: number
    transferTransactions: number
    avgAmount: number
    avgCommission: number
  }> {
    const db = await getDatabase()
    
    try {
      const { whereClause, params } = this.buildWhereClause(filters)
      
      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(commission), 0) as total_commission,
          COALESCE(SUM(net_amount), 0) as total_net_amount,
          COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN 1 ELSE 0 END), 0) as cash_transactions,
          COALESCE(SUM(CASE WHEN payment_method = 'Transfer' THEN 1 ELSE 0 END), 0) as transfer_transactions,
          COALESCE(AVG(amount), 0) as avg_amount,
          COALESCE(AVG(commission), 0) as avg_commission
        FROM transactions 
        ${whereClause}
      `
      
      const result = await db.query(query, params)
      const row = result[0] || {}
      
      return {
        totalTransactions: row.total_transactions || 0,
        totalAmount: parseFloat(row.total_amount) || 0,
        totalCommission: parseFloat(row.total_commission) || 0,
        totalNetAmount: parseFloat(row.total_net_amount) || 0,
        cashTransactions: row.cash_transactions || 0,
        transferTransactions: row.transfer_transactions || 0,
        avgAmount: parseFloat(row.avg_amount) || 0,
        avgCommission: parseFloat(row.avg_commission) || 0
      }

    } catch (error) {
      logger.error('Error getting transaction stats:', error)
      throw error
    }
  }

  private static buildWhereClause(filters: TransactionFilters): { whereClause: string, params: any[] } {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.location) {
      conditions.push('location LIKE ?')
      params.push(`%${filters.location}%`)
    }

    if (filters.csName) {
      conditions.push('cs_name LIKE ?')
      params.push(`%${filters.csName}%`)
    }

    if (filters.paymentMethod) {
      conditions.push('payment_method = ?')
      params.push(filters.paymentMethod)
    }

    if (filters.dateFrom) {
      conditions.push('date_only >= ?')
      params.push(filters.dateFrom)
    }

    if (filters.dateTo) {
      conditions.push('date_only <= ?')
      params.push(filters.dateTo)
    }

    if (filters.skipFinancial !== undefined) {
      conditions.push('skip_financial = ?')
      params.push(filters.skipFinancial)
    }

    if (filters.search) {
      conditions.push('(unit LIKE ? OR cs_name LIKE ? OR location LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    
    return { whereClause, params }
  }

  private static mapRowToTransaction(row: any): Transaction {
    return {
      id: row.id,
      messageId: row.message_id,
      location: row.location,
      unit: row.unit,
      checkoutTime: row.checkout_time,
      duration: row.duration,
      paymentMethod: row.payment_method,
      csName: row.cs_name,
      commission: parseFloat(row.commission) || 0,
      amount: parseFloat(row.amount) || 0,
      netAmount: parseFloat(row.net_amount) || 0,
      skipFinancial: Boolean(row.skip_financial),
      createdAt: row.created_at,
      dateOnly: row.date_only
    }
  }
}
