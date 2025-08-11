# Setup Firebase Push Notification - PowerShell Script
# Untuk Windows - KakaRama Room Project

Write-Host "🚀 Setting up Firebase Push Notification for KakaRama Room" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "⚠️  Warning: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host "   Consider running PowerShell as Administrator for best results." -ForegroundColor Yellow
    Write-Host ""
}

# Function to check if command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Step 1: Check prerequisites
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Cyan

# Check Node.js
if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if we're in the right directory
if (-not (Test-Path "mobile\KakaRamaRoom\package.json")) {
    Write-Host "❌ Please run this script from the project root directory (D:\Projects\Bot-WA-KR)" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project directory confirmed" -ForegroundColor Green

# Step 2: Install Supabase CLI
Write-Host ""
Write-Host "📦 Step 2: Installing Supabase CLI..." -ForegroundColor Cyan

if (Test-Command "supabase") {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI already installed: $supabaseVersion" -ForegroundColor Green
} else {
    Write-Host "Installing Supabase CLI..." -ForegroundColor Yellow
    
    # Try Chocolatey first
    if (Test-Command "choco") {
        Write-Host "Using Chocolatey to install Supabase CLI..." -ForegroundColor Yellow
        try {
            choco install supabase -y
            Write-Host "✅ Supabase CLI installed via Chocolatey" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to install via Chocolatey: $_" -ForegroundColor Red
        }
    }
    # Try Scoop if Chocolatey failed or not available
    elseif (Test-Command "scoop") {
        Write-Host "Using Scoop to install Supabase CLI..." -ForegroundColor Yellow
        try {
            scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
            scoop install supabase
            Write-Host "✅ Supabase CLI installed via Scoop" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to install via Scoop: $_" -ForegroundColor Red
        }
    }
    # Manual installation guide
    else {
        Write-Host "❌ Neither Chocolatey nor Scoop found." -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install Supabase CLI manually:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://github.com/supabase/cli/releases" -ForegroundColor Yellow
        Write-Host "2. Extract supabase.exe to a folder" -ForegroundColor Yellow
        Write-Host "3. Add the folder to your PATH environment variable" -ForegroundColor Yellow
        Write-Host "4. Restart PowerShell and run this script again" -ForegroundColor Yellow
        exit 1
    }
}

# Verify Supabase CLI installation
if (-not (Test-Command "supabase")) {
    Write-Host "❌ Supabase CLI installation failed. Please install manually." -ForegroundColor Red
    exit 1
}

# Step 3: Check Firebase Service Account
Write-Host ""
Write-Host "🔐 Step 3: Checking Firebase Service Account..." -ForegroundColor Cyan

if (Test-Path "credentials\firebase-service-account.json") {
    Write-Host "✅ Firebase Service Account found" -ForegroundColor Green
    
    # Convert to base64
    Write-Host "Converting service account to base64..." -ForegroundColor Yellow
    try {
        $content = Get-Content "credentials\firebase-service-account.json" -Raw
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
        $base64 = [System.Convert]::ToBase64String($bytes)
        
        # Save base64 to temp file for easy copying
        $base64 | Out-File "credentials\firebase-service-account-base64.txt" -Encoding UTF8
        Write-Host "✅ Base64 conversion completed" -ForegroundColor Green
        Write-Host "📄 Base64 saved to: credentials\firebase-service-account-base64.txt" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to convert service account to base64: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Firebase Service Account not found at: credentials\firebase-service-account.json" -ForegroundColor Red
    Write-Host "   Please ensure the service account key is placed in the credentials folder." -ForegroundColor Yellow
    exit 1
}

# Step 4: Supabase Login and Setup
Write-Host ""
Write-Host "🔗 Step 4: Supabase Setup..." -ForegroundColor Cyan

Write-Host "Please follow these manual steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Login to Supabase:" -ForegroundColor White
Write-Host "   supabase login" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Link to project:" -ForegroundColor White
Write-Host "   supabase link --project-ref rvcknyuinfssgpgkfetx" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Set Firebase Service Account secret:" -ForegroundColor White
Write-Host "   supabase secrets set FIREBASE_SERVICE_ACCOUNT=`"<paste_base64_from_file>`"" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Deploy Edge Function:" -ForegroundColor White
Write-Host "   supabase functions deploy send-push-notification" -ForegroundColor Gray
Write-Host ""

# Step 5: Build APK
Write-Host "📱 Step 5: Building APK..." -ForegroundColor Cyan

$buildChoice = Read-Host "Do you want to build the APK now? (y/n)"
if ($buildChoice -eq "y" -or $buildChoice -eq "Y") {
    Write-Host "Building APK..." -ForegroundColor Yellow
    
    try {
        Set-Location "mobile\KakaRamaRoom"
        
        # Check if Android SDK is available
        if (Test-Path "android\gradlew.bat") {
            Write-Host "Building release APK..." -ForegroundColor Yellow
            .\android\gradlew.bat -p android assembleRelease
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ APK built successfully!" -ForegroundColor Green
                Write-Host "📱 APK location: mobile\KakaRamaRoom\android\app\build\outputs\apk\release\" -ForegroundColor Green
            } else {
                Write-Host "❌ APK build failed. Check the logs above." -ForegroundColor Red
            }
        } else {
            Write-Host "❌ Android Gradle wrapper not found. Please ensure Android development environment is set up." -ForegroundColor Red
        }
        
        Set-Location "..\..\"
    } catch {
        Write-Host "❌ Error building APK: $_" -ForegroundColor Red
        Set-Location "..\..\"
    }
}

# Step 6: Final Instructions
Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Complete Supabase setup (login, link, set secrets, deploy function)" -ForegroundColor White
Write-Host "2. Install APK on physical device (not emulator)" -ForegroundColor White
Write-Host "3. Test push notifications using the admin panel" -ForegroundColor White
Write-Host "4. Check console logs for any issues" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "- Testing Guide: TESTING_PUSH_NOTIFICATION.md" -ForegroundColor White
Write-Host "- Deployment Guide: supabase\DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Security Notes:" -ForegroundColor Yellow
Write-Host "- Firebase Service Account base64 is in: credentials\firebase-service-account-base64.txt" -ForegroundColor White
Write-Host "- Delete this file after setting Supabase secrets" -ForegroundColor White
Write-Host "- Never commit credentials folder to Git" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
