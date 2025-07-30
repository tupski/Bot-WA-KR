// Test lengkap dengan berbagai CS dan payment method
const MessageParser = require('./src/messageParser');
const database = require('./src/database');
const ReportGenerator = require('./src/reportGenerator');
const moment = require('moment-timezone');

async function testComplete() {
    try {
        console.log('🧪 Test Lengkap - Berbagai CS dan Payment Method\n');
        
        // Inisialisasi
        await database.initialize();
        const parser = MessageParser;
        const reportGenerator = ReportGenerator;
        
        // Clear data lama
        await database.executeQuery('DELETE FROM transactions WHERE location = ?', ['SKY HOUSE']);
        await database.executeQuery('DELETE FROM cs_summary WHERE date = ?', ['2025-07-30']);
        await database.executeQuery('DELETE FROM daily_summary WHERE date = ?', ['2025-07-30']);
        
        // Test messages dengan berbagai CS
        const testMessages = [
            {
                message: `🟢SKY HOUSE
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: cash 250
Cs    : amel
Komisi: 50`,
                description: 'CS amel dengan cash'
            },
            {
                message: `🟢SKY HOUSE
Unit      :L4/20N
Cek out: 14:00
Untuk   : 3 jam
Cash/Tf: tf kr 300
Cs    : dreamy
Komisi: 60`,
                description: 'CS dreamy (→kr) dengan transfer'
            },
            {
                message: `🟢SKY HOUSE
Unit      :L5/10N
Cek out: 18:00
Untuk   : 4 jam
Cash/Tf: cash 200
Cs    : apk
Komisi: 0`,
                description: 'CS apk dengan cash (skip financial)'
            },
            {
                message: `🟢SKY HOUSE
Unit      :L6/15N
Cek out: 20:00
Untuk   : 2 jam
Cash/Tf: tf kr 150
Cs    : kr
Komisi: 30`,
                description: 'CS kr dengan transfer'
            }
        ];
        
        console.log('📝 Memproses test messages...\n');
        
        for (let i = 0; i < testMessages.length; i++) {
            const test = testMessages[i];
            console.log(`${i + 1}. ${test.description}`);
            
            const result = parser.parseBookingMessage(test.message, `TEST${i + 1}`);
            
            if (result.status === 'VALID') {
                await database.saveTransaction(result.data);
                console.log(`   ✅ Berhasil: ${result.data.csName} - ${result.data.paymentMethod} - ${result.data.amount}`);
            } else {
                console.log(`   ❌ Gagal: ${result.status}`);
            }
        }
        
        // Generate laporan
        console.log('\n📊 Generating laporan...\n');
        const now = moment().tz('Asia/Jakarta');
        const startTime = now.clone().hour(12).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
        const endTime = now.format('YYYY-MM-DD HH:mm:ss');
        
        const report = await reportGenerator.generateReportByDateRange(startTime, endTime);
        
        console.log('📄 LAPORAN HASIL:');
        console.log('='.repeat(60));
        console.log(report);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await database.close();
        console.log('\n✅ Test selesai!');
        process.exit(0);
    }
}

// Jalankan test
testComplete();
