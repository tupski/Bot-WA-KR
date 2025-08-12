@echo off
echo ========================================
echo KakaRama Room - Deploy Android APK
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

set "APK_PATH=android\app\build\outputs\apk\release\app-release.apk"
set "DEPLOY_DIR=D:\Projects\Bot-WA-KR\deploy"
set "APK_NAME=KakaRamaRoom-v2.1.0.apk"

echo [1/5] Check APK file...
if exist "%APK_PATH%" (
    echo ✅ APK found: %APK_PATH%
    
    echo Getting APK info...
    for %%A in ("%APK_PATH%") do (
        echo    📁 Size: %%~zA bytes
        echo    📅 Date: %%~tA
    )
) else (
    echo ❌ APK not found: %APK_PATH%
    echo.
    echo Please build APK first:
    echo   D:\Projects\Bot-WA-KR\build-production-apk.bat
    echo.
    pause
    exit /b 1
)
echo.

echo [2/5] Create deployment directory...
if not exist "%DEPLOY_DIR%" (
    mkdir "%DEPLOY_DIR%"
    echo ✅ Created deploy directory: %DEPLOY_DIR%
) else (
    echo ✅ Deploy directory exists: %DEPLOY_DIR%
)
echo.

echo [3/5] Copy APK to deployment directory...
copy "%APK_PATH%" "%DEPLOY_DIR%\%APK_NAME%"
if %errorlevel% equ 0 (
    echo ✅ APK copied to: %DEPLOY_DIR%\%APK_NAME%
) else (
    echo ❌ Failed to copy APK
    pause
    exit /b 1
)
echo.

echo [4/5] Generate deployment info...
echo Creating deployment documentation...

echo # KakaRama Room App - Deployment Package > "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 📱 APK Information >> "%DEPLOY_DIR%\README.md"
echo - **File**: %APK_NAME% >> "%DEPLOY_DIR%\README.md"
echo - **Version**: 2.1.0 >> "%DEPLOY_DIR%\README.md"
echo - **Build Date**: %date% %time% >> "%DEPLOY_DIR%\README.md"
echo - **Platform**: Android >> "%DEPLOY_DIR%\README.md"
echo - **Architecture**: Universal APK >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 🚀 Installation Instructions >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ### Method 1: Direct Install >> "%DEPLOY_DIR%\README.md"
echo 1. Copy APK file to Android device >> "%DEPLOY_DIR%\README.md"
echo 2. Enable "Install from unknown sources" in Settings >> "%DEPLOY_DIR%\README.md"
echo 3. Tap APK file to install >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ### Method 2: ADB Install >> "%DEPLOY_DIR%\README.md"
echo ```bash >> "%DEPLOY_DIR%\README.md"
echo adb install %APK_NAME% >> "%DEPLOY_DIR%\README.md"
echo ``` >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 🔑 Login Credentials >> "%DEPLOY_DIR%\README.md"
echo - **Username**: admin >> "%DEPLOY_DIR%\README.md"
echo - **Password**: admin123 >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 🌐 Features >> "%DEPLOY_DIR%\README.md"
echo - ✅ Real-time sync with Supabase >> "%DEPLOY_DIR%\README.md"
echo - ✅ Admin dashboard >> "%DEPLOY_DIR%\README.md"
echo - ✅ Apartment management >> "%DEPLOY_DIR%\README.md"
echo - ✅ Unit management >> "%DEPLOY_DIR%\README.md"
echo - ✅ Checkin management >> "%DEPLOY_DIR%\README.md"
echo - ✅ Activity logs >> "%DEPLOY_DIR%\README.md"
echo - ✅ Top marketing reports >> "%DEPLOY_DIR%\README.md"
echo - ✅ Field team access >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 🔧 Technical Requirements >> "%DEPLOY_DIR%\README.md"
echo - **Android Version**: 6.0+ (API 23+) >> "%DEPLOY_DIR%\README.md"
echo - **RAM**: 2GB minimum, 4GB recommended >> "%DEPLOY_DIR%\README.md"
echo - **Storage**: 100MB free space >> "%DEPLOY_DIR%\README.md"
echo - **Network**: Internet connection required >> "%DEPLOY_DIR%\README.md"
echo. >> "%DEPLOY_DIR%\README.md"
echo ## 📞 Support >> "%DEPLOY_DIR%\README.md"
echo For technical support, contact the development team. >> "%DEPLOY_DIR%\README.md"

echo ✅ Deployment documentation created
echo.

echo [5/5] Create installation script...
echo Creating Windows installation helper...

echo @echo off > "%DEPLOY_DIR%\install-to-device.bat"
echo echo ======================================== >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo KR App - Install to Android Device >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo ======================================== >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo. >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo Checking device connection... >> "%DEPLOY_DIR%\install-to-device.bat"
echo adb devices >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo. >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo Installing KR App... >> "%DEPLOY_DIR%\install-to-device.bat"
echo adb install -r "%APK_NAME%" >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo. >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo Installation complete! >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo Look for "KR App" on your device. >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo. >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo Login: admin / admin123 >> "%DEPLOY_DIR%\install-to-device.bat"
echo echo. >> "%DEPLOY_DIR%\install-to-device.bat"
echo pause >> "%DEPLOY_DIR%\install-to-device.bat"

echo ✅ Installation script created
echo.

echo ========================================
echo 🎉 DEPLOYMENT PACKAGE READY!
echo ========================================
echo.
echo 📦 Deployment Location: %DEPLOY_DIR%
echo 📱 APK File: %APK_NAME%
echo 📄 Documentation: README.md
echo 🔧 Installation Script: install-to-device.bat
echo.
echo 📊 Package Contents:
dir "%DEPLOY_DIR%" /b
echo.
echo 🚀 Distribution Options:
echo.
echo 1. **USB Transfer**:
echo    • Copy entire deploy folder to USB drive
echo    • Transfer to target device
echo    • Run install-to-device.bat
echo.
echo 2. **Network Share**:
echo    • Share deploy folder on network
echo    • Download APK on target device
echo    • Install manually
echo.
echo 3. **Cloud Storage**:
echo    • Upload APK to Google Drive/Dropbox
echo    • Share download link
echo    • Install on target devices
echo.
echo 4. **Direct ADB**:
echo    • Connect device via USB
echo    • Run: adb install %APK_NAME%
echo.
echo 🔑 Default Login: admin / admin123
echo.
echo ✅ Ready for production deployment!
echo.

cd /d "D:\Projects\Bot-WA-KR"

echo Press any key to open deployment folder...
pause
explorer "%DEPLOY_DIR%"
