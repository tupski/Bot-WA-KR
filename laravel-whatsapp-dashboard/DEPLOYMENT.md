# Deployment Guide - Laravel WhatsApp Dashboard

## Prerequisites

- PHP 8.2 or higher
- Composer
- Node.js & NPM
- MySQL/PostgreSQL/SQLite
- Web server (Apache/Nginx)
- SSL Certificate (recommended)

## Production Environment Setup

### 1. Server Requirements

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PHP 8.2 and extensions
sudo apt install php8.2 php8.2-fpm php8.2-mysql php8.2-xml php8.2-curl php8.2-zip php8.2-mbstring php8.2-gd php8.2-bcmath

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Database Setup

```sql
-- Create database
CREATE DATABASE whatsapp_dashboard;
CREATE USER 'dashboard_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON whatsapp_dashboard.* TO 'dashboard_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-repo/laravel-whatsapp-dashboard.git
cd laravel-whatsapp-dashboard

# Install dependencies
composer install --optimize-autoloader --no-dev
npm install && npm run build

# Set permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache

# Environment configuration
cp .env.example .env
php artisan key:generate
```

### 4. Environment Configuration (.env)

```env
APP_NAME="KakaRama WhatsApp Dashboard"
APP_ENV=production
APP_KEY=base64:your-generated-key
APP_DEBUG=false
APP_URL=https://yourdomain.com

LOG_CHANNEL=stack
LOG_DEPRECATIONS_CHANNEL=null
LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=whatsapp_dashboard
DB_USERNAME=dashboard_user
DB_PASSWORD=secure_password

BROADCAST_DRIVER=pusher
CACHE_DRIVER=redis
FILESYSTEM_DISK=local
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_LIFETIME=120

REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_ENCRYPTION=null
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME="${APP_NAME}"

# Pusher Configuration
PUSHER_APP_ID=your-app-id
PUSHER_APP_KEY=your-app-key
PUSHER_APP_SECRET=your-app-secret
PUSHER_HOST=
PUSHER_PORT=443
PUSHER_SCHEME=https
PUSHER_APP_CLUSTER=mt1

# Webhook Configuration
WEBHOOK_TOKEN=your-secure-webhook-token-here
```

### 5. Database Migration & Seeding

```bash
# Run migrations
php artisan migrate --force

# Seed initial data
php artisan db:seed --force

# Create admin user
php artisan tinker
>>> $user = \App\Models\User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => bcrypt('password')]);
>>> $user->assignRole('admin');
```

### 6. Web Server Configuration

#### Nginx Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/laravel-whatsapp-dashboard/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    # Security headers
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net;";
}
```

### 7. Process Management (Supervisor)

```ini
# /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/laravel-whatsapp-dashboard/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/laravel-whatsapp-dashboard/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
# Start supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start laravel-worker:*
```

### 8. Cron Jobs

```bash
# Add to crontab (crontab -e)
* * * * * cd /var/www/laravel-whatsapp-dashboard && php artisan schedule:run >> /dev/null 2>&1
```

### 9. Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: maxmemory 256mb
# Set: maxmemory-policy allkeys-lru

# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

### 10. Monitoring & Logging

```bash
# Log rotation
sudo nano /etc/logrotate.d/laravel

/var/www/laravel-whatsapp-dashboard/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 www-data www-data
    postrotate
        /usr/bin/supervisorctl restart laravel-worker:*
    endscript
}
```

### 11. Security Checklist

- [ ] SSL certificate installed and configured
- [ ] Firewall configured (UFW/iptables)
- [ ] Database user has minimal required permissions
- [ ] File permissions set correctly (755 for directories, 644 for files)
- [ ] Storage and cache directories writable by web server
- [ ] .env file not accessible via web
- [ ] Debug mode disabled in production
- [ ] Strong passwords for all accounts
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented

### 12. Performance Optimization

```bash
# Optimize Laravel
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Optimize Composer autoloader
composer dump-autoload --optimize

# Enable OPcache
sudo nano /etc/php/8.2/fpm/php.ini
# opcache.enable=1
# opcache.memory_consumption=128
# opcache.max_accelerated_files=4000
# opcache.revalidate_freq=60

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

### 13. Backup Strategy

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/whatsapp-dashboard"
APP_DIR="/var/www/laravel-whatsapp-dashboard"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u dashboard_user -p whatsapp_dashboard > $BACKUP_DIR/database_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/application_$DATE.tar.gz -C $APP_DIR .

# Storage backup
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz -C $APP_DIR/storage .

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

### 14. Health Monitoring

```bash
# Create health check script
#!/bin/bash
# health-check.sh
curl -f http://localhost/api/health || exit 1
```

### 15. Deployment Script

```bash
#!/bin/bash
# deploy.sh
set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install/update dependencies
composer install --optimize-autoloader --no-dev
npm ci && npm run build

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Run migrations
php artisan migrate --force

# Optimize for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Restart services
sudo supervisorctl restart laravel-worker:*
sudo systemctl reload php8.2-fpm

echo "Deployment completed successfully!"
```

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   ```bash
   sudo chown -R www-data:www-data storage bootstrap/cache
   sudo chmod -R 775 storage bootstrap/cache
   ```

2. **Queue Not Processing**
   ```bash
   sudo supervisorctl restart laravel-worker:*
   php artisan queue:restart
   ```

3. **Database Connection Issues**
   - Check database credentials in .env
   - Verify database server is running
   - Check firewall rules

4. **SSL Certificate Issues**
   - Verify certificate paths in Nginx config
   - Check certificate expiration
   - Test with SSL Labs

### Monitoring Commands

```bash
# Check application status
php artisan about

# Monitor logs
tail -f storage/logs/laravel.log

# Check queue status
php artisan queue:monitor

# Check supervisor status
sudo supervisorctl status
```

## Maintenance

- Regular security updates
- Database optimization
- Log cleanup
- SSL certificate renewal
- Backup verification
- Performance monitoring
