@echo off
echo ========================================
echo KakaRama Room - Android Environment Check
echo ========================================
echo.

echo [1/6] Checking Java...
java -version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Java not found
    echo 📥 Download JDK 17: https://adoptium.net/temurin/releases/
    echo 🔧 Set JAVA_HOME environment variable
) else (
    echo ✅ Java found
)
echo.

echo [2/6] Checking JAVA_HOME...
if "%JAVA_HOME%"=="" (
    echo ❌ JAVA_HOME not set
    echo 🔧 Set JAVA_HOME to JDK installation path
) else (
    echo ✅ JAVA_HOME: %JAVA_HOME%
)
echo.

echo [3/6] Checking Android SDK...
if "%ANDROID_HOME%"=="" (
    echo ❌ ANDROID_HOME not set
    echo 📥 Install Android Studio: https://developer.android.com/studio
    echo 🔧 Set ANDROID_HOME environment variable
) else (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
)
echo.

echo [4/6] Checking ADB...
adb version 2>nul
if %errorlevel% neq 0 (
    echo ❌ ADB not found
    echo 🔧 Add to PATH: %%ANDROID_HOME%%\platform-tools
) else (
    echo ✅ ADB found
)
echo.

echo [5/6] Checking connected devices...
adb devices 2>nul
if %errorlevel% neq 0 (
    echo ❌ Cannot check devices (ADB not working)
) else (
    echo ✅ ADB devices command works
)
echo.

echo [6/6] Checking Node.js and React Native...
node --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
) else (
    echo ✅ Node.js found
)

npx react-native --version 2>nul
if %errorlevel% neq 0 (
    echo ❌ React Native CLI not found
) else (
    echo ✅ React Native CLI found
)
echo.

echo ========================================
echo Summary & Next Steps:
echo ========================================
echo.
echo If you see ❌ errors above:
echo 1. Follow SETUP-ANDROID-DEV.md guide
echo 2. Install missing components
echo 3. Set environment variables
echo 4. Restart Command Prompt
echo 5. Run this script again
echo.
echo If all ✅ green:
echo 1. Connect Android device via USB
echo 2. Enable USB Debugging
echo 3. Run: adb devices
echo 4. Run: npx react-native run-android
echo.
pause
