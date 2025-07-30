// Script untuk membersihkan semua data database
require('dotenv').config();
const database = require('./src/database');

async function clearDatabase() {
    try {
        console.log('🗑️  Membersihkan semua data database...\n');
        
        // Inisialisasi database
        await database.initialize();
        
        // Daftar tabel yang akan dibersihkan
        const tables = [
            'transactions',
            'cs_summary', 
            'daily_summary',
            'processed_messages'
        ];
        
        let totalDeleted = 0;
        
        // Hapus data dari setiap tabel
        for (const table of tables) {
            try {
                console.log(`🧹 Membersihkan tabel ${table}...`);
                const result = await database.executeQuery(`DELETE FROM ${table}`);
                console.log(`   ✅ Berhasil membersihkan tabel ${table}`);
                
                // Hitung total rows yang dihapus (jika database mendukung)
                if (result && result.changes) {
                    totalDeleted += result.changes;
                    console.log(`   📊 Rows dihapus: ${result.changes}`);
                }
            } catch (error) {
                console.log(`   ⚠️  Warning: ${error.message}`);
            }
        }
        
        // Reset auto increment (untuk SQLite)
        try {
            console.log('\n🔄 Reset auto increment...');
            await database.executeQuery("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'cs_summary', 'daily_summary', 'processed_messages')");
            console.log('   ✅ Auto increment berhasil di-reset');
        } catch (error) {
            console.log(`   ⚠️  Warning: ${error.message}`);
        }
        
        // Verifikasi database kosong
        console.log('\n🔍 Verifikasi database...');
        for (const table of tables) {
            try {
                const count = await database.executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
                const rowCount = count[0]?.count || 0;
                console.log(`   📊 ${table}: ${rowCount} rows`);
            } catch (error) {
                console.log(`   ⚠️  Error checking ${table}: ${error.message}`);
            }
        }
        
        console.log('\n✅ Database berhasil dibersihkan!');
        console.log(`📊 Total estimasi rows dihapus: ${totalDeleted}`);
        console.log('\n📝 Catatan:');
        console.log('- Semua data transaksi telah dihapus');
        console.log('- Semua summary harian telah dihapus');
        console.log('- Semua checkpoint pesan telah dihapus');
        console.log('- Bot akan memproses ulang pesan dari jam 12:00 WIB saat restart');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await database.close();
        console.log('\n🔒 Koneksi database ditutup');
        process.exit(0);
    }
}

// Konfirmasi sebelum menjalankan
console.log('⚠️  PERINGATAN: Script ini akan menghapus SEMUA data dari database!');
console.log('📋 Tabel yang akan dibersihkan:');
console.log('   - transactions (semua data transaksi)');
console.log('   - cs_summary (summary CS harian)');
console.log('   - daily_summary (summary harian)');
console.log('   - processed_messages (checkpoint pesan)');
console.log('\n🚀 Menjalankan pembersihan dalam 3 detik...');

setTimeout(() => {
    clearDatabase();
}, 3000);
