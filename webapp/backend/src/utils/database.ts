import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { logger } from './logger';
import { DatabaseSeeder } from './seeder';

export interface DatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

class SQLiteConnection implements DatabaseConnection {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      if (sql.trim().toLowerCase().startsWith('select')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ insertId: this.lastID, changes: this.changes });
        });
      }
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

class MySQLConnection implements DatabaseConnection {
  private connection: mysql.Connection;

  constructor(connection: mysql.Connection) {
    this.connection = connection;
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const [rows] = await this.connection.execute(sql, params);
    return rows;
  }

  async close(): Promise<void> {
    await this.connection.end();
  }
}

let dbConnection: DatabaseConnection | null = null;

export async function connectDatabase(): Promise<DatabaseConnection> {
  if (dbConnection) {
    return dbConnection;
  }

  const dbType = process.env.DB_TYPE || 'sqlite';

  try {
    if (dbType === 'mysql') {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'bot_kr',
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
      });

      dbConnection = new MySQLConnection(connection);
      logger.info('Connected to MySQL database');
    } else {
      const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../../data/bot-kr.db');
      const resolvedPath = path.resolve(dbPath);
      
      dbConnection = new SQLiteConnection(resolvedPath);
      logger.info(`Connected to SQLite database at: ${resolvedPath}`);
    }

    // Create additional tables for web dashboard if they don't exist
    await createWebTables();

    // Run database seeders
    await runSeeders();

    return dbConnection;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

async function createWebTables(): Promise<void> {
  if (!dbConnection) {
    throw new Error('Database connection not established');
  }

  const dbType = process.env.DB_TYPE || 'sqlite';
  const autoIncrement = dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT';
  const timestamp = dbType === 'mysql' ? 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

  try {
    // Users table for web authentication
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY ${autoIncrement},
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login ${timestamp},
        created_at ${timestamp},
        updated_at ${timestamp}
      )
    `);

    // Sessions table for JWT refresh tokens
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY ${autoIncrement},
        user_id INTEGER NOT NULL,
        refresh_token VARCHAR(500) NOT NULL,
        expires_at ${dbType === 'mysql' ? 'TIMESTAMP' : 'DATETIME'} NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at ${timestamp},
        updated_at ${timestamp},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // API keys table for external integrations
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY ${autoIncrement},
        user_id INTEGER NOT NULL,
        key_name VARCHAR(100) NOT NULL,
        api_key VARCHAR(255) NOT NULL,
        permissions TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_used ${timestamp},
        created_at ${timestamp},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // User permissions table for role-based access control
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id INTEGER PRIMARY KEY ${autoIncrement},
        user_id INTEGER NOT NULL,
        permission VARCHAR(100) NOT NULL,
        resource VARCHAR(100),
        granted_by INTEGER,
        granted_at ${timestamp},
        expires_at ${dbType === 'mysql' ? 'TIMESTAMP' : 'DATETIME'},
        is_active BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE(user_id, permission, resource)
      )
    `);

    // Password reset tokens table
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY ${autoIncrement},
        user_id INTEGER NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at ${dbType === 'mysql' ? 'TIMESTAMP' : 'DATETIME'} NOT NULL,
        used_at ${dbType === 'mysql' ? 'TIMESTAMP' : 'DATETIME'},
        created_at ${timestamp},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Audit log table for tracking changes
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY ${autoIncrement},
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at ${timestamp},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Login attempts table for security tracking
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id INTEGER PRIMARY KEY ${autoIncrement},
        email VARCHAR(100) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT,
        success BOOLEAN NOT NULL,
        failure_reason VARCHAR(100),
        attempted_at ${timestamp}
      )
    `);

    // Logs table for system logging
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY ${autoIncrement},
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        source VARCHAR(100),
        details TEXT,
        user_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        timestamp ${timestamp},
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Config table for system configuration
    await dbConnection.query(`
      CREATE TABLE IF NOT EXISTS config (
        id INTEGER PRIMARY KEY ${autoIncrement},
        key_name VARCHAR(255) NOT NULL UNIQUE,
        value TEXT,
        updated_at ${timestamp}
      )
    `);

    logger.info('Web dashboard tables created successfully');
  } catch (error) {
    logger.error('Error creating web tables:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<DatabaseConnection> {
  if (!dbConnection) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return dbConnection;
}

async function runSeeders(): Promise<void> {
  try {
    await DatabaseSeeder.runAllSeeders();
  } catch (error) {
    logger.error('Error running database seeders:', error);
    // Don't throw error to prevent app from crashing
  }
}

export async function closeDatabase(): Promise<void> {
  if (dbConnection) {
    await dbConnection.close();
    dbConnection = null;
    logger.info('Database connection closed');
  }
}
