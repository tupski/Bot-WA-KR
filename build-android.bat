@echo off
echo ========================================
echo KakaRama Room - Android Build Script
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/5] Checking environment...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Java not found. Please run setup-env-vars.bat first
    pause
    exit /b 1
)

adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ADB not found. Please run setup-env-vars.bat first
    pause
    exit /b 1
)

echo ✅ Environment OK
echo.

echo [2/5] Checking device...
for /f "tokens=2" %%i in ('adb devices ^| findstr "PRQ4HA756DKZXWBE"') do set DEVICE_STATUS=%%i

if not "%DEVICE_STATUS%"=="device" (
    echo ❌ Device not authorized. Please run fix-device-auth.bat first
    pause
    exit /b 1
)

echo ✅ Device authorized
echo.

echo [3/5] Cleaning cache...
echo Cleaning React Native cache...
npx react-native start --reset-cache --port 8081 >nul 2>&1 &
timeout /t 3 >nul
taskkill /f /im node.exe >nul 2>&1

echo.
echo [4/5] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo [5/5] Building and installing APK...
echo This may take 5-10 minutes for first build...
echo.

npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo ✅ Build successful! App should be running on your device.
    echo.
    echo If app doesn't start automatically:
    echo 1. Look for "KakaRamaRoom" app icon on device
    echo 2. Tap to open
    echo.
) else (
    echo.
    echo ❌ Build failed. Check error messages above.
    echo.
    echo Common solutions:
    echo 1. Make sure device is connected and authorized
    echo 2. Try: npx react-native doctor
    echo 3. Clean project: cd android && .\gradlew clean
    echo.
)

pause
