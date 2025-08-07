@echo off
echo ========================================
echo Fix Android SDK for React Native
echo ========================================
echo.

echo Checking ANDROID_HOME...
if "%ANDROID_HOME%"=="" (
    echo ❌ ANDROID_HOME not set
    echo Please set ANDROID_HOME environment variable first
    pause
    exit /b 1
)

echo ✅ ANDROID_HOME: %ANDROID_HOME%
echo.

echo Checking Android SDK installation...
if not exist "%ANDROID_HOME%" (
    echo ❌ Android SDK directory not found: %ANDROID_HOME%
    echo Please install Android Studio or Android SDK
    pause
    exit /b 1
)

echo ✅ Android SDK directory found
echo.

echo Checking for SDK Manager...
set "SDKMANAGER=%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat"
if exist "%SDKMANAGER%" (
    echo ✅ SDK Manager found
    goto :install_sdk
)

set "SDKMANAGER=%ANDROID_HOME%\tools\bin\sdkmanager.bat"
if exist "%SDKMANAGER%" (
    echo ✅ SDK Manager found (legacy location)
    goto :install_sdk
)

echo ❌ SDK Manager not found
echo.
echo SDK Manager is required to install Android SDK components.
echo.
echo Please install Android Studio which includes SDK Manager:
echo 1. Download: https://developer.android.com/studio
echo 2. Install Android Studio
echo 3. Open Android Studio
echo 4. Go to: Tools → SDK Manager
echo 5. Install Android SDK Command-line Tools
echo.
pause
exit /b 1

:install_sdk
echo.
echo Installing required Android SDK components...
echo This may take a few minutes...
echo.

echo Installing Android SDK Platform 35...
"%SDKMANAGER%" "platforms;android-35"
if %errorlevel% neq 0 (
    echo ⚠️  Failed to install Android 35, trying Android 34...
    "%SDKMANAGER%" "platforms;android-34"
)

echo.
echo Installing Build Tools 35.0.0...
"%SDKMANAGER%" "build-tools;35.0.0"
if %errorlevel% neq 0 (
    echo ⚠️  Failed to install Build Tools 35.0.0, trying 34.0.0...
    "%SDKMANAGER%" "build-tools;34.0.0"
)

echo.
echo Installing Platform Tools...
"%SDKMANAGER%" "platform-tools"

echo.
echo Installing Android SDK Tools...
"%SDKMANAGER%" "tools"

echo.
echo Accepting licenses...
echo y | "%SDKMANAGER%" --licenses

echo.
echo ========================================
echo Verifying Installation
echo ========================================
echo.

echo Checking installed platforms...
if exist "%ANDROID_HOME%\platforms\android-35" (
    echo ✅ Android SDK 35 installed
) else if exist "%ANDROID_HOME%\platforms\android-34" (
    echo ✅ Android SDK 34 installed
) else (
    echo ❌ No Android SDK platform found
)

echo.
echo Checking build tools...
if exist "%ANDROID_HOME%\build-tools\35.0.0" (
    echo ✅ Build Tools 35.0.0 installed
) else if exist "%ANDROID_HOME%\build-tools\34.0.0" (
    echo ✅ Build Tools 34.0.0 installed
) else (
    echo ❌ No build tools found
)

echo.
echo Running React Native doctor to verify...
cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"
npx react-native doctor

echo.
echo ========================================
echo Android SDK Setup Complete!
echo ========================================
echo.
echo If React Native doctor shows all green checkmarks,
echo you can now run: npx react-native run-android
echo.
pause
