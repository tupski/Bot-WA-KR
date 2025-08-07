@echo off
echo ========================================
echo Fix Java Version for React Native Build
echo ========================================
echo.

echo Checking current Java version...
java -version 2>&1 | findstr "version" | findstr "11\."
if %errorlevel% equ 0 (
    echo ❌ Java 11 detected - need Java 17 for Android Gradle Plugin
) else (
    java -version 2>&1 | findstr "version" | findstr "17\."
    if %errorlevel% equ 0 (
        echo ✅ Java 17 detected
        goto :check_gradle_config
    ) else (
        echo ⚠️  Java version unclear, checking installation...
    )
)

echo.
echo Checking for JDK 17 installation...
if exist "C:\Program Files\Eclipse Adoptium\jdk-17*" (
    echo ✅ JDK 17 found in Program Files
    goto :set_java_home
) else (
    echo ❌ JDK 17 not found
    goto :download_jdk
)

:download_jdk
echo.
echo JDK 17 is required for React Native 0.80+ with Android Gradle Plugin
echo.
echo Please download and install JDK 17:
echo 1. Open: https://adoptium.net/temurin/releases/
echo 2. Select: JDK 17 LTS
echo 3. Platform: Windows x64
echo 4. Package Type: MSI
echo 5. Download and install
echo.
echo After installation, run this script again.
echo.
pause
exit /b 1

:set_java_home
echo.
echo Setting JAVA_HOME for JDK 17...
for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do (
    set "JAVA_HOME=%%i"
    echo Found JDK 17 at: %%i
)

if "%JAVA_HOME%"=="" (
    echo ❌ Could not find JDK 17 directory
    goto :download_jdk
)

echo Setting JAVA_HOME to: %JAVA_HOME%
setx JAVA_HOME "%JAVA_HOME%" /M
setx PATH "%PATH%;%JAVA_HOME%\bin" /M

:check_gradle_config
echo.
echo Checking gradle.properties configuration...
findstr "org.gradle.java.home" "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android\gradle.properties" >nul
if %errorlevel% equ 0 (
    echo ✅ gradle.properties already configured for Java 17
) else (
    echo ❌ gradle.properties not configured
    echo Adding Java 17 configuration to gradle.properties...
    echo. >> "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android\gradle.properties"
    echo # Force Java 17 for Android Gradle Plugin >> "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android\gradle.properties"
    echo org.gradle.java.home=C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.13.11-hotspot >> "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android\gradle.properties"
    echo ✅ gradle.properties updated
)

echo.
echo Cleaning Gradle cache to force Java version refresh...
cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android"
if exist ".gradle" (
    rmdir /s /q .gradle
    echo ✅ Gradle cache cleared
)

cd /d "D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom"
if exist "node_modules\.bin\.gradle" (
    rmdir /s /q "node_modules\.bin\.gradle"
    echo ✅ Node modules Gradle cache cleared
)

echo.
echo ========================================
echo Java 17 Setup Complete!
echo ========================================
echo.
echo ⚠️  IMPORTANT: 
echo 1. Close ALL Command Prompt/PowerShell windows
echo 2. Open NEW Command Prompt
echo 3. Navigate to: D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom
echo 4. Run: npx react-native run-android
echo.
echo The build should now use Java 17 instead of Java 11.
echo.
pause
