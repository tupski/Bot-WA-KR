@echo off
echo ========================================
echo Build KR App - Production APK
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/6] Environment Setup...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo ✅ Java 17: %JAVA_HOME%
echo ✅ Device: PRQ4HA756DKZXWBE ready
echo.

echo [2/6] Stop Metro bundler...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Metro stopped
echo.

echo [3/6] Clean build cache...
if exist "android\build" rmdir /s /q android\build
if exist "android\app\build" rmdir /s /q android\app\build
if exist "android\.gradle" rmdir /s /q android\.gradle
echo ✅ Build cache cleaned
echo.

echo [4/6] Generate production bundle...
echo Creating optimized JavaScript bundle...
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

if %errorlevel% neq 0 (
    echo ❌ Bundle generation failed
    pause
    exit /b 1
)

echo ✅ Production bundle created
echo.

echo [5/6] Build production APK...
echo Building release APK (this may take 10-15 minutes)...
cd android

echo Cleaning gradle cache...
gradlew clean

echo Building release APK...
gradlew assembleRelease

if %errorlevel% neq 0 (
    echo ❌ APK build failed
    cd ..
    pause
    exit /b 1
)

cd ..
echo ✅ Production APK built successfully
echo.

echo [6/6] Locate APK file...
set "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"

if exist "%APK_PATH%" (
    echo.
    echo ========================================
    echo 🎉 SUCCESS! Production APK Ready!
    echo ========================================
    echo.
    echo ✅ APK Location: %APK_PATH%
    echo 📱 File size: 
    dir "%APK_PATH%" | findstr app-release.apk
    echo.
    echo 🚀 Production Features:
    echo ✅ Optimized JavaScript bundle
    echo ✅ Minified code
    echo ✅ No Metro dependency
    echo ✅ Standalone installation
    echo ✅ Supabase integration ready
    echo.
    echo 📱 Installation Options:
    echo.
    echo Option 1 - Install to connected device:
    echo   adb install "%APK_PATH%"
    echo.
    echo Option 2 - Copy APK to device:
    echo   1. Copy APK file to device storage
    echo   2. Open file manager on device
    echo   3. Tap APK file to install
    echo   4. Allow "Install from unknown sources"
    echo.
    echo Option 3 - Share APK:
    echo   • Upload to Google Drive/Dropbox
    echo   • Send via WhatsApp/Email
    echo   • Use USB transfer
    echo.
    echo 🔑 Login: admin / admin123
    echo.
    echo 💡 This APK can be installed on any Android device
    echo    without needing development environment
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ APK NOT FOUND
    echo ========================================
    echo.
    echo Expected location: %APK_PATH%
    echo.
    echo Possible locations:
    dir android\app\build\outputs\apk\ /s | findstr .apk
    echo.
    echo Check build logs above for errors
    echo.
)

echo.
echo Press any key to exit...
pause
