# Deployment Guide - Kakarama Room System

Panduan lengkap untuk deploy sistem Kakarama Room ke production server.

## 🏗️ Arsitektur Production

```
Internet
    │
    ▼
┌─────────────┐
│   Nginx     │ ← Reverse Proxy + SSL
│  (Port 80)  │
└─────────────┘
    │
    ▼
┌─────────────┐
│   Laravel   │ ← Web Application
│  (Port 8000)│
└─────────────┘
    │
    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   MySQL     │    │    Redis    │    │ WhatsApp Bot│
│  (Port 3306)│    │  (Port 6379)│    │ (Internal)  │
└─────────────┘    └─────────────┘    └─────────────┘
```

## 📋 Server Requirements

### Minimum Specifications
- **OS**: Ubuntu 20.04 LTS atau CentOS 8+
- **CPU**: 2 vCPU
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **Network**: 100 Mbps

### Recommended Specifications
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4 vCPU
- **RAM**: 8GB
- **Storage**: 100GB SSD
- **Network**: 1 Gbps

### Software Requirements
- Docker 24.0+
- Docker Compose 2.0+
- Nginx 1.18+
- Certbot (untuk SSL)
- Git

## 🚀 Production Deployment

### 1. Server Setup

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip
```

#### Install Docker
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. Application Deployment

#### Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-repo/kakarama-room.git
sudo chown -R $USER:$USER kakarama-room
cd kakarama-room
```

#### Setup Environment Files
```bash
# Copy environment templates
cp .env.production .env
cp laravel-app/.env.production laravel-app/.env
cp whatsapp-bot/.env.production whatsapp-bot/.env
```

#### Configure Production Environment
Edit `.env`:
```env
# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_HOST=mysql
DB_DATABASE=kakarama_room_prod
DB_USERNAME=kakarama_user
DB_PASSWORD=your-secure-password

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=your-redis-password

# Pusher/WebSocket
PUSHER_APP_ID=your-pusher-app-id
PUSHER_APP_KEY=your-pusher-key
PUSHER_APP_SECRET=your-pusher-secret

# Bot
BOT_API_TOKEN=your-very-secure-bot-token

# Mail
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-email-password
```

#### Build and Start Services
```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check services status
docker-compose -f docker-compose.prod.yml ps
```

#### Setup Database
```bash
# Run migrations
docker-compose -f docker-compose.prod.yml exec laravel php artisan migrate --force

# Create admin user
docker-compose -f docker-compose.prod.yml exec laravel php artisan db:seed --class=AdminUserSeeder

# Optimize Laravel
docker-compose -f docker-compose.prod.yml exec laravel php artisan optimize
```

### 3. Nginx Configuration

#### Create Nginx Config
```bash
sudo nano /etc/nginx/sites-available/kakarama-room
```

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Main Location
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API Rate Limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Login Rate Limiting
    location /api/v1/auth/login {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static Files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        proxy_pass http://127.0.0.1:8000;
    }
    
    # WebSocket Support (if using Soketi)
    location /app/ {
        proxy_pass http://127.0.0.1:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/kakarama-room /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate Setup

#### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

#### Obtain SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

#### Setup Auto-renewal
```bash
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 5. WhatsApp Bot Setup

#### First Time Authentication
```bash
# View bot logs to see QR code
docker-compose -f docker-compose.prod.yml logs -f whatsapp-bot

# Scan QR code with WhatsApp on your phone
# Wait for "WhatsApp client is ready!" message
```

#### Verify Bot Status
```bash
# Check if bot is running
curl -H "Authorization: Bearer your-bot-token" \
     https://your-domain.com/api/v1/bot/status
```

## 🔧 Production Configuration

### Docker Compose Production
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  laravel:
    build:
      context: ./laravel-app
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
    volumes:
      - ./laravel-app:/var/www/html
      - laravel_storage:/var/www/html/storage
    depends_on:
      - mysql
      - redis
    restart: unless-stopped

  whatsapp-bot:
    build:
      context: ./whatsapp-bot
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    volumes:
      - ./whatsapp-bot:/app
      - bot_sessions:/app/sessions
    depends_on:
      - laravel
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USERNAME}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:
  laravel_storage:
  bot_sessions:
```

### Laravel Production Dockerfile
Create `laravel-app/Dockerfile.prod`:
```dockerfile
FROM php:8.3-fpm-alpine

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    oniguruma-dev \
    libxml2-dev \
    zip \
    unzip \
    nginx \
    supervisor

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader

# Set permissions
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Copy nginx config
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
```

## 📊 Monitoring & Maintenance

### Health Checks
```bash
# System health check script
#!/bin/bash
echo "=== Kakarama Room Health Check ==="

# Check services
docker-compose -f docker-compose.prod.yml ps

# Check application health
curl -f https://your-domain.com/api/health || echo "❌ Application health check failed"

# Check bot status
curl -f -H "Authorization: Bearer your-bot-token" \
     https://your-domain.com/api/v1/bot/status || echo "❌ Bot health check failed"

# Check disk space
df -h

# Check memory usage
free -h

# Check logs for errors
docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error
```

### Backup Strategy

#### Database Backup
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.prod.yml exec -T mysql \
    mysqldump -u root -p$DB_ROOT_PASSWORD kakarama_room_prod \
    > $BACKUP_DIR/db_backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

#### Application Backup
```bash
#!/bin/bash
# backup-app.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

# Backup bot sessions
tar -czf $BACKUP_DIR/bot_sessions_$DATE.tar.gz \
    -C /opt/kakarama-room/whatsapp-bot sessions/

# Backup uploaded files
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz \
    -C /opt/kakarama-room/laravel-app storage/app/public/
```

#### Automated Backups
```bash
# Add to crontab
sudo crontab -e

# Daily database backup at 2 AM
0 2 * * * /opt/scripts/backup-db.sh

# Weekly application backup on Sunday at 3 AM
0 3 * * 0 /opt/scripts/backup-app.sh
```

### Log Management
```bash
# Setup log rotation
sudo nano /etc/logrotate.d/kakarama-room

/opt/kakarama-room/laravel-app/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### Performance Monitoring

#### System Monitoring Script
```bash
#!/bin/bash
# monitor.sh
echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4"%"}'

echo "Memory Usage:"
free | grep Mem | awk '{printf "%.2f%%\n", $3/$2 * 100.0}'

echo "Disk Usage:"
df -h / | awk 'NR==2{printf "%s\n", $5}'

echo "=== Docker Stats ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo "=== Application Metrics ==="
curl -s https://your-domain.com/api/health | jq .
```

### Security Hardening

#### Firewall Setup
```bash
# Install UFW
sudo apt install -y ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

#### Fail2Ban Setup
```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure Fail2Ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

## 🚨 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -h

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

#### Database Connection Issues
```bash
# Check MySQL status
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p -e "SHOW PROCESSLIST;"

# Check Laravel database config
docker-compose -f docker-compose.prod.yml exec laravel php artisan config:show database
```

#### WhatsApp Bot Issues
```bash
# Check bot logs
docker-compose -f docker-compose.prod.yml logs whatsapp-bot

# Restart bot
docker-compose -f docker-compose.prod.yml restart whatsapp-bot

# Clear sessions (will require re-authentication)
docker-compose -f docker-compose.prod.yml exec whatsapp-bot rm -rf sessions/*
```

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --dry-run

# Check Nginx config
sudo nginx -t
```

### Performance Issues

#### High Memory Usage
```bash
# Check memory usage by service
docker stats

# Restart services if needed
docker-compose -f docker-compose.prod.yml restart

# Optimize Laravel
docker-compose -f docker-compose.prod.yml exec laravel php artisan optimize:clear
docker-compose -f docker-compose.prod.yml exec laravel php artisan optimize
```

#### Slow Database Queries
```bash
# Enable slow query log
docker-compose -f docker-compose.prod.yml exec mysql mysql -u root -p -e "
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
"

# Analyze slow queries
docker-compose -f docker-compose.prod.yml exec mysql mysqldumpslow /var/log/mysql/slow.log
```

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- **Daily**: Check system health, review logs
- **Weekly**: Update system packages, review backups
- **Monthly**: Security updates, performance review
- **Quarterly**: Full system audit, disaster recovery test

### Emergency Contacts
- **System Admin**: admin@kakarama.com
- **Developer**: dev@kakarama.com
- **24/7 Support**: +62 xxx-xxxx-xxxx

### Maintenance Windows
- **Scheduled**: Sunday 02:00 - 04:00 WIB
- **Emergency**: As needed with 1-hour notice
