@echo off
echo ========================================
echo Installing Image Picker Dependencies
echo ========================================

cd mobile\KakaRamaRoom

echo.
echo [1/4] Installing npm packages...
call npm install

echo.
echo [2/4] Installing pods for iOS (if applicable)...
if exist ios (
    cd ios
    call pod install
    cd ..
) else (
    echo iOS folder not found, skipping pod install
)

echo.
echo [3/4] Cleaning and rebuilding...
call npx react-native clean

echo.
echo [4/4] Building APK...
call gradlew clean -p android
call gradlew assembleRelease -p android

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo New packages installed:
echo - react-native-image-picker ^7.1.0
echo - react-native-image-resizer ^3.0.7  
echo - react-native-permissions ^4.1.5
echo.
echo Permissions added to AndroidManifest.xml:
echo - CAMERA
echo - READ_EXTERNAL_STORAGE
echo - WRITE_EXTERNAL_STORAGE
echo - READ_MEDIA_IMAGES
echo.
echo Features now available:
echo - Take photo with camera
echo - Select photo from gallery
echo - Image resize and optimization
echo - Upload to Supabase Storage
echo - Image preview in UI
echo.
echo APK Location: android\app\build\outputs\apk\release\
echo.
pause
