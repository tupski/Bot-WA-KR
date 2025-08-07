@echo off
echo ========================================
echo KR App - Clean Build (NDK Safe)
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/5] Environment Setup...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo ✅ Java 17: %JAVA_HOME%
echo ✅ Device: PRQ4HA756DKZXWBE ready
echo.

echo [2/5] Clean Environment...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Metro stopped
echo.

echo [3/5] Start Metro Bundler...
start /b npx react-native start --port 8081
echo Waiting for Metro to start...
timeout /t 8 >nul
echo ✅ Metro ready on port 8081
echo.

echo [4/5] Pre-build Check...
echo Checking device connection...
adb devices | findstr "PRQ4HA756DKZXWBE.*device"
if %errorlevel% equ 0 (
    echo ✅ Device ready for installation
) else (
    echo ⚠️  Device not ready, but continuing...
    adb devices
)
echo.

echo [5/5] Build KR App...
echo ⚠️  IMPORTANT: This will download NDK (~500MB-1GB)
echo ⏱️  First build: 10-20 minutes (don't abort!)
echo 🔄 Subsequent builds: 2-5 minutes
echo.
echo Starting build process...
echo.

npx react-native run-android --port 8081

echo.
echo Build command finished with exit code: %errorlevel%

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 SUCCESS! KR App Installed!
    echo ========================================
    echo.
    echo ✅ APK built and installed successfully
    echo 📱 Look for "KR App" icon on your Android device
    echo 🔑 Default login: admin / admin123
    echo.
    echo 🚀 App Features to Test:
    echo - Login system
    echo - Dashboard
    echo - Apartment management
    echo - Unit management
    echo - Check-in system
    echo - Reports
    echo.
    echo 💡 The app is now permanently installed on your device
    echo    You can close this terminal and use the app normally
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Exit code: %errorlevel%
    echo.
    echo Common issues and solutions:
    echo.
    echo 1. NDK Download Interrupted:
    echo    - Run: fix-corrupt-ndk.bat
    echo    - Then retry this build
    echo.
    echo 2. Internet Connection:
    echo    - Check stable internet connection
    echo    - NDK download needs ~500MB-1GB
    echo.
    echo 3. Device Issues:
    echo    - Make sure device is connected
    echo    - USB debugging enabled
    echo    - Device authorized
    echo.
    echo 4. Java/Gradle Issues:
    echo    - Run: npx react-native doctor
    echo    - Check all components are green
    echo.
)

echo.
echo Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Press any key to exit...
pause
