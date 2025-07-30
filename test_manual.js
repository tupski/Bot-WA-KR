// Test manual untuk parsing dan penyimpanan data
const MessageParser = require('./src/messageParser');
const database = require('./src/database');
const moment = require('moment-timezone');

async function testManual() {
    try {
        console.log('🧪 Test Manual - Parsing dan Penyimpanan Data\n');
        
        // Inisialisasi
        await database.initialize();
        const parser = MessageParser;
        
        // Test message - sesuai format yang benar
        const testMessage = `🟢SKY HOUSE
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: cash 250
Cs    : dreamy
Komisi: 50`;

        console.log('📝 Test Message:');
        console.log(testMessage);
        console.log('\n⏰ Waktu sekarang:', moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'), 'WIB\n');
        
        // Parse message
        console.log('🔍 Parsing message...');
        const result = parser.parseBookingMessage(testMessage, 'TEST123');
        
        if (result.status === 'VALID') {
            console.log('✅ Parsing berhasil!');
            console.log('📊 Data parsed:');
            console.log('- Location:', `"${result.data.location}"`);
            console.log('- Group Prefix:', `"${result.data.groupPrefix}"`);
            console.log('- Unit:', result.data.unit);
            console.log('- CS:', result.data.csName);
            console.log('- Amount:', result.data.amount, '(format ribuan)');
            console.log('- Commission:', result.data.commission, '(format ribuan)');
            console.log('- Payment Method:', result.data.paymentMethod);
            console.log('- Created At:', result.data.createdAt);

            console.log('\n🔍 Debug raw result:');
            console.log(JSON.stringify(result.data, null, 2));
            
            // Simpan ke database
            console.log('\n💾 Menyimpan ke database...');
            await database.saveTransaction(result.data);
            console.log('✅ Data berhasil disimpan!');
            
            // Cek data yang tersimpan
            console.log('\n🔍 Mengecek data yang tersimpan...');
            const savedData = await database.getLastTransactions(1);
            
            if (savedData.length > 0) {
                const transaction = savedData[0];
                console.log('📋 Data tersimpan:');
                console.log('- ID:', transaction.id);
                console.log('- Location:', transaction.location);
                console.log('- Unit:', transaction.unit);
                console.log('- CS:', transaction.cs_name);
                console.log('- Amount:', transaction.amount);
                console.log('- Commission:', transaction.commission);
                console.log('- Created At:', transaction.created_at);
                
                // Test !rekap
                console.log('\n📊 Test !rekap...');
                const now = moment().tz('Asia/Jakarta');
                const startTime = now.clone().hour(12).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
                const endTime = now.format('YYYY-MM-DD HH:mm:ss');
                
                console.log('🕐 Rentang waktu rekap:', startTime, '-', endTime);
                
                const rekapData = await database.getTransactionsByDateRange(startTime, endTime);
                
                if (rekapData.length > 0) {
                    console.log('✅ Data ditemukan dalam rentang rekap!');
                    console.log('📊 Jumlah transaksi:', rekapData.length);
                    rekapData.forEach((tx, index) => {
                        console.log(`${index + 1}. ${tx.location} - ${tx.unit} - ${tx.cs_name} - ${tx.amount} - ${tx.created_at}`);
                    });
                } else {
                    console.log('❌ Tidak ada data dalam rentang rekap');
                    console.log('🔍 Kemungkinan penyebab:');
                    console.log('- Data tersimpan di luar rentang waktu 12:00-sekarang');
                    console.log('- Format datetime tidak sesuai');
                }
            } else {
                console.log('❌ Tidak ada data tersimpan');
            }
            
        } else {
            console.log('❌ Parsing gagal:', result.status);
            if (result.message) {
                console.log('📝 Pesan error:', result.message);
            }
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
testManual();
