@echo off
echo ========================================
echo Setting up Environment Variables
echo ========================================
echo.

echo Setting JAVA_HOME...
for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk-*") do (
    set "JAVA_HOME=%%i"
    echo Found JDK at: %%i
)

if "%JAVA_HOME%"=="" (
    echo ❌ JDK not found in default location
    echo Please install JDK 17 first
    pause
    exit /b 1
)

echo Setting JAVA_HOME to: %JAVA_HOME%
setx JAVA_HOME "%JAVA_HOME%" /M

echo.
echo Setting ANDROID_HOME...
set "ANDROID_HOME=C:\platform-tools"
echo Setting ANDROID_HOME to: %ANDROID_HOME%
setx ANDROID_HOME "%ANDROID_HOME%" /M

echo.
echo Updating PATH...
setx PATH "%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%" /M

echo.
echo ✅ Environment variables set successfully!
echo.
echo ⚠️  IMPORTANT: You must restart Command Prompt/PowerShell
echo    for changes to take effect.
echo.
echo Next steps:
echo 1. Close this window
echo 2. Open new Command Prompt
echo 3. Run: java -version
echo 4. Run: adb version
echo 5. Run: adb devices
echo.
pause
