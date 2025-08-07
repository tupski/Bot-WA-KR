@echo off
echo ========================================
echo Fix Android Device Authorization
echo ========================================
echo.

echo Checking ADB...
adb version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ADB not found. Please setup environment first.
    echo Run setup-env-vars.bat and restart Command Prompt
    pause
    exit /b 1
)

echo ✅ ADB found
echo.

echo Current connected devices:
adb devices
echo.

echo Checking device status...
for /f "tokens=2" %%i in ('adb devices ^| findstr "PRQ4HA756DKZXWBE"') do set DEVICE_STATUS=%%i

if "%DEVICE_STATUS%"=="device" (
    echo ✅ Device is authorized and ready!
    echo.
    echo You can now run: npx react-native run-android
    pause
    exit /b 0
)

if "%DEVICE_STATUS%"=="unauthorized" (
    echo ⚠️  Device is unauthorized
    echo.
    echo Please follow these steps on your Android device:
    echo.
    echo 1. Look for popup: "Allow USB debugging?"
    echo 2. Check "Always allow from this computer"
    echo 3. Tap "OK"
    echo.
    echo If no popup appears:
    echo 1. Disconnect USB cable
    echo 2. Go to Settings → Developer Options
    echo 3. Turn OFF USB Debugging
    echo 4. Turn ON USB Debugging again
    echo 5. Reconnect USB cable
    echo 6. Allow the popup
    echo.
    echo Press any key to check again...
    pause >nul
    goto :check_again
)

echo ❌ Device not found or not connected
echo.
echo Please:
echo 1. Connect Android device via USB
echo 2. Enable Developer Options (tap Build Number 7 times)
echo 3. Enable USB Debugging in Developer Options
echo 4. Run this script again
echo.
pause
exit /b 1

:check_again
echo.
echo Checking device status again...
adb devices
echo.
for /f "tokens=2" %%i in ('adb devices ^| findstr "PRQ4HA756DKZXWBE"') do set DEVICE_STATUS=%%i

if "%DEVICE_STATUS%"=="device" (
    echo ✅ Device is now authorized!
    echo You can now run: npx react-native run-android
) else (
    echo ❌ Device still unauthorized. Please try the steps above again.
)

echo.
pause
