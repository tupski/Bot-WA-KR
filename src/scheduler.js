// Scheduler Module for WhatsApp Bot
const cron = require('node-cron');
const moment = require('moment-timezone');
const config = require('../config/config.js');
const reportGenerator = require('./reportGenerator');
const excelExporter = require('./excelExporter');
const emailService = require('./emailService');
const database = require('./database');
const logger = require('./logger');

class Scheduler {
    constructor(whatsappBot) {
        this.bot = whatsappBot;
        this.timezone = config.report.timezone;
        this.scheduledTasks = new Map();
    }

    /**
     * Initialize all scheduled tasks
     */
    initializeSchedules() {
        try {
            // Daily report at 12:00 WIB
            this.scheduleDailyReport();
            
            // Weekly report every Monday at 09:00 WIB
            this.scheduleWeeklyReport();
            
            // Monthly report on 1st day of month at 10:00 WIB
            this.scheduleMonthlyReport();
            
            // Database cleanup every Sunday at 02:00 WIB
            this.scheduleDatabaseCleanup();
            
            // Health check every hour
            this.scheduleHealthCheck();

            logger.info('All scheduled tasks initialized successfully');
        } catch (error) {
            logger.error('Error initializing scheduled tasks:', error);
        }
    }

    /**
     * Schedule daily report at 12:00 WIB
     */
    scheduleDailyReport() {
        const task = cron.schedule(config.report.dailyReportTime, async () => {
            try {
                logger.info('Starting scheduled daily report generation...');
                
                // Generate report
                const report = await reportGenerator.generateDailyReport();
                
                // Send to WhatsApp group
                const messageSent = await this.bot.sendToGroup(report);
                
                if (messageSent) {
                    logger.info('Daily report sent to WhatsApp group successfully');
                } else {
                    logger.error('Failed to send daily report to WhatsApp group');
                }
                
                // Generate Excel file
                const excelPath = await excelExporter.generateDailyExcel();
                
                if (excelPath) {
                    // Send email with Excel attachment
                    const emailSent = await emailService.sendDailyReport(excelPath);
                    
                    if (emailSent) {
                        logger.info('Daily Excel report sent via email successfully');
                    } else {
                        logger.error('Failed to send daily Excel report via email');
                    }
                } else {
                    logger.error('Failed to generate Excel file for daily report');
                }
                
            } catch (error) {
                logger.error('Error in scheduled daily report:', error);
                
                // Send error notification to group
                const errorMessage = `❌ *Error dalam laporan harian*\n\nTerjadi kesalahan saat membuat laporan harian. Silakan periksa log untuk detail lebih lanjut.\n\nWaktu: ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm')} WIB`;
                await this.bot.sendToGroup(errorMessage);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('dailyReport', task);
        logger.info(`Daily report scheduled for ${config.report.dailyReportTime} ${this.timezone}`);
    }

    /**
     * Schedule weekly report every Monday at 09:00 WIB
     */
    scheduleWeeklyReport() {
        const task = cron.schedule('0 9 * * 1', async () => {
            try {
                logger.info('Starting scheduled weekly report generation...');
                
                const report = await reportGenerator.generateWeeklyReport();
                await this.bot.sendToGroup(report);
                
                logger.info('Weekly report sent successfully');
            } catch (error) {
                logger.error('Error in scheduled weekly report:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('weeklyReport', task);
        logger.info('Weekly report scheduled for every Monday at 09:00 WIB');
    }

    /**
     * Schedule monthly report on 1st day of month at 10:00 WIB
     */
    scheduleMonthlyReport() {
        const task = cron.schedule('0 10 1 * *', async () => {
            try {
                logger.info('Starting scheduled monthly report generation...');
                
                // Generate report for previous month
                const lastMonth = moment().tz(this.timezone).subtract(1, 'month');
                const report = await reportGenerator.generateMonthlyReport(
                    lastMonth.year(), 
                    lastMonth.month() + 1
                );
                
                await this.bot.sendToGroup(report);
                
                logger.info('Monthly report sent successfully');
            } catch (error) {
                logger.error('Error in scheduled monthly report:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('monthlyReport', task);
        logger.info('Monthly report scheduled for 1st day of each month at 10:00 WIB');
    }

    /**
     * Schedule database cleanup every Sunday at 02:00 WIB
     */
    scheduleDatabaseCleanup() {
        const task = cron.schedule('0 2 * * 0', async () => {
            try {
                logger.info('Starting scheduled database cleanup...');
                
                const deletedCount = await database.cleanupOldData(90); // Keep 90 days
                
                logger.info(`Database cleanup completed. Deleted ${deletedCount} old records.`);
            } catch (error) {
                logger.error('Error in scheduled database cleanup:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('databaseCleanup', task);
        logger.info('Database cleanup scheduled for every Sunday at 02:00 WIB');
    }

    /**
     * Schedule health check every hour
     */
    scheduleHealthCheck() {
        const task = cron.schedule('0 * * * *', async () => {
            try {
                // Check if WhatsApp bot is still connected
                if (!this.bot.isClientReady()) {
                    logger.warn('WhatsApp bot is not ready - attempting to reconnect');
                    // Could implement reconnection logic here
                }
                
                // Check database connection
                try {
                    await database.getTotalStats();
                } catch (dbError) {
                    logger.error('Database health check failed:', dbError);
                }
                
                // Log health status
                logger.debug('Health check completed');
            } catch (error) {
                logger.error('Error in health check:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('healthCheck', task);
        logger.info('Health check scheduled every hour');
    }

    /**
     * Schedule custom task
     */
    scheduleCustomTask(name, cronExpression, taskFunction, options = {}) {
        try {
            const task = cron.schedule(cronExpression, taskFunction, {
                timezone: options.timezone || this.timezone,
                ...options
            });

            this.scheduledTasks.set(name, task);
            logger.info(`Custom task '${name}' scheduled with expression: ${cronExpression}`);
            
            return task;
        } catch (error) {
            logger.error(`Error scheduling custom task '${name}':`, error);
            return null;
        }
    }

    /**
     * Stop a scheduled task
     */
    stopTask(taskName) {
        const task = this.scheduledTasks.get(taskName);
        if (task) {
            task.stop();
            logger.info(`Task '${taskName}' stopped`);
            return true;
        } else {
            logger.warn(`Task '${taskName}' not found`);
            return false;
        }
    }

    /**
     * Start a stopped task
     */
    startTask(taskName) {
        const task = this.scheduledTasks.get(taskName);
        if (task) {
            task.start();
            logger.info(`Task '${taskName}' started`);
            return true;
        } else {
            logger.warn(`Task '${taskName}' not found`);
            return false;
        }
    }

    /**
     * Remove a scheduled task
     */
    removeTask(taskName) {
        const task = this.scheduledTasks.get(taskName);
        if (task) {
            task.destroy();
            this.scheduledTasks.delete(taskName);
            logger.info(`Task '${taskName}' removed`);
            return true;
        } else {
            logger.warn(`Task '${taskName}' not found`);
            return false;
        }
    }

    /**
     * Get all scheduled tasks status
     */
    getTasksStatus() {
        const status = {};
        for (const [name, task] of this.scheduledTasks) {
            status[name] = {
                running: task.running || false,
                scheduled: true
            };
        }
        return status;
    }

    /**
     * Stop all scheduled tasks
     */
    stopAllTasks() {
        for (const [name, task] of this.scheduledTasks) {
            task.stop();
            logger.info(`Task '${name}' stopped`);
        }
        logger.info('All scheduled tasks stopped');
    }

    /**
     * Start all scheduled tasks
     */
    startAllTasks() {
        for (const [name, task] of this.scheduledTasks) {
            task.start();
            logger.info(`Task '${name}' started`);
        }
        logger.info('All scheduled tasks started');
    }

    /**
     * Manually trigger daily report (for testing)
     */
    async triggerDailyReport(date = null) {
        try {
            logger.info('Manually triggering daily report...');
            
            const report = await reportGenerator.generateDailyReport(date);
            const messageSent = await this.bot.sendToGroup(report);
            
            if (messageSent) {
                logger.info('Manual daily report sent successfully');
                return true;
            } else {
                logger.error('Failed to send manual daily report');
                return false;
            }
        } catch (error) {
            logger.error('Error in manual daily report trigger:', error);
            return false;
        }
    }

    /**
     * Get next scheduled run times
     */
    getNextRunTimes() {
        const nextRuns = {};
        for (const [name, task] of this.scheduledTasks) {
            if (task.nextDate) {
                nextRuns[name] = task.nextDate().format();
            }
        }
        return nextRuns;
    }
}

module.exports = Scheduler;
