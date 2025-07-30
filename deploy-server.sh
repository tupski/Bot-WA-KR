#!/bin/bash
# Script instalasi otomatis WhatsApp Bot Kakarama Room untuk Ubuntu 22.04/24.04

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Script ini tidak boleh dijalankan sebagai root!"
   print_status "Jalankan dengan: bash install.sh"
   exit 1
fi

# Check Ubuntu version
print_status "Checking Ubuntu version..."
UBUNTU_VERSION=$(lsb_release -rs)
if [[ "$UBUNTU_VERSION" != "22.04" && "$UBUNTU_VERSION" != "24.04" ]]; then
    print_warning "Script ini dioptimalkan untuk Ubuntu 22.04 atau 24.04"
    print_warning "Versi Anda: Ubuntu $UBUNTU_VERSION"
    read -p "Lanjutkan instalasi? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo
echo "🚀 INSTALASI OTOMATIS WHATSAPP BOT KAKARAMA ROOM"
echo "================================================="
echo "Ubuntu Version: $UBUNTU_VERSION"
echo "User: $(whoami)"
echo "Date: $(date)"
echo

# Prompt for configuration
print_status "Konfigurasi instalasi..."
read -p "📧 Email untuk laporan (contoh: admin@kakarama.com): " EMAIL_USER
read -p "📧 Email tujuan laporan (contoh: laporan@kakarama.com): " EMAIL_TO
read -s -p "🔑 Gmail App Password: " EMAIL_PASS
echo
read -p "📂 Install di direktori (default: /home/$(whoami)/whatsapp-bot): " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-"/home/$(whoami)/whatsapp-bot"}
read -p "🗄️  Install MySQL? (y/n, default: n): " INSTALL_MYSQL
INSTALL_MYSQL=${INSTALL_MYSQL:-"n"}

echo
print_status "Konfigurasi:"
echo "  - Install Directory: $INSTALL_DIR"
echo "  - Email User: $EMAIL_USER"
echo "  - Email To: $EMAIL_TO"
echo "  - Install MySQL: $INSTALL_MYSQL"
echo

read -p "Lanjutkan instalasi? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Instalasi dibatalkan"
    exit 1
fi

# Update system
print_status "Update system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

# Install essential packages
print_status "Install essential packages..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates lsb-release
print_success "Essential packages installed"

# Install Node.js 20.x LTS
print_status "Install Node.js 20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installed: $NODE_VERSION, npm: $NPM_VERSION"

# Install PM2
print_status "Install PM2..."
sudo npm install -g pm2
PM2_VERSION=$(pm2 --version)
print_success "PM2 installed: $PM2_VERSION"

# Install Git
print_status "Install Git..."
sudo apt install -y git
GIT_VERSION=$(git --version)
print_success "Git installed: $GIT_VERSION"

# Install additional dependencies
print_status "Install additional dependencies..."
sudo apt install -y build-essential python3-pip sqlite3 htop iotop ufw fail2ban
print_success "Additional dependencies installed"

# Install MySQL if requested
if [[ "$INSTALL_MYSQL" =~ ^[Yy]$ ]]; then
    print_status "Install MySQL Server..."
    sudo apt install -y mysql-server

    # Start MySQL service
    sudo systemctl start mysql
    sudo systemctl enable mysql

    # Generate random password for MySQL
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
    MYSQL_BOT_PASSWORD=$(openssl rand -base64 24)

    print_status "Configure MySQL security..."
    # Set root password and secure installation
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    print_status "Create database and user for bot..."
    # Create database and user for bot
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS kakarama_room CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS 'botuser'@'localhost' IDENTIFIED BY '$MYSQL_BOT_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON kakarama_room.* TO 'botuser'@'localhost';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    # Save MySQL credentials
    cat > "$INSTALL_DIR/mysql_credentials.txt" << EOF
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

IMPORTANT: Keep this file secure and backup these credentials!
EOF
    chmod 600 "$INSTALL_DIR/mysql_credentials.txt"

    # Configure MySQL for better performance and data retention
    print_status "Configure MySQL for data retention..."
    sudo tee -a /etc/mysql/mysql.conf.d/mysqld.cnf > /dev/null << EOF

# WhatsApp Bot Kakarama Room Configuration
# Data retention and performance settings
max_connections = 200
innodb_buffer_pool_size = 512M
innodb_log_file_size = 128M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 64M
query_cache_type = 1

# Disable binary logging to save space (optional)
# skip-log-bin

# Data retention settings - keep data forever
expire_logs_days = 0
max_binlog_size = 100M
EOF

    sudo systemctl restart mysql

    print_success "MySQL Server configured with database 'kakarama_room'"
    print_success "Credentials saved to: $INSTALL_DIR/mysql_credentials.txt"

    # Update DB_TYPE to mysql in environment
    DB_TYPE="mysql"
    DB_HOST="localhost"
    DB_USER="botuser"
    DB_PASSWORD="$MYSQL_BOT_PASSWORD"
    DB_NAME="kakarama_room"
else
    DB_TYPE="sqlite"
    DB_HOST=""
    DB_USER=""
    DB_PASSWORD=""
    DB_NAME=""
fi

# Setup firewall
print_status "Setup UFW firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 22/tcp
sudo ufw status
print_success "Firewall configured"

# Create installation directory
print_status "Create installation directory..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/logs"
mkdir -p "$INSTALL_DIR/data"
mkdir -p "$INSTALL_DIR/exports"
mkdir -p "$INSTALL_DIR/session"
mkdir -p "$HOME/backup"
print_success "Directories created"

# Clone or download bot source code
print_status "Setup bot source code..."
cd "$INSTALL_DIR"

# Create basic bot structure if not exists
if [ ! -f "package.json" ]; then
    print_status "Creating bot project structure..."

    # Create package.json
    cat > package.json << 'EOF'
{
  "name": "whatsapp-bot-kakarama",
  "version": "1.0.0",
  "description": "WhatsApp Bot untuk Kakarama Room",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "node test/test.js"
  },
  "dependencies": {
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0",
    "sqlite3": "^5.1.6",
    "mysql2": "^3.6.0",
    "nodemailer": "^6.9.4",
    "exceljs": "^4.4.0",
    "moment-timezone": "^0.5.43",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

    # Create basic index.js
    cat > index.js << 'EOF'
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 Starting WhatsApp Bot Kakarama Room...');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('📱 Scan QR Code berikut dengan WhatsApp:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('✅ Bot siap digunakan!');
});

client.on('message', async (message) => {
    if (message.body === '!ping') {
        message.reply('🏓 Pong! Bot aktif.');
    }
});

client.initialize();
EOF

    print_success "Basic bot structure created"
fi

# Install dependencies
print_status "Install Node.js dependencies..."
npm install
print_success "Dependencies installed"

# Create .env file
print_status "Create environment configuration..."
cat > .env << EOF
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true

# Database Configuration
DB_TYPE=$DB_TYPE
SQLITE_PATH=./data/bot-kr.db

# MySQL Configuration
DB_HOST=$DB_HOST
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_PORT=3306

# Email Configuration
EMAIL_ENABLED=true
EMAIL_USER=$EMAIL_USER
EMAIL_PASS=$EMAIL_PASS
EMAIL_TO=$EMAIL_TO

# Logging Configuration
LOG_LEVEL=info
LOG_ENABLE_FILE=true
LOG_MAX_FILES=10
LOG_MAX_SIZE=50m

# Data Retention Configuration
# Keep all data forever - no automatic cleanup
DATA_RETENTION_DAYS=0
AUTO_CLEANUP_ENABLED=false
BACKUP_RETENTION_DAYS=0

# Timezone Configuration
TIMEZONE=Asia/Jakarta

# Company Configuration
COMPANY_NAME=Kakarama Room
EOF

print_success "Environment file created"

# Setup PM2 ecosystem
print_status "Setup PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-bot-kakarama',
    script: 'index.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Start bot with PM2
print_status "Start bot with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup | grep -E '^sudo' | bash || true
print_success "Bot started with PM2"

# Setup log rotation
print_status "Setup log rotation..."
sudo tee /etc/logrotate.d/whatsapp-bot-kakarama > /dev/null << EOF
$INSTALL_DIR/logs/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 $(whoami) $(whoami)
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
print_success "Log rotation configured"

# Setup backup cron
print_status "Setup automated backup..."
if [[ "$DB_TYPE" == "mysql" ]]; then
    # MySQL backup
    (crontab -l 2>/dev/null; echo "0 2 * * * mysqldump -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > $HOME/backup/kakarama-db-\$(date +\\%Y\\%m\\%d).sql") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * * find $HOME/backup -name 'kakarama-db-*.sql' -mtime +30 -delete") | crontab -
else
    # SQLite backup
    (crontab -l 2>/dev/null; echo "0 2 * * * cp $INSTALL_DIR/data/bot-kr.db $HOME/backup/bot-kr-\$(date +\\%Y\\%m\\%d).db") | crontab -
fi
# Health check - restart if not responding
(crontab -l 2>/dev/null; echo "*/5 * * * * pm2 ping whatsapp-bot-kakarama || pm2 restart whatsapp-bot-kakarama") | crontab -
# Weekly log cleanup (keep logs but compress old ones)
(crontab -l 2>/dev/null; echo "0 1 * * 0 find $INSTALL_DIR/logs -name '*.log' -mtime +7 -exec gzip {} \\;") | crontab -
print_success "Backup and maintenance cron configured"

# Create monitoring script
print_status "Create monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "=== WhatsApp Bot Kakarama Room Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Disk Usage: $(df -h $HOME)"
echo "Memory Usage: $(free -h)"
echo
echo "PM2 Status:"
pm2 status
echo
echo "Recent Logs (last 20 lines):"
tail -n 20 logs/combined.log
echo
echo "Database Info:"
if [ "$DB_TYPE" = "mysql" ]; then
    echo "MySQL Database: $DB_NAME"
    mysql -u $DB_USER -p'$DB_PASSWORD' -e "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null || echo "Database connection error"
else
    if [ -f "data/bot-kr.db" ]; then
        echo "SQLite Database: $(ls -lh data/bot-kr.db)"
    else
        echo "Database not found"
    fi
fi
EOF
chmod +x monitor.sh
print_success "Monitoring script created"

# Create management scripts
print_status "Create management scripts..."

# Start script
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting WhatsApp Bot Kakarama Room..."
pm2 start ecosystem.config.js
pm2 save
echo "✅ Bot started!"
EOF
chmod +x start.sh

# Stop script
cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping WhatsApp Bot Kakarama Room..."
pm2 stop whatsapp-bot-kakarama
echo "✅ Bot stopped!"
EOF
chmod +x stop.sh

# Restart script
cat > restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting WhatsApp Bot Kakarama Room..."
pm2 restart whatsapp-bot-kakarama
echo "✅ Bot restarted!"
EOF
chmod +x restart.sh

# Status script
cat > status.sh << 'EOF'
#!/bin/bash
echo "📊 WhatsApp Bot Kakarama Room Status:"
pm2 status whatsapp-bot-kakarama
echo
echo "📋 Recent logs:"
pm2 logs whatsapp-bot-kakarama --lines 10
EOF
chmod +x status.sh

print_success "Management scripts created"

# Setup fail2ban for additional security
print_status "Configure fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_success "Fail2ban configured"

# Final setup
print_status "Final setup..."
chmod 755 "$INSTALL_DIR"
chmod -R 755 "$INSTALL_DIR/logs"
chmod -R 755 "$INSTALL_DIR/data"

echo
print_success "🎉 INSTALASI SELESAI!"
echo
echo "📋 INFORMASI INSTALASI:"
echo "  📂 Install Directory: $INSTALL_DIR"
echo "  👤 User: $(whoami)"
echo "  🐧 Ubuntu Version: $UBUNTU_VERSION"
echo "  📦 Node.js: $(node --version)"
echo "  🔧 PM2: $(pm2 --version)"
echo
echo "🚀 CARA MENJALANKAN BOT:"
echo "  cd $INSTALL_DIR"
echo "  ./start.sh          # Start bot"
echo "  ./stop.sh           # Stop bot"
echo "  ./restart.sh        # Restart bot"
echo "  ./status.sh         # Check status"
echo "  ./monitor.sh        # Full monitoring"
echo
echo "📱 SCAN QR CODE:"
echo "  pm2 logs whatsapp-bot-kakarama"
echo "  Scan QR code yang muncul dengan WhatsApp"
echo
echo "📊 MONITORING:"
echo "  pm2 monit           # Real-time monitoring"
echo "  pm2 logs            # View logs"
echo "  ./monitor.sh        # System status"
echo
echo "📧 KONFIGURASI EMAIL:"
echo "  Email User: $EMAIL_USER"
echo "  Email To: $EMAIL_TO"
echo "  ✅ Sudah dikonfigurasi otomatis"
echo
if [[ "$DB_TYPE" == "mysql" ]]; then
echo "�️ DATABASE MYSQL:"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  ✅ Credentials saved to: mysql_credentials.txt"
echo "  ✅ Data retention: UNLIMITED (disimpan selamanya)"
echo "  ✅ Auto backup: Daily at 2:00 AM"
else
echo "🗄️ DATABASE SQLITE:"
echo "  File: ./data/bot-kr.db"
echo "  ✅ Data retention: UNLIMITED (disimpan selamanya)"
echo "  ✅ Auto backup: Daily at 2:00 AM"
fi
echo
echo "�🔒 KEAMANAN:"
echo "  ✅ UFW Firewall enabled"
echo "  ✅ Fail2ban configured"
echo "  ✅ Log rotation setup"
echo "  ✅ Automated backup & maintenance"
echo "  ✅ Data retention: UNLIMITED"
echo
echo "📝 FILE PENTING:"
echo "  📄 $INSTALL_DIR/.env              # Environment config"
echo "  📄 $INSTALL_DIR/ecosystem.config.js # PM2 config"
echo "  📁 $INSTALL_DIR/logs/             # Log files"
echo "  📁 $INSTALL_DIR/data/             # Database"
echo "  📁 $HOME/backup/                  # Backup files"
echo
print_success "Bot siap digunakan! Jalankan: cd $INSTALL_DIR && ./start.sh"
