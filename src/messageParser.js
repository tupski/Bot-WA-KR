// Modul Parser Pesan
const moment = require('moment-timezone');
const config = require('../config/config.js');
const logger = require('./logger');

class MessageParser {
    constructor() {
        this.timezone = config.report.timezone;
    }

    /**
     * Parse pesan booking dengan format baru
     * Format yang diharapkan:
     * 🟢SKY HOUSE
     * Unit      :L3/30N
     * Cek out: 05:00
     * Untuk   : 6 jam
     * Cash/Tf: tf kr 250
     * Cs    : dreamy
     * Komisi: 50
     */
    parseBookingMessage(messageBody, messageId = null, groupName = '') {
        try {
            // Cek apakah pesan dimulai dengan prefix grup
            const groupPrefix = `🟢${groupName}`;
            if (!messageBody.startsWith(groupPrefix)) {
                return null;
            }

            // Pisahkan baris-baris pesan
            const lines = messageBody.split('\n').map(line => line.trim()).filter(line => line);

            if (lines.length < 6) {
                logger.warn(`Format pesan tidak lengkap: ${messageBody}`);
                return null;
            }

            // Parse setiap baris
            const data = {};

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];

                if (line.toLowerCase().includes('unit')) {
                    data.unit = this.extractValue(line);
                } else if (line.toLowerCase().includes('cek out')) {
                    data.checkoutTime = this.extractValue(line);
                } else if (line.toLowerCase().includes('untuk')) {
                    data.duration = this.extractValue(line);
                } else if (line.toLowerCase().includes('cash') || line.toLowerCase().includes('tf')) {
                    const cashTfData = this.parseCashTf(line);
                    data.paymentMethod = cashTfData.method;
                    data.amount = cashTfData.amount;
                    data.csFromPayment = cashTfData.cs;
                } else if (line.toLowerCase().includes('cs')) {
                    data.csName = this.extractValue(line);
                } else if (line.toLowerCase().includes('komisi')) {
                    data.komisi = parseFloat(this.extractValue(line)) || 0;
                }
            }

            // Validasi data yang diperlukan
            if (!data.unit || !data.csName) {
                logger.warn(`Data wajib tidak lengkap: ${messageBody}`);
                return null;
            }

            // Hitung pendapatan bersih (amount - komisi)
            const netAmount = (data.amount || 0) - (data.komisi || 0);

            // Dapatkan tanggal saat ini
            const currentDate = moment().tz(this.timezone).format('YYYY-MM-DD');

            const parsedData = {
                messageId: messageId,
                location: groupName,
                unit: data.unit,
                checkoutTime: data.checkoutTime || '',
                duration: data.duration || '',
                paymentMethod: data.paymentMethod || 'Unknown',
                csName: data.csName,
                amount: data.amount || 0,
                commission: data.komisi || 0,
                netAmount: netAmount,
                date: currentDate,
                createdAt: moment().tz(this.timezone).toISOString(),
                skipFinancial: data.csName.toLowerCase() === 'apk', // Skip APK dari perhitungan keuangan
                originalMessage: messageBody
            };

            logger.info('Pesan berhasil di-parse:', JSON.stringify(parsedData, null, 2));
            return parsedData;

        } catch (error) {
            logger.error('Error parsing pesan:', error);
            logger.error('Isi pesan:', messageBody);
            return null;
        }
    }

    /**
     * Ekstrak nilai dari baris (setelah tanda :)
     */
    extractValue(line) {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            return line.substring(colonIndex + 1).trim();
        }
        return line.trim();
    }

    /**
     * Parse baris Cash/Tf
     * Format: Cash 250, Tf KR 350, Tf Amel (tanpa nominal)
     */
    parseCashTf(line) {
        const value = this.extractValue(line).toLowerCase();

        // Cek apakah Cash atau TF
        if (value.startsWith('cash')) {
            const amount = this.extractNumber(value);
            return {
                method: 'Cash',
                amount: amount,
                cs: null
            };
        } else if (value.startsWith('tf')) {
            // Parse TF dengan CS dan nominal
            const tfPart = value.substring(2).trim(); // Hapus "tf"

            // Cek apakah ada nama CS
            if (tfPart.includes('kr')) {
                const amount = this.extractNumber(tfPart);
                return {
                    method: 'Transfer',
                    amount: amount,
                    cs: 'KR'
                };
            } else if (tfPart.includes('amel')) {
                return {
                    method: 'Transfer',
                    amount: 0, // Amel tanpa nominal
                    cs: 'Amel'
                };
            } else {
                // TF tanpa CS spesifik
                const amount = this.extractNumber(tfPart);
                return {
                    method: 'Transfer',
                    amount: amount,
                    cs: null
                };
            }
        }

        return {
            method: 'Unknown',
            amount: 0,
            cs: null
        };
    }

    /**
     * Ekstrak angka dari teks
     */
    extractNumber(text) {
        const numbers = text.match(/\d+/g);
        if (numbers && numbers.length > 0) {
            return parseInt(numbers[numbers.length - 1]); // Ambil angka terakhir
        }
        return 0;
    }

    /**
     * Parse command !rekap
     * Format: !rekap atau !rekap 28062025
     */
    parseRekapCommand(messageBody) {
        try {
            const content = messageBody.trim();

            if (!content.startsWith('!rekap')) {
                return null;
            }

            // Ambil bagian setelah !rekap
            const parts = content.split(/\s+/);

            if (parts.length === 1) {
                // !rekap tanpa tanggal - dari jam 12:00 WIB hari ini sampai sekarang
                const today = moment().tz(this.timezone);
                const startTime = today.clone().hour(12).minute(0).second(0);
                const endTime = today.clone();

                return {
                    type: 'rekap_today',
                    startDate: startTime.format('YYYY-MM-DD HH:mm:ss'),
                    endDate: endTime.format('YYYY-MM-DD HH:mm:ss'),
                    displayDate: today.format('DD/MM/YYYY')
                };
            } else if (parts.length === 2) {
                // !rekap dengan tanggal - format: 28062025
                const dateStr = parts[1];

                if (dateStr.length === 8) {
                    const day = dateStr.substring(0, 2);
                    const month = dateStr.substring(2, 4);
                    const year = dateStr.substring(4, 8);

                    const targetDate = moment.tz(`${year}-${month}-${day}`, this.timezone);

                    if (targetDate.isValid()) {
                        const startTime = targetDate.clone().startOf('day');
                        const endTime = targetDate.clone().endOf('day');

                        return {
                            type: 'rekap_date',
                            startDate: startTime.format('YYYY-MM-DD HH:mm:ss'),
                            endDate: endTime.format('YYYY-MM-DD HH:mm:ss'),
                            displayDate: targetDate.format('DD/MM/YYYY')
                        };
                    }
                }

                logger.warn(`Format tanggal tidak valid: ${dateStr}`);
                return null;
            }

            return null;
        } catch (error) {
            logger.error('Error parsing command rekap:', error);
            return null;
        }
    }

    /**
     * Cek apakah pesan adalah command
     */
    isCommand(messageBody) {
        return messageBody.trim().startsWith('!');
    }
}

module.exports = new MessageParser();
