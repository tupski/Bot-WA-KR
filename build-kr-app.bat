@echo off
echo ========================================
echo KR App - Build with Correct Java Path
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/5] Setting correct Java environment...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo ✅ JAVA_HOME: %JAVA_HOME%
echo.

echo Testing Java version...
java --version
if %errorlevel% neq 0 (
    echo ❌ Java not working
    pause
    exit /b 1
)
echo ✅ Java 17 working
echo.

echo [2/5] Checking device connection...
adb devices | findstr "PRQ4HA756DKZXWBE.*device"
if %errorlevel% equ 0 (
    echo ✅ Device ready: PRQ4HA756DKZXWBE
) else (
    echo ❌ Device not ready
    adb devices
    echo.
    echo Please make sure:
    echo 1. Android device is connected via USB
    echo 2. USB Debugging is enabled
    echo 3. Computer is authorized on device
    echo.
    echo Continue anyway? (Y/N)
    set /p continue=
    if /i not "%continue%"=="Y" (
        echo Build cancelled
        pause
        exit /b 1
    )
)
echo.

echo [3/5] Stopping any running Metro...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Metro stopped
echo.

echo [4/5] Cleaning build cache...
if exist "android\build" (
    rmdir /s /q android\build
    echo ✅ Android build cache cleared
)

if exist "android\.gradle" (
    rmdir /s /q android\.gradle
    echo ✅ Gradle cache cleared
)
echo.

echo [5/5] Building KR App...
echo This will take 5-10 minutes for first build...
echo.

echo Starting Metro bundler...
start /b npx react-native start --port 8081

echo Waiting for Metro to initialize...
timeout /t 5 >nul

echo.
echo Building and installing APK to device...
echo.

npx react-native run-android --port 8081

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo 🎉 KR App has been installed on your device!
    echo.
    echo The app should launch automatically.
    echo If not, look for "KR App" icon on your device.
    echo.
    echo 📱 App Features:
    echo - Login as Admin or Field Team
    echo - Manage apartments and units
    echo - Handle check-ins and extensions
    echo - View reports and activity logs
    echo.
    echo 🔑 Default Login:
    echo Username: admin
    echo Password: admin123
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Check the error messages above.
    echo.
    echo Common solutions:
    echo 1. Make sure device is connected and authorized
    echo 2. Check if Android SDK is properly installed
    echo 3. Try running: npx react-native doctor
    echo 4. Clean project and retry
    echo.
    echo If Java errors persist:
    echo 1. Restart Command Prompt as Administrator
    echo 2. Run: fix-java-home.bat
    echo 3. Try build again
    echo.
)

echo.
echo Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1

pause
