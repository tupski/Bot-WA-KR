// Excel Exporter Module
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.js');
const database = require('./database');
const logger = require('./logger');

/**
 * Get apartment color scheme
 */
function getApartmentColors(apartmentName) {
    const colorSchemes = {
        'TREEPARK BSD': { bg: 'FFFF00', font: '000000' }, // Kuning 🟡
        'SKY HOUSE BSD': { bg: '00FF00', font: '000000' }, // Hijau 🟢
        'SPRINGWOOD': { bg: '87CEEB', font: '000000' }, // Biru Muda 🔵
        'EMERALD BINTARO': { bg: '000000', font: 'FFFFFF' }, // Hitam ⚫
        'TOKYO RIVERSIDE PIK2': { bg: 'D2691E', font: 'FFFFFF' }, // Coklat 🟤
        'TRANSPARK BINTARO': { bg: '800080', font: 'FFFFFF' }, // Ungu 🟣
        'SERPONG GARDEN': { bg: 'FFA500', font: '000000' } // Oranye 🟠
    };

    return colorSchemes[apartmentName] || { bg: '366092', font: 'FFFFFF' }; // Default blue
}

class ExcelExporter {
    constructor() {
        this.timezone = config.report.timezone;
        this.companyName = config.report.companyName;
        this.exportDir = './exports';
        
        // Create exports directory if it doesn't exist
        if (!fs.existsSync(this.exportDir)) {
            fs.mkdirSync(this.exportDir, { recursive: true });
        }
    }

    /**
     * Generate daily Excel report with 3 sheets
     */
    async generateDailyExcel(date = null) {
        try {
            let startDate, endDate, displayDate, reportDate;

            if (date) {
                // Jika tanggal spesifik diberikan, gunakan business day range yang sama dengan WhatsApp
                reportDate = date;
                displayDate = moment(reportDate).format('DD/MM/YYYY');

                // Buat datetime range yang sama dengan laporan WhatsApp
                const businessDay = moment(reportDate);
                const nextDay = businessDay.clone().add(1, 'day');

                const startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                const endDate = nextDay.format('YYYY-MM-DD') + ' 11:59:59';

                logger.info(`Membuat laporan Excel untuk tanggal spesifik dengan range: ${startDate} - ${endDate}`);

                // Get data from database berdasarkan datetime range (sama dengan WhatsApp)
                const transactions = await database.getTransactionsByDateRange(startDate, endDate);

                // Hitung summary dari transactions (sama seperti WhatsApp)
                const csSummary = this.calculateCSSummaryFromTransactions(transactions);
                const marketingCommission = this.calculateMarketingCommissionFromTransactions(transactions);

                logger.info(`Membuat laporan Excel untuk tanggal spesifik: ${reportDate}`);

                // Create workbook dengan data tanggal spesifik
                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'KAKARAMA ROOM';
                workbook.lastModifiedBy = 'WhatsApp Bot';
                workbook.created = new Date();
                workbook.modified = new Date();

                // Create sheets
                await this.createTransactionsSheet(workbook, transactions, displayDate);
                await this.createCashReportSheet(workbook, transactions, displayDate);
                await this.createCombinedSummarySheet(workbook, csSummary, marketingCommission, displayDate);

                // Save file dengan format tanggal yang aman untuk filename
                const filenameDateFormat = moment(reportDate).format('YYYY-MM-DD');
                const filename = `Laporan_KAKARAMA_ROOM_${filenameDateFormat}.xlsx`;
                const filepath = path.join(this.exportDir, filename);

                await workbook.xlsx.writeFile(filepath);

                logger.info(`Laporan Excel disimpan: ${filepath}`);
                return filepath;
            } else {
                // Default: gunakan business day range (untuk laporan harian otomatis)
                // Laporan harian jam 12:00 adalah untuk periode kemarin jam 12:00 - hari ini jam 11:59
                const now = moment().tz(this.timezone);
                const businessDay = now.clone().subtract(1, 'day');

                // Rentang waktu: kemarin jam 12:00 - hari ini jam 11:59
                const startTime = businessDay.hour(12).minute(0).second(0);
                const endTime = now.clone().hour(11).minute(59).second(59);

                startDate = startTime.format('YYYY-MM-DD HH:mm:ss');
                endDate = endTime.format('YYYY-MM-DD HH:mm:ss');
                displayDate = businessDay.format('DD/MM/YYYY');

                logger.info(`Membuat laporan Excel untuk business day range: ${startDate} - ${endDate}`);

                // Get data from database berdasarkan range waktu
                const transactions = await database.getTransactionsByDateRange(startDate, endDate);

                // Hitung summary dari transactions
                const csSummary = this.calculateCSSummaryFromTransactions(transactions);
                const marketingCommission = this.calculateMarketingCommissionFromTransactions(transactions);

                // Create workbook dengan data range
                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'KAKARAMA ROOM';
                workbook.lastModifiedBy = 'WhatsApp Bot';
                workbook.created = new Date();
                workbook.modified = new Date();

                // Create sheets dengan data yang sudah dihitung
                await this.createTransactionsSheet(workbook, transactions, `${displayDate} (Business Day Range)`);
                await this.createCashReportSheet(workbook, transactions, `${displayDate} (Business Day Range)`);
                await this.createCombinedSummarySheet(workbook, csSummary, marketingCommission, `${displayDate} (Business Day Range)`);

                // Save file dengan format tanggal yang benar untuk filename
                const filenameDateFormat = businessDay.format('YYYY-MM-DD');
                const filename = `Laporan_KAKARAMA_ROOM_${filenameDateFormat}_BusinessDay.xlsx`;
                const filepath = path.join(this.exportDir, filename);

                await workbook.xlsx.writeFile(filepath);

                logger.info(`Laporan Excel business day disimpan: ${filepath}`);
                return filepath;
            }

        } catch (error) {
            logger.error('Error membuat laporan Excel:', error);
            throw error;
        }
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
     * Calculate CS summary from transactions array
     */
    calculateCSSummaryFromTransactions(transactions) {
        const csSummary = {};

        transactions.forEach(transaction => {
            const rawCsName = transaction.cs_name || 'Unknown';
            const normalizedCsName = this.normalizeMarketingName(rawCsName);

            if (!csSummary[normalizedCsName]) {
                csSummary[normalizedCsName] = {
                    cs_name: normalizedCsName,
                    total_bookings: 0,
                    total_amount: 0,
                    total_commission: 0
                };
            }

            csSummary[normalizedCsName].total_bookings += 1;
            csSummary[normalizedCsName].total_amount += parseFloat(transaction.amount || 0);
            csSummary[normalizedCsName].total_commission += parseFloat(transaction.commission || 0);
        });

        return Object.values(csSummary);
    }

    /**
     * Calculate marketing commission by apartment from transactions array
     */
    calculateMarketingCommissionFromTransactions(transactions) {
        const groupedData = {};

        transactions.forEach(transaction => {
            const rawCsName = transaction.cs_name || 'Unknown';
            const normalizedCsName = this.normalizeMarketingName(rawCsName);
            const location = transaction.location || 'Unknown';

            const key = `${normalizedCsName}_${location}`;

            if (!groupedData[key]) {
                groupedData[key] = {
                    cs_name: normalizedCsName,
                    location: location,
                    booking_count: 0,
                    total_commission: 0
                };
            }

            groupedData[key].booking_count += 1;
            groupedData[key].total_commission += parseFloat(transaction.commission || 0);
        });

        return Object.values(groupedData);
    }

    /**
     * Create Transactions sheet with multiple headers per apartment
     */
    async createTransactionsSheet(workbook, transactions, date) {
        const worksheet = workbook.addWorksheet('Transaksi');

        // Set column widths
        worksheet.columns = [
            { width: 5 },   // No
            { width: 12 },  // Tanggal
            { width: 8 },   // Waktu
            { width: 20 },  // Apartemen
            { width: 10 },  // Unit
            { width: 12 },  // Check Out
            { width: 10 },  // Durasi
            { width: 12 },  // Pembayaran
            { width: 15 },  // Jumlah
            { width: 10 },  // CS
            { width: 15 }   // Komisi
        ];

        // Add title
        const titleText = `Detail Transaksi - ${date}`;
        worksheet.addRow([titleText]);
        worksheet.mergeCells('A1:K1');
        const titleRow = worksheet.getRow(1);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: 'center' };

        worksheet.addRow([]);

        if (transactions && transactions.length > 0) {
            // Group transactions by apartment
            const apartmentGroups = {};
            transactions.forEach((transaction) => {
                const location = transaction.location || 'Unknown';
                if (!apartmentGroups[location]) {
                    apartmentGroups[location] = [];
                }
                apartmentGroups[location].push(transaction);
            });

            // Define apartment order
            const apartmentOrder = [
                'TREEPARK BSD',
                'SKY HOUSE BSD',
                'SPRINGWOOD',
                'EMERALD BINTARO',
                'TOKYO RIVERSIDE PIK2',
                'SERPONG GARDEN',
                'TRANSPARK BINTARO'
            ];

            let currentRowNumber = 1;
            let currentRow = 3;
            let grandTotalAmount = 0;
            let grandTotalCommission = 0;

            // Process apartments in order
            apartmentOrder.forEach(apartmentName => {
                if (apartmentGroups[apartmentName]) {
                    const apartmentTransactions = apartmentGroups[apartmentName];

                    // Add apartment name header
                    const colors = getApartmentColors(apartmentName);
                    const apartmentNameRow = worksheet.addRow([apartmentName]);
                    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
                    apartmentNameRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentNameRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentNameRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment name row
                    apartmentNameRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add column headers
                    const apartmentHeaderRow = worksheet.addRow([
                        'No', 'Tanggal', 'Waktu', 'Apartemen', 'Unit', 'Check Out', 'Durasi', 'Pembayaran', 'Jumlah', 'CS', 'Komisi'
                    ]);
                    apartmentHeaderRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentHeaderRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment header
                    apartmentHeaderRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add transaction data
                    apartmentTransactions.forEach((transaction) => {
                        const amount = parseFloat(transaction.amount || 0);
                        const commission = parseFloat(transaction.commission || 0);

                        const row = worksheet.addRow([
                            currentRowNumber,
                            moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY'),
                            moment(transaction.created_at).tz(this.timezone).format('HH:mm'),
                            transaction.location || '-',
                            transaction.unit || '-',
                            transaction.checkout_time || '-',
                            transaction.duration || '-',
                            transaction.payment_method || '-',
                            amount,
                            transaction.cs_name || '-',
                            commission
                        ]);

                        // Format currency columns
                        row.getCell(9).numFmt = 'Rp #,##0';  // Amount
                        row.getCell(11).numFmt = 'Rp #,##0'; // Komisi

                        // Add borders to data row
                        row.eachCell((cell) => {
                            cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };
                        });

                        grandTotalAmount += amount;
                        grandTotalCommission += commission;
                        currentRowNumber++;
                        currentRow++;
                    });

                    // Add empty row between apartments
                    worksheet.addRow([]);
                    currentRow++;
                }
            });

            // Process any remaining apartments not in the order
            Object.keys(apartmentGroups).forEach(apartmentName => {
                if (!apartmentOrder.includes(apartmentName)) {
                    const apartmentTransactions = apartmentGroups[apartmentName];

                    // Add apartment name header
                    const colors = getApartmentColors(apartmentName);
                    const apartmentNameRow = worksheet.addRow([apartmentName]);
                    worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
                    apartmentNameRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentNameRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentNameRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment name row
                    apartmentNameRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add column headers
                    const apartmentHeaderRow = worksheet.addRow([
                        'No', 'Tanggal', 'Waktu', 'Apartemen', 'Unit', 'Check Out', 'Durasi', 'Pembayaran', 'Jumlah', 'CS', 'Komisi'
                    ]);
                    apartmentHeaderRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentHeaderRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment header
                    apartmentHeaderRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add transaction data
                    apartmentTransactions.forEach((transaction) => {
                        const amount = parseFloat(transaction.amount || 0);
                        const commission = parseFloat(transaction.commission || 0);

                        const row = worksheet.addRow([
                            currentRowNumber,
                            moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY'),
                            moment(transaction.created_at).tz(this.timezone).format('HH:mm'),
                            transaction.location || '-',
                            transaction.unit || '-',
                            transaction.checkout_time || '-',
                            transaction.duration || '-',
                            transaction.payment_method || '-',
                            amount,
                            transaction.cs_name || '-',
                            commission
                        ]);

                        // Format currency columns
                        row.getCell(9).numFmt = 'Rp #,##0';  // Amount
                        row.getCell(11).numFmt = 'Rp #,##0'; // Komisi

                        // Add borders to data row
                        row.eachCell((cell) => {
                            cell.border = {
                                top: { style: 'thin' },
                                left: { style: 'thin' },
                                bottom: { style: 'thin' },
                                right: { style: 'thin' }
                            };
                        });

                        grandTotalAmount += amount;
                        grandTotalCommission += commission;
                        currentRowNumber++;
                        currentRow++;
                    });

                    // Add empty row between apartments
                    worksheet.addRow([]);
                    currentRow++;
                }
            });

            // Add grand total row
            if (transactions.length > 0) {
                worksheet.addRow([]); // Empty row before total
                const grandTotalRow = worksheet.addRow([
                    '', '', '', 'TOTAL:', '', '', '', '',
                    grandTotalAmount, '', grandTotalCommission
                ]);
                grandTotalRow.font = { bold: true, size: 12 };
                grandTotalRow.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'D4E6F1' }
                };
                grandTotalRow.font = { bold: true, color: { argb: '000000' } };
                grandTotalRow.getCell(9).numFmt = 'Rp #,##0';  // Amount
                grandTotalRow.getCell(11).numFmt = 'Rp #,##0'; // Komisi

                // Add borders to grand total row
                grandTotalRow.eachCell((cell, colNumber) => {
                    if (colNumber >= 8 && colNumber <= 11) {
                        cell.border = {
                            top: { style: 'thick' },
                            left: { style: 'thin' },
                            bottom: { style: 'thick' },
                            right: { style: 'thin' }
                        };
                    }
                });
            }
        } else {
            worksheet.addRow(['Tidak ada transaksi pada periode ini']);
            worksheet.mergeCells('A3:K3');
            const noDataRow = worksheet.getRow(3);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        }
    }

    /**
     * Create CS Summary sheet
     */
    async createCSSummarySheet(workbook, csSummary, date) {
        const worksheet = workbook.addWorksheet('Ringkasan CS');

        // Set column widths
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Nama CS', key: 'cs_name', width: 15 },
            { header: 'Total Booking', key: 'bookings', width: 15 },
            { header: 'Total Cash', key: 'cash', width: 18 },
            { header: 'Total Transfer', key: 'transfer', width: 18 },
            { header: 'Total Komisi', key: 'commission', width: 18 }
        ];

        // Add title
        worksheet.insertRow(1, [`Ringkasan CS KAKARAMA ROOM - ${date}`]);
        worksheet.mergeCells('A1:F1');
        const titleRow = worksheet.getRow(1);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: 'center' };
        titleRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };

        // Add empty row
        worksheet.addRow([]);

        // Style header row
        const headerRow = worksheet.getRow(3);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add data rows
        if (csSummary && csSummary.length > 0) {
            csSummary.forEach((cs, index) => {
                const row = worksheet.addRow({
                    no: index + 1,
                    cs_name: cs.cs_name || '-',
                    bookings: cs.total_bookings || 0,
                    cash: parseFloat(cs.total_cash || 0),
                    transfer: parseFloat(cs.total_transfer || 0),
                    commission: parseFloat(cs.total_commission || 0)
                });

                // Format currency columns
                row.getCell('cash').numFmt = 'Rp #,##0';
                row.getCell('transfer').numFmt = 'Rp #,##0';
                row.getCell('commission').numFmt = 'Rp #,##0';
            });

            // Add totals row
            const totalRow = worksheet.addRow({
                no: '',
                cs_name: 'TOTAL:',
                bookings: { formula: `SUM(C4:C${3 + csSummary.length})` },
                cash: { formula: `SUM(D4:D${3 + csSummary.length})` },
                transfer: { formula: `SUM(E4:E${3 + csSummary.length})` },
                commission: { formula: `SUM(F4:F${3 + csSummary.length})` }
            });

            totalRow.font = { bold: true };
            totalRow.getCell('cash').numFmt = 'Rp #,##0';
            totalRow.getCell('transfer').numFmt = 'Rp #,##0';
            totalRow.getCell('commission').numFmt = 'Rp #,##0';
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F2F2F2' }
            };
        } else {
            worksheet.addRow(['Tidak ada data CS pada tanggal ini']);
            worksheet.mergeCells(`A4:F4`);
            const noDataRow = worksheet.getRow(4);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        }

        // Add borders to all cells
        this.addBordersToSheet(worksheet);
    }

    /**
     * Create Marketing Commission sheet with apartment table format
     */
    async createCommissionSheet(workbook, marketingCommissionByApartment, date) {
        const worksheet = workbook.addWorksheet('Komisi Marketing');

        // Define apartment order
        const apartmentOrder = [
            'TREEPARK BSD',
            'SKY HOUSE BSD',
            'SPRINGWOOD',
            'EMERALD BINTARO',
            'TOKYO RIVERSIDE PIK2',
            'SERPONG GARDEN',
            'TRANSPARK BINTARO'
        ];

        // Set column widths for table format
        worksheet.columns = [
            { header: 'Marketing', key: 'marketing', width: 12 },
            { header: 'Treepark', key: 'treepark', width: 10 },
            { header: 'Sky House', key: 'skyhouse', width: 10 },
            { header: 'Springwood', key: 'springwood', width: 12 },
            { header: 'Emerald', key: 'emerald', width: 10 },
            { header: 'Tokyo', key: 'tokyo', width: 10 },
            { header: 'Serpong', key: 'serpong', width: 10 },
            { header: 'Transpark', key: 'transpark', width: 10 },
            { header: 'Total', key: 'total', width: 10 }
        ];

        // Add title
        worksheet.insertRow(1, [`Komisi Marketing KAKARAMA ROOM - ${date}`]);
        worksheet.mergeCells('A1:I1');
        const titleRow = worksheet.getRow(1);
        titleRow.font = { bold: true, size: 14 };
        titleRow.alignment = { horizontal: 'center' };
        titleRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };

        // Add empty row
        worksheet.addRow([]);

        // Style header row
        const headerRow = worksheet.getRow(3);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        if (!marketingCommissionByApartment || marketingCommissionByApartment.length === 0) {
            worksheet.addRow(['Tidak ada data komisi pada tanggal ini']);
            worksheet.mergeCells(`A4:I4`);
            const noDataRow = worksheet.getRow(4);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        } else {
            // Group data by marketing name and apartment
            const marketingData = {};

            marketingCommissionByApartment.forEach(item => {
                const csName = item.cs_name;
                const location = item.location;
                const bookingCount = parseInt(item.booking_count || 0);

                if (!marketingData[csName]) {
                    marketingData[csName] = {};
                    apartmentOrder.forEach(apt => {
                        marketingData[csName][apt] = 0;
                    });
                    marketingData[csName].total = 0;
                }

                // Map location to apartment name
                if (marketingData[csName][location] !== undefined) {
                    marketingData[csName][location] += bookingCount;
                }

                marketingData[csName].total += bookingCount;
            });

            // Add data rows
            Object.keys(marketingData).forEach(csName => {
                const data = marketingData[csName];
                const row = worksheet.addRow({
                    marketing: csName,
                    treepark: data['TREEPARK BSD'] || '',
                    skyhouse: data['SKY HOUSE BSD'] || '',
                    springwood: data['SPRINGWOOD'] || '',
                    emerald: data['EMERALD BINTARO'] || '',
                    tokyo: data['TOKYO RIVERSIDE PIK2'] || '',
                    serpong: data['SERPONG GARDEN'] || '',
                    transpark: data['TRANSPARK BINTARO'] || '',
                    total: data.total
                });

                // Center align all cells
                row.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        }

        // Add borders to all cells
        this.addBordersToSheet(worksheet);
    }

    /**
     * Create Combined Summary sheet with Marketing Commission on top and CS Summary below
     */
    async createCombinedSummarySheet(workbook, csSummary, marketingCommissionByApartment, date) {
        const worksheet = workbook.addWorksheet('Komisi Marketing');

        // Define apartment order
        const apartmentOrder = [
            'TREEPARK BSD',
            'SKY HOUSE BSD',
            'SPRINGWOOD',
            'EMERALD BINTARO',
            'TOKYO RIVERSIDE PIK2',
            'SERPONG GARDEN',
            'TRANSPARK BINTARO'
        ];

        // ===== KOMISI MARKETING SECTION (TOP) =====

        // Title for Marketing Commission
        worksheet.addRow([`Komisi Marketing - ${date}`]);
        worksheet.mergeCells('A1:I1');
        const titleRow1 = worksheet.getRow(1);
        titleRow1.font = { bold: true, size: 14 };
        titleRow1.alignment = { horizontal: 'center' };
        titleRow1.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };

        worksheet.addRow([]);

        // Headers for Marketing Commission table
        const headerRow1 = worksheet.addRow(['Marketing', 'Treepark', 'Sky House', 'Springwood', 'Emerald', 'Tokyo', 'Serpong', 'Transpark', 'Total']);
        headerRow1.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow1.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow1.alignment = { horizontal: 'center', vertical: 'middle' };

        // Set column widths for table format
        worksheet.columns = [
            { width: 12 }, // Marketing
            { width: 10 }, // Treepark
            { width: 10 }, // Sky House
            { width: 12 }, // Springwood
            { width: 10 }, // Emerald
            { width: 10 }, // Tokyo
            { width: 10 }, // Serpong
            { width: 10 }, // Transpark
            { width: 10 }  // Total
        ];

        let currentRow = 4; // Track current row for spacing

        if (!marketingCommissionByApartment || marketingCommissionByApartment.length === 0) {
            worksheet.addRow(['Tidak ada data komisi marketing pada tanggal ini']);
            worksheet.mergeCells(`A4:I4`);
            const noDataRow = worksheet.getRow(4);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
            currentRow = 5;
        } else {
            // Group data by marketing name and apartment
            const marketingData = {};

            marketingCommissionByApartment.forEach(item => {
                const normalizedCsName = this.normalizeMarketingName(item.cs_name);
                const location = item.location;
                const bookingCount = parseInt(item.booking_count || 0);

                if (!marketingData[normalizedCsName]) {
                    marketingData[normalizedCsName] = {};
                    apartmentOrder.forEach(apt => {
                        marketingData[normalizedCsName][apt] = 0;
                    });
                    marketingData[normalizedCsName].total = 0;
                }

                // Map location to apartment name
                if (marketingData[normalizedCsName][location] !== undefined) {
                    marketingData[normalizedCsName][location] += bookingCount;
                }

                marketingData[normalizedCsName].total += bookingCount;
            });

            // Add data rows for marketing commission
            let marketingRowIndex = 0;
            Object.keys(marketingData).forEach(csName => {
                const data = marketingData[csName];
                const row = worksheet.addRow([
                    csName,
                    data['TREEPARK BSD'] || '',
                    data['SKY HOUSE BSD'] || '',
                    data['SPRINGWOOD'] || '',
                    data['EMERALD BINTARO'] || '',
                    data['TOKYO RIVERSIDE PIK2'] || '',
                    data['SERPONG GARDEN'] || '',
                    data['TRANSPARK BINTARO'] || '',
                    data.total
                ]);

                // Center align all cells
                row.alignment = { horizontal: 'center', vertical: 'middle' };

                // Add zebra stripe (alternating row colors)
                if (marketingRowIndex % 2 === 1) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8F9FA' }
                    };
                }

                marketingRowIndex++;
                currentRow++;
            });
        }

        // Add spacing between sections
        currentRow += 2;
        worksheet.addRow([]);
        worksheet.addRow([]);

        // ===== RINGKASAN CS SECTION (BOTTOM) =====

        // Title for CS Summary
        worksheet.addRow([`Ringkasan CS - ${date}`]);
        worksheet.mergeCells(`A${currentRow + 1}:D${currentRow + 1}`);
        const titleRowObj = worksheet.getRow(currentRow + 1);
        titleRowObj.font = { bold: true, size: 14 };
        titleRowObj.alignment = { horizontal: 'center' };
        titleRowObj.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };

        currentRow += 2;
        worksheet.addRow([]);

        // Headers for CS Summary
        const headerRow2 = worksheet.addRow(['No', 'Nama CS', 'Total Booking', 'Total Komisi']);
        headerRow2.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow2.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow2.alignment = { horizontal: 'center', vertical: 'middle' };

        currentRow += 1;

        // Add CS Summary data
        if (csSummary && csSummary.length > 0) {
            csSummary.forEach((cs, index) => {
                const row = worksheet.addRow([
                    index + 1,
                    cs.cs_name || '-',
                    cs.total_bookings || 0,
                    parseFloat(cs.total_commission || 0)
                ]);

                // Format currency columns
                row.getCell(4).numFmt = 'Rp #,##0'; // Total Komisi

                // Add zebra stripe (alternating row colors)
                if (index % 2 === 1) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F8F9FA' }
                    };
                }

                currentRow++;
            });

            // Add totals row for CS Summary
            const totalRow = worksheet.addRow([
                '',
                'TOTAL:',
                { formula: `SUM(C${currentRow - csSummary.length + 1}:C${currentRow})` },
                { formula: `SUM(D${currentRow - csSummary.length + 1}:D${currentRow})` }
            ]);

            // Merge cells A and B for TOTAL label to make it wider
            worksheet.mergeCells(`A${totalRow.number}:B${totalRow.number}`);

            totalRow.font = { bold: true };
            totalRow.getCell(4).numFmt = 'Rp #,##0';

            // Add background color to make total row more visible in protected view
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE6CC' } // Light orange background
            };

            // Center align the TOTAL text
            totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
            worksheet.addRow(['', 'Tidak ada data CS pada tanggal ini']);
            worksheet.mergeCells(`A${currentRow + 1}:D${currentRow + 1}`);
            const noDataRow = worksheet.getRow(currentRow + 1);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        }

        // Add borders to all cells
        this.addBordersToSheet(worksheet);
    }

    /**
     * Add borders to all cells in a worksheet
     */
    addBordersToSheet(worksheet) {
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
    }

    /**
     * Generate monthly Excel report
     */
    async generateMonthlyExcel(year = null, month = null) {
        try {
            const targetDate = moment().tz(this.timezone);
            if (year) targetDate.year(year);
            if (month) targetDate.month(month - 1);

            const startDate = targetDate.clone().startOf('month').format('YYYY-MM-DD');
            const endDate = targetDate.clone().endOf('month').format('YYYY-MM-DD');
            const monthName = targetDate.format('MMMM_YYYY');

            logger.info(`Membuat laporan Excel bulanan untuk ${monthName}`);

            // Get data from database
            const [transactions, csPerformance] = await Promise.all([
                database.getTransactionsByDateRange(startDate, endDate),
                database.getCSPerformance(startDate, endDate)
            ]);

            // Create workbook
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'KAKARAMA ROOM';
            workbook.created = new Date();

            // Create monthly summary sheet
            await this.createMonthlySummarySheet(workbook, transactions, csPerformance, monthName);

            // Save file
            const filename = `Laporan_Bulanan_KAKARAMA_ROOM_${monthName}.xlsx`;
            const filepath = path.join(this.exportDir, filename);
            
            await workbook.xlsx.writeFile(filepath);
            
            logger.info(`Laporan Excel bulanan disimpan: ${filepath}`);
            return filepath;

        } catch (error) {
            logger.error('Error membuat laporan Excel bulanan:', error);
            throw error;
        }
    }

    /**
     * Create monthly summary sheet
     */
    async createMonthlySummarySheet(workbook, transactions, csPerformance, monthName) {
        const worksheet = workbook.addWorksheet('Ringkasan Bulanan');

        // Add title
        worksheet.addRow([`Laporan Bulanan KAKARAMA ROOM - ${monthName.replace('_', ' ')}`]);
        worksheet.mergeCells('A1:F1');
        const titleRow = worksheet.getRow(1);
        titleRow.font = { bold: true, size: 16 };
        titleRow.alignment = { horizontal: 'center' };

        worksheet.addRow([]);

        // Summary statistics
        const totalBookings = transactions.length;
        const totalRevenue = transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const totalCommission = transactions.reduce((sum, t) => sum + parseFloat(t.commission || 0), 0);

        worksheet.addRow(['RINGKASAN BULANAN']);
        worksheet.addRow(['Total Booking:', totalBookings]);
        worksheet.addRow(['Total Pendapatan:', totalRevenue]);
        worksheet.addRow(['Total Komisi:', totalCommission]);

        // Format currency
        worksheet.getCell('B5').numFmt = 'Rp #,##0';
        worksheet.getCell('B6').numFmt = 'Rp #,##0';

        worksheet.addRow([]);

        // CS Performance
        if (csPerformance.length > 0) {
            worksheet.addRow(['PERFORMA CS']);
            worksheet.addRow(['Nama CS', 'Total Booking', 'Total Pendapatan', 'Total Komisi', 'Rata-rata per Booking']);

            const headerRow = worksheet.getRow(worksheet.rowCount);
            headerRow.font = { bold: true };

            csPerformance.forEach(cs => {
                const row = worksheet.addRow([
                    cs.cs_name,
                    cs.total_bookings,
                    parseFloat(cs.total_revenue || 0),
                    parseFloat(cs.total_commission || 0),
                    parseFloat(cs.avg_booking_value || 0)
                ]);

                row.getCell(3).numFmt = 'Rp #,##0';
                row.getCell(4).numFmt = 'Rp #,##0';
                row.getCell(5).numFmt = 'Rp #,##0';
            });
        }

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = 20;
        });

        // Add borders
        this.addBordersToSheet(worksheet);
    }

    /**
     * Clean up old Excel files
     */
    async cleanupOldFiles(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.exportDir);
            const cutoffDate = moment().subtract(daysToKeep, 'days');
            let deletedCount = 0;

            for (const file of files) {
                if (file.endsWith('.xlsx')) {
                    const filePath = path.join(this.exportDir, file);
                    const stats = fs.statSync(filePath);
                    const fileDate = moment(stats.mtime);

                    if (fileDate.isBefore(cutoffDate)) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        logger.info(`Menghapus file Excel lama: ${file}`);
                    }
                }
            }

            logger.info(`Membersihkan ${deletedCount} file Excel lama`);
            return deletedCount;
        } catch (error) {
            logger.error('Error membersihkan file Excel lama:', error);
            return 0;
        }
    }

    /**
     * Create Cash Report sheet - contains only cash payment transactions
     */
    async createCashReportSheet(workbook, transactions, date) {
        const worksheet = workbook.addWorksheet('Laporan Cash');

        // Filter transactions for cash payments only (case insensitive, exclude APK variants)
        const cashTransactions = transactions.filter(transaction => {
            if (!transaction.payment_method) return false;
            const paymentMethod = transaction.payment_method.toLowerCase();
            const csName = (transaction.cs_name || '').toLowerCase();

            // Exclude if payment method or CS name contains 'apk' (case insensitive)
            if (paymentMethod.includes('apk') || csName.includes('apk')) {
                return false;
            }

            return paymentMethod === 'cash';
        });

        // Set column widths (adjusted for new column positions starting from B)
        worksheet.columns = [
            { width: 3 },   // Column A (empty)
            { width: 5 },   // Column B (No)
            { width: 12 },  // Column C (Tanggal)
            { width: 8 },   // Column D (Waktu)
            { width: 20 },  // Column E (Apartemen)
            { width: 10 },  // Column F (Unit)
            { width: 12 },  // Column G (Check Out)
            { width: 10 },  // Column H (Durasi)
            { width: 12 },  // Column I (Pembayaran)
            { width: 15 },  // Column J (Jumlah)
            { width: 10 },  // Column K (CS)
            { width: 15 }   // Column L (Komisi)
        ];

        // Add empty rows to start from B3
        worksheet.addRow([]);
        worksheet.addRow([]);

        // Add title starting from B3
        worksheet.getCell('B3').value = `Laporan Cash - ${date}`;
        worksheet.mergeCells('B3:K3');
        const titleRow = worksheet.getRow(3);
        titleRow.font = { bold: true, size: 16 };
        titleRow.alignment = { horizontal: 'center' };
        titleRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };

        // Remove the empty row and unused header - start directly with apartment data

        if (cashTransactions.length === 0) {
            worksheet.addRow(['', 'Tidak ada transaksi tunai pada periode ini.']);
            worksheet.mergeCells('B4:K4');
            const noDataRow = worksheet.getRow(4);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        } else {
            // Define apartment order for consistent sorting
            const apartmentOrder = [
                'TREEPARK BSD',
                'SKY HOUSE BSD',
                'SPRINGWOOD',
                'EMERALD BINTARO',
                'TOKYO RIVERSIDE PIK2',
                'SERPONG GARDEN',
                'TRANSPARK BINTARO'
            ];

            // Group transactions by apartment
            const apartmentGroups = {};
            cashTransactions.forEach(transaction => {
                const location = transaction.location || 'Unknown';
                if (!apartmentGroups[location]) {
                    apartmentGroups[location] = [];
                }
                apartmentGroups[location].push(transaction);
            });

            // Sort transactions within each apartment by created_at
            Object.keys(apartmentGroups).forEach(apartmentName => {
                apartmentGroups[apartmentName].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            });

            let currentRowNumber = 1;
            let totalAmount = 0;
            let totalCommission = 0;
            let currentRow = 4; // Start after main title (B3) with empty row

            // Process apartments in order
            apartmentOrder.forEach(apartmentName => {
                if (apartmentGroups[apartmentName]) {
                    const apartmentTransactions = apartmentGroups[apartmentName];

                    // Add apartment name header starting from column B
                    const colors = getApartmentColors(apartmentName);
                    const apartmentNameRow = worksheet.addRow(['', apartmentName]);
                    worksheet.mergeCells(`B${currentRow}:K${currentRow}`);
                    apartmentNameRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentNameRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentNameRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment name row
                    apartmentNameRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add column headers starting from column B
                    const apartmentHeaderRow = worksheet.addRow([
                        '', 'No', 'Tanggal', 'Waktu', 'Apartemen', 'Unit', 'Check Out', 'Durasi', 'Pembayaran', 'Jumlah', 'CS', 'Komisi'
                    ]);
                    apartmentHeaderRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentHeaderRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment header
                    apartmentHeaderRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Track apartment totals
                    let apartmentAmount = 0;
                    let apartmentCommission = 0;

                    apartmentGroups[apartmentName].forEach((transaction) => {
                        const amount = parseFloat(transaction.amount || 0);
                        const commission = parseFloat(transaction.commission || 0);

                        const row = worksheet.addRow([
                            '', // Empty column A
                            currentRowNumber,
                            moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY'),
                            moment(transaction.created_at).tz(this.timezone).format('HH:mm'),
                            transaction.location || '-',
                            transaction.unit || '-',
                            transaction.checkout_time || '-',
                            transaction.duration || '-',
                            transaction.payment_method || '-',
                            amount,
                            transaction.cs_name || '-',
                            commission
                        ]);

                        // Format currency columns (adjusted for new column positions)
                        row.getCell(10).numFmt = 'Rp #,##0'; // Jumlah
                        row.getCell(12).numFmt = 'Rp #,##0'; // Komisi

                        // Add zebra stripe
                        if (currentRowNumber % 2 === 0) {
                            row.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'F8F9FA' }
                            };
                        }

                        apartmentAmount += amount;
                        apartmentCommission += commission;
                        totalAmount += amount;
                        totalCommission += commission;
                        currentRowNumber++;
                        currentRow++;
                    });

                    // Add apartment total row (adjusted for new column positions)
                    const apartmentTotalRow = worksheet.addRow([
                        '', '', '', '', '', '', '', '', `TOTAL ${apartmentName}:`, apartmentAmount, '', apartmentCommission
                    ]);
                    apartmentTotalRow.font = { bold: true };
                    apartmentTotalRow.getCell(9).alignment = { horizontal: 'center' };
                    apartmentTotalRow.getCell(10).numFmt = 'Rp #,##0';
                    apartmentTotalRow.getCell(12).numFmt = 'Rp #,##0';
                    apartmentTotalRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E8F4FD' } // Light blue background for apartment total
                    };
                    currentRow++;

                    // Add empty row between apartments
                    worksheet.addRow([]);
                    currentRow++;
                }
            });

            // Process any remaining apartments not in the predefined order
            Object.keys(apartmentGroups).forEach(apartmentName => {
                if (!apartmentOrder.includes(apartmentName)) {

                    // Add apartment name header starting from column B
                    const colors = getApartmentColors(apartmentName);
                    const apartmentNameRow = worksheet.addRow(['', apartmentName]);
                    worksheet.mergeCells(`B${currentRow}:K${currentRow}`);
                    apartmentNameRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentNameRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentNameRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment name row
                    apartmentNameRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Add column headers starting from column B
                    const apartmentHeaderRow = worksheet.addRow([
                        '', 'No', 'Tanggal', 'Waktu', 'Apartemen', 'Unit', 'Check Out', 'Durasi', 'Pembayaran', 'Jumlah', 'CS', 'Komisi'
                    ]);
                    apartmentHeaderRow.font = { bold: true, color: { argb: colors.font } };
                    apartmentHeaderRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: colors.bg }
                    };
                    apartmentHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };

                    // Add borders to apartment header
                    apartmentHeaderRow.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' },
                            left: { style: 'thin' },
                            bottom: { style: 'thin' },
                            right: { style: 'thin' }
                        };
                    });

                    currentRow++;

                    // Track apartment totals
                    let apartmentAmount = 0;
                    let apartmentCommission = 0;

                    apartmentGroups[apartmentName].forEach((transaction) => {
                        const amount = parseFloat(transaction.amount || 0);
                        const commission = parseFloat(transaction.commission || 0);

                        const row = worksheet.addRow([
                            '', // Empty column A
                            currentRowNumber,
                            moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY'),
                            moment(transaction.created_at).tz(this.timezone).format('HH:mm'),
                            transaction.location || '-',
                            transaction.unit || '-',
                            transaction.checkout_time || '-',
                            transaction.duration || '-',
                            transaction.payment_method || '-',
                            amount,
                            transaction.cs_name || '-',
                            commission
                        ]);

                        // Format currency columns (adjusted for new column positions)
                        row.getCell(10).numFmt = 'Rp #,##0'; // Jumlah
                        row.getCell(12).numFmt = 'Rp #,##0'; // Komisi

                        // Add zebra stripe
                        if (currentRowNumber % 2 === 0) {
                            row.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'F8F9FA' }
                            };
                        }

                        apartmentAmount += amount;
                        apartmentCommission += commission;
                        totalAmount += amount;
                        totalCommission += commission;
                        currentRowNumber++;
                        currentRow++;
                    });

                    // Add apartment total row (adjusted for new column positions)
                    const apartmentTotalRow = worksheet.addRow([
                        '', '', '', '', '', '', '', '', `TOTAL ${apartmentName}:`, apartmentAmount, '', apartmentCommission
                    ]);
                    apartmentTotalRow.font = { bold: true };
                    apartmentTotalRow.getCell(9).alignment = { horizontal: 'center' };
                    apartmentTotalRow.getCell(10).numFmt = 'Rp #,##0';
                    apartmentTotalRow.getCell(12).numFmt = 'Rp #,##0';
                    apartmentTotalRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E8F4FD' } // Light blue background for apartment total
                    };
                    currentRow++;

                    // Add empty row between apartments
                    worksheet.addRow([]);
                    currentRow++;
                }
            });

            // Add grand total row (adjusted for new column positions)
            worksheet.addRow([]);
            const summaryRow = worksheet.addRow([
                '', '', '', '', '', '', '', '', 'GRAND TOTAL:', totalAmount, '', totalCommission
            ]);

            summaryRow.font = { bold: true, size: 12 };
            summaryRow.getCell(9).alignment = { horizontal: 'center' };
            summaryRow.getCell(10).numFmt = 'Rp #,##0';
            summaryRow.getCell(12).numFmt = 'Rp #,##0';

            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD700' } // Gold background for grand total
            };
        }

        // Add borders to all cells
        this.addBordersToSheet(worksheet);
    }
}

module.exports = new ExcelExporter();
