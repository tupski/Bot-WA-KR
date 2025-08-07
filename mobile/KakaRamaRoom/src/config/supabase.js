import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration - keys loaded from environment
import Config from 'react-native-config';

const supabaseUrl = Config.SUPABASE_URL || 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseAnonKey = Config.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE2OTgsImV4cCI6MjA3MDA5NzY5OH0.FXWPp9L4xZ3uw34Iob7QvlEsePTdBmGmgRufXBZZ34c';

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
