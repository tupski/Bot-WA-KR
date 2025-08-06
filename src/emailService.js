// Email Service Module
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.js');
const logger = require('./logger');

// Mapping bulan ke bahasa Indonesia
const MONTH_NAMES_ID = {
    'January': 'Januari',
    'February': 'Februari',
    'March': 'Maret',
    'April': 'April',
    'May': 'Mei',
    'June': 'Juni',
    'July': 'Juli',
    'August': 'Agustus',
    'September': 'September',
    'October': 'Oktober',
    'November': 'November',
    'December': 'Desember'
};

class EmailService {
    constructor() {
        this.timezone = config.report.timezone;
        this.companyName = config.report.companyName;
        this.transporter = null;
        this.initializeTransporter();
    }

    /**
     * Convert date to Indonesian format
     */
    formatDateIndonesian(date) {
        const momentDate = moment(date);
        const englishFormat = momentDate.format('DD MMMM YYYY');
        let indonesianFormat = englishFormat;

        // Replace English month names with Indonesian
        Object.keys(MONTH_NAMES_ID).forEach(englishMonth => {
            indonesianFormat = indonesianFormat.replace(englishMonth, MONTH_NAMES_ID[englishMonth]);
        });

        return indonesianFormat;
    }

    /**
     * Get dynamic greeting based on current time
     */
    getDynamicGreeting() {
        const currentHour = moment().tz(this.timezone).hour();

        if (currentHour >= 5 && currentHour < 11) {
            return 'Selamat pagi';
        } else if (currentHour >= 11 && currentHour < 15) {
            return 'Selamat siang';
        } else if (currentHour >= 15 && currentHour < 18) {
            return 'Selamat sore';
        } else {
            return 'Selamat malam';
        }
    }

    /**
     * Initialize email transporter
     */
    initializeTransporter() {
        try {
            let transportConfig;

            if (config.email.service === 'custom' && config.email.host) {
                // Custom SMTP configuration
                transportConfig = {
                    host: config.email.host,
                    port: config.email.port,
                    secure: config.email.secure, // true for 465, false for other ports
                    auth: {
                        user: config.email.auth.user,
                        pass: config.email.auth.pass
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                };
                logger.info(`Initializing custom SMTP: ${config.email.host}:${config.email.port} (secure: ${config.email.secure})`);
            } else {
                // Service-based configuration (Gmail, etc.)
                transportConfig = {
                    service: config.email.service,
                    auth: {
                        user: config.email.auth.user,
                        pass: config.email.auth.pass
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                };
                logger.info(`Initializing email service: ${config.email.service}`);
            }

            this.transporter = nodemailer.createTransport(transportConfig);

            logger.info('Transporter email berhasil diinisialisasi');
        } catch (error) {
            logger.error('Error menginisialisasi transporter email:', error);
        }
    }

    /**
     * Verify email configuration
     */
    async verifyConnection() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            await this.transporter.verify();
            logger.info('Koneksi email berhasil diverifikasi');
            return true;
        } catch (error) {
            logger.error('Verifikasi koneksi email gagal:', error);
            return false;
        }
    }

    /**
     * Send daily report with Excel attachment
     */
    async sendDailyReport(excelFilePath, date = null, apartmentName = null, isExportCommand = false) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            if (!excelFilePath || !fs.existsSync(excelFilePath)) {
                throw new Error('Excel file not found or path is invalid');
            }

            const reportDate = date || moment().tz(this.timezone).format('YYYY-MM-DD');
            const displayDate = this.formatDateIndonesian(reportDate);
            const currentTime = moment().tz(this.timezone).format('HH:mm');

            // Email content dengan format baru
            let subject, htmlContent, textContent;

            if (apartmentName) {
                // Format: Laporan <Nama Apartemen> <Tanggal> - KR WA Bot
                subject = `Laporan ${apartmentName} ${displayDate} - KR WA Bot`;
                htmlContent = this.generateDailyEmailHTML(displayDate, currentTime, apartmentName, isExportCommand);
                textContent = this.generateDailyEmailText(displayDate, currentTime, apartmentName, isExportCommand);
            } else {
                // Format lama untuk backward compatibility
                subject = `Laporan Harian ${this.companyName} - ${displayDate}`;
                htmlContent = this.generateDailyEmailHTML(displayDate, currentTime, null, isExportCommand);
                textContent = this.generateDailyEmailText(displayDate, currentTime, null, isExportCommand);
            }

            // Email options
            const mailOptions = {
                from: {
                    name: 'KakaRama Bot',
                    address: config.email.from
                },
                to: config.email.to,
                subject: subject,
                text: textContent,
                html: htmlContent,
                attachments: [
                    {
                        filename: path.basename(excelFilePath),
                        path: excelFilePath,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ]
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);
            
            logger.info(`Email laporan harian berhasil dikirim ke ${config.email.to}`);
            logger.info(`Message ID: ${info.messageId}`);

            return true;

        } catch (error) {
            logger.error('Error mengirim email laporan harian:', error);
            return false;
        }
    }

    /**
     * Generate HTML content for daily email
     */
    generateDailyEmailHTML(displayDate, currentTime, apartmentName = null, isExportCommand = false) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    background-color: #366092;
                    color: white;
                    padding: 20px;
                    text-align: center;
                    border-radius: 5px 5px 0 0;
                }
                .content {
                    background-color: #f9f9f9;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 0 0 5px 5px;
                }
                .footer {
                    margin-top: 20px;
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }
                .highlight {
                    background-color: #e7f3ff;
                    padding: 10px;
                    border-left: 4px solid #366092;
                    margin: 10px 0;
                }
                .logo {
                    text-align: center;
                    margin: 20px 0;
                }
                .logo img {
                    max-width: 150px;
                    height: auto;
                }
            </style>
        </head>
        <body>
            <div class="logo">
                <img src="https://kakaramaroom.com/wp-content/uploads/2025/05/logo-kr-transparent-square.png" alt="Kakarama Room Logo" />
            </div>

            <div class="header">
                <h1>${isExportCommand ? 'Laporan Export' : 'Laporan Harian'} ${apartmentName || this.companyName}</h1>
                <p>${displayDate} - ${currentTime} WIB</p>
            </div>

            <div class="content">
                <h2>${this.getDynamicGreeting()}!</h2>

                <p>Berikut adalah ${isExportCommand ? 'laporan export' : 'laporan harian'} ${apartmentName || this.companyName} untuk tanggal <strong>${displayDate}</strong>.</p>
                
                <div class="highlight">
                    <h3>📊 File Laporan Excel</h3>
                    <p>File Excel dengan detail lengkap telah dilampirkan dalam email ini, berisi:</p>
                    <ul>
                        <li><strong>Sheet Transaksi:</strong> Detail semua transaksi pada periode ini</li>
                        <li><strong>Sheet Laporan Cash:</strong> Khusus transaksi pembayaran tunai</li>
                        <li><strong>Sheet Ringkasan:</strong> Ringkasan CS dan komisi marketing</li>
                    </ul>
                </div>

                ${!isExportCommand ? `<div class="highlight">
                    <h3>📱 Laporan WhatsApp</h3>
                    <p>Ringkasan laporan juga telah dikirim ke grup WhatsApp pada pukul 12:00 WIB.</p>
                </div>` : ''}
                
                <p>Jika ada pertanyaan atau memerlukan informasi tambahan, silakan hubungi Om Tupas ekekekke.</p>
                
                <p>Terima kasih!</p>
            </div>
            
            <div class="footer">
                <p>Email ini dikirim secara otomatis oleh sistem WhatsApp Bot ${this.companyName}</p>
                <p>Waktu pengiriman: ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm:ss')} WIB</p>
                <p>Copyright &copy; 2025 - Kakarama Room.</p>
                <p><a href="https://kakaramaroom.com" target="_blank">www.kakaramaroom.com</a></p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate text content for daily email
     */
    generateDailyEmailText(displayDate, currentTime, apartmentName = null, isExportCommand = false) {
        const reportName = apartmentName || this.companyName;
        const reportType = isExportCommand ? 'EXPORT' : 'HARIAN';
        const greeting = this.getDynamicGreeting();

        return `
LAPORAN ${reportType} ${reportName.toUpperCase()}
${displayDate} - ${currentTime} WIB

${greeting}!

Berikut adalah laporan ${isExportCommand ? 'export' : 'harian'} ${reportName} untuk tanggal ${displayDate}.

FILE LAPORAN EXCEL:
File Excel dengan detail lengkap telah dilampirkan dalam email ini, berisi:
- Sheet Transaksi: Detail semua transaksi pada periode ini
- Sheet Laporan Cash: Khusus transaksi pembayaran tunai
- Sheet Ringkasan: Ringkasan CS dan komisi marketing

${!isExportCommand ? `LAPORAN WHATSAPP:
Ringkasan laporan juga telah dikirim ke grup WhatsApp pada pukul 12:00 WIB.

` : ''}

Jika ada pertanyaan atau memerlukan informasi tambahan, silakan hubungi Om Tupas ekekekke.

Terima kasih!

---
Email ini dikirim secara otomatis oleh sistem WhatsApp Bot ${this.companyName}
Waktu pengiriman: ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm:ss')} WIB
        `;
    }

    /**
     * Send weekly report
     */
    async sendWeeklyReport(excelFilePath, startDate, endDate) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            if (!excelFilePath || !fs.existsSync(excelFilePath)) {
                throw new Error('Excel file not found or path is invalid');
            }

            const displayStartDate = this.formatDateIndonesian(startDate);
            const displayEndDate = this.formatDateIndonesian(endDate);

            const subject = `Laporan Mingguan ${this.companyName} - ${displayStartDate} s/d ${displayEndDate}`;
            const htmlContent = this.generateWeeklyEmailHTML(displayStartDate, displayEndDate);

            const mailOptions = {
                from: {
                    name: 'Kakarama Bot',
                    address: config.email.from
                },
                to: config.email.to,
                subject: subject,
                html: htmlContent,
                attachments: [
                    {
                        filename: path.basename(excelFilePath),
                        path: excelFilePath,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email laporan mingguan berhasil dikirim: ${info.messageId}`);
            return true;

        } catch (error) {
            logger.error('Error mengirim email laporan mingguan:', error);
            return false;
        }
    }

    /**
     * Generate HTML content for weekly email
     */
    generateWeeklyEmailHTML(displayStartDate, displayEndDate) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #366092; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Laporan Mingguan ${this.companyName}</h1>
                <p>${displayStartDate} - ${displayEndDate}</p>
            </div>
            <div class="content">
                <h2>Laporan Mingguan</h2>
                <p>Terlampir adalah laporan mingguan ${this.companyName} untuk periode ${displayStartDate} sampai ${displayEndDate}.</p>
                <p>File Excel berisi ringkasan performa dan statistik lengkap untuk periode tersebut.</p>
            </div>
            <div class="footer">
                <p>Email otomatis dari sistem WhatsApp Bot ${this.companyName}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Send monthly report
     */
    async sendMonthlyReport(excelFilePath, year, month) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            if (!excelFilePath || !fs.existsSync(excelFilePath)) {
                throw new Error('Excel file not found or path is invalid');
            }

            const monthDate = moment().year(year).month(month - 1);
            const monthName = this.formatDateIndonesian(monthDate.format('YYYY-MM-01')).replace(/\d+ /, '');
            const subject = `Laporan Bulanan ${this.companyName} - ${monthName}`;
            const htmlContent = this.generateMonthlyEmailHTML(monthName);

            const mailOptions = {
                from: {
                    name: 'Kakarama Bot',
                    address: config.email.from
                },
                to: config.email.to,
                subject: subject,
                html: htmlContent,
                attachments: [
                    {
                        filename: path.basename(excelFilePath),
                        path: excelFilePath,
                        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email laporan bulanan berhasil dikirim: ${info.messageId}`);
            return true;

        } catch (error) {
            logger.error('Error mengirim email laporan bulanan:', error);
            return false;
        }
    }

    /**
     * Generate HTML content for monthly email
     */
    generateMonthlyEmailHTML(monthName) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #366092; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
                .footer { margin-top: 20px; padding: 10px; text-align: center; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Laporan Bulanan ${this.companyName}</h1>
                <p>${monthName}</p>
            </div>
            <div class="content">
                <h2>Laporan Bulanan</h2>
                <p>Terlampir adalah laporan bulanan ${this.companyName} untuk bulan ${monthName}.</p>
                <p>File Excel berisi ringkasan lengkap performa bulanan dan analisis statistik.</p>
            </div>
            <div class="footer">
                <p>Email otomatis dari sistem WhatsApp Bot ${this.companyName}</p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Send error notification email
     */
    async sendErrorNotification(error, context = '') {
        try {
            if (!this.transporter) {
                return false;
            }

            const subject = `Error Alert - ${this.companyName} WhatsApp Bot`;
            const htmlContent = `
            <h2>Error Alert</h2>
            <p><strong>Context:</strong> ${context}</p>
            <p><strong>Error:</strong> ${error.message}</p>
            <p><strong>Stack:</strong></p>
            <pre>${error.stack}</pre>
            <p><strong>Time:</strong> ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm:ss')} WIB</p>
            `;

            const mailOptions = {
                from: {
                    name: `${this.companyName} Bot Alert`,
                    address: config.email.from
                },
                to: config.email.to,
                subject: subject,
                html: htmlContent
            };

            await this.transporter.sendMail(mailOptions);
            logger.info('Email notifikasi error berhasil dikirim');
            return true;

        } catch (emailError) {
            logger.error('Error mengirim email notifikasi error:', emailError);
            return false;
        }
    }

    /**
     * Test email functionality
     */
    async sendTestEmail() {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            const subject = `Test Email - ${this.companyName} WhatsApp Bot`;
            const htmlContent = `
            <h2>Test Email</h2>
            <p>This is a test email from ${this.companyName} WhatsApp Bot.</p>
            <p>If you receive this email, the email configuration is working correctly.</p>
            <p><strong>Time:</strong> ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm:ss')} WIB</p>
            `;

            const mailOptions = {
                from: {
                    name: 'Kakarama Bot',
                    address: config.email.from
                },
                to: config.email.to,
                subject: subject,
                html: htmlContent
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email test berhasil dikirim: ${info.messageId}`);
            return true;

        } catch (error) {
            logger.error('Error mengirim email test:', error);
            return false;
        }
    }
}

module.exports = new EmailService();
