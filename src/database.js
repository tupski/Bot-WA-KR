// Database module for WhatsApp Bot
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const config = require('../config/config.js');
const logger = require('./logger');

class Database {
    constructor() {
        this.db = null;
        this.dbType = config.database.type;
    }

    async initialize() {
        try {
            if (this.dbType === 'sqlite') {
                await this.initializeSQLite();
            } else if (this.dbType === 'mysql') {
                await this.initializeMySQL();
            }
            
            await this.createTables();
            logger.info(`Database initialized successfully (${this.dbType})`);
        } catch (error) {
            logger.error('Error initializing database:', error);
            throw error;
        }
    }

    async initializeSQLite() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(config.database.sqlite.path, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async initializeMySQL() {
        this.db = await mysql.createConnection(config.database.mysql);
    }

    async createTables() {
        const tables = {
            transactions: `
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY ${this.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                    message_id VARCHAR(255),
                    location VARCHAR(100),
                    unit VARCHAR(50),
                    checkout_time VARCHAR(100),
                    duration VARCHAR(50),
                    payment_method VARCHAR(20),
                    cs_name VARCHAR(50),
                    commission DECIMAL(10,2),
                    amount DECIMAL(12,2),
                    net_amount DECIMAL(12,2),
                    skip_financial BOOLEAN DEFAULT FALSE,
                    created_at ${this.dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
                    date_only DATE
                )
            `,
            cs_summary: `
                CREATE TABLE IF NOT EXISTS cs_summary (
                    id INTEGER PRIMARY KEY ${this.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                    date DATE,
                    cs_name VARCHAR(50),
                    total_bookings INTEGER DEFAULT 0,
                    total_cash DECIMAL(12,2) DEFAULT 0,
                    total_transfer DECIMAL(12,2) DEFAULT 0,
                    total_commission DECIMAL(12,2) DEFAULT 0,
                    created_at ${this.dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
                    UNIQUE(date, cs_name)
                )
            `,
            daily_summary: `
                CREATE TABLE IF NOT EXISTS daily_summary (
                    id INTEGER PRIMARY KEY ${this.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                    date DATE UNIQUE,
                    total_bookings INTEGER DEFAULT 0,
                    total_cash DECIMAL(12,2) DEFAULT 0,
                    total_transfer DECIMAL(12,2) DEFAULT 0,
                    total_gross DECIMAL(12,2) DEFAULT 0,
                    total_commission DECIMAL(12,2) DEFAULT 0,
                    created_at ${this.dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
                )
            `,
            processed_messages: `
                CREATE TABLE IF NOT EXISTS processed_messages (
                    id INTEGER PRIMARY KEY ${this.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                    message_id VARCHAR(255) UNIQUE,
                    chat_id VARCHAR(255),
                    processed_at ${this.dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'},
                    status VARCHAR(50) DEFAULT 'processed'
                )
            `,
            config_table: `
                CREATE TABLE IF NOT EXISTS config (
                    id INTEGER PRIMARY KEY ${this.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
                    key_name VARCHAR(100) UNIQUE,
                    value TEXT,
                    updated_at ${this.dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP'}
                )
            `
        };

        for (const [tableName, query] of Object.entries(tables)) {
            await this.executeQuery(query);
            logger.info(`Table ${tableName} created/verified`);
        }
    }

    async executeQuery(query, params = []) {
        if (this.dbType === 'sqlite') {
            return new Promise((resolve, reject) => {
                if (query.trim().toUpperCase().startsWith('SELECT')) {
                    this.db.all(query, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.run(query, params, function(err) {
                        if (err) reject(err);
                        else resolve({ insertId: this.lastID, changes: this.changes });
                    });
                }
            });
        } else {
            const [rows] = await this.db.execute(query, params);
            return rows;
        }
    }

    async saveTransaction(data) {
        const query = `
            INSERT INTO transactions
            (message_id, location, unit, checkout_time, duration, payment_method, cs_name, commission, amount, net_amount, skip_financial, date_only)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            data.messageId,
            data.location,
            data.unit,
            data.checkoutTime,
            data.duration,
            data.paymentMethod,
            data.csName,
            data.commission,
            data.amount,
            data.netAmount || (data.amount - data.commission),
            data.skipFinancial || false,
            data.date
        ];

        const result = await this.executeQuery(query, params);
        
        // Update daily summaries
        await this.updateDailySummary(data);
        await this.updateCSSummary(data);
        
        return result;
    }

    async updateDailySummary(data) {
        const date = data.date;
        const amount = parseFloat(data.amount) || 0;
        const commission = parseFloat(data.commission) || 0;
        
        const cashAmount = data.paymentMethod.toLowerCase() === 'cash' ? amount : 0;
        const transferAmount = data.paymentMethod.toLowerCase() === 'tf' ? amount : 0;

        const query = `
            INSERT INTO daily_summary (date, total_bookings, total_cash, total_transfer, total_gross, total_commission)
            VALUES (?, 1, ?, ?, ?, ?)
            ${this.dbType === 'mysql' ? 
                'ON DUPLICATE KEY UPDATE total_bookings = total_bookings + 1, total_cash = total_cash + ?, total_transfer = total_transfer + ?, total_gross = total_gross + ?, total_commission = total_commission + ?' :
                'ON CONFLICT(date) DO UPDATE SET total_bookings = total_bookings + 1, total_cash = total_cash + ?, total_transfer = total_transfer + ?, total_gross = total_gross + ?, total_commission = total_commission + ?'
            }
        `;

        const params = [date, cashAmount, transferAmount, amount, commission, cashAmount, transferAmount, amount, commission];
        await this.executeQuery(query, params);
    }

    async updateCSSummary(data) {
        const date = data.date;
        const amount = parseFloat(data.amount) || 0;
        const commission = parseFloat(data.commission) || 0;
        
        const cashAmount = data.paymentMethod.toLowerCase() === 'cash' ? amount : 0;
        const transferAmount = data.paymentMethod.toLowerCase() === 'tf' ? amount : 0;

        const query = `
            INSERT INTO cs_summary (date, cs_name, total_bookings, total_cash, total_transfer, total_commission)
            VALUES (?, ?, 1, ?, ?, ?)
            ${this.dbType === 'mysql' ? 
                'ON DUPLICATE KEY UPDATE total_bookings = total_bookings + 1, total_cash = total_cash + ?, total_transfer = total_transfer + ?, total_commission = total_commission + ?' :
                'ON CONFLICT(date, cs_name) DO UPDATE SET total_bookings = total_bookings + 1, total_cash = total_cash + ?, total_transfer = total_transfer + ?, total_commission = total_commission + ?'
            }
        `;

        const params = [date, data.csName, cashAmount, transferAmount, commission, cashAmount, transferAmount, commission];
        await this.executeQuery(query, params);
    }

    async getDailySummary(date) {
        const query = 'SELECT * FROM daily_summary WHERE date = ?';
        const result = await this.executeQuery(query, [date]);
        return this.dbType === 'sqlite' ? result[0] : result[0];
    }

    async getCSSummary(date) {
        const query = 'SELECT * FROM cs_summary WHERE date = ? ORDER BY cs_name';
        return await this.executeQuery(query, [date]);
    }

    async getTransactions(date) {
        const query = 'SELECT * FROM transactions WHERE date_only = ? ORDER BY created_at';
        return await this.executeQuery(query, [date]);
    }

    async getMarketingCommission(date) {
        const query = `
            SELECT cs_name, COUNT(*) as booking_count, SUM(commission) as total_commission
            FROM transactions
            WHERE date_only = ?
            GROUP BY cs_name
            ORDER BY total_commission DESC
        `;
        return await this.executeQuery(query, [date]);
    }

    // Additional utility functions
    async getTransactionsByDateRange(startDate, endDate) {
        // Jika startDate dan endDate mengandung waktu, gunakan created_at
        // Jika hanya tanggal, gunakan date_only
        let query, params;

        if (startDate.includes(' ') || endDate.includes(' ')) {
            // Menggunakan datetime range
            query = `
                SELECT * FROM transactions
                WHERE created_at BETWEEN ? AND ?
                ORDER BY created_at DESC
            `;
            params = [startDate, endDate];
        } else {
            // Menggunakan date range
            query = `
                SELECT * FROM transactions
                WHERE date_only BETWEEN ? AND ?
                ORDER BY created_at DESC
            `;
            params = [startDate, endDate];
        }

        return await this.executeQuery(query, params);
    }

    async getCSPerformance(startDate, endDate) {
        const query = `
            SELECT
                cs_name,
                COUNT(*) as total_bookings,
                SUM(CASE WHEN payment_method = 'Cash' THEN amount ELSE 0 END) as total_cash,
                SUM(CASE WHEN payment_method = 'TF' THEN amount ELSE 0 END) as total_transfer,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission,
                AVG(amount) as avg_booking_value
            FROM transactions
            WHERE date_only BETWEEN ? AND ?
            GROUP BY cs_name
            ORDER BY total_revenue DESC
        `;
        return await this.executeQuery(query, [startDate, endDate]);
    }

    async getLocationStats(date) {
        const query = `
            SELECT
                location,
                COUNT(*) as booking_count,
                SUM(amount) as total_revenue
            FROM transactions
            WHERE date_only = ?
            GROUP BY location
            ORDER BY total_revenue DESC
        `;
        return await this.executeQuery(query, [date]);
    }

    async getPaymentMethodStats(date) {
        const query = `
            SELECT
                payment_method,
                COUNT(*) as booking_count,
                SUM(amount) as total_amount
            FROM transactions
            WHERE date_only = ?
            GROUP BY payment_method
        `;
        return await this.executeQuery(query, [date]);
    }

    async deleteTransaction(transactionId) {
        const query = 'DELETE FROM transactions WHERE id = ?';
        return await this.executeQuery(query, [transactionId]);
    }

    async updateTransaction(transactionId, data) {
        const fields = [];
        const values = [];

        const allowedFields = ['location', 'unit', 'checkout_time', 'duration', 'payment_method', 'cs_name', 'commission', 'amount'];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(transactionId);
        const query = `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`;

        return await this.executeQuery(query, values);
    }

    async getConfigValue(key) {
        const query = 'SELECT value FROM config WHERE key_name = ?';
        const result = await this.executeQuery(query, [key]);
        return result.length > 0 ? result[0].value : null;
    }

    async setConfigValue(key, value) {
        const query = `
            INSERT INTO config (key_name, value)
            VALUES (?, ?)
            ${this.dbType === 'mysql' ?
                'ON DUPLICATE KEY UPDATE value = ?, updated_at = CURRENT_TIMESTAMP' :
                'ON CONFLICT(key_name) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP'
            }
        `;
        const params = [key, value, value];
        return await this.executeQuery(query, params);
    }

    async getLastTransactions(limit = 10) {
        const query = `
            SELECT * FROM transactions
            ORDER BY created_at DESC
            LIMIT ?
        `;
        return await this.executeQuery(query, [limit]);
    }

    async getTotalStats() {
        const query = `
            SELECT
                COUNT(*) as total_transactions,
                SUM(amount) as total_revenue,
                SUM(commission) as total_commission,
                COUNT(DISTINCT cs_name) as unique_cs_count,
                COUNT(DISTINCT date_only) as active_days
            FROM transactions
        `;
        const result = await this.executeQuery(query);
        return this.dbType === 'sqlite' ? result[0] : result[0];
    }

    // Database maintenance functions
    async cleanupOldData(daysToKeep = 90) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const queries = [
            'DELETE FROM transactions WHERE date_only < ?',
            'DELETE FROM cs_summary WHERE date < ?',
            'DELETE FROM daily_summary WHERE date < ?'
        ];

        let totalDeleted = 0;
        for (const query of queries) {
            const result = await this.executeQuery(query, [cutoffDateStr]);
            totalDeleted += result.changes || result.affectedRows || 0;
        }

        logger.info(`Cleaned up ${totalDeleted} old records older than ${daysToKeep} days`);
        return totalDeleted;
    }

    // Checkpoint system methods
    async markMessageProcessed(messageId, chatId) {
        const query = `
            INSERT OR REPLACE INTO processed_messages (message_id, chat_id, status)
            VALUES (?, ?, 'processed')
        `;
        return await this.executeQuery(query, [messageId, chatId]);
    }

    async isMessageProcessed(messageId) {
        const query = 'SELECT id FROM processed_messages WHERE message_id = ?';
        const result = await this.executeQuery(query, [messageId]);
        return result.length > 0;
    }

    async getUnprocessedMessages(chatId, limit = 100) {
        // Ini akan digunakan untuk recovery - implementasi tergantung WhatsApp API
        const query = `
            SELECT message_id FROM processed_messages
            WHERE chat_id = ?
            ORDER BY processed_at DESC
            LIMIT ?
        `;
        return await this.executeQuery(query, [chatId, limit]);
    }

    async cleanupProcessedMessages(daysToKeep = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const query = 'DELETE FROM processed_messages WHERE processed_at < ?';
        const result = await this.executeQuery(query, [cutoffDateStr]);

        const deleted = result.changes || result.affectedRows || 0;
        logger.info(`Cleaned up ${deleted} old processed message records`);
        return deleted;
    }

    async close() {
        if (this.db) {
            if (this.dbType === 'sqlite') {
                this.db.close();
            } else {
                await this.db.end();
            }
            logger.info('Database connection closed');
        }
    }
}

module.exports = new Database();
