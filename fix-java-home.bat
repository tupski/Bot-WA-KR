@echo off
echo ========================================
echo Fix JAVA_HOME Path
echo ========================================
echo.

echo Current JAVA_HOME: %JAVA_HOME%
echo.

echo Searching for JDK 17 installation...
echo.

set "FOUND_JAVA="

REM Check common JDK 17 locations
for /d %%i in ("C:\Program Files\Eclipse Adoptium\jdk-17*") do (
    if exist "%%i\bin\java.exe" (
        set "FOUND_JAVA=%%i"
        echo ✅ Found JDK 17 at: %%i
        goto :found
    )
)

for /d %%i in ("C:\Program Files\Java\jdk-17*") do (
    if exist "%%i\bin\java.exe" (
        set "FOUND_JAVA=%%i"
        echo ✅ Found JDK 17 at: %%i
        goto :found
    )
)

for /d %%i in ("C:\Program Files\OpenJDK\jdk-17*") do (
    if exist "%%i\bin\java.exe" (
        set "FOUND_JAVA=%%i"
        echo ✅ Found JDK 17 at: %%i
        goto :found
    )
)

echo ❌ JDK 17 not found in common locations
echo.
echo Please check if JDK 17 is installed:
java --version
echo.
echo If Java 17 is working but path is wrong, please:
echo 1. Find your JDK 17 installation directory
echo 2. Set JAVA_HOME manually
echo.
pause
exit /b 1

:found
echo.
echo Setting JAVA_HOME to: %FOUND_JAVA%
setx JAVA_HOME "%FOUND_JAVA%" /M

echo.
echo Updating gradle.properties...
set "GRADLE_PROPS=D:\Projects\Bot-WA-KR\mobile\KakaRamaRoom\android\gradle.properties"

REM Remove old java.home line
findstr /v "org.gradle.java.home" "%GRADLE_PROPS%" > "%GRADLE_PROPS%.tmp"
move "%GRADLE_PROPS%.tmp" "%GRADLE_PROPS%"

REM Add new java.home line with correct path
echo. >> "%GRADLE_PROPS%"
echo # Force Java 17 for Android Gradle Plugin (auto-detected) >> "%GRADLE_PROPS%"
echo org.gradle.java.home=%FOUND_JAVA:\=\\% >> "%GRADLE_PROPS%"

echo ✅ gradle.properties updated
echo.

echo Testing Java path...
"%FOUND_JAVA%\bin\java.exe" --version
if %errorlevel% equ 0 (
    echo ✅ Java 17 is working correctly
) else (
    echo ❌ Java 17 test failed
)

echo.
echo ========================================
echo JAVA_HOME Fix Complete!
echo ========================================
echo.
echo ⚠️  IMPORTANT: 
echo 1. Close ALL Command Prompt windows
echo 2. Open NEW Command Prompt
echo 3. Test: java --version
echo 4. Try build again
echo.
pause
