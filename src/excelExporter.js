// Excel Exporter Module
const ExcelJS = require('exceljs');
const moment = require('moment-timezone');
const path = require('path');
const fs = require('fs');
const config = require('../config/config.js');
const database = require('./database');
const logger = require('./logger');

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
                // Jika tanggal spesifik diberikan, gunakan tanggal tersebut
                reportDate = date;
                displayDate = moment(reportDate).format('YYYY-MM-DD');

                // Get data from database untuk tanggal spesifik
                const [transactions, csSummary, marketingCommissionByApartment] = await Promise.all([
                    database.getTransactions(reportDate),
                    database.getCSSummary(reportDate),
                    database.getMarketingCommissionByApartment(reportDate)
                ]);

                logger.info(`Membuat laporan Excel untuk tanggal spesifik: ${reportDate}`);

                // Create workbook dengan data tanggal spesifik
                const workbook = new ExcelJS.Workbook();
                workbook.creator = 'KAKARAMA ROOM';
                workbook.lastModifiedBy = 'WhatsApp Bot';
                workbook.created = new Date();
                workbook.modified = new Date();

                // Create sheets
                await this.createTransactionsSheet(workbook, transactions, displayDate);
                await this.createCombinedSummarySheet(workbook, csSummary, marketingCommissionByApartment, displayDate);

                // Save file
                const filename = `Laporan_KAKARAMA_ROOM_${displayDate}.xlsx`;
                const filepath = path.join(this.exportDir, filename);

                await workbook.xlsx.writeFile(filepath);

                logger.info(`Laporan Excel disimpan: ${filepath}`);
                return filepath;
            } else {
                // Default: gunakan business day range (untuk laporan harian otomatis)
                const now = moment().tz(this.timezone);

                // Business day kemarin (karena laporan jam 12:00 untuk hari sebelumnya)
                const businessDay = now.clone().subtract(1, 'day');

                // Rentang waktu: business day kemarin jam 12:00 - hari ini jam 11:59
                startDate = businessDay.format('YYYY-MM-DD') + ' 12:00:00';
                endDate = now.format('YYYY-MM-DD') + ' 11:59:59';
                displayDate = businessDay.format('YYYY-MM-DD');

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
                await this.createCombinedSummarySheet(workbook, csSummary, marketingCommission, `${displayDate} (Business Day Range)`);

                // Save file
                const filename = `Laporan_KAKARAMA_ROOM_${displayDate}_BusinessDay.xlsx`;
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
     * Calculate CS summary from transactions array
     */
    calculateCSSummaryFromTransactions(transactions) {
        const csSummary = {};

        transactions.forEach(transaction => {
            const csName = transaction.cs_name || 'Unknown';
            if (!csSummary[csName]) {
                csSummary[csName] = {
                    cs_name: csName,
                    total_bookings: 0,
                    total_amount: 0,
                    total_commission: 0
                };
            }

            csSummary[csName].total_bookings += 1;
            csSummary[csName].total_amount += parseFloat(transaction.amount || 0);
            csSummary[csName].total_commission += parseFloat(transaction.commission || 0);
        });

        return Object.values(csSummary);
    }

    /**
     * Calculate marketing commission by apartment from transactions array
     */
    calculateMarketingCommissionFromTransactions(transactions) {
        const result = [];
        const groupedData = {};

        transactions.forEach(transaction => {
            const csName = transaction.cs_name || 'Unknown';
            const location = transaction.location || 'Unknown';

            // Skip APK dan AMEL (bukan marketing)
            if (csName.toLowerCase() !== 'apk' && csName.toLowerCase() !== 'amel') {
                const key = `${csName}_${location}`;

                if (!groupedData[key]) {
                    groupedData[key] = {
                        cs_name: csName,
                        location: location,
                        booking_count: 0,
                        total_commission: 0
                    };
                }

                groupedData[key].booking_count += 1;
                groupedData[key].total_commission += parseFloat(transaction.commission || 0);
            }
        });

        return Object.values(groupedData);
    }

    /**
     * Create Transactions sheet
     */
    async createTransactionsSheet(workbook, transactions, date) {
        const worksheet = workbook.addWorksheet('Transaksi');

        // Set column widths
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Waktu', key: 'time', width: 20 },
            { header: 'Lokasi', key: 'location', width: 15 },
            { header: 'Unit', key: 'unit', width: 10 },
            { header: 'Check Out', key: 'checkout', width: 12 },
            { header: 'Durasi', key: 'duration', width: 10 },
            { header: 'Pembayaran', key: 'payment', width: 12 },
            { header: 'CS', key: 'cs', width: 10 },
            { header: 'Jumlah', key: 'amount', width: 15 },
            { header: 'Komisi', key: 'commission', width: 15 }
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '366092' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add title
        worksheet.insertRow(1, [`Laporan Transaksi KAKARAMA ROOM - ${date}`]);
        worksheet.mergeCells('A1:J1');
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

        // Add data rows
        if (transactions && transactions.length > 0) {
            transactions.forEach((transaction, index) => {
                const row = worksheet.addRow({
                    no: index + 1,
                    time: moment(transaction.created_at).tz(this.timezone).format('DD/MM/YYYY HH:mm'),
                    location: transaction.location || '-',
                    unit: transaction.unit || '-',
                    checkout: transaction.checkout_time || '-',
                    duration: transaction.duration || '-',
                    payment: transaction.payment_method || '-',
                    cs: transaction.cs_name || '-',
                    amount: parseFloat(transaction.amount || 0),
                    commission: parseFloat(transaction.commission || 0)
                });

                // Format currency columns
                row.getCell('amount').numFmt = 'Rp #,##0';
                row.getCell('commission').numFmt = 'Rp #,##0';
            });

            // Add totals row
            const totalRow = worksheet.addRow({
                no: '',
                time: '',
                location: '',
                unit: '',
                checkout: '',
                duration: '',
                payment: '',
                cs: 'TOTAL:',
                amount: { formula: `SUM(I4:I${3 + transactions.length})` },
                commission: { formula: `SUM(J4:J${3 + transactions.length})` }
            });

            totalRow.font = { bold: true };
            totalRow.getCell('amount').numFmt = 'Rp #,##0';
            totalRow.getCell('commission').numFmt = 'Rp #,##0';
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F2F2F2' }
            };
        } else {
            worksheet.addRow(['Tidak ada transaksi pada tanggal ini']);
            worksheet.mergeCells(`A4:J4`);
            const noDataRow = worksheet.getRow(4);
            noDataRow.alignment = { horizontal: 'center' };
            noDataRow.font = { italic: true };
        }

        // Add borders to all cells
        this.addBordersToSheet(worksheet);
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
        const worksheet = workbook.addWorksheet('Ringkasan');

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

            // Add data rows for marketing commission
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
        worksheet.mergeCells(`A${currentRow + 1}:F${currentRow + 1}`);
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
        const headerRow2 = worksheet.addRow(['No', 'Nama CS', 'Total Booking', 'Total Cash', 'Total Transfer', 'Total Komisi']);
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
                    parseFloat(cs.total_cash || 0),
                    parseFloat(cs.total_transfer || 0),
                    parseFloat(cs.total_commission || 0)
                ]);

                // Format currency columns
                row.getCell(4).numFmt = 'Rp #,##0'; // Total Cash
                row.getCell(5).numFmt = 'Rp #,##0'; // Total Transfer
                row.getCell(6).numFmt = 'Rp #,##0'; // Total Komisi
                currentRow++;
            });

            // Add totals row for CS Summary
            const totalRow = worksheet.addRow([
                '',
                'TOTAL:',
                { formula: `SUM(C${currentRow - csSummary.length + 1}:C${currentRow})` },
                { formula: `SUM(D${currentRow - csSummary.length + 1}:D${currentRow})` },
                { formula: `SUM(E${currentRow - csSummary.length + 1}:E${currentRow})` },
                { formula: `SUM(F${currentRow - csSummary.length + 1}:F${currentRow})` }
            ]);

            totalRow.font = { bold: true };
            totalRow.getCell(4).numFmt = 'Rp #,##0';
            totalRow.getCell(5).numFmt = 'Rp #,##0';
            totalRow.getCell(6).numFmt = 'Rp #,##0';
            totalRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F2F2F2' }
            };
        } else {
            worksheet.addRow(['', 'Tidak ada data CS pada tanggal ini']);
            worksheet.mergeCells(`A${currentRow + 1}:F${currentRow + 1}`);
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
}

module.exports = new ExcelExporter();
