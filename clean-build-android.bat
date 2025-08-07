@echo off
echo ========================================
echo KR App - Clean Build Android
echo ========================================
echo.

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

echo [1/7] Checking Java version...
java -version 2>&1 | findstr "version"
echo.

echo [2/7] Checking Android SDK...
if exist "%ANDROID_HOME%\platforms\android-35" (
    echo ✅ Android SDK 35 found
) else (
    echo ❌ Android SDK 35 not found, installing...
    if exist "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" (
        "%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat" "platforms;android-35" "build-tools;35.0.0"
        echo ✅ Android SDK 35 installed
    ) else (
        echo ⚠️  SDK Manager not found, continuing with available SDK...
    )
)
echo.

echo [3/7] Stopping Metro bundler...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Metro stopped

echo.
echo [4/7] Cleaning React Native cache...
npx react-native start --reset-cache --port 8081 >nul 2>&1 &
timeout /t 2 >nul
taskkill /f /im node.exe >nul 2>&1
echo ✅ React Native cache cleared

echo.
echo [5/7] Cleaning Android build cache...
cd android
if exist "build" (
    rmdir /s /q build
    echo ✅ Android build cache cleared
)
if exist ".gradle" (
    rmdir /s /q .gradle
    echo ✅ Gradle cache cleared
)

echo.
echo [6/7] Cleaning Gradle wrapper cache...
if exist "%USERPROFILE%\.gradle\wrapper\dists" (
    rmdir /s /q "%USERPROFILE%\.gradle\wrapper\dists"
    echo ✅ Gradle wrapper cache cleared
)

cd ..

echo.
echo [7/7] Starting fresh build...
echo This will take 5-10 minutes...
echo.

echo Checking device connection...
adb devices | findstr "device$"
if %errorlevel% neq 0 (
    echo ⚠️  No authorized device found
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
echo Starting React Native build with Java 17...
echo.

set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.13.11-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

npx react-native run-android --verbose

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✅ BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo App should be installed and running on your device.
    echo Look for "KR App" icon.
    echo.
    echo If app doesn't start automatically:
    echo 1. Find "KR App" on device
    echo 2. Tap to open
    echo 3. Grant any permissions if asked
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ BUILD FAILED
    echo ========================================
    echo.
    echo Common solutions:
    echo 1. Make sure JDK 17 is installed
    echo 2. Check device is connected and authorized
    echo 3. Try running: npx react-native doctor
    echo 4. Check error messages above
    echo.
    echo If Java version error persists:
    echo 1. Run: fix-java-version.bat
    echo 2. Restart Command Prompt
    echo 3. Try build again
    echo.
)

pause
