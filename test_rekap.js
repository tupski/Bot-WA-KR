// Test format laporan !rekap
const ReportGenerator = require('./src/reportGenerator');
const database = require('./src/database');
const moment = require('moment-timezone');

async function testRekap() {
    try {
        console.log('📊 Test Format Laporan !rekap\n');
        
        // Inisialisasi
        await database.initialize();
        const reportGenerator = ReportGenerator;
        
        // Ambil data dalam rentang waktu rekap
        const now = moment().tz('Asia/Jakarta');
        const startTime = now.clone().hour(12).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
        const endTime = now.format('YYYY-MM-DD HH:mm:ss');
        
        console.log('🕐 Rentang waktu rekap:', startTime, '-', endTime);
        
        const transactions = await database.getTransactionsByDateRange(startTime, endTime);
        console.log('📊 Jumlah transaksi ditemukan:', transactions.length);
        
        if (transactions.length > 0) {
            console.log('\n📋 Data transaksi:');
            transactions.forEach((tx, index) => {
                console.log(`${index + 1}. ${tx.location} - ${tx.unit} - ${tx.cs_name} - ${tx.amount} - ${tx.payment_method}`);
            });
            
            // Generate laporan
            console.log('\n📊 Generating laporan...');

            // Debug stats calculation
            const stats = reportGenerator.calculateRangeStats(transactions);
            console.log('\n🔍 Debug stats:');
            console.log('- csSummary:', JSON.stringify(stats.csSummary, null, 2));
            console.log('- csPaymentBreakdown:', JSON.stringify(stats.csPaymentBreakdown, null, 2));
            console.log('- paymentMethods:', JSON.stringify(stats.paymentMethods, null, 2));

            const report = await reportGenerator.generateReportByDateRange(startTime, endTime);
            
            console.log('\n📄 LAPORAN HASIL:');
            console.log('='.repeat(50));
            console.log(report);
            console.log('='.repeat(50));
            
        } else {
            console.log('❌ Tidak ada transaksi dalam rentang waktu');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await database.close();
        console.log('\n✅ Test selesai!');
        process.exit(0);
    }
}

// Jalankan test
testRekap();
