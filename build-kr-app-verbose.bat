@echo off
echo ========================================
echo KR App - Build with Verbose Output
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/5] Setting correct Java environment...
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo ✅ JAVA_HOME: %JAVA_HOME%
echo ✅ Current directory: %CD%
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
echo Running: adb devices
adb devices
echo.

echo Checking for specific device...
adb devices | findstr "PRQ4HA756DKZXWBE"
echo Device check result: %errorlevel%

adb devices | findstr "PRQ4HA756DKZXWBE.*device"
if %errorlevel% equ 0 (
    echo ✅ Device ready: PRQ4HA756DKZXWBE
) else (
    echo ⚠️  Device status unclear, continuing anyway...
)
echo.

echo [3/5] Stopping any running Metro...
echo Killing node processes...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Metro stopped
echo.

echo [4/5] Cleaning build cache...
echo Checking android/build directory...
if exist "android\build" (
    echo Removing android/build...
    rmdir /s /q android\build
    echo ✅ Android build cache cleared
) else (
    echo No android/build directory found
)

echo Checking android/.gradle directory...
if exist "android\.gradle" (
    echo Removing android/.gradle...
    rmdir /s /q android\.gradle
    echo ✅ Gradle cache cleared
) else (
    echo No android/.gradle directory found
)
echo.

echo [5/5] Building KR App...
echo This will take 5-10 minutes for first build...
echo.

echo Checking if Metro is already running...
netstat -ano | findstr ":8081"
if %errorlevel% equ 0 (
    echo Metro already running on port 8081
) else (
    echo Starting Metro bundler...
    start /b npx react-native start --port 8081
    echo Waiting for Metro to initialize...
    timeout /t 5 >nul
)

echo.
echo Checking Metro status...
netstat -ano | findstr ":8081"
echo.

echo Building and installing APK to device...
echo Running: npx react-native run-android --port 8081 --verbose
echo.

npx react-native run-android --port 8081 --verbose

echo.
echo Build command finished with exit code: %errorlevel%

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo 🎉 KR App has been installed on your device!
    echo Look for "KR App" icon on your device.
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Exit code: %errorlevel%
    echo Check the verbose output above for specific errors.
    echo.
)

echo.
echo Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Press any key to exit...
pause
