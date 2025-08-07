@echo off
echo ========================================
echo Install KR App Production APK
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

set "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"

echo [1/3] Check APK file...
if exist "%APK_PATH%" (
    echo ✅ APK found: %APK_PATH%
    dir "%APK_PATH%" | findstr app-release.apk
) else (
    echo ❌ APK not found: %APK_PATH%
    echo.
    echo Please build production APK first:
    echo   build-production-apk.bat
    echo.
    pause
    exit /b 1
)
echo.

echo [2/3] Check device connection...
adb devices
echo.

echo [3/3] Install APK to device...
echo Installing KR App production version...
adb install -r "%APK_PATH%"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 🎉 SUCCESS! Production APK Installed!
    echo ========================================
    echo.
    echo ✅ KR App (Production) installed on device
    echo 📱 Look for "KR App" icon on your device
    echo 🔑 Login: admin / admin123
    echo.
    echo 🚀 Production Features:
    echo ✅ Standalone app (no Metro needed)
    echo ✅ Optimized performance
    echo ✅ Supabase integration
    echo ✅ All core features available
    echo.
    echo 💡 This is the final production version
    echo    Ready for distribution and use
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ INSTALLATION FAILED
    echo ========================================
    echo.
    echo Common solutions:
    echo 1. Enable "Developer options" on device
    echo 2. Enable "USB debugging"
    echo 3. Allow "Install from unknown sources"
    echo 4. Check USB cable connection
    echo 5. Try: adb kill-server && adb start-server
    echo.
    echo Manual installation:
    echo 1. Copy APK to device storage
    echo 2. Use file manager to open APK
    echo 3. Allow installation from unknown sources
    echo.
)

echo.
echo Press any key to exit...
pause
