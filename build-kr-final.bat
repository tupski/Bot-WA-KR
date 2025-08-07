@echo off
echo ========================================
echo KR App - Final Build (Fixed Java Path)
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/4] Environment Check...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo ✅ JAVA_HOME: %JAVA_HOME%
echo ✅ Device: PRQ4HA756DKZXWBE ready
echo.

echo [2/4] Clean Previous Build...
taskkill /f /im node.exe >nul 2>&1
if exist "android\build" rmdir /s /q android\build
if exist "android\.gradle" rmdir /s /q android\.gradle
echo ✅ Cleaned
echo.

echo [3/4] Start Metro Bundler...
start /b npx react-native start --port 8081
echo Waiting for Metro...
timeout /t 8 >nul
echo ✅ Metro started
echo.

echo [4/4] Build and Install APK...
echo This may take 5-10 minutes...
echo.

npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ SUCCESS! KR App Installed!
    echo ========================================
    echo.
    echo 🎉 Look for "KR App" icon on your device
    echo 🔑 Login: admin / admin123
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Exit code: %errorlevel%
    echo.
)

echo Stopping Metro...
taskkill /f /im node.exe >nul 2>&1
pause
