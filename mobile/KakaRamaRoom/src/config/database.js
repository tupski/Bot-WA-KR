import SQLite from 'react-native-sqlite-storage';

// Enable promise for SQLite
SQLite.enablePromise(true);

class DatabaseManager {
  constructor() {
    this.database = null;
  }

  async initDatabase() {
    try {
      this.database = await SQLite.openDatabase({
        name: 'KakaRamaRoom.db',
        location: 'default',
      });
      
      await this.createTables();
      console.log('Database initialized successfully');
      return this.database;
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const tables = [
      // Tabel Admin
      `CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        phone VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabel Apartemen
      `CREATE TABLE IF NOT EXISTS apartments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        whatsapp_group_id VARCHAR(255),
        address TEXT,
        description TEXT,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabel Tim Lapangan
      `CREATE TABLE IF NOT EXISTS field_teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabel Assignment Tim ke Apartemen
      `CREATE TABLE IF NOT EXISTS team_apartment_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        apartment_id INTEGER NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES field_teams(id) ON DELETE CASCADE,
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
        UNIQUE(team_id, apartment_id)
      )`,

      // Tabel Unit
      `CREATE TABLE IF NOT EXISTS units (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL,
        unit_number VARCHAR(20) NOT NULL,
        unit_type VARCHAR(50),
        status ENUM('available', 'occupied', 'cleaning', 'maintenance') DEFAULT 'available',
        cleaning_started_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (apartment_id) REFERENCES apartments(id) ON DELETE CASCADE,
        UNIQUE(apartment_id, unit_number)
      )`,

      // Tabel Checkin
      `CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        apartment_id INTEGER NOT NULL,
        unit_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        duration_hours INTEGER NOT NULL,
        checkout_time DATETIME NOT NULL,
        payment_method ENUM('Cash', 'Cash Amel', 'Transfer KR', 'Transfer Amel', 'APK') NOT NULL,
        payment_amount DECIMAL(12,2),
        payment_proof_path VARCHAR(255),
        marketing_name VARCHAR(100),
        notes TEXT,
        status ENUM('active', 'extended', 'completed', 'early_checkout') DEFAULT 'active',
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (apartment_id) REFERENCES apartments(id),
        FOREIGN KEY (unit_id) REFERENCES units(id),
        FOREIGN KEY (team_id) REFERENCES field_teams(id),
        FOREIGN KEY (created_by) REFERENCES field_teams(id)
      )`,

      // Tabel Extend Checkin
      `CREATE TABLE IF NOT EXISTS checkin_extensions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        checkin_id INTEGER NOT NULL,
        additional_hours INTEGER NOT NULL,
        new_checkout_time DATETIME NOT NULL,
        payment_method ENUM('Cash', 'Cash Amel', 'Transfer KR', 'Transfer Amel', 'APK') NOT NULL,
        payment_amount DECIMAL(12,2),
        payment_proof_path VARCHAR(255),
        notes TEXT,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (checkin_id) REFERENCES checkins(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES field_teams(id)
      )`,

      // Tabel Log Aktivitas
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        user_type ENUM('admin', 'field_team') NOT NULL,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        related_table VARCHAR(50),
        related_id INTEGER,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSQL of tables) {
      await this.database.executeSql(tableSQL);
    }

    // Insert default admin
    await this.insertDefaultData();
  }

  async insertDefaultData() {
    try {
      // Insert default admin
      const adminExists = await this.database.executeSql(
        'SELECT COUNT(*) as count FROM admins WHERE username = ?',
        ['admin']
      );
      
      if (adminExists[0].rows.item(0).count === 0) {
        await this.database.executeSql(
          `INSERT INTO admins (username, password, full_name, email) 
           VALUES (?, ?, ?, ?)`,
          ['admin', 'admin123', 'Administrator', 'admin@kakaramaroom.com']
        );
      }

      // Insert default apartments
      const apartments = [
        ['Treepark BSD', 'TREEPARK', null],
        ['Sky House BSD', 'SKYHOUSE', null],
        ['Springwood', 'SPRINGWOOD', null],
        ['Emerald Bintaro', 'EMERALD', null],
        ['Tokyo PIK 2', 'TOKYO', null],
        ['Serpong Garden', 'SERPONG', null],
        ['Transpark Bintaro', 'TRANSPARK', null]
      ];

      for (const [name, code, groupId] of apartments) {
        const exists = await this.database.executeSql(
          'SELECT COUNT(*) as count FROM apartments WHERE code = ?',
          [code]
        );
        
        if (exists[0].rows.item(0).count === 0) {
          await this.database.executeSql(
            `INSERT INTO apartments (name, code, whatsapp_group_id, status) 
             VALUES (?, ?, ?, 'active')`,
            [name, code, groupId]
          );
        }
      }

    } catch (error) {
      console.error('Error inserting default data:', error);
    }
  }

  async closeDatabase() {
    if (this.database) {
      await this.database.close();
      console.log('Database closed');
    }
  }

  getDatabase() {
    return this.database;
  }
}

export default new DatabaseManager();
