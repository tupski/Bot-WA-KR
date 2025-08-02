# Panduan Deployment Kakarama Room Dashboard di aaPanel

Panduan lengkap untuk deploy dashboard Kakarama Room menggunakan aaPanel dengan Node.js, Nginx, dan database.

## 📋 Prerequisites

### Server Requirements
- **VPS/Server** dengan minimal 2GB RAM, 2 CPU cores
- **OS**: Ubuntu 20.04/22.04 atau CentOS 7/8
- **Storage**: Minimal 20GB free space
- **Network**: Port 80, 443, 8888 (aaPanel) terbuka

### Domain & DNS
- Domain yang sudah pointing ke server IP
- SSL certificate (bisa menggunakan Let's Encrypt via aaPanel)

## 🚀 Step 1: Install aaPanel

### Ubuntu/Debian:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install aaPanel
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel
```

### CentOS:
```bash
# Update system
sudo yum update -y

# Install aaPanel
yum install -y wget && wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && sh install.sh aapanel
```

### Setelah Instalasi:
1. Catat URL, username, dan password yang ditampilkan
2. Akses aaPanel via browser: `http://your-server-ip:8888`
3. Login dengan credentials yang diberikan

## 🔧 Step 2: Setup Environment di aaPanel

### Install Required Software:
1. **Masuk ke aaPanel Dashboard**
2. **Go to App Store** → Install:
   - **Nginx** (latest version)
   - **Node.js** (version 18+)
   - **PM2** (untuk process management)
   - **MySQL** atau **PostgreSQL** (pilih salah satu)
   - **Redis** (optional, untuk caching)

### Setup Database:
1. **Go to Database** → **Add Database**
   - Database Name: `kakarama_room`
   - Username: `kakarama_user`
   - Password: `[strong-password]`
   - Access: `localhost` atau `%` (untuk remote access)

## 📁 Step 3: Upload dan Setup Project

### Upload Project Files:
1. **Go to File Manager**
2. Navigate ke `/www/wwwroot/`
3. Create folder: `kakarama-dashboard`
4. Upload project files atau clone dari Git:

```bash
# Via SSH/Terminal
cd /www/wwwroot/
git clone [your-repository-url] kakarama-dashboard
cd kakarama-dashboard
```

### Setup Environment Variables:
1. Copy `.env.example` ke `.env`:
```bash
cp webapp/.env.example webapp/.env
```

2. Edit `webapp/.env` file:
```bash
# Database Configuration
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kakarama_room
DB_USER=kakarama_user
DB_PASSWORD=[your-db-password]

# Server Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://yourdomain.com/api

# JWT Configuration
JWT_SECRET=[generate-strong-secret-32-chars]
JWT_REFRESH_SECRET=[generate-strong-refresh-secret-32-chars]
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WhatsApp Bot Integration
WHATSAPP_SESSION_PATH=../data/whatsapp-session
BOT_DATABASE_PATH=../data/bot-kr.db
```

## 🏗️ Step 4: Build dan Install Dependencies

### Backend Setup:
```bash
cd /www/wwwroot/kakarama-dashboard/webapp/backend
npm install --production
```

### Frontend Setup:
```bash
cd /www/wwwroot/kakarama-dashboard/webapp/frontend
npm install
npm run build
```

### Setup Database Schema:
```bash
cd /www/wwwroot/kakarama-dashboard
# Import database schema jika ada
mysql -u kakarama_user -p kakarama_room < database/init.sql
```

## 🌐 Step 5: Configure Nginx

### Create Website di aaPanel:
1. **Go to Website** → **Add Site**
   - Domain: `yourdomain.com`
   - Document Root: `/www/wwwroot/kakarama-dashboard/webapp/frontend/dist`
   - PHP Version: `Pure Static` atau `Disable`

### Configure Nginx:
1. **Click domain** → **Site Settings** → **Config File**
2. Replace dengan konfigurasi berikut:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (akan diatur otomatis oleh aaPanel)
    ssl_certificate /www/server/panel/vhost/cert/yourdomain.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/yourdomain.com/privkey.pem;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Root directory untuk frontend
    root /www/wwwroot/kakarama-dashboard/webapp/frontend/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # API routes ke backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files dengan caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Security - block sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
}
```

## 🔄 Step 6: Setup PM2 untuk Backend

### Install PM2 globally:
```bash
npm install -g pm2
```

### Create PM2 ecosystem file:
```bash
cd /www/wwwroot/kakarama-dashboard/webapp
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'kakarama-backend',
    script: './backend/server.js',
    cwd: '/www/wwwroot/kakarama-dashboard/webapp',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
}
```

### Start aplikasi dengan PM2:
```bash
# Create logs directory
mkdir -p /www/wwwroot/kakarama-dashboard/webapp/logs

# Start aplikasi
cd /www/wwwroot/kakarama-dashboard/webapp
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
# Jalankan command yang diberikan oleh PM2
```

## 🔒 Step 7: Setup SSL Certificate

### Via aaPanel (Let's Encrypt):
1. **Go to Website** → **Click domain** → **SSL**
2. **Let's Encrypt** → **Apply**
3. **Force HTTPS**: Enable
4. **HSTS**: Enable (optional)

### Manual SSL:
Jika menggunakan SSL certificate sendiri, upload ke:
- Certificate: `/www/server/panel/vhost/cert/yourdomain.com/fullchain.pem`
- Private Key: `/www/server/panel/vhost/cert/yourdomain.com/privkey.pem`

## 🔧 Step 8: Configure Firewall & Security

### aaPanel Security:
1. **Go to Security**
2. **Add rules**:
   - Port 80 (HTTP): Allow
   - Port 443 (HTTPS): Allow
   - Port 3001 (Backend): Deny (hanya internal)
   - Port 8888 (aaPanel): Allow (specific IP only)

### System Firewall:
```bash
# Ubuntu UFW
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8888/tcp  # aaPanel (restrict to your IP)
sudo ufw enable

# CentOS Firewalld
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8888/tcp
sudo firewall-cmd --reload
```

## 📊 Step 9: Monitoring & Maintenance

### Setup Monitoring di aaPanel:
1. **Go to Monitoring**
2. Enable:
   - **System Load**
   - **Memory Usage**
   - **Disk Usage**
   - **Network Traffic**

### PM2 Monitoring:
```bash
# Monitor aplikasi
pm2 monit

# View logs
pm2 logs kakarama-backend

# Restart aplikasi
pm2 restart kakarama-backend

# Status aplikasi
pm2 status
```

### Database Backup:
1. **Go to Database** → **Backup**
2. Setup **Automatic Backup**:
   - Frequency: Daily
   - Retention: 7 days
   - Time: 2:00 AM

## 🚀 Step 10: Testing & Verification

### Test Website:
1. **Frontend**: `https://yourdomain.com`
2. **API Health**: `https://yourdomain.com/api/health`
3. **Login**: Test authentication system

### Performance Test:
```bash
# Test response time
curl -w "@curl-format.txt" -o /dev/null -s "https://yourdomain.com"

# Test API
curl -X GET "https://yourdomain.com/api/system/status"
```

### Check Logs:
```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /www/wwwlogs/yourdomain.com.log

# System logs
tail -f /var/log/syslog
```

## 🔄 Step 11: Deployment Script

Create deployment script untuk update:

```bash
nano /www/wwwroot/kakarama-dashboard/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
git pull origin main

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd webapp/backend && npm install --production

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

# Build frontend
echo "🏗️ Building frontend..."
npm run build

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart kakarama-backend

echo "✅ Deployment completed!"
```

```bash
chmod +x /www/wwwroot/kakarama-dashboard/deploy.sh
```

## 🆘 Troubleshooting

### Common Issues:

**1. Backend tidak bisa start:**
```bash
# Check logs
pm2 logs kakarama-backend

# Check port
netstat -tulpn | grep 3001

# Restart
pm2 restart kakarama-backend
```

**2. Database connection error:**
```bash
# Test database connection
mysql -u kakarama_user -p -h localhost kakarama_room

# Check database service
systemctl status mysql
```

**3. Frontend tidak load:**
```bash
# Check Nginx config
nginx -t

# Restart Nginx
systemctl restart nginx

# Check file permissions
ls -la /www/wwwroot/kakarama-dashboard/webapp/frontend/dist/
```

**4. SSL issues:**
- Verify certificate files exist
- Check domain DNS pointing
- Renew Let's Encrypt if expired

### Performance Optimization:

**1. Enable Nginx caching:**
```nginx
# Add to nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**2. Database optimization:**
```sql
-- Add indexes for better performance
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_cs ON transactions(cs_name);
```

**3. PM2 cluster mode:**
```javascript
// ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

## 📞 Support

Jika mengalami masalah:
1. Check logs di PM2 dan Nginx
2. Verify database connection
3. Test API endpoints manually
4. Check firewall dan security settings

---

**Deployment berhasil!** 🎉
Dashboard Kakarama Room sekarang running di production dengan aaPanel.

## 📝 Quick Commands Reference

### aaPanel Management:
```bash
# Restart aaPanel
sudo /etc/init.d/bt restart

# Check aaPanel status
sudo /etc/init.d/bt status

# Reset aaPanel password
sudo /etc/init.d/bt 14
```

### Application Management:
```bash
# Update application
cd /www/wwwroot/kakarama-dashboard
./deploy.sh

# Check application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Restart all services
pm2 restart all
```

### Database Management:
```bash
# Backup database
mysqldump -u kakarama_user -p kakarama_room > backup.sql

# Restore database
mysql -u kakarama_user -p kakarama_room < backup.sql

# Check database size
mysql -u kakarama_user -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema='kakarama_room';"
```
