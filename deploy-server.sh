#!/bin/bash
# Script deployment server untuk WhatsApp Bot Kakarama Room

echo "🚀 Deployment Script untuk WhatsApp Bot Kakarama Room"
echo "=================================================="

# Update system
echo "📦 Update system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x LTS
echo "📦 Install Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
echo "📦 Install PM2..."
sudo npm install -g pm2

# Install Git
echo "📦 Install Git..."
sudo apt install -y git

# Install MySQL (optional)
echo "📦 Install MySQL (optional)..."
read -p "Install MySQL? (y/n): " install_mysql
if [ "$install_mysql" = "y" ]; then
    sudo apt install -y mysql-server
    sudo mysql_secure_installation
fi

# Create bot user
echo "👤 Create bot user..."
sudo adduser --disabled-password --gecos "" botuser
sudo usermod -aG sudo botuser

# Setup firewall
echo "🔒 Setup firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 2222/tcp
echo "Firewall configured"

# Create directories
echo "📁 Create directories..."
sudo mkdir -p /opt/whatsapp-bot
sudo mkdir -p /opt/whatsapp-bot/logs
sudo mkdir -p /opt/whatsapp-bot/data
sudo mkdir -p /backup
sudo chown -R botuser:botuser /opt/whatsapp-bot
sudo chown -R botuser:botuser /backup

# Clone repository
echo "📥 Clone repository..."
cd /opt/whatsapp-bot
sudo -u botuser git clone https://github.com/your-repo/bot-kr.git .

# Install dependencies
echo "📦 Install dependencies..."
sudo -u botuser npm install

# Setup environment
echo "⚙️ Setup environment..."
sudo -u botuser cp .env.example .env
echo "Edit .env file with your configuration"

# Setup PM2
echo "🔄 Setup PM2..."
sudo -u botuser pm2 start index.js --name "whatsapp-bot"
sudo -u botuser pm2 startup
sudo -u botuser pm2 save

# Setup log rotation
echo "📝 Setup log rotation..."
sudo tee /etc/logrotate.d/whatsapp-bot > /dev/null <<EOF
/opt/whatsapp-bot/logs/*.log {
    daily
    rotate 30
    compress
    missingok
    notifempty
    create 644 botuser botuser
}
EOF

# Setup backup cron
echo "💾 Setup backup cron..."
sudo -u botuser crontab -l > /tmp/crontab.tmp 2>/dev/null || true
echo "0 2 * * * cp /opt/whatsapp-bot/data/bot-kr.db /backup/bot-kr-\$(date +\\%Y\\%m\\%d).db" >> /tmp/crontab.tmp
echo "0 3 * * * cd /opt/whatsapp-bot && git push origin master" >> /tmp/crontab.tmp
echo "*/5 * * * * cd /opt/whatsapp-bot && pm2 ping whatsapp-bot || pm2 restart whatsapp-bot" >> /tmp/crontab.tmp
sudo -u botuser crontab /tmp/crontab.tmp
rm /tmp/crontab.tmp

# Setup monitoring script
echo "📊 Setup monitoring script..."
sudo tee /opt/whatsapp-bot/monitor.sh > /dev/null <<EOF
#!/bin/bash
echo "=== WhatsApp Bot Status ==="
echo "Date: \$(date)"
echo "Uptime: \$(uptime)"
echo "Disk Usage: \$(df -h /)"
echo "Memory Usage: \$(free -h)"
echo "PM2 Status:"
pm2 status
echo "Recent Logs:"
tail -n 10 /opt/whatsapp-bot/logs/app.log
EOF
sudo chmod +x /opt/whatsapp-bot/monitor.sh
sudo chown botuser:botuser /opt/whatsapp-bot/monitor.sh

echo "✅ Deployment completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Edit /opt/whatsapp-bot/.env with your configuration"
echo "2. Run: sudo -u botuser pm2 restart whatsapp-bot"
echo "3. Check status: sudo -u botuser pm2 status"
echo "4. Monitor logs: sudo -u botuser pm2 logs whatsapp-bot"
echo "5. Run monitoring: /opt/whatsapp-bot/monitor.sh"
echo ""
echo "🔒 Security Notes:"
echo "- Change SSH port in /etc/ssh/sshd_config"
echo "- Setup SSH key authentication"
echo "- Disable password authentication"
echo "- Regular security updates"
