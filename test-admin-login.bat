@echo off
echo ========================================
echo Testing Admin Login Fix
echo ========================================
echo.

echo [1/5] Checking project structure...
if exist "mobile\KakaRamaRoom" (
    echo ✅ Mobile project found
) else (
    echo ❌ Mobile project not found
    pause
    exit /b 1
)

echo.
echo [2/5] Checking APK in root...
if exist "KakaRamaRoom-latest.apk" (
    echo ✅ APK found in root folder
) else (
    echo ❌ APK not found in root folder
)

echo.
echo [3/5] Checking if Bot WhatsApp files are removed...
if not exist "src\whatsappBot.js" (
    echo ✅ WhatsApp Bot files removed
) else (
    echo ❌ WhatsApp Bot files still exist
)

echo.
echo [4/5] Checking ErrorBoundary component...
if exist "mobile\KakaRamaRoom\src\components\ErrorBoundary.js" (
    echo ✅ ErrorBoundary component added
) else (
    echo ❌ ErrorBoundary component missing
)

echo.
echo [5/5] Building and testing APK...
echo Navigating to mobile project...
cd mobile\KakaRamaRoom

echo.
echo Checking React Native environment...
npx react-native doctor

echo.
echo Building APK for testing...
echo This will take a few minutes...
npx react-native run-android --variant=release

echo.
echo ========================================
echo Testing completed!
echo ========================================
echo.
echo To test admin login:
echo 1. Install the APK on your device
echo 2. Try logging in with:
echo    - Email: admin@kakaramaroom.com
echo    - Password: admin123
echo.
echo If the app doesn't crash, the fix is successful!
echo.
pause
