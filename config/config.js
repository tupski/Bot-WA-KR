// Configuration file for WhatsApp Bot
require('dotenv').config();
const path = require('path');
const fs = require('fs');

class Configuration {
    constructor() {
        this.configFile = path.join(__dirname, 'bot-config.json');
        this.loadConfiguration();
    }

    loadConfiguration() {
        this.config = {
            // WhatsApp Configuration
            whatsapp: {
                // groupChatId tidak diperlukan untuk sistem multi-grup
                sessionPath: process.env.WHATSAPP_SESSION_PATH || './session',
                puppeteerOptions: {
                    headless: process.env.PUPPETEER_HEADLESS !== 'false',
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: process.env.CHROME_EXECUTABLE_PATH || null
                },
                messageDelay: parseInt(process.env.MESSAGE_DELAY) || 1000,
                maxRetries: parseInt(process.env.MAX_RETRIES) || 3
            },

            // Owner Configuration
            owner: {
                // Nomor owner yang diizinkan menjalankan perintah (dari environment variable)
                allowedNumbers: this.buildOwnerNumbers()
            },

            // Grup Apartemen Configuration
            apartments: {
                // Mapping ID grup WhatsApp ke nama apartemen (dari environment variables)
                groupMapping: this.buildGroupMapping(),

                // Grup yang diizinkan berdasarkan ID (hanya grup yang ada di env vars)
                allowedGroups: this.buildAllowedGroups(),

                // Default apartemen jika grup tidak dikenali
                defaultApartment: 'APARTEMEN TIDAK DIKETAHUI'
            },

            // Database Configuration
            database: {
                type: process.env.DB_TYPE || 'sqlite', // 'sqlite' or 'mysql'
                sqlite: {
                    path: process.env.SQLITE_PATH || './data/bot-kr.db'
                },
                mysql: {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT) || 3306,
                    user: process.env.DB_USER || 'root',
                    password: process.env.DB_PASSWORD || '',
                    database: process.env.DB_NAME || 'bot_kr',
                    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
                    acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
                    timeout: parseInt(process.env.DB_TIMEOUT) || 60000
                }
            },

            // Email Configuration
            email: {
                service: process.env.EMAIL_SERVICE || 'gmail',
                host: process.env.EMAIL_HOST || null,
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER || '',
                    pass: process.env.EMAIL_PASS || '' // App password for Gmail or custom SMTP
                },
                to: process.env.EMAIL_TO || 'kakaramaroom@gmail.com',
                from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '',
                enabled: process.env.EMAIL_ENABLED !== 'false'
            },

            // Commission Configuration (per booking)
            commission: {
                'Amel': parseFloat(process.env.COMMISSION_AMEL) || 50000,    // Rp 50,000 per booking
                'KR': parseFloat(process.env.COMMISSION_KR) || 45000,      // Rp 45,000 per booking
                'APK': parseFloat(process.env.COMMISSION_APK) || 40000,     // Rp 40,000 per booking
                'default': parseFloat(process.env.COMMISSION_DEFAULT) || 30000  // Default commission for other CS
            },

            // Report Configuration
            report: {
                timezone: process.env.REPORT_TIMEZONE || 'Asia/Jakarta',
                dailyReportTime: process.env.DAILY_REPORT_TIME || '0 12 * * *', // 12:00 WIB daily
                weeklyReportTime: process.env.WEEKLY_REPORT_TIME || '0 9 * * 1', // Monday 09:00 WIB
                monthlyReportTime: process.env.MONTHLY_REPORT_TIME || '0 10 1 * *', // 1st day 10:00 WIB
                companyName: process.env.COMPANY_NAME || 'SKY HOUSE',
                includeCharts: process.env.INCLUDE_CHARTS !== 'false',
                exportFormat: process.env.EXPORT_FORMAT || 'xlsx'
            },

            // Business Rules
            business: {
                workingHours: {
                    start: process.env.WORKING_HOURS_START || '08:00',
                    end: process.env.WORKING_HOURS_END || '22:00'
                },
                locations: process.env.LOCATIONS ? process.env.LOCATIONS.split(',') : ['SKY1', 'SKY2', 'SKY3'],
                paymentMethods: process.env.PAYMENT_METHODS ? process.env.PAYMENT_METHODS.split(',') : ['Cash', 'Transfer'],
                minBookingDuration: parseFloat(process.env.MIN_BOOKING_DURATION) || 1, // hours
                maxBookingDuration: parseFloat(process.env.MAX_BOOKING_DURATION) || 24, // hours
                autoCleanupDays: parseInt(process.env.AUTO_CLEANUP_DAYS) || 90
            },

            // Logging Configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE || './data/bot.log',
                maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
                maxSize: process.env.LOG_MAX_SIZE || '10m',
                enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
                enableFile: process.env.LOG_ENABLE_FILE !== 'false'
            },

            // Performance settings
            performance: {
                cacheEnabled: process.env.CACHE_ENABLED !== 'false',
                cacheTTL: parseInt(process.env.CACHE_TTL) || 300, // seconds
                batchSize: parseInt(process.env.BATCH_SIZE) || 100,
                maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPS) || 5
            },

            // Security settings
            security: {
                enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
                maxMessagesPerMinute: parseInt(process.env.MAX_MESSAGES_PER_MINUTE) || 10,
                allowedUsers: process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [],
                encryptData: process.env.ENCRYPT_DATA === 'true'
            }
        };

        // Load additional configuration from file if exists
        this.loadFromFile();
    }

    /**
     * Build group mapping from environment variables
     */
    buildGroupMapping() {
        const mapping = {};



        // Define all possible groups
        const groups = [
            { id: 'GROUP_SKYHOUSE_ID', name: 'GROUP_SKYHOUSE_NAME', enabled: 'GROUP_SKYHOUSE_ENABLED' },
            { id: 'GROUP_TREEPARK_ID', name: 'GROUP_TREEPARK_NAME', enabled: 'GROUP_TREEPARK_ENABLED' },
            { id: 'GROUP_EMERALD_ID', name: 'GROUP_EMERALD_NAME', enabled: 'GROUP_EMERALD_ENABLED' },
            { id: 'GROUP_SPRINGWOOD_ID', name: 'GROUP_SPRINGWOOD_NAME', enabled: 'GROUP_SPRINGWOOD_ENABLED' },
            { id: 'GROUP_SERPONG_ID', name: 'GROUP_SERPONG_NAME', enabled: 'GROUP_SERPONG_ENABLED' },
            { id: 'GROUP_TOKYO_ID', name: 'GROUP_TOKYO_NAME', enabled: 'GROUP_TOKYO_ENABLED' },
            { id: 'GROUP_TESTER_ID', name: 'GROUP_TESTER_NAME', enabled: 'GROUP_TESTER_ENABLED' }
        ];

        // Add groups that are enabled
        groups.forEach(group => {
            const groupId = process.env[group.id];
            const groupName = process.env[group.name];
            const isEnabled = process.env[group.enabled] === 'true';

            if (groupId && groupName && isEnabled) {
                mapping[groupId] = groupName;
            }
        });

        return mapping;
    }

    /**
     * Build allowed groups list from environment variables
     */
    buildAllowedGroups() {
        const allowedGroups = [];

        // Define all possible groups
        const groups = [
            { id: 'GROUP_SKYHOUSE_ID', enabled: 'GROUP_SKYHOUSE_ENABLED' },
            { id: 'GROUP_TREEPARK_ID', enabled: 'GROUP_TREEPARK_ENABLED' },
            { id: 'GROUP_EMERALD_ID', enabled: 'GROUP_EMERALD_ENABLED' },
            { id: 'GROUP_SPRINGWOOD_ID', enabled: 'GROUP_SPRINGWOOD_ENABLED' },
            { id: 'GROUP_SERPONG_ID', enabled: 'GROUP_SERPONG_ENABLED' },
            { id: 'GROUP_TOKYO_ID', enabled: 'GROUP_TOKYO_ENABLED' },
            { id: 'GROUP_TESTER_ID', enabled: 'GROUP_TESTER_ENABLED' }
        ];

        // Add groups that are enabled
        groups.forEach(group => {
            const groupId = process.env[group.id];
            const isEnabled = process.env[group.enabled] === 'true';

            if (groupId && isEnabled) {
                allowedGroups.push(groupId);
            }
        });

        return allowedGroups;
    }

    /**
     * Build owner numbers list from environment variable
     */
    buildOwnerNumbers() {
        const ownerNumbers = [];
        const ownerNumbersEnv = process.env.OWNER_NUMBER;

        if (ownerNumbersEnv) {
            // Split by comma and clean up each number
            const numbers = ownerNumbersEnv.split(',').map(num => num.trim()).filter(num => num.length > 0);
            ownerNumbers.push(...numbers);
        }
        return ownerNumbers;
    }

    /**
     * Load configuration from JSON file
     */
    loadFromFile() {
        try {
            if (fs.existsSync(this.configFile)) {
                const fileConfig = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                this.mergeConfig(this.config, fileConfig);
            }
        } catch (error) {
            console.warn('Warning: Could not load configuration file:', error.message);
        }
    }

    /**
     * Merge configuration objects recursively
     */
    mergeConfig(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeConfig(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }

    /**
     * Save current configuration to file
     */
    saveToFile() {
        try {
            fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving configuration file:', error);
            return false;
        }
    }

    /**
     * Get configuration value by path
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * Set configuration value by path
     */
    set(path, value) {
        const keys = path.split('.');
        let target = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }

        target[keys[keys.length - 1]] = value;
    }

    /**
     * Get commission rate for CS
     */
    getCommissionRate(csName) {
        const rates = this.get('commission');
        return rates[csName] || rates.default || 30000;
    }

    /**
     * Set commission rate for CS
     */
    setCommissionRate(csName, rate) {
        this.set(`commission.${csName}`, parseFloat(rate));
    }

    /**
     * Validate configuration
     */
    validate() {
        const errors = [];

        // Validate database configuration
        if (!['sqlite', 'mysql'].includes(this.get('database.type'))) {
            errors.push('Invalid database type. Must be "sqlite" or "mysql"');
        }

        // Validate email configuration
        if (this.get('email.enabled')) {
            if (!this.get('email.auth.user') || !this.get('email.auth.pass')) {
                errors.push('Email authentication credentials are required when email is enabled');
            }
        }

        // Validate commission rates
        const rates = this.get('commission');
        for (const [cs, rate] of Object.entries(rates)) {
            if (typeof rate !== 'number' || rate < 0) {
                errors.push(`Invalid commission rate for ${cs}: ${rate}. Must be a positive number`);
            }
        }

        // Validate timezone
        try {
            const moment = require('moment-timezone');
            if (!moment.tz.zone(this.get('report.timezone'))) {
                errors.push(`Invalid timezone: ${this.get('report.timezone')}`);
            }
        } catch (error) {
            errors.push('Could not validate timezone');
        }

        return errors;
    }

    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.loadConfiguration();
    }

    /**
     * Check if configuration is valid
     */
    isValid() {
        return this.validate().length === 0;
    }
}

// Create and export configuration instance
const configuration = new Configuration();

// Export both the configuration object and the class for backward compatibility
module.exports = configuration.getAll();
module.exports.Configuration = Configuration;
module.exports.instance = configuration;
