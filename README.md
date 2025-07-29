# WhatsApp Bot for SKY HOUSE Room Booking Management

A comprehensive WhatsApp bot system for managing room bookings, generating reports, and tracking CS performance for SKY HOUSE business operations.

## Features

- 🤖 **Automated Message Processing**: Parses booking messages starting with 🟢 symbol
- 📊 **Daily Reports**: Automated daily reports sent to WhatsApp group at 12:00 WIB
- 📧 **Email Integration**: Daily Excel reports sent via email
- 💾 **Database Support**: SQLite and MySQL database options
- 📈 **Performance Tracking**: CS performance monitoring and commission calculations
- 🔄 **Scheduled Tasks**: Automated daily, weekly, and monthly reporting
- 📱 **Excel Export**: Comprehensive Excel reports with multiple sheets
- 🛡️ **Error Handling**: Robust error handling and logging system
- ⚙️ **Configurable**: Extensive configuration options via environment variables

## Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Gmail account with app password (for email features)
- WhatsApp account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd bot-kr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Create data directory**
   ```bash
   mkdir data
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

6. **Scan QR code**
   - The bot will display a QR code in the terminal
   - Scan it with WhatsApp on your phone
   - Wait for "Bot is ready!" message

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure the following:

#### WhatsApp Settings
```env
GROUP_CHAT_ID=your_whatsapp_group_chat_id_here
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true
```

#### Database Settings
```env
DB_TYPE=sqlite
SQLITE_PATH=./data/bot-kr.db
```

#### Email Settings
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_TO=kakaramaroom@gmail.com
```

#### Commission Settings (in Rupiah)
```env
COMMISSION_AMEL=50000
COMMISSION_KR=45000
COMMISSION_APK=40000
COMMISSION_DEFAULT=30000
```

### Gmail App Password Setup

1. Enable 2-factor authentication on your Gmail account
2. Go to Google Account settings → Security → App passwords
3. Generate an app password for "Mail"
4. Use this password in `EMAIL_PASS` environment variable

## Message Format

The bot processes messages that start with 🟢 symbol. Example formats:

```
🟢 SKY1 - A1 - CO: 14:30 - 3 jam - Cash - Amel - 150000
🟢 SKY2 - B2 - Checkout: 15:00 - 2.5 jam - Transfer - KR - 200000
🟢 SKY3 - C3 - 16:00 - 4 jam - Cash - APK - 300000
```

### Message Components

- **🟢**: Required prefix symbol
- **Location**: SKY1, SKY2, SKY3, etc.
- **Unit**: Room/unit identifier (A1, B2, C3, etc.)
- **Checkout Time**: Format: HH:MM or "CO: HH:MM"
- **Duration**: Hours (e.g., "3 jam", "2.5 jam")
- **Payment Method**: "Cash" or "Transfer"/"TF"
- **CS Name**: Customer service representative name
- **Amount**: Transaction amount in Rupiah

## Reports

### Daily Reports (12:00 WIB)

Automatically generated daily reports include:
- Total bookings and revenue
- CS performance summary
- Payment method breakdown
- Commission calculations

### Excel Reports

Daily Excel files contain 3 sheets:
1. **Transaksi**: Detailed transaction list
2. **Ringkasan CS**: CS performance summary
3. **Komisi Marketing**: Commission calculations

### Email Reports

- Sent daily to configured email address
- Includes Excel attachment
- Professional HTML formatting

## Database Schema

### Tables

1. **transactions**: Individual booking records
2. **cs_summary**: Daily CS performance aggregates
3. **daily_summary**: Daily business summaries

### SQLite vs MySQL

- **SQLite**: Default, file-based, no server required
- **MySQL**: For production, better performance, concurrent access

## Scripts

```bash
# Start the bot
npm start

# Development mode with auto-restart
npm run dev

# Run tests
npm test
```

## File Structure

```
bot-kr/
├── config/
│   └── config.js              # Configuration management
├── src/
│   ├── database.js            # Database operations
│   ├── whatsappBot.js         # WhatsApp client wrapper
│   ├── messageParser.js       # Message parsing logic
│   ├── reportGenerator.js     # Report generation
│   ├── scheduler.js           # Scheduled tasks
│   ├── excelExporter.js       # Excel file generation
│   ├── emailService.js        # Email functionality
│   ├── numberFormatter.js     # Number formatting utilities
│   ├── errorHandler.js        # Error handling system
│   └── logger.js              # Logging system
├── data/                      # Database and logs
├── exports/                   # Generated Excel files
├── session/                   # WhatsApp session data
├── .env.example               # Environment template
├── package.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **QR Code not appearing**
   - Check if port 3000 is available
   - Ensure PUPPETEER_HEADLESS=false for debugging

2. **Database connection errors**
   - Verify database configuration in .env
   - Check file permissions for SQLite
   - Ensure MySQL server is running

3. **Email not sending**
   - Verify Gmail app password
   - Check EMAIL_ENABLED=true
   - Review email logs in console

4. **Messages not being processed**
   - Verify message format matches expected pattern
   - Check WhatsApp connection status
   - Review parsing logs

### Logs

Logs are stored in:
- Console output (real-time)
- `./data/bot.log` (file logging)

Log levels: error, warn, info, debug

## Development

### Adding New Features

1. **New message formats**: Modify `src/messageParser.js`
2. **Additional reports**: Extend `src/reportGenerator.js`
3. **New scheduled tasks**: Add to `src/scheduler.js`
4. **Database changes**: Update `src/database.js`

### Testing

```bash
# Run all tests
npm test

# Test specific module
npm test -- --grep "messageParser"
```

## Production Deployment

### Recommended Setup

1. **Use MySQL database**
   ```env
   DB_TYPE=mysql
   DB_HOST=your-mysql-host
   DB_USER=your-mysql-user
   DB_PASSWORD=your-mysql-password
   DB_NAME=bot_kr_production
   ```

2. **Enable process management**
   ```bash
   npm install -g pm2
   pm2 start index.js --name "whatsapp-bot"
   pm2 startup
   pm2 save
   ```

3. **Configure logging**
   ```env
   LOG_LEVEL=info
   LOG_ENABLE_FILE=true
   LOG_MAX_FILES=10
   LOG_MAX_SIZE=50m
   ```

4. **Set up monitoring**
   ```bash
   pm2 monit
   ```

### Security Considerations

- Keep `.env` file secure and never commit it
- Use strong MySQL passwords
- Regularly update dependencies
- Monitor logs for suspicious activity
- Backup database regularly

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Verify configuration settings
4. Test with simple message formats first

## License

This project is proprietary software for SKY HOUSE business operations.

---

**Note**: This bot requires a stable internet connection and WhatsApp Web access. Ensure your server/computer remains online for continuous operation.
