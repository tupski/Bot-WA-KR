@echo off
echo ========================================
echo Fix Corrupt NDK Issue
echo ========================================
echo.

echo [1/4] Stopping all processes...
taskkill /f /im node.exe >nul 2>&1
taskkill /f /im java.exe >nul 2>&1
echo ✅ Processes stopped
echo.

echo [2/4] Cleaning corrupt NDK...
set "NDK_PATH=C:\Users\octar\AppData\Local\Android\Sdk\ndk\27.0.12077973"
if exist "%NDK_PATH%" (
    echo Removing corrupt NDK: %NDK_PATH%
    rmdir /s /q "%NDK_PATH%"
    echo ✅ Corrupt NDK removed
) else (
    echo NDK path not found, continuing...
)

echo Cleaning other NDK versions...
if exist "C:\Users\octar\AppData\Local\Android\Sdk\ndk\27.1.12297006" (
    rmdir /s /q "C:\Users\octar\AppData\Local\Android\Sdk\ndk\27.1.12297006"
    echo ✅ Old NDK removed
)
echo.

echo [3/4] Cleaning Gradle cache...
cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"

if exist "android\build" (
    rmdir /s /q android\build
    echo ✅ Android build cleaned
)

if exist "android\.gradle" (
    rmdir /s /q android\.gradle
    echo ✅ Gradle cache cleaned
)

if exist "%USERPROFILE%\.gradle" (
    rmdir /s /q "%USERPROFILE%\.gradle"
    echo ✅ User Gradle cache cleaned
)
echo.

echo [4/4] Force clean Gradle daemon...
cd android
gradlew.bat --stop
echo ✅ Gradle daemon stopped
cd ..
echo.

echo ========================================
echo NDK Cleanup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. NDK will be downloaded fresh on next build
echo 2. Run: build-kr-clean.bat
echo 3. Let it download NDK completely (don't abort!)
echo.
pause
