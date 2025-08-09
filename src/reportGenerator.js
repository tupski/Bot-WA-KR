// Modul Generator Laporan
const moment = require('moment-timezone');
const config = require('../config/config.js');
const database = require('./database');
const numberFormatter = require('./numberFormatter');
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

class ReportGenerator {
    constructor() {
        this.timezone = config.report.timezone;
        this.companyName = config.report.companyName;
    }

    /**
     * Convert date to Indonesian format
     */
    formatDateIndonesian(date, format = 'DD MMMM YYYY') {
        const momentDate = moment(date);
        const englishFormat = momentDate.format(format);
        let indonesianFormat = englishFormat;

        // Replace English month names with Indonesian
        Object.keys(MONTH_NAMES_ID).forEach(englishMonth => {
            indonesianFormat = indonesianFormat.replace(englishMonth, MONTH_NAMES_ID[englishMonth]);
        });

        return indonesianFormat;
    }

    /**
     * Generate daily report in the specified format
     */
    async generateDailyReport(date = null) {
        try {
            const reportDate = date || moment().tz(this.timezone).format('YYYY-MM-DD');
            const displayDate = this.formatDateIndonesian(reportDate);
            const displayTime = moment().tz(this.timezone).format('HH:mm');

            logger.info(`Membuat laporan harian untuk ${reportDate}`);

            // Get data from database
            const [csSummary, dailySummary, marketingCommissionByApartment] = await Promise.all([
                database.getCSSummary(reportDate),
                database.getDailySummary(reportDate),
                database.getMarketingCommissionByApartment(reportDate)
            ]);

            // Build report sections
            const csSection = this.buildCSSection(csSummary);
            const financeSection = this.buildFinanceSection(csSummary, dailySummary);
            const commissionSection = this.buildCommissionSection(marketingCommissionByApartment);

            // Combine all sections
            const report = this.formatReport(displayDate, displayTime, csSection, financeSection, commissionSection);

            logger.info('Laporan harian berhasil dibuat');
            return report;

        } catch (error) {
            logger.error('Error membuat laporan harian:', error);
            throw error;
        }
    }

    /**
     * Build CS section of the report
     */
    buildCSSection(csSummary) {
        let section = '=== *Laporan CS* ===\n';
        let totalCS = 0;

        if (csSummary && csSummary.length > 0) {
            // Group by CS name and sum bookings
            const csGroups = {};
            
            csSummary.forEach(cs => {
                if (!csGroups[cs.cs_name]) {
                    csGroups[cs.cs_name] = 0;
                }
                csGroups[cs.cs_name] += cs.total_bookings || 0;
            });

            // Sort by booking count (descending)
            const sortedCS = Object.entries(csGroups)
                .sort(([,a], [,b]) => b - a);

            sortedCS.forEach(([csName, bookings]) => {
                section += `- Total CS ${csName}: ${bookings}\n`;
                totalCS += bookings;
            });
        } else {
            section += '- Tidak ada data CS hari ini\n';
        }

        section += `- *Total CS: ${totalCS}*\n`;
        return section;
    }

    /**
     * Build finance section of the report
     */
    buildFinanceSection(csSummary, dailySummary) {
        let section = '=== *Keuangan* ===\n';
        
        // Initialize totals
        let totalCash = 0;
        let totalTransfer = 0;
        let totalGross = 0;

        if (csSummary && csSummary.length > 0) {
            // Group by location/CS for cash and transfer
            const locationGroups = {};
            
            csSummary.forEach(cs => {
                const location = cs.cs_name;
                if (!locationGroups[location]) {
                    locationGroups[location] = {
                        cash: 0,
                        transfer: 0
                    };
                }
                locationGroups[location].cash += parseFloat(cs.total_cash || 0);
                locationGroups[location].transfer += parseFloat(cs.total_transfer || 0);
            });

            // Display cash amounts by location
            Object.entries(locationGroups).forEach(([location, amounts]) => {
                if (amounts.cash > 0) {
                    section += `- Total Cash ${location}: ${this.formatCurrency(amounts.cash)}\n`;
                    totalCash += amounts.cash;
                }
            });

            // Display transfer amounts by location
            Object.entries(locationGroups).forEach(([location, amounts]) => {
                if (amounts.transfer > 0) {
                    section += `- Total TF ${location}: ${this.formatCurrency(amounts.transfer)}\n`;
                    totalTransfer += amounts.transfer;
                }
            });
        }

        // Use daily summary if available, otherwise calculate from CS summary
        if (dailySummary) {
            totalCash = parseFloat(dailySummary.total_cash || 0);
            totalTransfer = parseFloat(dailySummary.total_transfer || 0);
            totalGross = parseFloat(dailySummary.total_gross || 0);
        } else {
            totalGross = totalCash + totalTransfer;
        }

        section += `- *Total Kotor: ${this.formatCurrency(totalGross)}*\n`;
        return section;
    }

    /**
     * Normalize marketing name untuk konsistensi case
     */
    normalizeMarketingName(name) {
        if (!name) return 'Unknown';

        const lowerName = name.toLowerCase().trim();

        // Special cases
        if (lowerName === 'apk') return 'APK';
        if (lowerName === 'amel' || lowerName.includes('amel')) return 'Amel';

        // Capitalize first letter, lowercase the rest
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }

    /**
     * Build commission section of the report in table format
     */
    buildCommissionSection(marketingCommissionByApartment) {
        let section = '=== *Komisi Marketing* ===\n';

        // Define apartment order as requested by user
        const apartmentOrder = [
            'TREEPARK BSD',
            'SKY HOUSE BSD',
            'SPRINGWOOD',
            'EMERALD BINTARO',
            'TOKYO RIVERSIDE PIK2',
            'SERPONG GARDEN',
            'TRANSPARK BINTARO'
        ];

        if (!marketingCommissionByApartment || marketingCommissionByApartment.length === 0) {
            section += 'Tidak ada komisi hari ini\n';
            return section;
        }

        // Group data by marketing name and apartment
        const marketingData = {};
        let totalCommissionAll = 0;

        marketingCommissionByApartment.forEach(item => {
            const normalizedCsName = this.normalizeMarketingName(item.cs_name);
            const location = item.location;
            const bookingCount = parseInt(item.booking_count || 0);
            const commission = parseFloat(item.total_commission || 0);

            if (!marketingData[normalizedCsName]) {
                marketingData[normalizedCsName] = {};
                apartmentOrder.forEach(apt => {
                    marketingData[normalizedCsName][apt] = { count: 0, commission: 0 };
                });
                marketingData[normalizedCsName].totalCount = 0;
                marketingData[normalizedCsName].totalCommission = 0;
            }

            // Map location to apartment name
            if (marketingData[normalizedCsName][location]) {
                marketingData[normalizedCsName][location].count += bookingCount;
                marketingData[normalizedCsName][location].commission += commission;
            }

            marketingData[normalizedCsName].totalCount += bookingCount;
            marketingData[normalizedCsName].totalCommission += commission;
            totalCommissionAll += commission;
        });

        // Build table header
        section += '```\n';
        section += '| Marketing | Treepark | Sky House | Springwood | Emerald | Tokyo | Serpong | Transpark | Total |\n';
        section += '|-----------|----------|-----------|------------|---------|-------|---------|-----------|-------|\n';

        // Build table rows
        Object.keys(marketingData).forEach(csName => {
            const data = marketingData[csName];
            let row = `| ${csName.padEnd(9)} |`;

            apartmentOrder.forEach(apt => {
                const count = data[apt].count;
                const countStr = count > 0 ? count.toString() : '';
                row += ` ${countStr.padEnd(8)} |`;
            });

            row += ` ${data.totalCount.toString().padEnd(5)} |\n`;
            section += row;
        });

        section += '```\n\n';

        // Build summary table
        section += '*Ringkasan Komisi:*\n';
        Object.keys(marketingData).forEach(csName => {
            const data = marketingData[csName];
            section += `${csName}: ${data.totalCount} booking, ${this.formatCurrency(data.totalCommission)}\n`;
        });

        section += `\n*Total Komisi: ${this.formatCurrency(totalCommissionAll)}*\n`;
        return section;
    }

    /**
     * Format the complete report
     */
    formatReport(displayDate, displayTime, csSection, financeSection, commissionSection) {
        return `*Laporan KAKARAMA ROOM*
*Tanggal: ${displayDate}, Jam ${displayTime} WIB*

${csSection}
${financeSection}
${commissionSection}`;
    }

    /**
     * Format currency in Indonesian Rupiah
     */
    formatCurrency(amount) {
        return numberFormatter.formatByContext(amount, 'whatsapp');
    }

    /**
     * Generate monthly report
     */
    async generateMonthlyReport(year = null, month = null) {
        try {
            const targetDate = moment().tz(this.timezone);
            if (year) targetDate.year(year);
            if (month) targetDate.month(month - 1);

            const startDate = targetDate.clone().startOf('month').format('YYYY-MM-DD');
            const endDate = targetDate.clone().endOf('month').format('YYYY-MM-DD');

            const monthYearIndonesian = this.formatDateIndonesian(targetDate.format('YYYY-MM-01'), 'MMMM YYYY');
            logger.info(`Membuat laporan bulanan untuk ${monthYearIndonesian}`);

            const [transactions, csPerformance] = await Promise.all([
                database.getTransactionsByDateRange(startDate, endDate),
                database.getCSPerformance(startDate, endDate)
            ]);

            let report = `*Laporan Bulanan KAKARAMA ROOM*\n`;
            report += `*Bulan: ${monthYearIndonesian}*\n\n`;

            // Monthly summary
            const totalBookings = transactions.length;
            const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const totalCommission = transactions.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);
            const avgDailyRevenue = totalRevenue / targetDate.daysInMonth();

            report += `=== *Ringkasan Bulanan* ===\n`;
            report += `- Total Booking: ${totalBookings}\n`;
            report += `- Total Pendapatan: ${this.formatCurrency(totalRevenue)}\n`;
            report += `- Total Komisi: ${this.formatCurrency(totalCommission)}\n`;
            report += `- Rata-rata Harian: ${this.formatCurrency(avgDailyRevenue)}\n\n`;

            // Top performing CS
            if (csPerformance.length > 0) {
                report += `=== *Top Performer* ===\n`;
                const topCS = csPerformance[0];
                report += `🏆 ${topCS.cs_name}: ${topCS.total_bookings} booking, ${this.formatCurrency(topCS.total_revenue)}\n\n`;

                report += `=== *Performa Semua CS* ===\n`;
                csPerformance.forEach((cs, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '-';
                    report += `${medal} ${cs.cs_name}: ${cs.total_bookings} booking, ${this.formatCurrency(cs.total_revenue)}\n`;
                });
            }

            return report;

        } catch (error) {
            logger.error('Error membuat laporan bulanan:', error);
            throw error;
        }
    }

    /**
     * Generate custom report for date range
     */
    async generateCustomReport(startDate, endDate, title = 'Laporan Custom') {
        try {
            logger.info(`Membuat laporan kustom dari ${startDate} sampai ${endDate}`);

            const [transactions, csPerformance, paymentStats] = await Promise.all([
                database.getTransactionsByDateRange(startDate, endDate),
                database.getCSPerformance(startDate, endDate),
                database.getPaymentMethodStats(startDate) // Note: This might need adjustment for date range
            ]);

            let report = `*${title}*\n`;
            const startDateIndonesian = this.formatDateIndonesian(startDate, 'DD MMM YYYY');
            const endDateIndonesian = this.formatDateIndonesian(endDate, 'DD MMM YYYY');
            report += `*Periode: ${startDateIndonesian} - ${endDateIndonesian}*\n\n`;

            // Summary
            const totalBookings = transactions.length;
            const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const totalCommission = transactions.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);

            report += `=== *Ringkasan* ===\n`;
            report += `- Total Booking: ${totalBookings}\n`;
            report += `- Total Pendapatan: ${this.formatCurrency(totalRevenue)}\n`;
            report += `- Total Komisi: ${this.formatCurrency(totalCommission)}\n\n`;

            // CS Performance
            if (csPerformance.length > 0) {
                report += `=== *Performa CS* ===\n`;
                csPerformance.forEach(cs => {
                    report += `- ${cs.cs_name}: ${cs.total_bookings} booking, ${this.formatCurrency(cs.total_revenue)}\n`;
                });
            }

            return report;

        } catch (error) {
            logger.error('Error membuat laporan kustom:', error);
            throw error;
        }
    }

    /**
     * Generate laporan berdasarkan rentang tanggal dan waktu
     */
    async generateReportByDateRange(startDate, endDate, displayDate, apartmentName = null) {
        try {
            logger.info(`Generating report untuk rentang: ${startDate} - ${endDate}${apartmentName ? ` untuk apartemen: ${apartmentName}` : ''}`);

            // Ambil data dari database berdasarkan rentang waktu
            const transactions = await database.getTransactionsByDateRange(startDate, endDate, apartmentName);

            if (!transactions || transactions.length === 0) {
                return null;
            }

            // Hitung statistik
            const stats = this.calculateRangeStats(transactions);

            // Format laporan
            const defaultDisplayDate = displayDate || 'RENTANG WAKTU';
            const report = this.formatRangeReport(stats, defaultDisplayDate, apartmentName);

            return report;

        } catch (error) {
            logger.error('Error membuat laporan berdasarkan rentang tanggal:', error);
            throw error;
        }
    }

    /**
     * Hitung statistik untuk rentang waktu
     */
    calculateRangeStats(transactions) {
        const stats = {
            totalTransactions: 0,
            totalAmount: 0,
            totalCommission: 0,
            totalNet: 0,
            csSummary: {},
            paymentMethods: { Cash: 0, Transfer: 0 },
            locations: {},
            csPaymentBreakdown: {} // Breakdown cash/transfer per CS
        };

        transactions.forEach(transaction => {
            const csName = transaction.cs_name || transaction.csName;
            const amount = parseFloat(transaction.amount || 0);
            const commission = parseFloat(transaction.commission || 0);
            const paymentMethod = transaction.payment_method || transaction.paymentMethod || '';

            // Mapping CS berdasarkan aturan:
            // amel → amel, apk/APK → apk, lainnya → kr
            let mappedCS;
            if (csName.toLowerCase() === 'amel') {
                mappedCS = 'amel';
            } else if (csName.toLowerCase() === 'apk') {
                mappedCS = 'apk';
            } else {
                mappedCS = 'kr';
            }

            // Inisialisasi CS summary (gunakan nama asli untuk summary)
            if (!stats.csSummary[csName]) {
                stats.csSummary[csName] = { count: 0, amount: 0, commission: 0, net: 0 };
            }

            // Inisialisasi CS payment breakdown (gunakan mapped CS)
            if (!stats.csPaymentBreakdown[mappedCS]) {
                stats.csPaymentBreakdown[mappedCS] = { cash: 0, transfer: 0 };
            }

            // Hitung CS count
            stats.csSummary[csName].count++;

            // Skip APK dari perhitungan keuangan
            if (csName && csName.toLowerCase() === 'apk') {
                return;
            }

            // Hitung total keuangan
            stats.totalTransactions++;
            stats.totalAmount += amount;
            stats.totalCommission += commission;
            stats.totalNet += (amount - commission);

            // CS Summary
            stats.csSummary[csName].amount += amount;
            stats.csSummary[csName].commission += commission;
            stats.csSummary[csName].net += (amount - commission);

            // Payment Methods breakdown per CS (gunakan mapped CS)
            if (paymentMethod.toLowerCase().includes('cash')) {
                stats.paymentMethods.Cash += amount;
                stats.csPaymentBreakdown[mappedCS].cash += amount;
            } else if (paymentMethod.toLowerCase().includes('transfer') || paymentMethod.toLowerCase().includes('tf')) {
                stats.paymentMethods.Transfer += amount;
                stats.csPaymentBreakdown[mappedCS].transfer += amount;
            }

            // Locations
            if (transaction.location) {
                if (!stats.locations[transaction.location]) {
                    stats.locations[transaction.location] = 0;
                }
                stats.locations[transaction.location]++;
            }
        });

        return stats;
    }

    /**
     * Format laporan untuk rentang waktu dengan format baru
     */
    formatRangeReport(stats, displayDate, apartmentName = null) {
        const now = moment().tz(this.timezone);

        // Gunakan displayDate yang sudah dihitung dengan business day logic
        const reportDate = displayDate || now.format('DD/MM/YYYY');

        let report = `📊 REKAP LAPORAN ${reportDate}\n`;
        report += `🏢 KAKARAMA ROOM\n`;
        report += `📅 ${reportDate} 12:00 - 11:59 WIB\n\n`;

        // Total CS
        report += `👥 TOTAL CS\n`;

        // Tampilkan CS berdasarkan nama asli dari database
        const csDetailSummary = {};
        Object.entries(stats.csSummary).forEach(([csName, data]) => {
            const lowerCsName = csName.toLowerCase();
            csDetailSummary[lowerCsName] = data.count;
        });

        // Tampilkan sesuai format yang diminta
        if (csDetailSummary.amel > 0) report += `- total cs amel: ${csDetailSummary.amel}\n`;
        if (csDetailSummary.apk > 0) report += `- total cs apk: ${csDetailSummary.apk}\n`;
        if (csDetailSummary.kr > 0) report += `- total cs kr: ${csDetailSummary.kr}\n`;

        const totalCS = Object.values(stats.csSummary).reduce((sum, data) => sum + data.count, 0);
        report += `\n- Jumlah CS: ${totalCS}\n`;
        report += `----------------------\n\n`;

        // Keuangan
        report += `💰 KEUANGAN\n`;

        // Hitung cash dan transfer per CS
        const cashAmel = stats.csPaymentBreakdown?.amel?.cash || 0;
        const cashKr = stats.csPaymentBreakdown?.kr?.cash || 0;
        const tfKr = stats.csPaymentBreakdown?.kr?.transfer || 0;

        if (cashAmel > 0) report += `- total cash amel: ${numberFormatter.formatCurrency(cashAmel, 'whatsapp')}\n`;
        if (cashKr > 0) report += `- total cash kr: ${numberFormatter.formatCurrency(cashKr, 'whatsapp')}\n`;
        if (tfKr > 0) report += `- total tf KR: ${numberFormatter.formatCurrency(tfKr, 'whatsapp')}\n\n`;

        report += `- total kotor: ${numberFormatter.formatCurrency(stats.totalAmount, 'whatsapp')}\n`;
        report += `-----------\n\n`;

        // Komisi Marketing
        report += `💼 KOMISI MARKETING\n\n`;

        // Group by marketing (semua CS termasuk APK dan Amel)
        const marketingStats = {};
        Object.entries(stats.csSummary).forEach(([csName, data]) => {
            const normalizedName = this.normalizeMarketingName(csName);
            // Gabungkan data jika CS sudah ada (case-insensitive)
            if (marketingStats[normalizedName]) {
                marketingStats[normalizedName].totalCS += data.count;
                marketingStats[normalizedName].totalKomisi += data.commission;
            } else {
                marketingStats[normalizedName] = {
                    totalCS: data.count,
                    totalKomisi: data.commission
                };
            }
        });

        let totalKomisiMarketing = 0;
        Object.entries(marketingStats).forEach(([marketingName, data]) => {
            report += `${marketingName}:\n`;
            report += `- total cs: ${data.totalCS}\n`;
            report += `- total komisi: ${numberFormatter.formatCurrency(data.totalKomisi, 'whatsapp')}\n\n`;
            totalKomisiMarketing += data.totalKomisi;
        });

        report += `Total komisi marketing: ${numberFormatter.formatCurrency(totalKomisiMarketing, 'whatsapp')}\n`;

        return report;
    }

    /**
     * Generate laporan untuk apartemen tertentu
     */
    async generateApartmentReport(apartmentName, dateRange = null) {
        try {
            let startDate, endDate;

            if (dateRange) {
                startDate = dateRange.startDate;
                endDate = dateRange.endDate;
            } else {
                // Default: hari ini
                const today = moment().tz(this.timezone);
                startDate = today.format('YYYY-MM-DD');
                endDate = startDate;
            }

            logger.info(`Membuat laporan apartemen untuk ${apartmentName} dari ${startDate} sampai ${endDate}`);

            // Get transactions untuk apartemen tertentu
            const transactions = await database.getTransactionsByLocation(apartmentName, startDate, endDate);

            if (!transactions || transactions.length === 0) {
                return `📊 *LAPORAN ${apartmentName.toUpperCase()}*\n${startDate === endDate ? startDate : `${startDate} - ${endDate}`}\n\n❌ Tidak ada data transaksi.`;
            }

            // Calculate stats
            const stats = this.calculateRangeStats(transactions);

            // Format report
            let report = `📊 *LAPORAN ${apartmentName.toUpperCase()}*\n`;
            report += `📅 ${startDate === endDate ? startDate : `${startDate} - ${endDate}`}\n\n`;

            report += `📈 *RINGKASAN*\n`;
            report += `Total Transaksi: ${stats.totalTransactions}\n`;
            report += `Total Pendapatan: ${this.formatCurrency(stats.totalAmount)}\n`;
            report += `Total Komisi: ${this.formatCurrency(stats.totalCommission)}\n`;
            report += `Pendapatan Bersih: ${this.formatCurrency(stats.totalNet)}\n\n`;

            // Payment methods
            if (stats.paymentMethods.Cash > 0 || stats.paymentMethods.Transfer > 0) {
                report += `💰 *METODE PEMBAYARAN*\n`;
                if (stats.paymentMethods.Cash > 0) {
                    report += `Cash: ${this.formatCurrency(stats.paymentMethods.Cash)}\n`;
                }
                if (stats.paymentMethods.Transfer > 0) {
                    report += `Transfer: ${this.formatCurrency(stats.paymentMethods.Transfer)}\n`;
                }
                report += `\n`;
            }

            // CS Summary
            if (Object.keys(stats.csSummary).length > 0) {
                report += `👥 *RINGKASAN CS*\n`;
                Object.entries(stats.csSummary).forEach(([csName, data]) => {
                    if (data.count > 0) {
                        report += `${csName}: ${data.count} transaksi - ${this.formatCurrency(data.net)}\n`;
                    }
                });
            }

            return report;

        } catch (error) {
            logger.error('Error membuat laporan apartemen:', error);
            throw error;
        }
    }

    /**
     * Generate detailed report showing all transactions
     */
    async generateDetailedReport(dateRange = null, apartmentName = null) {
        try {
            let startDate, endDate, displayDate;

            if (dateRange) {
                startDate = dateRange.startDate;
                endDate = dateRange.endDate;
                displayDate = moment(startDate).tz(this.timezone).format('DD/MM/YYYY');
            } else {
                // Default: business day logic - dimulai jam 12:00 siang
                const now = moment().tz(this.timezone);

                // Tentukan business day saat ini
                let businessDay;
                if (now.hour() < 12) {
                    // Sebelum jam 12:00 - masih business day kemarin
                    businessDay = now.clone().subtract(1, 'day');
                } else {
                    // Setelah jam 12:00 - sudah business day hari ini
                    businessDay = now.clone();
                }

                // Rentang waktu: business day jam 12:00 - business day+1 jam 11:59 (sama dengan !rekap)
                const startTime = businessDay.hour(12).minute(0).second(0);
                const endTime = businessDay.clone().add(1, 'day').hour(11).minute(59).second(59);

                startDate = startTime.format('YYYY-MM-DD HH:mm:ss');
                endDate = endTime.format('YYYY-MM-DD HH:mm:ss');
                displayDate = businessDay.format('DD/MM/YYYY');
            }

            logger.info(`Membuat laporan detail untuk ${displayDate}`);

            // Get all transactions from database
            const transactions = await database.getDetailedTransactions(startDate, endDate, apartmentName);

            if (!transactions || transactions.length === 0) {
                return null;
            }

            // Format header
            let report = `📋 DETAIL REKAP CHECKIN\n`;
            report += `🏢 KAKARAMA ROOM\n`;
            report += `📅 ${displayDate}\n`;
            if (apartmentName) {
                // Tampilkan nama apartemen spesifik
                report += `🏠 ${apartmentName}\n`;
            }
            report += `\n`;

            // Format each transaction
            transactions.forEach((transaction, index) => {
                const inputDate = moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY HH:mm');

                // Format payment method sesuai format asli
                let cashTfDisplay = transaction.payment_method.toLowerCase();

                // Jika ada amount, tampilkan dengan format yang benar
                if (transaction.amount > 0) {
                    // Konversi kembali ke format ribuan (dibagi 1000)
                    const displayAmount = transaction.amount / 1000;
                    cashTfDisplay += ` ${displayAmount}`;
                } else {
                    // Untuk kasus khusus seperti "tf amel" atau "cash apk"
                    cashTfDisplay += ` ${transaction.cs_name}`;
                }

                // Format commission
                let komisiDisplay;
                if (transaction.commission > 0) {
                    // Konversi kembali ke format ribuan (dibagi 1000)
                    const displayCommission = transaction.commission / 1000;
                    komisiDisplay = displayCommission.toString();
                } else {
                    // Untuk kasus khusus seperti komisi amel/apk
                    komisiDisplay = transaction.cs_name;
                }

                report += `Tanggal & Jam input: ${inputDate}\n`;
                report += `Unit      : ${transaction.unit}\n`;
                report += `Cek out: ${transaction.checkout_time}\n`;
                report += `Untuk   : ${transaction.duration}\n`;
                report += `Cash/tf: ${cashTfDisplay}\n`;
                report += `Cs         : ${transaction.cs_name}\n`;
                report += `komisi : ${komisiDisplay}\n`;

                if (index < transactions.length - 1) {
                    report += `---------------\n`;
                }
            });

            logger.info(`Laporan detail berhasil dibuat dengan ${transactions.length} transaksi`);
            return report;

        } catch (error) {
            logger.error('Error membuat laporan detail:', error);
            throw error;
        }
    }
}

module.exports = new ReportGenerator();
