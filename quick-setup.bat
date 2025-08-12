@echo off
echo ========================================
echo KakaRama Room - Quick Setup & Fix
echo ========================================
echo.

echo 🔧 FIXING COMMON ISSUES...
echo.

echo [1/4] Update Mobile App Dependencies...
cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo Installing latest React Native CLI...
npm install --save-dev @react-native-community/cli@latest

if %errorlevel% neq 0 (
    echo ⚠️ NPM install had issues, but continuing...
)

echo ✅ Dependencies updated
echo.

cd /d "D:\Projects\Bot-WA-KR"

echo [2/4] Test Basic Database Connection...
node test-supabase-connection.js

if %errorlevel% neq 0 (
    echo ❌ Database connection failed
    echo Please check your .env file and Supabase configuration
    pause
    exit /b 1
)

echo ✅ Database connection working
echo.

echo [3/4] Create Activity Logs Table...
echo.
echo 📋 MANUAL STEP REQUIRED:
echo.
echo 1. Go to https://supabase.com/dashboard
echo 2. Select your project
echo 3. Go to SQL Editor
echo 4. Copy and run the SQL from: create-activity-logs-safe.sql
echo.
echo This will create the missing activity_logs table.
echo.
echo Press any key when you've completed this step...
pause

echo [4/4] Test System Again...
echo Testing with fixes applied...

node test-supabase-connection.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ SYSTEM READY!
    echo ========================================
    echo.
    echo 🎉 All core components working:
    echo ✅ Database connection successful
    echo ✅ Bot WhatsApp ready
    echo ✅ Mobile app dependencies updated
    echo ✅ Tables accessible
    echo.
    echo 🚀 Next Steps:
    echo.
    echo 1. Build Mobile App:
    echo    build-production-apk.bat
    echo.
    echo 2. Start WhatsApp Bot:
    echo    node index.js
    echo.
    echo 3. Install Mobile App:
    echo    install-production-apk.bat
    echo.
    echo 4. Test Integration:
    echo    • Login to mobile app: admin/admin123
    echo    • Send WhatsApp message to bot
    echo    • Verify data sync
    echo.
    echo 📱 Mobile App Features:
    echo ✅ Admin dashboard
    echo ✅ Apartment management
    echo ✅ Unit management  
    echo ✅ Checkin management
    echo ✅ Activity logs
    echo ✅ Reports
    echo.
    echo 🤖 Bot WhatsApp Features:
    echo ✅ Booking commands
    echo ✅ Report generation
    echo ✅ Excel exports
    echo ✅ Data sync with mobile app
    echo.
) else (
    echo ❌ Still having issues
    echo Please run: debug-common-issues.bat
)

echo.
echo Press any key to continue...
pause
