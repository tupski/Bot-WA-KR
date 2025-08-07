// Script untuk migrasi data dari SQLite ke Supabase
// File: migrate-sqlite-to-supabase.js

const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUyMTY5OCwiZXhwIjoyMDcwMDk3Njk4fQ.c-TsCsWk7rG-l-Z-BvFc111oCpAsJ8wXKTqydj9sWIc';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQLite database path
const sqliteDbPath = './data/bot-kr (1).db';

// Function to convert SQLite data to Supabase format
async function migrateData() {
  console.log('🚀 Starting migration from SQLite to Supabase...');

  // Check if SQLite file exists
  if (!fs.existsSync(sqliteDbPath)) {
    console.error('❌ SQLite database file not found:', sqliteDbPath);
    return;
  }

  // Open SQLite database
  const db = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('❌ Error opening SQLite database:', err.message);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  try {
    // Get all table names from SQLite
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => row.name));
      });
    });

    console.log('📋 Found tables:', tables);

    // Generate migration SQL file
    let migrationSQL = '-- Migration data from SQLite to Supabase\n';
    migrationSQL += '-- Generated on: ' + new Date().toISOString() + '\n\n';

    // Process each table
    for (const tableName of tables) {
      if (tableName === 'sqlite_sequence') continue; // Skip SQLite system table

      console.log(`📊 Processing table: ${tableName}`);

      // Get table schema
      const schema = await new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get table data
      const data = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM ${tableName}`, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      if (data.length > 0) {
        migrationSQL += `-- Data for table: ${tableName}\n`;
        
        // Map SQLite table names to Supabase table names
        const supabaseTableName = mapTableName(tableName);
        
        for (const row of data) {
          const columns = Object.keys(row);
          const values = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            return val;
          });

          migrationSQL += `INSERT INTO ${supabaseTableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        migrationSQL += '\n';
      }

      console.log(`✅ Processed ${data.length} rows from ${tableName}`);
    }

    // Save migration SQL to file
    const migrationFile = 'migration-data.sql';
    fs.writeFileSync(migrationFile, migrationSQL);
    console.log(`💾 Migration SQL saved to: ${migrationFile}`);

    // Also create a summary report
    const summary = await generateMigrationSummary(tables, db);
    fs.writeFileSync('migration-summary.json', JSON.stringify(summary, null, 2));
    console.log('📊 Migration summary saved to: migration-summary.json');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    // Close SQLite database
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err.message);
      } else {
        console.log('✅ SQLite database connection closed');
      }
    });
  }
}

// Map SQLite table names to Supabase table names
function mapTableName(sqliteTableName) {
  const tableMapping = {
    'admins': 'admins',
    'apartments': 'apartments',
    'field_teams': 'field_teams',
    'units': 'units',
    'checkins': 'checkins',
    'checkin_extensions': 'checkin_extensions',
    'team_apartment_assignments': 'team_apartment_assignments',
    'activity_logs': 'activity_logs'
  };

  return tableMapping[sqliteTableName] || sqliteTableName;
}

// Generate migration summary
async function generateMigrationSummary(tables, db) {
  const summary = {
    migrationDate: new Date().toISOString(),
    sourceDatabase: sqliteDbPath,
    targetDatabase: 'Supabase',
    tables: {}
  };

  for (const tableName of tables) {
    if (tableName === 'sqlite_sequence') continue;

    const count = await new Promise((resolve, reject) => {
      db.get(`SELECT COUNT(*) as count FROM ${tableName}`, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    const schema = await new Promise((resolve, reject) => {
      db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    summary.tables[tableName] = {
      rowCount: count,
      columns: schema.map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        primaryKey: col.pk === 1
      }))
    };
  }

  return summary;
}

// Function to upload data directly to Supabase (alternative to SQL file)
async function uploadToSupabase() {
  console.log('🚀 Starting direct upload to Supabase...');

  const db = new sqlite3.Database(sqliteDbPath, sqlite3.OPEN_READONLY);

  try {
    // Example: Migrate apartments table
    const apartments = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM apartments', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (apartments.length > 0) {
      console.log(`📊 Uploading ${apartments.length} apartments...`);
      
      // Convert SQLite data to Supabase format
      const supabaseApartments = apartments.map(apt => ({
        name: apt.name,
        code: apt.code,
        whatsapp_group_id: apt.whatsapp_group_id,
        address: apt.address,
        description: apt.description,
        status: apt.status || 'active'
      }));

      const { data, error } = await supabase
        .from('apartments')
        .insert(supabaseApartments);

      if (error) {
        console.error('❌ Error uploading apartments:', error);
      } else {
        console.log('✅ Apartments uploaded successfully');
      }
    }

    // Add similar blocks for other tables...

  } catch (error) {
    console.error('❌ Upload error:', error);
  } finally {
    db.close();
  }
}

// Main execution
async function main() {
  console.log('🎯 KakaRama Room - SQLite to Supabase Migration Tool');
  console.log('================================================\n');

  const args = process.argv.slice(2);
  
  if (args.includes('--upload')) {
    await uploadToSupabase();
  } else {
    await migrateData();
  }

  console.log('\n🎉 Migration completed!');
  console.log('\nNext steps:');
  console.log('1. Run the schema SQL in Supabase SQL Editor');
  console.log('2. Run the migration SQL in Supabase SQL Editor');
  console.log('3. Verify data in Supabase dashboard');
  console.log('4. Update bot and app configurations');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateData, uploadToSupabase };
