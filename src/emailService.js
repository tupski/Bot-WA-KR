// Email Service Module
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.js');
const logger = require('./logger');

class EmailService {
    constructor() {
        this.timezone = config.report.timezone;
        this.companyName = config.report.companyName;
        this.transporter = null;
        this.initializeTransporter();
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
    async sendDailyReport(excelFilePath, date = null, apartmentName = null) {
        try {
            if (!this.transporter) {
                throw new Error('Email transporter not initialized');
            }

            if (!excelFilePath || !fs.existsSync(excelFilePath)) {
                throw new Error('Excel file not found or path is invalid');
            }

            const reportDate = date || moment().tz(this.timezone).format('YYYY-MM-DD');
            const displayDate = moment(reportDate).format('DD MMMM YYYY');
            const currentTime = moment().tz(this.timezone).format('HH:mm');

            // Email content dengan format baru
            let subject, htmlContent, textContent;

            if (apartmentName) {
                // Format: Laporan <Nama Apartemen> <Tanggal> - KR WA Bot
                subject = `Laporan ${apartmentName} ${displayDate} - KR WA Bot`;
                htmlContent = this.generateDailyEmailHTML(displayDate, currentTime, apartmentName);
                textContent = this.generateDailyEmailText(displayDate, currentTime, apartmentName);
            } else {
                // Format lama untuk backward compatibility
                subject = `Laporan Harian ${this.companyName} - ${displayDate}`;
                htmlContent = this.generateDailyEmailHTML(displayDate, currentTime);
                textContent = this.generateDailyEmailText(displayDate, currentTime);
            }

            // Email options
            const mailOptions = {
                from: {
                    name: 'Kakarama Bot',
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
    generateDailyEmailHTML(displayDate, currentTime, apartmentName = null) {
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
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Laporan Harian ${apartmentName || this.companyName}</h1>
                <p>${displayDate} - ${currentTime} WIB</p>
            </div>

            <div class="content">
                <h2>Selamat siang!</h2>

                <p>Berikut adalah laporan harian ${apartmentName || this.companyName} untuk tanggal <strong>${displayDate}</strong>.</p>
                
                <div class="highlight">
                    <h3>📊 File Laporan Excel</h3>
                    <p>File Excel dengan detail lengkap telah dilampirkan dalam email ini, berisi:</p>
                    <ul>
                        <li><strong>Sheet Transaksi:</strong> Detail semua transaksi hari ini</li>
                        <li><strong>Sheet Ringkasan CS:</strong> Performa masing-masing CS</li>
                        <li><strong>Sheet Komisi Marketing:</strong> Perhitungan komisi untuk setiap CS</li>
                    </ul>
                </div>
                
                <div class="highlight">
                    <h3>📱 Laporan WhatsApp</h3>
                    <p>Ringkasan laporan juga telah dikirim ke grup WhatsApp pada pukul 12:00 WIB.</p>
                </div>
                
                <p>Jika ada pertanyaan atau memerlukan informasi tambahan, silakan hubungi Om Tupas ekekekke.</p>
                
                <p>Terima kasih!</p>
            </div>
            
            <div class="footer">
                <p>Email ini dikirim secara otomatis oleh sistem WhatsApp Bot ${this.companyName}</p>
                <p>Waktu pengiriman: ${moment().tz(this.timezone).format('DD/MM/YYYY HH:mm:ss')} WIB</p>
                <p>Copyright &copy; 2025 - Kakarama Room.<a href="https://kakaramaroom.com" target="_blank">kakaramaroom.com</a></p>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate text content for daily email
     */
    generateDailyEmailText(displayDate, currentTime, apartmentName = null) {
        const reportName = apartmentName || this.companyName;
        return `
LAPORAN HARIAN ${reportName.toUpperCase()}
${displayDate} - ${currentTime} WIB

Selamat siang!

Berikut adalah laporan harian ${reportName} untuk tanggal ${displayDate}.

FILE LAPORAN EXCEL:
File Excel dengan detail lengkap telah dilampirkan dalam email ini, berisi:
- Sheet Transaksi: Detail semua transaksi hari ini
- Sheet Ringkasan CS: Performa masing-masing CS  
- Sheet Komisi Marketing: Perhitungan komisi untuk setiap CS

LAPORAN WHATSAPP:
Ringkasan laporan juga telah dikirim ke grup WhatsApp pada pukul 12:00 WIB.

Jika ada pertanyaan atau memerlukan informasi tambahan, silakan hubungi administrator sistem.

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

            const displayStartDate = moment(startDate).format('DD MMMM YYYY');
            const displayEndDate = moment(endDate).format('DD MMMM YYYY');

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

            const monthName = moment().month(month - 1).format('MMMM YYYY');
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
