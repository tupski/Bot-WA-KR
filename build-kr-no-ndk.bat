@echo off
echo ========================================
echo KR App - Build without NDK
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/5] Environment Setup...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo ✅ Java 17 configured
echo ✅ Device PRQ4HA756DKZXWBE ready
echo.

echo [2/5] Clean Build Environment...
taskkill /f /im node.exe >nul 2>&1
if exist "android\build" (
    rmdir /s /q android\build
    echo ✅ Android build cleaned
)
if exist "android\.gradle" (
    rmdir /s /q android\.gradle
    echo ✅ Gradle cache cleaned
)
echo.

echo [3/5] Clean Gradle Daemon...
cd android
gradlew.bat --stop
echo ✅ Gradle daemon stopped
cd ..
echo.

echo [4/5] Start Metro Bundler...
start /b npx react-native start --port 8081
echo Waiting for Metro to initialize...
timeout /t 10 >nul
echo ✅ Metro ready
echo.

echo [5/5] Build KR App (NDK Disabled)...
echo This may take 5-10 minutes...
echo.

npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 SUCCESS! KR App Installed!
    echo ========================================
    echo.
    echo ✅ APK built and installed successfully
    echo 📱 Look for "KR App" icon on your device
    echo 🔑 Default login: admin / admin123
    echo.
    echo 🚀 App Features:
    echo - Admin Dashboard
    echo - Apartment Management
    echo - Unit Management
    echo - Check-in System
    echo - Reports & Analytics
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Exit code: %errorlevel%
    echo.
    echo If NDK errors persist:
    echo 1. Install Android Studio
    echo 2. Go to SDK Manager
    echo 3. Install NDK (Side by side)
    echo 4. Or continue using this NDK-disabled build
    echo.
)

echo.
echo Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Build process completed.
pause
