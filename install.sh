#!/bin/bash
# Script instalasi cepat WhatsApp Bot Kakarama Room untuk Ubuntu 22.04/24.04

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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "Jangan jalankan sebagai root! Gunakan: bash install.sh"
   exit 1
fi

echo "🚀 INSTALASI WHATSAPP BOT KAKARAMA ROOM"
echo "======================================"
echo "Ubuntu $(lsb_release -rs) - User: $(whoami)"
echo

# Quick setup
INSTALL_DIR="$HOME/whatsapp-bot"
print_info "Install directory: $INSTALL_DIR"

# Ask for MySQL installation
read -p "Install MySQL untuk database yang lebih robust? (y/n, default: y): " INSTALL_MYSQL
INSTALL_MYSQL=${INSTALL_MYSQL:-"y"}

# Update system
print_info "Update system..."
sudo apt update -y

# Install Node.js 20.x
print_info "Install Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2
print_info "Install PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install dependencies
print_info "Install dependencies..."
sudo apt install -y git sqlite3 ufw

# Create directories first
print_info "Create directories..."
mkdir -p "$INSTALL_DIR"/{logs,data,exports,session}
mkdir -p "$HOME/backup"

# Install MySQL if requested
if [[ "$INSTALL_MYSQL" =~ ^[Yy]$ ]]; then
    print_info "Install MySQL Server..."
    sudo apt install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql

    # Generate passwords
    MYSQL_ROOT_PASSWORD=$(openssl rand -base64 32)
    MYSQL_BOT_PASSWORD=$(openssl rand -base64 24)

    print_info "Configure MySQL..."
    sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS kakarama_room CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "CREATE USER IF NOT EXISTS 'botuser'@'localhost' IDENTIFIED BY '$MYSQL_BOT_PASSWORD';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "GRANT ALL PRIVILEGES ON kakarama_room.* TO 'botuser'@'localhost';"
    sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

    DB_TYPE="mysql"
    DB_CONFIG="DB_TYPE=mysql
DB_HOST=localhost
DB_USER=botuser
DB_PASSWORD=$MYSQL_BOT_PASSWORD
DB_NAME=kakarama_room
DB_PORT=3306"

    # Save credentials
    cat > "$INSTALL_DIR/mysql_credentials.txt" << EOF
MySQL Credentials:
Root Password: $MYSQL_ROOT_PASSWORD
Bot User: botuser
Bot Password: $MYSQL_BOT_PASSWORD
Database: kakarama_room
EOF
    chmod 600 "$INSTALL_DIR/mysql_credentials.txt"
    print_success "MySQL configured with unlimited data retention"
else
    DB_TYPE="sqlite"
    DB_CONFIG="DB_TYPE=sqlite
SQLITE_PATH=./data/bot-kr.db"
fi

cd "$INSTALL_DIR"

# Create package.json
print_info "Create project files..."
cat > package.json << 'EOF'
{
  "name": "whatsapp-bot-kakarama",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "whatsapp-web.js": "^1.23.0",
    "qrcode-terminal": "^0.12.0",
    "sqlite3": "^5.1.6",
    "nodemailer": "^6.9.4",
    "exceljs": "^4.4.0",
    "moment-timezone": "^0.5.43",
    "winston": "^3.10.0",
    "dotenv": "^16.3.1"
  }
}
EOF

# Create basic bot
cat > index.js << 'EOF'
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('🚀 WhatsApp Bot Kakarama Room Starting...');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './session' }),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('qr', qr => {
    console.log('📱 Scan QR Code:');
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => console.log('✅ Bot Ready!'));

client.on('message', async msg => {
    if (msg.body === '!ping') msg.reply('🏓 Pong!');
});

client.initialize();
EOF

# Create .env
cat > .env << EOF
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true

# Database Configuration
$DB_CONFIG

# Email Configuration (Edit sesuai kebutuhan)
EMAIL_ENABLED=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_TO=admin@kakarama.com

# Data Retention - Keep data forever
DATA_RETENTION_DAYS=0
AUTO_CLEANUP_ENABLED=false
BACKUP_RETENTION_DAYS=0

# Timezone
TIMEZONE=Asia/Jakarta
COMPANY_NAME=Kakarama Room
EOF

# Install npm packages
print_info "Install npm packages..."
npm install

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kakarama-bot',
    script: 'index.js',
    instances: 1,
    max_memory_restart: '1G',
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log'
  }]
};
EOF

# Create management scripts
cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting bot..."
pm2 start ecosystem.config.js
pm2 save
EOF

cat > stop.sh << 'EOF'
#!/bin/bash
echo "🛑 Stopping bot..."
pm2 stop kakarama-bot
EOF

cat > restart.sh << 'EOF'
#!/bin/bash
echo "🔄 Restarting bot..."
pm2 restart kakarama-bot
EOF

cat > logs.sh << 'EOF'
#!/bin/bash
echo "📋 Bot logs:"
pm2 logs kakarama-bot
EOF

chmod +x *.sh

# Setup firewall
print_info "Setup firewall..."
sudo ufw --force enable
sudo ufw allow ssh

# Setup backup cron
print_info "Setup backup..."
if [[ "$DB_TYPE" == "mysql" ]]; then
    (crontab -l 2>/dev/null; echo "0 2 * * * mysqldump -u botuser -p'$MYSQL_BOT_PASSWORD' kakarama_room > $HOME/backup/kakarama-db-\$(date +%Y%m%d).sql") | crontab -
else
    (crontab -l 2>/dev/null; echo "0 2 * * * cp $INSTALL_DIR/data/bot-kr.db $HOME/backup/bot-kr-\$(date +%Y%m%d).db") | crontab -
fi

echo
print_success "🎉 INSTALASI SELESAI!"
echo
echo "📋 CARA PENGGUNAAN:"
echo "  cd $INSTALL_DIR"
echo "  ./start.sh    # Start bot"
echo "  ./stop.sh     # Stop bot"
echo "  ./restart.sh  # Restart bot"
echo "  ./logs.sh     # View logs"
echo
echo "📱 UNTUK SCAN QR CODE:"
echo "  ./logs.sh"
echo "  Scan QR code dengan WhatsApp"
echo
if [[ "$DB_TYPE" == "mysql" ]]; then
echo "🗄️ DATABASE MYSQL:"
echo "  Database: kakarama_room"
echo "  Credentials: mysql_credentials.txt"
echo "  ✅ Data disimpan SELAMANYA (unlimited retention)"
else
echo "🗄️ DATABASE SQLITE:"
echo "  File: ./data/bot-kr.db"
echo "  ✅ Data disimpan SELAMANYA (unlimited retention)"
fi
echo
echo "⚙️ KONFIGURASI:"
echo "  Edit file .env untuk email dan pengaturan lain"
echo "  ✅ Auto backup harian jam 2:00 AM"
echo "  ✅ Data retention: UNLIMITED"
echo
print_success "Bot siap digunakan dengan penyimpanan data unlimited!"
