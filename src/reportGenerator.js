// Modul Generator Laporan
const moment = require('moment-timezone');
const config = require('../config/config.js');
const database = require('./database');
const numberFormatter = require('./numberFormatter');
const logger = require('./logger');

class ReportGenerator {
    constructor() {
        this.timezone = config.report.timezone;
        this.companyName = config.report.companyName;
    }

    /**
     * Generate daily report in the specified format
     */
    async generateDailyReport(date = null) {
        try {
            const reportDate = date || moment().tz(this.timezone).format('YYYY-MM-DD');
            const displayDate = moment(reportDate).tz(this.timezone).format('DD MMMM YYYY');
            const displayTime = moment().tz(this.timezone).format('HH:mm');

            logger.info(`Membuat laporan harian untuk ${reportDate}`);

            // Get data from database
            const [csSummary, dailySummary, marketingCommission, locationStats] = await Promise.all([
                database.getCSSummary(reportDate),
                database.getDailySummary(reportDate),
                database.getMarketingCommission(reportDate),
                database.getLocationStats(reportDate)
            ]);

            // Build report sections
            const csSection = this.buildCSSection(csSummary);
            const financeSection = this.buildFinanceSection(csSummary, dailySummary);
            const commissionSection = this.buildCommissionSection(marketingCommission);

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
     * Build commission section of the report
     */
    buildCommissionSection(marketingCommission) {
        let section = '=== *Komisi Marketing* ===\n';
        let totalCommission = 0;

        if (marketingCommission && marketingCommission.length > 0) {
            marketingCommission.forEach(commission => {
                const csName = commission.cs_name;
                const bookingCount = commission.booking_count || 0;
                const commissionAmount = parseFloat(commission.total_commission || 0);
                
                section += `(${csName}): ${bookingCount} booking, ${this.formatCurrency(commissionAmount)}\n`;
                totalCommission += commissionAmount;
            });
        } else {
            section += 'Tidak ada komisi hari ini\n';
        }

        section += `Total Komisi: ${this.formatCurrency(totalCommission)}\n`;
        return section;
    }

    /**
     * Format the complete report
     */
    formatReport(displayDate, displayTime, csSection, financeSection, commissionSection) {
        return `*Laporan ${this.companyName}*
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
     * Generate weekly report
     */
    async generateWeeklyReport(startDate = null) {
        try {
            const endDate = startDate ? 
                moment(startDate).add(6, 'days').format('YYYY-MM-DD') :
                moment().tz(this.timezone).format('YYYY-MM-DD');
            
            const actualStartDate = startDate || 
                moment().tz(this.timezone).subtract(6, 'days').format('YYYY-MM-DD');

            logger.info(`Membuat laporan mingguan dari ${actualStartDate} sampai ${endDate}`);

            const [transactions, csPerformance] = await Promise.all([
                database.getTransactionsByDateRange(actualStartDate, endDate),
                database.getCSPerformance(actualStartDate, endDate)
            ]);

            let report = `*Laporan Mingguan ${this.companyName}*\n`;
            report += `*Periode: ${moment(actualStartDate).format('DD MMM')} - ${moment(endDate).format('DD MMM YYYY')}*\n\n`;

            // Weekly summary
            const totalBookings = transactions.length;
            const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
            const totalCommission = transactions.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);

            report += `=== *Ringkasan Mingguan* ===\n`;
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
            logger.error('Error membuat laporan mingguan:', error);
            throw error;
        }
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

            logger.info(`Membuat laporan bulanan untuk ${targetDate.format('MMMM YYYY')}`);

            const [transactions, csPerformance] = await Promise.all([
                database.getTransactionsByDateRange(startDate, endDate),
                database.getCSPerformance(startDate, endDate)
            ]);

            let report = `*Laporan Bulanan ${this.companyName}*\n`;
            report += `*Bulan: ${targetDate.format('MMMM YYYY')}*\n\n`;

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
            report += `*Periode: ${moment(startDate).format('DD MMM YYYY')} - ${moment(endDate).format('DD MMM YYYY')}*\n\n`;

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

        let report = `📊 *REKAP LAPORAN ${now.format('DD/MM/YYYY')}*\n`;
        report += `🏢 ${this.companyName}\n`;
        if (apartmentName) {
            report += `🏠 ${apartmentName}\n`;
        }
        report += `📅 ${now.format('DD/MM/YYYY')} 12:00 - ${now.format('HH:mm')} WIB\n\n`;

        // Total CS berdasarkan mapping
        report += `👥 *TOTAL CS*\n`;

        // Kelompokkan CS berdasarkan mapping
        const csMappedSummary = { amel: 0, apk: 0, kr: 0 };
        Object.entries(stats.csSummary).forEach(([csName, data]) => {
            if (csName.toLowerCase() === 'amel') {
                csMappedSummary.amel += data.count;
            } else if (csName.toLowerCase() === 'apk') {
                csMappedSummary.apk += data.count;
            } else {
                csMappedSummary.kr += data.count;
            }
        });

        report += `- total cs amel: ${csMappedSummary.amel}\n`;
        report += `- total cs apk: ${csMappedSummary.apk}\n`;
        report += `- total cs kr: ${csMappedSummary.kr}\n`;

        const totalCS = Object.values(stats.csSummary).reduce((sum, data) => sum + data.count, 0);
        report += `\n- Jumlah CS: ${totalCS}\n`;
        report += `----------------------\n\n`;

        // Keuangan
        report += `💰 *KEUANGAN*\n`;

        // Hitung cash dan transfer per CS
        const cashAmel = stats.csPaymentBreakdown?.amel?.cash || 0;
        const cashKr = stats.csPaymentBreakdown?.kr?.cash || 0;
        const tfKr = stats.csPaymentBreakdown?.kr?.transfer || 0;

        report += `- total cash amel: ${numberFormatter.formatCurrency(cashAmel, 'whatsapp')}\n`;
        report += `- total cash kr: ${numberFormatter.formatCurrency(cashKr, 'whatsapp')}\n`;
        report += `- total tf KR: ${numberFormatter.formatCurrency(tfKr, 'whatsapp')}\n\n`;

        report += `- total kotor: ${numberFormatter.formatCurrency(stats.totalAmount, 'whatsapp')}\n`;
        report += `-----------\n\n`;

        // Komisi Marketing
        report += `💼 *KOMISI MARKETING*\n\n`;

        // Group by marketing (berdasarkan CS yang bukan APK dan bukan AMEL)
        const marketingStats = {};
        Object.entries(stats.csSummary).forEach(([csName, data]) => {
            if (csName.toLowerCase() !== 'apk' && csName.toLowerCase() !== 'amel') {
                // Gunakan nama asli CS dengan capitalize first letter
                const displayName = csName.charAt(0).toUpperCase() + csName.slice(1).toLowerCase();
                marketingStats[displayName] = {
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
                // Default: dari jam 12:00 WIB hari ini sampai sekarang
                const now = moment().tz(this.timezone);
                const todayStart = now.clone().hour(12).minute(0).second(0);

                startDate = todayStart.format('YYYY-MM-DD HH:mm:ss');
                endDate = now.format('YYYY-MM-DD HH:mm:ss');
                displayDate = now.format('DD/MM/YYYY');
            }

            logger.info(`Membuat laporan detail untuk ${displayDate}`);

            // Get all transactions from database
            const transactions = await database.getDetailedTransactions(startDate, endDate, apartmentName);

            if (!transactions || transactions.length === 0) {
                return null;
            }

            // Format header
            let report = `📋 DETAIL REKAP CHECKIN\n`;
            report += `🏢 ${this.companyName}\n`;
            report += `📅 ${displayDate}\n`;
            if (apartmentName) {
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
