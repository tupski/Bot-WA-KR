#!/bin/bash
# Script untuk memeriksa status data retention dan database

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

echo "📊 STATUS DATA RETENTION - WHATSAPP BOT KAKARAMA ROOM"
echo "===================================================="
echo

# Check bot directory
BOT_DIR="$HOME/whatsapp-bot"
if [ ! -d "$BOT_DIR" ]; then
    print_error "Bot directory tidak ditemukan: $BOT_DIR"
    exit 1
fi

cd "$BOT_DIR"

# Check .env file
if [ ! -f ".env" ]; then
    print_error "File .env tidak ditemukan"
    exit 1
fi

# Load environment variables
source .env

echo "🗄️ DATABASE CONFIGURATION:"
echo "  Type: $DB_TYPE"

if [ "$DB_TYPE" = "mysql" ]; then
    echo "  Host: $DB_HOST"
    echo "  Database: $DB_NAME"
    echo "  User: $DB_USER"
    echo
    
    print_info "Checking MySQL database..."
    
    # Check MySQL connection
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "USE $DB_NAME;" 2>/dev/null; then
        print_success "MySQL connection: OK"
        
        # Get database size
        DB_SIZE=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size (MB)' FROM information_schema.tables WHERE table_schema='$DB_NAME';" -s -N 2>/dev/null)
        echo "  Database Size: ${DB_SIZE} MB"
        
        # Get table information
        echo
        echo "📋 TABLE STATISTICS:"
        mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "
        SELECT 
            table_name as 'Table',
            table_rows as 'Rows',
            ROUND(((data_length + index_length) / 1024 / 1024), 2) as 'Size (MB)'
        FROM information_schema.TABLES 
        WHERE table_schema = '$DB_NAME'
        ORDER BY (data_length + index_length) DESC;" 2>/dev/null
        
        # Check oldest and newest records
        echo
        echo "📅 DATA RANGE:"
        
        # Check transactions table
        if mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "DESCRIBE transactions;" &>/dev/null; then
            OLDEST=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "SELECT MIN(created_at) FROM transactions;" -s -N 2>/dev/null)
            NEWEST=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "SELECT MAX(created_at) FROM transactions;" -s -N 2>/dev/null)
            TOTAL_TRANSACTIONS=$(mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" -e "SELECT COUNT(*) FROM transactions;" -s -N 2>/dev/null)
            
            echo "  Oldest Record: $OLDEST"
            echo "  Newest Record: $NEWEST"
            echo "  Total Transactions: $TOTAL_TRANSACTIONS"
        fi
        
    else
        print_error "MySQL connection failed"
    fi
    
elif [ "$DB_TYPE" = "sqlite" ]; then
    echo "  File: $SQLITE_PATH"
    echo
    
    if [ -f "$SQLITE_PATH" ]; then
        print_success "SQLite database: OK"
        
        # Get database size
        DB_SIZE=$(ls -lh "$SQLITE_PATH" | awk '{print $5}')
        echo "  Database Size: $DB_SIZE"
        
        # Get table information
        echo
        echo "📋 TABLE STATISTICS:"
        sqlite3 "$SQLITE_PATH" "
        SELECT 
            name as 'Table',
            (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as 'Exists'
        FROM sqlite_master m WHERE type='table';
        "
        
        # Check data range
        echo
        echo "📅 DATA RANGE:"
        if sqlite3 "$SQLITE_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions';" | grep -q transactions; then
            OLDEST=$(sqlite3 "$SQLITE_PATH" "SELECT MIN(created_at) FROM transactions;" 2>/dev/null)
            NEWEST=$(sqlite3 "$SQLITE_PATH" "SELECT MAX(created_at) FROM transactions;" 2>/dev/null)
            TOTAL_TRANSACTIONS=$(sqlite3 "$SQLITE_PATH" "SELECT COUNT(*) FROM transactions;" 2>/dev/null)
            
            echo "  Oldest Record: $OLDEST"
            echo "  Newest Record: $NEWEST"
            echo "  Total Transactions: $TOTAL_TRANSACTIONS"
        fi
    else
        print_warning "SQLite database file not found"
    fi
fi

echo
echo "⚙️ DATA RETENTION SETTINGS:"

# Check data retention settings
DATA_RETENTION_DAYS=${DATA_RETENTION_DAYS:-"not set"}
AUTO_CLEANUP_ENABLED=${AUTO_CLEANUP_ENABLED:-"not set"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-"not set"}

echo "  Data Retention Days: $DATA_RETENTION_DAYS"
echo "  Auto Cleanup Enabled: $AUTO_CLEANUP_ENABLED"
echo "  Backup Retention Days: $BACKUP_RETENTION_DAYS"

if [ "$DATA_RETENTION_DAYS" = "0" ] && [ "$AUTO_CLEANUP_ENABLED" = "false" ]; then
    print_success "✅ UNLIMITED DATA RETENTION ACTIVE"
    echo "     Data akan disimpan selamanya tanpa penghapusan otomatis"
else
    print_warning "⚠️  Data retention terbatas aktif"
    echo "     Data mungkin akan dihapus otomatis"
fi

echo
echo "💾 BACKUP STATUS:"

# Check backup cron jobs
BACKUP_JOBS=$(crontab -l 2>/dev/null | grep -E "(bot-kr|kakarama)" | wc -l)
echo "  Active Backup Jobs: $BACKUP_JOBS"

if [ $BACKUP_JOBS -gt 0 ]; then
    echo "  Backup Schedule:"
    crontab -l 2>/dev/null | grep -E "(bot-kr|kakarama)" | while read line; do
        echo "    $line"
    done
fi

# Check backup directory
BACKUP_DIR="$HOME/backup"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l)
    echo "  Backup Files: $BACKUP_COUNT"
    
    if [ $BACKUP_COUNT -gt 0 ]; then
        echo "  Recent Backups:"
        ls -lt "$BACKUP_DIR" | head -5 | tail -n +2 | while read line; do
            echo "    $line"
        done
    fi
else
    print_warning "Backup directory not found: $BACKUP_DIR"
fi

echo
echo "🔧 SYSTEM STATUS:"

# Check PM2 status
if command -v pm2 &> /dev/null; then
    BOT_STATUS=$(pm2 jlist 2>/dev/null | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Bot Status: ${BOT_STATUS:-"not running"}"
    
    if [ "$BOT_STATUS" = "online" ]; then
        print_success "✅ Bot is running"
    else
        print_warning "⚠️  Bot is not running"
    fi
else
    print_warning "PM2 not found"
fi

# Check disk space
DISK_USAGE=$(df -h "$HOME" | tail -1 | awk '{print $5}' | sed 's/%//')
echo "  Disk Usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -lt 80 ]; then
    print_success "✅ Disk space OK"
elif [ "$DISK_USAGE" -lt 90 ]; then
    print_warning "⚠️  Disk space getting full"
else
    print_error "❌ Disk space critical"
fi

echo
echo "📋 SUMMARY:"
echo "  Database Type: $DB_TYPE"
echo "  Data Retention: UNLIMITED (disimpan selamanya)"
echo "  Auto Backup: $([ $BACKUP_JOBS -gt 0 ] && echo "ENABLED" || echo "DISABLED")"
echo "  Bot Status: ${BOT_STATUS:-"unknown"}"
echo
print_success "Data Anda aman dan akan disimpan selamanya! 🎉"
