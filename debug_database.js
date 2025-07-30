// Debug script untuk melihat data di database
const database = require('./src/database');
const moment = require('moment-timezone');

async function debugDatabase() {
    try {
        console.log('🔍 Debug Database - Melihat data transaksi...\n');
        
        // Inisialisasi database
        await database.initialize();
        
        // 1. Lihat transaksi terakhir
        console.log('📋 TRANSAKSI TERAKHIR (10 data):');
        const lastTransactions = await database.getLastTransactions(10);
        
        if (lastTransactions.length === 0) {
            console.log('❌ Tidak ada transaksi di database!');
        } else {
            lastTransactions.forEach((tx, index) => {
                console.log(`${index + 1}. ID: ${tx.id}`);
                console.log(`   Location: "${tx.location}"`);
                console.log(`   Unit: ${tx.unit}`);
                console.log(`   CS: ${tx.cs_name}`);
                console.log(`   Amount: ${tx.amount}`);
                console.log(`   Commission: ${tx.commission}`);
                console.log(`   Date: ${tx.date_only}`);
                console.log(`   Created: ${tx.created_at}`);
                console.log(`   Message ID: ${tx.message_id}`);
                console.log('   ---');
            });
        }
        
        // 2. Cek transaksi hari ini
        const today = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
        console.log(`\n📅 TRANSAKSI HARI INI (${today}):`);
        const todayTransactions = await database.getTransactions(today);
        
        if (todayTransactions.length === 0) {
            console.log('❌ Tidak ada transaksi hari ini!');
        } else {
            console.log(`✅ Ditemukan ${todayTransactions.length} transaksi hari ini:`);
            todayTransactions.forEach((tx, index) => {
                console.log(`${index + 1}. ${tx.location} - ${tx.unit} - ${tx.cs_name} - ${tx.amount}`);
            });
        }
        
        // 3. Cek transaksi dalam rentang waktu !rekap (12:00 - sekarang)
        const startTime = moment().tz('Asia/Jakarta').hour(12).minute(0).second(0).format('YYYY-MM-DD HH:mm:ss');
        const endTime = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
        
        console.log(`\n⏰ TRANSAKSI RENTANG REKAP (${startTime} - ${endTime}):`);
        const rekapTransactions = await database.getTransactionsByDateRange(startTime, endTime);
        
        if (rekapTransactions.length === 0) {
            console.log('❌ Tidak ada transaksi dalam rentang waktu rekap!');
        } else {
            console.log(`✅ Ditemukan ${rekapTransactions.length} transaksi dalam rentang rekap:`);
            rekapTransactions.forEach((tx, index) => {
                console.log(`${index + 1}. ${tx.location} - ${tx.unit} - ${tx.cs_name} - ${tx.amount} - ${tx.created_at}`);
            });
        }
        
        // 4. Cek semua lokasi unik
        console.log('\n📍 LOKASI UNIK DI DATABASE:');
        const allTransactions = await database.getLastTransactions(100);
        const uniqueLocations = [...new Set(allTransactions.map(tx => tx.location))];
        
        if (uniqueLocations.length === 0) {
            console.log('❌ Tidak ada lokasi ditemukan!');
        } else {
            uniqueLocations.forEach((location, index) => {
                const count = allTransactions.filter(tx => tx.location === location).length;
                console.log(`${index + 1}. "${location}" (${count} transaksi)`);
            });
        }
        
        console.log('\n✅ Debug selesai!');
        
    } catch (error) {
        console.error('❌ Error saat debug database:', error);
    } finally {
        await database.close();
        process.exit(0);
    }
}

// Jalankan debug
debugDatabase();
