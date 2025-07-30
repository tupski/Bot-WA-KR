// Script untuk menghapus data test lama
const database = require('./src/database');

async function clearTestData() {
    try {
        console.log('🗑️  Menghapus data test lama...\n');
        
        // Inisialisasi database
        await database.initialize();
        
        // Hapus data dengan location "TESTING BOT"
        const deleteQuery = 'DELETE FROM transactions WHERE location = ?';
        const result = await database.executeQuery(deleteQuery, ['TESTING BOT']);
        
        console.log(`✅ Berhasil menghapus data test lama`);
        console.log(`📊 Rows affected: ${result.affectedRows || result.changes || 'unknown'}`);
        
        // Hapus juga dari cs_summary dan daily_summary jika ada
        await database.executeQuery('DELETE FROM cs_summary WHERE date = ?', ['2025-07-30']);
        await database.executeQuery('DELETE FROM daily_summary WHERE date = ?', ['2025-07-30']);
        
        console.log('✅ Data summary juga dibersihkan');
        
    } catch (error) {
        console.error('❌ Error saat menghapus data:', error);
    } finally {
        await database.close();
        process.exit(0);
    }
}

// Jalankan
clearTestData();
