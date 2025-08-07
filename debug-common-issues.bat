@echo off
echo ========================================
echo KR App - Debug Common Issues
echo ========================================
echo.

echo 🔧 TROUBLESHOOTING GUIDE
echo.

:MENU
echo Select an issue to debug:
echo.
echo 1. Bot WhatsApp won't start
echo 2. Mobile app won't connect to Supabase
echo 3. Real-time sync not working
echo 4. Metro bundler errors
echo 5. Build/compilation errors
echo 6. Database connection issues
echo 7. Environment variables problems
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto BOT_ISSUES
if "%choice%"=="2" goto MOBILE_SUPABASE
if "%choice%"=="3" goto REALTIME_ISSUES
if "%choice%"=="4" goto METRO_ISSUES
if "%choice%"=="5" goto BUILD_ISSUES
if "%choice%"=="6" goto DATABASE_ISSUES
if "%choice%"=="7" goto ENV_ISSUES
if "%choice%"=="8" goto EXIT
goto MENU

:BOT_ISSUES
echo.
echo 🤖 BOT WHATSAPP TROUBLESHOOTING
echo ================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Missing Supabase environment variables"
echo ✅ Solution: Check .env file has SUPABASE_URL and SUPABASE_SERVICE_KEY
echo.
echo ❌ Issue: "Database connection failed"
echo ✅ Solution: 
echo    1. Verify Supabase project is active
echo    2. Check API keys are correct
echo    3. Test connection: node test-supabase-connection.js
echo.
echo ❌ Issue: "WhatsApp session expired"
echo ✅ Solution:
echo    1. Delete .wwebjs_auth folder
echo    2. Restart bot and scan QR code again
echo.
echo ❌ Issue: "Port already in use"
echo ✅ Solution:
echo    1. Kill existing node processes: taskkill /f /im node.exe
echo    2. Restart bot
echo.
echo Testing bot connection...
node test-supabase-connection.js
echo.
goto MENU

:MOBILE_SUPABASE
echo.
echo 📱 MOBILE APP SUPABASE ISSUES
echo ==============================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Cannot connect to Supabase"
echo ✅ Solution:
echo    1. Check mobile\.env file exists
echo    2. Verify SUPABASE_URL and SUPABASE_ANON_KEY
echo    3. Restart Metro bundler
echo.
echo ❌ Issue: "Real-time subscriptions not working"
echo ✅ Solution:
echo    1. Check network connectivity
echo    2. Verify Supabase project settings
echo    3. Check RLS policies allow access
echo.
echo ❌ Issue: "Login fails with admin/admin123"
echo ✅ Solution:
echo    1. Check admins table exists in Supabase
echo    2. Verify default admin record exists
echo    3. Check RLS policies
echo.
echo Checking mobile app configuration...
if exist "mobile\KakaRamaRoom\.env" (
    echo ✅ Mobile .env file exists
    cd /d "mobile\KakaRamaRoom"
    findstr /C:"SUPABASE_URL" .env >nul && echo ✅ SUPABASE_URL configured || echo ❌ SUPABASE_URL missing
    findstr /C:"SUPABASE_ANON_KEY" .env >nul && echo ✅ SUPABASE_ANON_KEY configured || echo ❌ SUPABASE_ANON_KEY missing
    cd /d "..\..\"
) else (
    echo ❌ Mobile .env file missing
    echo Creating mobile .env file...
    copy ".env" "mobile\KakaRamaRoom\.env"
)
echo.
goto MENU

:REALTIME_ISSUES
echo.
echo 🔄 REAL-TIME SYNC TROUBLESHOOTING
echo =================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Sync status shows Offline"
echo ✅ Solution:
echo    1. Check internet connection
echo    2. Verify Supabase project is active
echo    3. Check API keys are valid
echo.
echo ❌ Issue: "Changes not syncing between bot and app"
echo ✅ Solution:
echo    1. Verify both use same Supabase project
echo    2. Check real-time subscriptions are active
echo    3. Test with: node test-realtime-sync.js
echo.
echo ❌ Issue: "Real-time events not received"
echo ✅ Solution:
echo    1. Check Supabase real-time is enabled
echo    2. Verify table permissions
echo    3. Check network firewall settings
echo.
echo Testing real-time sync...
node test-realtime-sync.js
echo.
goto MENU

:METRO_ISSUES
echo.
echo 📦 METRO BUNDLER TROUBLESHOOTING
echo ================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Metro bundler won't start"
echo ✅ Solution:
echo    1. Clear Metro cache: npx react-native start --reset-cache
echo    2. Delete node_modules and reinstall
echo    3. Check port 8081 is available
echo.
echo ❌ Issue: "Module not found errors"
echo ✅ Solution:
echo    1. Install missing dependencies
echo    2. Clear Metro cache
echo    3. Restart Metro bundler
echo.
echo ❌ Issue: "Asset loading errors"
echo ✅ Solution:
echo    1. Check asset paths are correct
echo    2. Verify assets exist in correct folders
echo    3. Clear Metro cache
echo.
echo Clearing Metro cache and restarting...
cd /d "mobile\KakaRamaRoom"
echo Stopping Metro...
taskkill /f /im node.exe >nul 2>&1
echo Clearing cache...
npx react-native start --reset-cache --port 8081 >nul 2>&1 &
timeout /t 3 >nul
taskkill /f /im node.exe >nul 2>&1
echo Starting Metro with fresh cache...
start /b npx react-native start --port 8081
cd /d "..\..\"
echo ✅ Metro restarted with fresh cache
echo.
goto MENU

:BUILD_ISSUES
echo.
echo 🔨 BUILD/COMPILATION TROUBLESHOOTING
echo ====================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Android build fails"
echo ✅ Solution:
echo    1. Check Java 17 is installed and configured
echo    2. Verify Android SDK is properly setup
echo    3. Clean build: cd android && gradlew clean
echo.
echo ❌ Issue: "Dependency conflicts"
echo ✅ Solution:
echo    1. Delete node_modules and package-lock.json
echo    2. Run npm install
echo    3. Clear Metro cache
echo.
echo ❌ Issue: "NDK errors"
echo ✅ Solution:
echo    1. Check NDK version compatibility
echo    2. Update React Native version
echo    3. Clean and rebuild
echo.
echo Checking build environment...
echo Java version:
java -version 2>&1 | findstr "version"
echo.
echo Android SDK:
if exist "%ANDROID_HOME%" (
    echo ✅ ANDROID_HOME set: %ANDROID_HOME%
) else (
    echo ❌ ANDROID_HOME not set
)
echo.
goto MENU

:DATABASE_ISSUES
echo.
echo 🗄️ DATABASE CONNECTION TROUBLESHOOTING
echo =======================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Connection timeout"
echo ✅ Solution:
echo    1. Check internet connection
echo    2. Verify Supabase project URL
echo    3. Check firewall settings
echo.
echo ❌ Issue: "Authentication failed"
echo ✅ Solution:
echo    1. Verify API keys are correct
echo    2. Check key permissions
echo    3. Regenerate keys if needed
echo.
echo ❌ Issue: "Table not found"
echo ✅ Solution:
echo    1. Run database schema setup
echo    2. Check table names are correct
echo    3. Verify RLS policies
echo.
echo Testing database connection...
node test-supabase-connection.js
echo.
goto MENU

:ENV_ISSUES
echo.
echo 🌍 ENVIRONMENT VARIABLES TROUBLESHOOTING
echo ========================================
echo.
echo Common Issues and Solutions:
echo.
echo ❌ Issue: "Environment variables not loaded"
echo ✅ Solution:
echo    1. Check .env file exists in root directory
echo    2. Verify .env syntax (no spaces around =)
echo    3. Restart application after changes
echo.
echo ❌ Issue: "Mobile app can't read environment variables"
echo ✅ Solution:
echo    1. Check mobile/.env file exists
echo    2. Verify react-native-config is installed
echo    3. Rebuild app after env changes
echo.
echo Checking environment files...
if exist ".env" (
    echo ✅ Root .env file exists
) else (
    echo ❌ Root .env file missing
)

if exist "mobile\KakaRamaRoom\.env" (
    echo ✅ Mobile .env file exists
) else (
    echo ❌ Mobile .env file missing
    echo Creating mobile .env file...
    copy ".env" "mobile\KakaRamaRoom\.env"
)
echo.
goto MENU

:EXIT
echo.
echo 👋 Debugging session ended.
echo.
echo 📚 Additional Resources:
echo • Documentation: README.md
echo • Supabase Docs: https://supabase.com/docs
echo • React Native Docs: https://reactnative.dev/docs
echo.
echo If issues persist, check the logs for detailed error messages.
echo.
pause
exit /b 0
