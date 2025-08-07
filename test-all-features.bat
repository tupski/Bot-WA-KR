@echo off
echo ========================================
echo KR App - Comprehensive Feature Testing
echo ========================================
echo.

echo 🧪 TESTING CHECKLIST - KakaRama Room App
echo.
echo This script will guide you through testing all features
echo of both the Bot WhatsApp and Mobile App integration.
echo.

echo [PHASE 1] ENVIRONMENT SETUP
echo ========================================
echo.

echo ✅ 1. Environment Variables Check
if exist ".env" (
    echo    ✅ .env file exists
    findstr /C:"SUPABASE_URL" .env >nul && echo    ✅ SUPABASE_URL configured || echo    ❌ SUPABASE_URL missing
    findstr /C:"SUPABASE_ANON_KEY" .env >nul && echo    ✅ SUPABASE_ANON_KEY configured || echo    ❌ SUPABASE_ANON_KEY missing
    findstr /C:"SUPABASE_SERVICE_KEY" .env >nul && echo    ✅ SUPABASE_SERVICE_KEY configured || echo    ❌ SUPABASE_SERVICE_KEY missing
) else (
    echo    ❌ .env file missing
)
echo.

echo ✅ 2. Mobile App Environment Check
if exist "mobile\KakaRamaRoom\.env" (
    echo    ✅ Mobile .env file exists
) else (
    echo    ❌ Mobile .env file missing
)
echo.

echo ✅ 3. Dependencies Check
if exist "node_modules\@supabase\supabase-js" (
    echo    ✅ Bot WhatsApp: Supabase dependency installed
) else (
    echo    ❌ Bot WhatsApp: Supabase dependency missing
)

if exist "mobile\KakaRamaRoom\node_modules\@supabase\supabase-js" (
    echo    ✅ Mobile App: Supabase dependency installed
) else (
    echo    ❌ Mobile App: Supabase dependency missing
)
echo.

echo [PHASE 2] DATABASE TESTING
echo ========================================
echo.

echo 🔄 Testing Supabase Connection...
node test-supabase-connection.js
if %errorlevel% neq 0 (
    echo ❌ Supabase connection failed
    echo Please fix database connection before continuing
    pause
    exit /b 1
)
echo.

echo 🔄 Testing Real-time Sync...
node test-realtime-sync.js
if %errorlevel% neq 0 (
    echo ⚠️ Real-time sync test had issues
    echo This is OK - basic functionality will still work
    echo See SUPABASE-REALTIME-SETUP.md for real-time configuration
    echo.
    echo Continuing with other tests...
)
echo.

echo [PHASE 3] BOT WHATSAPP TESTING
echo ========================================
echo.

echo 📱 Bot WhatsApp Manual Testing Checklist:
echo.
echo [ ] 1. Start Bot WhatsApp:
echo      Command: node index.js
echo      Expected: Bot starts without errors
echo.
echo [ ] 2. WhatsApp Connection:
echo      Expected: QR code appears or session restored
echo      Action: Scan QR code with WhatsApp
echo.
echo [ ] 3. Database Operations:
echo      Test: Send booking message to bot
echo      Expected: Data saved to Supabase
echo.
echo [ ] 4. Command Processing:
echo      Test: Send /help command
echo      Expected: Bot responds with help menu
echo.
echo [ ] 5. Report Generation:
echo      Test: Send /rekap command
echo      Expected: Excel report generated
echo.

echo [PHASE 4] MOBILE APP TESTING
echo ========================================
echo.

echo 📱 Mobile App Manual Testing Checklist:
echo.
echo [ ] 1. Build and Install:
echo      Command: cd mobile\KakaRamaRoom && npx react-native run-android
echo      Expected: App installs on device
echo.
echo [ ] 2. Login Screen:
echo      Test: Login with admin/admin123
echo      Expected: Successful login to dashboard
echo.
echo [ ] 3. Dashboard Features:
echo      Test: Navigate through all menu items
echo      Expected: All screens load without errors
echo.
echo [ ] 4. Real-time Sync:
echo      Test: Check sync status indicator
echo      Expected: Shows "Online" status
echo.
echo [ ] 5. Data Display:
echo      Test: View apartments, units, checkins
echo      Expected: Data from Supabase displays correctly
echo.
echo [ ] 6. CRUD Operations:
echo      Test: Create, edit, delete records
echo      Expected: Changes sync to database
echo.

echo [PHASE 5] INTEGRATION TESTING
echo ========================================
echo.

echo 🔄 End-to-End Integration Tests:
echo.
echo [ ] 1. Bot → Mobile Sync:
echo      Action: Create checkin via WhatsApp bot
echo      Test: Check if data appears in mobile app
echo      Expected: Real-time sync works
echo.
echo [ ] 2. Mobile → Bot Sync:
echo      Action: Create checkin via mobile app
echo      Test: Check if data appears in bot database
echo      Expected: Data syncs to Supabase
echo.
echo [ ] 3. Real-time Updates:
echo      Action: Update unit status via bot
echo      Test: Check mobile app updates instantly
echo      Expected: Real-time subscription works
echo.
echo [ ] 4. Offline/Online Testing:
echo      Action: Disconnect internet on mobile
echo      Test: Check sync status indicator
echo      Expected: Shows "Offline" status
echo      Action: Reconnect internet
echo      Expected: Shows "Online" status
echo.

echo [PHASE 6] PERFORMANCE TESTING
echo ========================================
echo.

echo ⚡ Performance Tests:
echo.
echo [ ] 1. Large Data Sets:
echo      Test: Load 100+ checkin records
echo      Expected: App remains responsive
echo.
echo [ ] 2. Real-time Load:
echo      Test: Multiple simultaneous updates
echo      Expected: All updates received
echo.
echo [ ] 3. Memory Usage:
echo      Test: Use app for extended period
echo      Expected: No memory leaks
echo.

echo [PHASE 7] ERROR HANDLING
echo ========================================
echo.

echo 🛡️ Error Handling Tests:
echo.
echo [ ] 1. Network Errors:
echo      Test: Disconnect internet during operation
echo      Expected: Graceful error handling
echo.
echo [ ] 2. Invalid Data:
echo      Test: Submit forms with invalid data
echo      Expected: Proper validation messages
echo.
echo [ ] 3. Database Errors:
echo      Test: Simulate database connection issues
echo      Expected: Error messages displayed
echo.

echo ========================================
echo 🎯 TESTING SUMMARY
echo ========================================
echo.
echo Complete all checklist items above to ensure
echo the KakaRama Room system is working correctly.
echo.
echo 📊 Key Success Metrics:
echo ✅ Bot WhatsApp connects to Supabase
echo ✅ Mobile app connects to Supabase  
echo ✅ Real-time sync works both ways
echo ✅ All CRUD operations function
echo ✅ Error handling is robust
echo ✅ Performance is acceptable
echo.
echo 🚀 When all tests pass, the system is ready for production!
echo.
echo Press any key to exit...
pause
