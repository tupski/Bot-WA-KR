@echo off
echo.
echo ========================================================
echo 🚀 Setting up Firebase Push Notification - KakaRama Room
echo ========================================================
echo.

REM Check if we're in the right directory
if not exist "mobile\KakaRamaRoom\package.json" (
    echo ❌ Please run this script from the project root directory
    echo    Expected: D:\Projects\Bot-WA-KR
    pause
    exit /b 1
)

echo ✅ Project directory confirmed
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Check Supabase CLI
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Supabase CLI not found. Installing...
    echo.
    
    REM Try Chocolatey first
    choco --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo Using Chocolatey to install Supabase CLI...
        choco install supabase -y
        if %errorlevel% neq 0 (
            echo ❌ Failed to install via Chocolatey
            goto manual_install
        )
        echo ✅ Supabase CLI installed via Chocolatey
    ) else (
        REM Try Scoop
        scoop --version >nul 2>&1
        if %errorlevel% equ 0 (
            echo Using Scoop to install Supabase CLI...
            scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
            scoop install supabase
            if %errorlevel% neq 0 (
                echo ❌ Failed to install via Scoop
                goto manual_install
            )
            echo ✅ Supabase CLI installed via Scoop
        ) else (
            goto manual_install
        )
    )
) else (
    echo ✅ Supabase CLI already installed
)

goto check_firebase

:manual_install
echo.
echo ❌ Neither Chocolatey nor Scoop found.
echo.
echo Please install Supabase CLI manually:
echo 1. Download from: https://github.com/supabase/cli/releases
echo 2. Extract supabase.exe to a folder
echo 3. Add the folder to your PATH environment variable
echo 4. Restart Command Prompt and run this script again
echo.
pause
exit /b 1

:check_firebase
echo.
echo 🔐 Checking Firebase Service Account...

if not exist "credentials\firebase-service-account.json" (
    echo ❌ Firebase Service Account not found
    echo    Expected location: credentials\firebase-service-account.json
    echo    Please ensure the service account key is placed in the credentials folder.
    pause
    exit /b 1
)

echo ✅ Firebase Service Account found
echo.

REM Convert to base64 using PowerShell
echo Converting service account to base64...
powershell -Command "$content = Get-Content 'credentials\firebase-service-account.json' -Raw; $bytes = [System.Text.Encoding]::UTF8.GetBytes($content); $base64 = [System.Convert]::ToBase64String($bytes); $base64 | Out-File 'credentials\firebase-service-account-base64.txt' -Encoding UTF8"

if %errorlevel% neq 0 (
    echo ❌ Failed to convert service account to base64
    pause
    exit /b 1
)

echo ✅ Base64 conversion completed
echo 📄 Base64 saved to: credentials\firebase-service-account-base64.txt
echo.

REM Manual steps
echo 🔗 Supabase Setup - Please run these commands manually:
echo ================================================
echo.
echo 1. Login to Supabase:
echo    supabase login
echo.
echo 2. Link to project:
echo    supabase link --project-ref rvcknyuinfssgpgkfetx
echo.
echo 3. Set Firebase Service Account secret:
echo    supabase secrets set FIREBASE_SERVICE_ACCOUNT="<paste_base64_from_file>"
echo.
echo 4. Deploy Edge Function:
echo    supabase functions deploy send-push-notification
echo.

REM Ask about building APK
set /p build_apk="Do you want to build the APK now? (y/n): "
if /i "%build_apk%"=="y" (
    echo.
    echo 📱 Building APK...
    cd mobile\KakaRamaRoom
    
    if exist "android\gradlew.bat" (
        echo Building release APK...
        call android\gradlew.bat -p android assembleRelease
        
        if %errorlevel% equ 0 (
            echo ✅ APK built successfully!
            echo 📱 APK location: mobile\KakaRamaRoom\android\app\build\outputs\apk\release\
        ) else (
            echo ❌ APK build failed. Check the logs above.
        )
    ) else (
        echo ❌ Android Gradle wrapper not found.
        echo    Please ensure Android development environment is set up.
    )
    
    cd ..\..
)

echo.
echo 🎉 Setup Complete!
echo =================
echo.
echo Next Steps:
echo 1. Complete Supabase setup (login, link, set secrets, deploy function)
echo 2. Install APK on physical device (not emulator)
echo 3. Test push notifications using the admin panel
echo 4. Check console logs for any issues
echo.
echo 📚 Documentation:
echo - Testing Guide: TESTING_PUSH_NOTIFICATION.md
echo - Deployment Guide: supabase\DEPLOYMENT.md
echo.
echo 🔐 Security Notes:
echo - Firebase Service Account base64 is in: credentials\firebase-service-account-base64.txt
echo - Delete this file after setting Supabase secrets
echo - Never commit credentials folder to Git
echo.
echo Happy coding! 🚀
echo.
pause
