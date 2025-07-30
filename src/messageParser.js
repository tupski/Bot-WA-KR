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
     * 🟢SKY HOUSE (atau 🔴, 🟡, 🔵, dll. untuk apartemen lain)
     * Unit      :L3/30N
     * Cek out: 05:00
     * Untuk   : 6 jam
     * Cash/Tf: tf kr 250
     * Cs    : dreamy (CS = Customer)
     * Komisi: 50
     */
    parseBookingMessage(messageBody, messageId = null, groupName = '') {
        try {
            // Pisahkan baris-baris pesan
            const lines = messageBody.split('\n').map(line => line.trim()).filter(line => line);

            // Cek apakah ada minimal 2 baris dan baris kedua mengandung "Unit"
            if (lines.length < 2 || !lines[1].toLowerCase().includes('unit')) {
                return {
                    status: 'WRONG_PREFIX',
                    data: null,
                    missingField: null,
                    message: null
                };
            }

            // Cek format dasar - minimal harus ada 6 baris (prefix + 5 field minimal)
            if (lines.length < 6) {
                return {
                    status: 'WRONG_FORMAT',
                    data: null,
                    missingField: null,
                    message: 'Salah anjing. yang bener gini:\n\n🟢SKY HOUSE\nUnit      :L3/30N\nCek out: 05:00\nUntuk   : 6 jam\nCash/Tf: tf kr 250\nCs    : dreamy\nKomisi: 50'
                };
            }

            // Ekstrak nama grup dari baris pertama (hapus emoji lingkaran berwarna)
            // Hapus 2 karakter pertama (emoji biasanya 2 karakter) dan trim
            const groupPrefix = lines[0].substring(2).trim();

            // Parse setiap baris mulai dari baris kedua
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
                    const komisiValue = this.extractValue(line).toLowerCase();
                    // Khusus untuk komisi apk/amel
                    if (komisiValue === 'apk' || komisiValue === 'amel') {
                        data.komisi = 0;
                    } else {
                        data.komisi = parseFloat(komisiValue) || 0;
                    }
                }
            }

            // Validasi field yang diperlukan
            const requiredFields = {
                'unit': 'Unit',
                'checkoutTime': 'Cek out',
                'duration': 'Untuk',
                'paymentMethod': 'Cash/Tf',
                'csName': 'Cs',
                'komisi': 'Komisi'
            };

            for (const [field, displayName] of Object.entries(requiredFields)) {
                if (field === 'komisi') {
                    // Khusus untuk komisi - cek apakah ada tapi kosong atau undefined
                    if (data.komisi === undefined || data.komisi === null || data.komisi === '') {
                        return {
                            status: 'MISSING_FIELD',
                            data: null,
                            missingField: 'Komisi',
                            message: 'Komisinya mana anjing?'
                        };
                    }
                } else {
                    // Field lainnya
                    if (!data[field] || data[field] === '') {
                        return {
                            status: 'MISSING_FIELD',
                            data: null,
                            missingField: displayName,
                            message: `${displayName}nya mana anjing?`
                        };
                    }
                }
            }

            // Konversi angka ke format ribuan (250 → 250.000)
            const amount = (data.amount || 0) * 1000;
            const commission = (data.komisi || 0) * 1000;

            // Hitung pendapatan bersih (amount - komisi)
            const netAmount = amount - commission;

            // Dapatkan tanggal dan waktu saat ini dengan timezone Indonesia
            const now = moment().tz(this.timezone);
            const currentDate = now.format('YYYY-MM-DD');
            const currentDateTime = now.format('YYYY-MM-DD HH:mm:ss');

            const parsedData = {
                messageId: messageId,
                location: groupPrefix, // Gunakan groupPrefix sebagai location
                groupPrefix: groupPrefix, // Nama grup dari prefix 🟢
                unit: data.unit,
                checkoutTime: data.checkoutTime || '',
                duration: data.duration || '',
                paymentMethod: data.paymentMethod || 'Unknown',
                csName: data.csName,
                amount: amount,
                commission: commission,
                netAmount: netAmount,
                date: currentDate,
                dateOnly: currentDate, // Tambahkan dateOnly untuk backlog checking
                createdAt: currentDateTime,
                skipFinancial: data.csName.toLowerCase() === 'apk', // Skip APK dari perhitungan keuangan
                originalMessage: messageBody
            };

            logger.info('Pesan berhasil di-parse:', JSON.stringify(parsedData, null, 2));
            return {
                status: 'VALID',
                data: parsedData,
                missingField: null,
                message: null
            };

        } catch (error) {
            logger.error('Error parsing pesan:', error);
            logger.error('Isi pesan:', messageBody);
            return {
                status: 'WRONG_FORMAT',
                data: null,
                missingField: null,
                message: 'Salah anjing. yang bener gini:\n\nUnit      :L3/30N\nCek out: 05:00\nUntuk   : 6 jam\nCash/Tf: tf kr 250\nCs    : dreamy\nKomisi: 50'
            };
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
        } else if (value === 'apk') {
            // Khusus untuk APK tanpa nominal
            return {
                method: 'Cash',
                amount: 0,
                cs: 'APK'
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
