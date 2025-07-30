# 🚀 Panduan Instalasi WhatsApp Bot Kakarama Room

Panduan lengkap instalasi otomatis untuk Ubuntu 22.04 dan 24.04.

## 📋 Prasyarat

### Sistem Requirements
- **OS**: Ubuntu 22.04 LTS atau 24.04 LTS
- **RAM**: Minimum 2GB (Recommended 4GB)
- **Storage**: Minimum 10GB free space
- **Network**: Koneksi internet stabil

### Akses Requirements
- **User**: Non-root user dengan sudo privileges
- **SSH**: Akses SSH ke server (jika remote)
- **WhatsApp**: Akun WhatsApp untuk bot

## 🎯 Instalasi Cepat (Recommended)

### Metode 1: One-Line Install (dengan MySQL)
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/bot-kr/main/deploy-server.sh | bash
```

### Metode 2: Quick Install (SQLite/MySQL pilihan)
```bash
curl -fsSL https://raw.githubusercontent.com/your-repo/bot-kr/main/install.sh | bash
```

### Metode 3: Download & Run
```bash
wget https://raw.githubusercontent.com/your-repo/bot-kr/main/install.sh
chmod +x install.sh
./install.sh
```

### Metode 4: Manual Download
```bash
git clone https://github.com/your-repo/bot-kr.git
cd bot-kr
chmod +x install.sh
./install.sh
```

## 🔧 Instalasi Manual (Advanced)

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PM2
```bash
sudo npm install -g pm2
```

### 4. Install Dependencies
```bash
sudo apt install -y git sqlite3 ufw fail2ban
```

### 5. Create Project
```bash
mkdir -p ~/whatsapp-bot
cd ~/whatsapp-bot
```

### 6. Setup Project Files
```bash
# Download project files atau copy manual
npm init -y
npm install whatsapp-web.js qrcode-terminal sqlite3 nodemailer exceljs moment-timezone winston dotenv
```

### 7. Configure Environment
```bash
cp .env.example .env
# Edit .env sesuai kebutuhan
```

### 8. Start Bot
```bash
pm2 start index.js --name kakarama-bot
pm2 save
pm2 startup
```

## ⚙️ Konfigurasi Post-Install

### 1. Edit Environment Variables
```bash
cd ~/whatsapp-bot
nano .env
```

**Konfigurasi Email:**
```env
EMAIL_ENABLED=true
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=admin@kakarama.com
```

**Konfigurasi Database (SQLite):**
```env
DB_TYPE=sqlite
SQLITE_PATH=./data/bot-kr.db
```

**Konfigurasi Database (MySQL):**
```env
DB_TYPE=mysql
DB_HOST=localhost
DB_USER=botuser
DB_PASSWORD=your_mysql_password
DB_NAME=kakarama_room
DB_PORT=3306
```

**Data Retention (Unlimited):**
```env
DATA_RETENTION_DAYS=0
AUTO_CLEANUP_ENABLED=false
BACKUP_RETENTION_DAYS=0
```

### 2. Setup Gmail App Password
1. Buka [Google Account Settings](https://myaccount.google.com/)
2. Security → 2-Step Verification → App passwords
3. Generate password untuk "Mail"
4. Copy password ke `EMAIL_PASS` di .env

### 3. Configure Firewall
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 22/tcp
sudo ufw status
```

## 📱 Menjalankan Bot

### Start Bot
```bash
cd ~/whatsapp-bot
./start.sh
```

### View Logs & QR Code
```bash
./logs.sh
# Scan QR code yang muncul dengan WhatsApp
```

### Management Commands
```bash
./start.sh    # Start bot
./stop.sh     # Stop bot
./restart.sh  # Restart bot
./logs.sh     # View logs
```

### PM2 Commands
```bash
pm2 status           # Check status
pm2 logs kakarama-bot # View logs
pm2 restart kakarama-bot # Restart
pm2 stop kakarama-bot    # Stop
pm2 delete kakarama-bot  # Delete
```

## 🔍 Troubleshooting

### Bot tidak start
```bash
# Check logs
pm2 logs kakarama-bot

# Check Node.js version
node --version  # Should be v20.x

# Reinstall dependencies
cd ~/whatsapp-bot
npm install
```

### QR Code tidak muncul
```bash
# Check logs
./logs.sh

# Restart bot
./restart.sh

# Check puppeteer
npm list puppeteer
```

### Database error
```bash
# Check database file
ls -la ~/whatsapp-bot/data/

# Check permissions
chmod 755 ~/whatsapp-bot/data/
```

### Email tidak terkirim
```bash
# Test email configuration
node -e "console.log(require('dotenv').config()); console.log(process.env.EMAIL_USER);"

# Check Gmail app password
# Regenerate app password jika perlu
```

## 🗄️ Database Management

### Upgrade ke MySQL (untuk instalasi SQLite)
```bash
cd ~/whatsapp-bot
wget https://raw.githubusercontent.com/your-repo/bot-kr/main/configure-mysql.sh
chmod +x configure-mysql.sh
./configure-mysql.sh
```

### Check Data Retention Status
```bash
cd ~/whatsapp-bot
wget https://raw.githubusercontent.com/your-repo/bot-kr/main/check-data-retention.sh
chmod +x check-data-retention.sh
./check-data-retention.sh
```

### Manual Database Backup
```bash
# SQLite backup
cp ~/whatsapp-bot/data/bot-kr.db ~/backup/bot-kr-$(date +%Y%m%d).db

# MySQL backup
mysqldump -u botuser -p kakarama_room > ~/backup/kakarama-db-$(date +%Y%m%d).sql
```

## 📊 Monitoring & Maintenance

### Real-time Monitoring
```bash
pm2 monit
```

### System Status
```bash
# Check system resources
htop
df -h
free -h

# Check bot status
pm2 status

# Check data retention status
./check-data-retention.sh
```

### Log Management
```bash
# View recent logs
tail -f ~/whatsapp-bot/logs/combined.log

# Clear old logs
pm2 flush kakarama-bot
```

### Database Maintenance
```bash
# MySQL optimization (if using MySQL)
mysql -u botuser -p -e "OPTIMIZE TABLE transactions, cs_summary, daily_summary;" kakarama_room

# SQLite optimization (if using SQLite)
sqlite3 ~/whatsapp-bot/data/bot-kr.db "VACUUM;"
```

## 🔒 Security Best Practices

### 1. Firewall Configuration
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw deny 80/tcp
sudo ufw deny 443/tcp
```

### 2. SSH Hardening
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
Port 2222
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
```

### 3. Fail2ban Setup
```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Node.js updates
npm update -g

# Bot dependencies
cd ~/whatsapp-bot
npm update
```

## 📋 Checklist Post-Install

- [ ] ✅ Bot berhasil diinstall
- [ ] ✅ QR Code berhasil di-scan
- [ ] ✅ Bot merespon `!ping` dengan `🏓 Pong!`
- [ ] ✅ Environment variables dikonfigurasi
- [ ] ✅ Email configuration setup
- [ ] ✅ Firewall enabled
- [ ] ✅ Backup cron job active
- [ ] ✅ PM2 startup configured
- [ ] ✅ Log rotation setup

## 🆘 Support

### Jika mengalami masalah:

1. **Check logs**: `./logs.sh`
2. **Restart bot**: `./restart.sh`
3. **Check system**: `pm2 monit`
4. **Verify config**: `cat .env`
5. **Test connectivity**: `ping google.com`

### Common Issues:

| **Problem** | **Solution** |
|-------------|--------------|
| QR Code tidak muncul | Restart bot, check logs |
| Bot tidak merespon | Check WhatsApp connection |
| Email tidak terkirim | Verify Gmail app password |
| Database error | Check file permissions |
| High memory usage | Restart bot, check for memory leaks |

## 📞 Contact

Untuk support teknis dan pertanyaan instalasi, hubungi tim development Kakarama Room.

---

**Note**: Pastikan server memiliki koneksi internet stabil untuk operasi WhatsApp Web yang optimal.
