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

            // Daily notification to owners at 12:00 WIB
            this.scheduleOwnerNotification();

            // Monthly report on 1st day of month at 10:00 WIB
            this.scheduleMonthlyReport();

            // Database cleanup every Sunday at 02:00 WIB
            this.scheduleDatabaseCleanup();

            // Health check every hour
            this.scheduleHealthCheck();

            logger.info('Semua tugas terjadwal berhasil diinisialisasi');
        } catch (error) {
            logger.error('Error menginisialisasi tugas terjadwal:', error);
        }
    }

    /**
     * Schedule daily report at 12:00 WIB
     */
    scheduleDailyReport() {
        const task = cron.schedule(config.report.dailyReportTime, async () => {
            try {
                logger.info('Memulai pembuatan laporan harian terjadwal...');
                
                // Generate Excel file first untuk kemarin (business day logic)
                const moment = require('moment-timezone');
                const now = moment().tz('Asia/Jakarta');
                const businessDay = now.clone().subtract(1, 'day');

                const excelPath = await excelExporter.generateDailyExcel(businessDay.format('YYYY-MM-DD'));

                if (excelPath) {
                    // Send email with Excel attachment
                    const emailSent = await emailService.sendDailyReport(excelPath);

                    if (emailSent) {
                        logger.info('Laporan Excel harian berhasil dikirim via email');
                    } else {
                        logger.error('Gagal mengirim laporan Excel harian via email');
                    }

                    // Send apartment-specific reports with Excel attachment to each group
                    const whatsappSent = await this.bot.sendDailyReportsWithAttachment(excelPath);

                    if (whatsappSent) {
                        logger.info('Laporan harian dengan attachment berhasil dikirim ke semua grup WhatsApp yang enabled');
                    } else {
                        logger.error('Gagal mengirim laporan harian dengan attachment ke grup WhatsApp');
                    }

                    // Send daily reports with Excel attachment to owner numbers
                    const ownersSent = await this.bot.sendDailyReportsToOwners(excelPath);

                    if (ownersSent) {
                        logger.info('Laporan harian dengan attachment berhasil dikirim ke owner numbers');
                    } else {
                        logger.error('Gagal mengirim laporan harian dengan attachment ke owner numbers');
                    }
                } else {
                    logger.error('Gagal membuat file Excel untuk laporan harian');

                    // Fallback: Send text-only reports to WhatsApp groups
                    const messageSent = await this.bot.sendDailyReportsToGroups();

                    if (messageSent) {
                        logger.info('Laporan harian teks berhasil dikirim ke semua grup WhatsApp yang enabled (tanpa attachment)');
                    } else {
                        logger.error('Gagal mengirim laporan harian ke grup WhatsApp');
                    }
                }

            } catch (error) {
                logger.error('Error dalam laporan harian terjadwal:', error);
                
                // Send error notification to all groups
                const errorMessage = `❌ *Error dalam laporan harian*\n\nTerjadi kesalahan saat membuat laporan harian. Silakan periksa log untuk detail lebih lanjut.\n\nWaktu: ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm')} WIB`;
                await this.bot.sendToAllEnabledGroups(errorMessage);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('dailyReport', task);
        logger.info(`Laporan harian dijadwalkan untuk ${config.report.dailyReportTime} ${this.timezone}`);
    }

    /**
     * Schedule daily notification to owners at 12:00 WIB
     */
    scheduleOwnerNotification() {
        const task = cron.schedule('0 12 * * *', async () => {
            try {
                logger.info('Mengirim notifikasi harian ke owner numbers...');

                const moment = require('moment-timezone');
                const displayDate = moment().tz(this.timezone).format('DD/MM/YYYY');
                const displayTime = moment().tz(this.timezone).format('HH:mm');

                // Check if owner numbers are configured
                if (!config.owner || !config.owner.allowedNumbers || config.owner.allowedNumbers.length === 0) {
                    logger.warn('No owner numbers configured for daily notification');
                    return;
                }

                const notificationMessage = `🔔 *NOTIFIKASI HARIAN*\n\n📅 Tanggal: ${displayDate}\n⏰ Waktu: ${displayTime} WIB\n\n✅ Laporan harian telah dikirim via email dan attachment WhatsApp\n📊 Silakan cek email dan file Excel untuk detail lengkap\n\n🏢 KAKARAMA ROOM`;

                let successCount = 0;
                for (const ownerNumber of config.owner.allowedNumbers) {
                    try {
                        // Format owner number untuk WhatsApp
                        const formattedNumber = ownerNumber.includes('@') ? ownerNumber : `${ownerNumber}@c.us`;

                        const success = await this.bot.sendMessage(formattedNumber, notificationMessage);
                        if (success) {
                            successCount++;
                            logger.info(`✅ Notifikasi harian berhasil dikirim ke owner: ${ownerNumber}`);
                        } else {
                            logger.error(`❌ Gagal mengirim notifikasi harian ke owner: ${ownerNumber}`);
                        }

                        // Delay antar pengiriman
                        await new Promise(resolve => setTimeout(resolve, config.whatsapp.messageDelay || 1000));
                    } catch (error) {
                        logger.error(`Error mengirim notifikasi ke owner ${ownerNumber}:`, error);
                    }
                }

                logger.info(`Notifikasi harian selesai: ${successCount}/${config.owner.allowedNumbers.length} owner berhasil`);

            } catch (error) {
                logger.error('Error dalam notifikasi harian ke owner:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('ownerNotification', task);
        logger.info(`Notifikasi harian ke owner dijadwalkan untuk 12:00 ${this.timezone}`);
    }

    /**
     * Schedule monthly report on 1st day of month at 10:00 WIB
     */
    scheduleMonthlyReport() {
        const task = cron.schedule('0 10 1 * *', async () => {
            try {
                logger.info('Memulai pembuatan laporan bulanan terjadwal...');

                // Generate report for previous month
                const lastMonth = moment().tz(this.timezone).subtract(1, 'month');
                const report = await reportGenerator.generateMonthlyReport(
                    lastMonth.year(),
                    lastMonth.month() + 1
                );

                const messageSent = await this.bot.sendToAllEnabledGroups(report);

                if (messageSent) {
                    logger.info('Laporan bulanan berhasil dikirim ke semua grup yang enabled');
                } else {
                    logger.error('Gagal mengirim laporan bulanan ke grup WhatsApp');
                }
            } catch (error) {
                logger.error('Error dalam laporan bulanan terjadwal:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('monthlyReport', task);
        logger.info('Laporan bulanan dijadwalkan tanggal 1 setiap bulan jam 10:00 WIB');
    }

    /**
     * Schedule database cleanup every Sunday at 02:00 WIB
     */
    scheduleDatabaseCleanup() {
        const task = cron.schedule('0 2 * * 0', async () => {
            try {
                logger.info('Memulai pembersihan database terjadwal...');

                const deletedCount = await database.cleanupOldData(90); // Keep 90 days

                logger.info(`Pembersihan database selesai. Menghapus ${deletedCount} record lama.`);
            } catch (error) {
                logger.error('Error dalam pembersihan database terjadwal:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('databaseCleanup', task);
        logger.info('Pembersihan database dijadwalkan setiap Minggu jam 02:00 WIB');
    }

    /**
     * Schedule health check every hour
     */
    scheduleHealthCheck() {
        const task = cron.schedule('0 * * * *', async () => {
            try {
                // Check if WhatsApp bot is still connected
                if (!this.bot.isClientReady()) {
                    logger.warn('Bot WhatsApp tidak siap - mencoba menyambung kembali');
                    // Could implement reconnection logic here
                }

                // Check database connection
                try {
                    await database.getTotalStats();
                } catch (dbError) {
                    logger.error('Pemeriksaan kesehatan database gagal:', dbError);
                }

                // Log health status
                logger.debug('Pemeriksaan kesehatan selesai');
            } catch (error) {
                logger.error('Error dalam pemeriksaan kesehatan:', error);
            }
        }, {
            timezone: this.timezone
        });

        this.scheduledTasks.set('healthCheck', task);
        logger.info('Pemeriksaan kesehatan dijadwalkan setiap jam');
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
            logger.info(`Tugas kustom '${name}' dijadwalkan dengan ekspresi: ${cronExpression}`);

            return task;
        } catch (error) {
            logger.error(`Error menjadwalkan tugas kustom '${name}':`, error);
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
            logger.info(`Tugas '${taskName}' dihentikan`);
            return true;
        } else {
            logger.warn(`Tugas '${taskName}' tidak ditemukan`);
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
            logger.info(`Tugas '${taskName}' dimulai`);
            return true;
        } else {
            logger.warn(`Tugas '${taskName}' tidak ditemukan`);
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
            logger.info(`Tugas '${taskName}' dihapus`);
            return true;
        } else {
            logger.warn(`Tugas '${taskName}' tidak ditemukan`);
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
            logger.info(`Tugas '${name}' dihentikan`);
        }
        logger.info('Semua tugas terjadwal dihentikan');
    }

    /**
     * Start all scheduled tasks
     */
    startAllTasks() {
        for (const [name, task] of this.scheduledTasks) {
            task.start();
            logger.info(`Tugas '${name}' dimulai`);
        }
        logger.info('Semua tugas terjadwal dimulai');
    }

    /**
     * Manually trigger daily report (for testing)
     */
    async triggerDailyReport(date = null) {
        try {
            logger.info('Memicu laporan harian secara manual...');

            const report = await reportGenerator.generateDailyReport(date);
            const messageSent = await this.bot.sendToAllEnabledGroups(report);

            if (messageSent) {
                logger.info('Laporan harian manual berhasil dikirim ke semua grup yang enabled');
                return true;
            } else {
                logger.error('Gagal mengirim laporan harian manual');
                return false;
            }
        } catch (error) {
            logger.error('Error dalam pemicu laporan harian manual:', error);
            return false;
        }
    }

    /**
     * Get next scheduled run times
     */
    getNextRunTimes() {
        const nextRuns = {};

        try {
            const now = moment().tz(this.timezone);

            // Daily report: setiap hari jam 12:00
            const dailyNext = now.clone().hour(12).minute(0).second(0);
            if (dailyNext.isBefore(now)) {
                dailyNext.add(1, 'day');
            }
            nextRuns.dailyReport = dailyNext.toDate();

            // Weekly report: setiap Senin jam 09:00
            const weeklyNext = now.clone().day(1).hour(9).minute(0).second(0); // 1 = Monday
            if (weeklyNext.isBefore(now)) {
                weeklyNext.add(1, 'week');
            }
            nextRuns.weeklyReport = weeklyNext.toDate();

            // Monthly report: tanggal 1 jam 10:00
            const monthlyNext = now.clone().date(1).hour(10).minute(0).second(0);
            if (monthlyNext.isBefore(now)) {
                monthlyNext.add(1, 'month');
            }
            nextRuns.monthlyReport = monthlyNext.toDate();

        } catch (error) {
            logger.error('Error getting next run times:', error);
        }

        return nextRuns;
    }
}

module.exports = Scheduler;
