// DEPRECATED: This file is no longer used
// We have migrated to Supabase (see supabase.js)
// Keeping this file for backward compatibility only

console.warn('database.js is deprecated, use supabase.js instead');

// Dummy export to prevent import errors
class DatabaseManager {
  async initDatabase() {
    console.warn('Using deprecated SQLite database manager. Please use Supabase instead.');
    return Promise.resolve();
  }
  
  getDatabase() {
    console.warn('Using deprecated SQLite database manager. Please use Supabase instead.');
    return null;
  }
}

export default new DatabaseManager();
