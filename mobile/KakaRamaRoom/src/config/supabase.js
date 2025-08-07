import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration - keys loaded from environment
// For React Native, we'll use a config file approach
import { SUPABASE_CONFIG } from './env-config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database Manager untuk Supabase
 * Menggantikan SQLite dengan Supabase PostgreSQL
 */
class DatabaseManager {
  constructor() {
    this.supabase = supabase;
    this.database = supabase; // Compatibility dengan kode lama
  }

  /**
   * Inisialisasi database (tidak diperlukan untuk Supabase)
   * Kept for compatibility dengan kode existing
   */
  async initDatabase() {
    try {
      // Test koneksi ke Supabase
      const { data, error } = await this.supabase
        .from('apartments')
        .select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found, which is OK
        throw error;
      }

      console.log('Supabase database berhasil terhubung');
      return this.supabase;
    } catch (error) {
      console.error('Gagal menghubungkan ke Supabase:', error);
      throw error;
    }
  }

  /**
   * Get database instance (untuk compatibility)
   */
  getDatabase() {
    return this.supabase;
  }

  /**
   * Execute SQL query (untuk compatibility dengan kode SQLite)
   * Note: Ini adalah wrapper, sebaiknya gunakan Supabase client langsung
   */
  async executeSql(query, params = []) {
    console.warn('executeSql is deprecated, use Supabase client methods instead');
    
    // Ini hanya untuk compatibility, implementasi terbatas
    // Sebaiknya refactor kode untuk menggunakan Supabase client langsung
    return {
      success: false,
      message: 'Use Supabase client methods instead of executeSql'
    };
  }
}

// Export singleton instance
const databaseManager = new DatabaseManager();
export default databaseManager;

// Export Supabase client untuk penggunaan langsung
export { supabase };
