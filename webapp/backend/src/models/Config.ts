import { getDatabase } from '@/utils/database'
import { logger } from '@/utils/logger'
import fs from 'fs'
import path from 'path'

export interface SystemConfig {
  // WhatsApp Configuration
  whatsapp: {
    sessionPath: string
    messageDelay: number
    maxRetries: number
    puppeteerHeadless: boolean
  }
  
  // Owner Configuration
  owner: {
    allowedNumbers: string[]
  }
  
  // Apartment/Group Configuration
  apartments: {
    groups: ApartmentGroup[]
    defaultApartment: string
  }
  
  // Database Configuration
  database: {
    type: 'sqlite' | 'mysql'
    sqlite?: {
      path: string
    }
    mysql?: {
      host: string
      port: number
      user: string
      password: string
      database: string
      connectionLimit: number
    }
  }
  
  // Email Configuration
  email: {
    enabled: boolean
    service: string
    user: string
    password: string
    to: string
    from: string
  }
  
  // Commission Configuration
  commission: {
    [csName: string]: number
  }
  
  // Report Configuration
  report: {
    timezone: string
    dailyReportTime: string
    weeklyReportTime: string
    monthlyReportTime: string
    companyName: string
    includeCharts: boolean
    exportFormat: string
  }
  
  // Business Rules
  business: {
    workingHours: {
      start: string
      end: string
    }
    locations: string[]
    paymentMethods: string[]
    minBookingDuration: number
    maxBookingDuration: number
    autoCleanupDays: number
  }
  
  // Security Settings
  security: {
    enableRateLimit: boolean
    maxMessagesPerMinute: number
    allowedUsers: string[]
    encryptData: boolean
  }
  
  // Logging Configuration
  logging: {
    level: string
    enableConsole: boolean
    enableFile: boolean
    maxFiles: number
    maxSize: string
  }
}

export interface ApartmentGroup {
  id: string
  name: string
  enabled: boolean
  chatId?: string
}

export interface ConfigUpdate {
  section: string
  key: string
  value: any
}

export class ConfigModel {
  private static configCache: SystemConfig | null = null
  private static cacheExpiry: number = 0
  private static readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  static async getSystemConfig(): Promise<SystemConfig> {
    // Check cache first
    if (this.configCache && Date.now() < this.cacheExpiry) {
      return this.configCache
    }

    try {
      // Load from database first, then merge with environment variables
      const dbConfig = await this.loadFromDatabase()
      const envConfig = this.loadFromEnvironment()
      
      // Merge configurations (database overrides environment)
      const config = this.mergeConfigs(envConfig, dbConfig)
      
      // Cache the result
      this.configCache = config
      this.cacheExpiry = Date.now() + this.CACHE_TTL
      
      return config
    } catch (error) {
      logger.error('Error getting system config:', error)
      throw error
    }
  }

  static async updateConfig(updates: ConfigUpdate[]): Promise<void> {
    const db = await getDatabase()
    
    try {
      for (const update of updates) {
        const key = `${update.section}.${update.key}`
        const value = JSON.stringify(update.value)
        
        const query = `
          INSERT OR REPLACE INTO config (key_name, value, updated_at)
          VALUES (?, ?, datetime('now'))
        `
        
        await db.query(query, [key, value])
        logger.info(`Config updated: ${key} = ${value}`)
      }
      
      // Clear cache to force reload
      this.configCache = null
      this.cacheExpiry = 0
      
    } catch (error) {
      logger.error('Error updating config:', error)
      throw error
    }
  }

  static async getConfigValue(section: string, key: string): Promise<any> {
    const config = await this.getSystemConfig()
    return this.getNestedValue(config, `${section}.${key}`)
  }

  static async setConfigValue(section: string, key: string, value: any): Promise<void> {
    await this.updateConfig([{ section, key, value }])
  }

  static async getApartments(): Promise<ApartmentGroup[]> {
    const config = await this.getSystemConfig()
    return config.apartments.groups
  }

  static async updateApartments(apartments: ApartmentGroup[]): Promise<void> {
    await this.updateConfig([{
      section: 'apartments',
      key: 'groups',
      value: apartments
    }])
  }

  static async getCommissionRates(): Promise<{ [csName: string]: number }> {
    const config = await this.getSystemConfig()
    return config.commission
  }

  static async updateCommissionRates(rates: { [csName: string]: number }): Promise<void> {
    await this.updateConfig([{
      section: 'commission',
      key: 'rates',
      value: rates
    }])
  }

  static async getOwnerNumbers(): Promise<string[]> {
    const config = await this.getSystemConfig()
    return config.owner.allowedNumbers
  }

  static async updateOwnerNumbers(numbers: string[]): Promise<void> {
    await this.updateConfig([{
      section: 'owner',
      key: 'allowedNumbers',
      value: numbers
    }])
  }

  static async resetToDefaults(): Promise<void> {
    const db = await getDatabase()
    
    try {
      // Clear all config from database
      await db.query('DELETE FROM config')
      
      // Clear cache
      this.configCache = null
      this.cacheExpiry = 0
      
      logger.info('Configuration reset to defaults')
    } catch (error) {
      logger.error('Error resetting config:', error)
      throw error
    }
  }

  static async exportConfig(): Promise<SystemConfig> {
    return this.getSystemConfig()
  }

  static async importConfig(config: Partial<SystemConfig>): Promise<void> {
    const updates: ConfigUpdate[] = []
    
    // Convert nested config to flat updates
    this.flattenConfig(config, '', updates)
    
    await this.updateConfig(updates)
  }

  private static async loadFromDatabase(): Promise<Partial<SystemConfig>> {
    const db = await getDatabase()
    
    try {
      const query = 'SELECT key_name, value FROM config'
      const rows = await db.query(query)
      
      const config: any = {}
      
      for (const row of rows) {
        const keys = row.key_name.split('.')
        let current = config
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {}
          }
          current = current[keys[i]]
        }
        
        try {
          current[keys[keys.length - 1]] = JSON.parse(row.value)
        } catch {
          current[keys[keys.length - 1]] = row.value
        }
      }
      
      return config
    } catch (error) {
      logger.error('Error loading config from database:', error)
      return {}
    }
  }

  private static loadFromEnvironment(): SystemConfig {
    return {
      whatsapp: {
        sessionPath: process.env.WHATSAPP_SESSION_PATH || './session',
        messageDelay: parseInt(process.env.MESSAGE_DELAY || '1000'),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
        puppeteerHeadless: process.env.PUPPETEER_HEADLESS !== 'false'
      },
      
      owner: {
        allowedNumbers: process.env.OWNER_NUMBER ? process.env.OWNER_NUMBER.split(',') : []
      },
      
      apartments: {
        groups: this.buildApartmentGroups(),
        defaultApartment: 'APARTEMEN TIDAK DIKETAHUI'
      },
      
      database: {
        type: (process.env.DB_TYPE as 'sqlite' | 'mysql') || 'sqlite',
        sqlite: {
          path: process.env.SQLITE_PATH || './data/bot-kr.db'
        },
        mysql: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '3306'),
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'bot_kr',
          connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10')
        }
      },
      
      email: {
        enabled: process.env.EMAIL_ENABLED === 'true',
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASS || '',
        to: process.env.EMAIL_TO || '',
        from: process.env.EMAIL_FROM || ''
      },
      
      commission: {
        'Amel': parseFloat(process.env.COMMISSION_AMEL || '50000'),
        'KR': parseFloat(process.env.COMMISSION_KR || '45000'),
        'APK': parseFloat(process.env.COMMISSION_APK || '40000'),
        'default': parseFloat(process.env.COMMISSION_DEFAULT || '30000')
      },
      
      report: {
        timezone: process.env.REPORT_TIMEZONE || 'Asia/Jakarta',
        dailyReportTime: process.env.DAILY_REPORT_TIME || '0 12 * * *',
        weeklyReportTime: process.env.WEEKLY_REPORT_TIME || '0 9 * * 1',
        monthlyReportTime: process.env.MONTHLY_REPORT_TIME || '0 10 1 * *',
        companyName: process.env.COMPANY_NAME || 'SKY HOUSE',
        includeCharts: process.env.INCLUDE_CHARTS === 'true',
        exportFormat: process.env.EXPORT_FORMAT || 'xlsx'
      },
      
      business: {
        workingHours: {
          start: process.env.WORKING_HOURS_START || '08:00',
          end: process.env.WORKING_HOURS_END || '22:00'
        },
        locations: process.env.LOCATIONS ? process.env.LOCATIONS.split(',') : ['SKY1', 'SKY2', 'SKY3'],
        paymentMethods: process.env.PAYMENT_METHODS ? process.env.PAYMENT_METHODS.split(',') : ['Cash', 'Transfer'],
        minBookingDuration: parseFloat(process.env.MIN_BOOKING_DURATION || '1'),
        maxBookingDuration: parseFloat(process.env.MAX_BOOKING_DURATION || '24'),
        autoCleanupDays: parseInt(process.env.AUTO_CLEANUP_DAYS || '90')
      },
      
      security: {
        enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
        maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE || '10'),
        allowedUsers: process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [],
        encryptData: process.env.ENCRYPT_DATA === 'true'
      },
      
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
        enableFile: process.env.LOG_ENABLE_FILE !== 'false',
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
        maxSize: process.env.LOG_MAX_SIZE || '10m'
      }
    }
  }

  private static buildApartmentGroups(): ApartmentGroup[] {
    const groups: ApartmentGroup[] = []
    
    // Parse environment variables for apartment groups
    Object.keys(process.env).forEach(key => {
      if (key.startsWith('GROUP_') && key.endsWith('_ID')) {
        const groupName = key.replace('GROUP_', '').replace('_ID', '')
        const nameKey = `GROUP_${groupName}_NAME`
        const enabledKey = `GROUP_${groupName}_ENABLED`
        
        groups.push({
          id: groupName,
          name: process.env[nameKey] || groupName,
          enabled: process.env[enabledKey] !== 'false',
          chatId: process.env[key]
        })
      }
    })
    
    return groups
  }

  private static mergeConfigs(base: SystemConfig, override: Partial<SystemConfig>): SystemConfig {
    const result = { ...base }
    
    for (const [key, value] of Object.entries(override)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key as keyof SystemConfig] = {
          ...result[key as keyof SystemConfig],
          ...value
        } as any
      } else {
        result[key as keyof SystemConfig] = value as any
      }
    }
    
    return result
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private static flattenConfig(obj: any, prefix: string, updates: ConfigUpdate[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.flattenConfig(value, fullKey, updates)
      } else {
        const [section, ...keyParts] = fullKey.split('.')
        updates.push({
          section,
          key: keyParts.join('.'),
          value
        })
      }
    }
  }
}
