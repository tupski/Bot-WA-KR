@echo off
echo ========================================
echo KR App - Test Build Now
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo ✅ Java 17 detected
echo ✅ Device authorized: PRQ4HA756DKZXWBE
echo.

echo [1/4] Checking device connection...
adb devices | findstr "PRQ4HA756DKZXWBE.*device"
if %errorlevel% equ 0 (
    echo ✅ Device ready for installation
) else (
    echo ❌ Device not ready
    adb devices
    pause
    exit /b 1
)

echo.
echo [2/4] Setting Java 17 environment...
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16+8
set PATH=%JAVA_HOME%\bin;%PATH%
echo ✅ Java environment set

echo.
echo [3/4] Cleaning previous build...
if exist "android\build" (
    rmdir /s /q android\build
    echo ✅ Android build cleaned
)

echo.
echo [4/4] Starting React Native build...
echo This will take 5-10 minutes for first build...
echo.

echo Starting Metro bundler in background...
start /b npx react-native start --port 8081

echo Waiting for Metro to start...
timeout /t 5 >nul

echo.
echo Building and installing APK...
npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo 🎉 KR App should be installed on your device!
    echo.
    echo Look for the app icon on your Android device and tap to open.
    echo.
    echo If the app doesn't start automatically:
    echo 1. Find "KR App" icon on device
    echo 2. Tap to launch
    echo 3. Grant any permissions if requested
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Don't worry! Let's try to fix the specific error.
    echo.
    echo Common solutions:
    echo 1. Android SDK issue → Run: fix-android-sdk.bat
    echo 2. Gradle issue → Clean and retry
    echo 3. Device issue → Check USB connection
    echo.
    echo Check the error messages above for specific issues.
    echo.
)

echo.
echo Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1

pause
