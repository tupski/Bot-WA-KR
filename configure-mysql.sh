#!/bin/bash
# Script untuk mengkonfigurasi MySQL pada instalasi bot yang sudah ada

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "🗄️ KONFIGURASI MYSQL UNTUK BOT KAKARAMA ROOM"
echo "============================================="
echo

# Check if bot directory exists
BOT_DIR="$HOME/whatsapp-bot"
if [ ! -d "$BOT_DIR" ]; then
    print_error "Bot directory tidak ditemukan: $BOT_DIR"
    print_info "Jalankan instalasi bot terlebih dahulu"
    exit 1
fi

cd "$BOT_DIR"

# Check if MySQL is already configured
if grep -q "DB_TYPE=mysql" .env 2>/dev/null; then
    print_warning "MySQL sudah dikonfigurasi!"
    print_info "Untuk rekonfigurasi, backup data terlebih dahulu"
    exit 0
fi

print_info "Install MySQL Server..."
sudo apt update
sudo apt install -y mysql-server

# Start MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# Generate secure passwords
MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
MYSQL_BOT_PASSWORD=$(openssl rand -base64 24)

print_info "Configure MySQL security..."
# Secure MySQL installation
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

print_info "Create database and user..."
# Create database and user
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS kakarama_room CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS 'botuser'@'localhost' IDENTIFIED BY '$MYSQL_BOT_PASSWORD';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON kakarama_room.* TO 'botuser'@'localhost';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

# Save credentials
print_info "Save MySQL credentials..."
cat > mysql_credentials.txt << EOF
MySQL Configuration for WhatsApp Bot Kakarama Room
================================================

Root User:
Username: root
Password: $MYSQL_ROOT_PASSWORD

Bot User:
Username: botuser
Password: $MYSQL_BOT_PASSWORD
Database: kakarama_room

Connection String:
mysql://botuser:$MYSQL_BOT_PASSWORD@localhost:3306/kakarama_room

IMPORTANT: Keep this file secure!
EOF
chmod 600 mysql_credentials.txt

# Migrate data from SQLite to MySQL (if SQLite exists)
if [ -f "data/bot-kr.db" ]; then
    print_info "Migrate data from SQLite to MySQL..."
    
    # Create migration script
    cat > migrate_to_mysql.js << 'EOF'
const sqlite3 = require('sqlite3').verbose();
const mysql = require('mysql2/promise');
const fs = require('fs');

async function migrate() {
    console.log('🔄 Starting migration from SQLite to MySQL...');
    
    // Read MySQL credentials
    const env = require('dotenv').config();
    
    // Connect to MySQL
    const mysqlConnection = await mysql.createConnection({
        host: 'localhost',
        user: 'botuser',
        password: process.env.DB_PASSWORD,
        database: 'kakarama_room'
    });
    
    // Connect to SQLite
    const sqliteDb = new sqlite3.Database('./data/bot-kr.db');
    
    // Get all tables from SQLite
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table'", async (err, tables) => {
        if (err) {
            console.error('Error reading SQLite tables:', err);
            return;
        }
        
        for (const table of tables) {
            console.log(`Migrating table: ${table.name}`);
            
            // Get table structure
            sqliteDb.all(`PRAGMA table_info(${table.name})`, async (err, columns) => {
                if (err) {
                    console.error(`Error reading table structure for ${table.name}:`, err);
                    return;
                }
                
                // Create MySQL table
                let createTableSQL = `CREATE TABLE IF NOT EXISTS ${table.name} (`;
                columns.forEach((col, index) => {
                    let mysqlType = col.type.replace('INTEGER', 'INT').replace('TEXT', 'VARCHAR(255)');
                    createTableSQL += `${col.name} ${mysqlType}`;
                    if (col.pk) createTableSQL += ' PRIMARY KEY';
                    if (index < columns.length - 1) createTableSQL += ', ';
                });
                createTableSQL += ')';
                
                await mysqlConnection.execute(createTableSQL);
                
                // Copy data
                sqliteDb.all(`SELECT * FROM ${table.name}`, async (err, rows) => {
                    if (err) {
                        console.error(`Error reading data from ${table.name}:`, err);
                        return;
                    }
                    
                    for (const row of rows) {
                        const keys = Object.keys(row);
                        const values = Object.values(row);
                        const placeholders = keys.map(() => '?').join(', ');
                        
                        const insertSQL = `INSERT IGNORE INTO ${table.name} (${keys.join(', ')}) VALUES (${placeholders})`;
                        await mysqlConnection.execute(insertSQL, values);
                    }
                    
                    console.log(`✅ Migrated ${rows.length} rows from ${table.name}`);
                });
            });
        }
        
        console.log('🎉 Migration completed!');
        sqliteDb.close();
        mysqlConnection.end();
    });
}

migrate().catch(console.error);
EOF
    
    # Install mysql2 if not exists
    if ! npm list mysql2 &>/dev/null; then
        npm install mysql2
    fi
    
    print_warning "Data migration script created: migrate_to_mysql.js"
    print_info "Jalankan migrasi setelah konfigurasi selesai dengan: node migrate_to_mysql.js"
fi

# Update .env file
print_info "Update environment configuration..."
# Backup current .env
cp .env .env.backup

# Update .env with MySQL configuration
sed -i "s/DB_TYPE=sqlite/DB_TYPE=mysql/" .env
sed -i "s|SQLITE_PATH=.*|# SQLITE_PATH=./data/bot-kr.db|" .env

# Add MySQL configuration
cat >> .env << EOF

# MySQL Configuration
DB_HOST=localhost
DB_USER=botuser
DB_PASSWORD=$MYSQL_BOT_PASSWORD
DB_NAME=kakarama_room
DB_PORT=3306
EOF

# Configure MySQL for data retention
print_info "Configure MySQL for unlimited data retention..."
sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf > /dev/null << EOF

# WhatsApp Bot Kakarama Room - Data Retention Configuration
max_connections = 200
innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
query_cache_size = 64M

# Unlimited data retention
expire_logs_days = 0
max_binlog_size = 100M
EOF

sudo systemctl restart mysql

# Update backup cron
print_info "Update backup configuration..."
# Remove old SQLite backup
crontab -l | grep -v "bot-kr-" | crontab - 2>/dev/null || true
# Add MySQL backup
(crontab -l 2>/dev/null; echo "0 2 * * * mysqldump -u botuser -p'$MYSQL_BOT_PASSWORD' kakarama_room > $HOME/backup/kakarama-db-\$(date +%Y%m%d).sql") | crontab -

# Restart bot
print_info "Restart bot with new configuration..."
if command -v pm2 &> /dev/null; then
    pm2 restart kakarama-bot 2>/dev/null || true
fi

echo
print_success "🎉 MYSQL BERHASIL DIKONFIGURASI!"
echo
echo "📋 INFORMASI MYSQL:"
echo "  Database: kakarama_room"
echo "  User: botuser"
echo "  Host: localhost"
echo "  Credentials: mysql_credentials.txt"
echo
echo "🔄 MIGRASI DATA:"
if [ -f "data/bot-kr.db" ]; then
echo "  SQLite database ditemukan"
echo "  Jalankan migrasi: node migrate_to_mysql.js"
else
echo "  Tidak ada data SQLite untuk dimigrasi"
fi
echo
echo "💾 BACKUP:"
echo "  ✅ Auto backup MySQL harian jam 2:00 AM"
echo "  ✅ Data retention: UNLIMITED"
echo "  📁 Backup location: $HOME/backup/"
echo
echo "🔧 RESTART BOT:"
echo "  ./restart.sh"
echo
print_success "Konfigurasi MySQL selesai dengan data retention unlimited!"
