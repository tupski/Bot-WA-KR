@echo off 
echo ======================================== 
echo KR App - Install to Android Device 
echo ======================================== 
echo. 
echo Checking device connection... 
adb devices 
echo. 
echo Installing KR App... 
adb install -r "KakaRamaRoom-v1.0.0.apk" 
echo. 
echo Installation complete! 
echo Look for "KR App" on your device. 
echo. 
echo Login: admin / admin123 
echo. 
pause 
