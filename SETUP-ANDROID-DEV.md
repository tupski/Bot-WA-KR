# 🔧 Setup Android Development Environment

## 🚨 **Masalah yang Ditemukan:**
1. ❌ ADB tidak ditemukan
2. ❌ JAVA_HOME tidak diset  
3. ❌ Android SDK belum dikonfigurasi
4. ⚠️ Device unauthorized

## 📋 **Langkah-langkah Setup:**

### **Step 1: Install Java Development Kit (JDK)**

1. **Download JDK 17** (recommended untuk React Native)
   - URL: https://adoptium.net/temurin/releases/
   - Pilih: JDK 17 LTS untuk Windows x64

2. **Install JDK**
   - Jalankan installer
   - Install ke: `C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot\`

3. **Set JAVA_HOME Environment Variable**
   ```cmd
   # Buka Command Prompt as Administrator
   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.x-hotspot" /M
   setx PATH "%PATH%;%JAVA_HOME%\bin" /M
   ```

### **Step 2: Install Android Studio**

1. **Download Android Studio**
   - URL: https://developer.android.com/studio
   - Download versi terbaru

2. **Install Android Studio**
   - Jalankan installer
   - Pilih "Standard" installation
   - Install Android SDK, Android SDK Platform, Android Virtual Device

3. **Configure Android SDK**
   - Buka Android Studio
   - File → Settings → Appearance & Behavior → System Settings → Android SDK
   - Install:
     - Android 13 (API Level 33)
     - Android 12 (API Level 31)
     - Android SDK Build-Tools 33.0.0
     - Android SDK Platform-Tools
     - Android SDK Tools

### **Step 3: Set Environment Variables**

1. **Set ANDROID_HOME**
   ```cmd
   # Default location Android SDK
   setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk" /M
   ```

2. **Update PATH**
   ```cmd
   setx PATH "%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin" /M
   ```

3. **Restart Command Prompt/PowerShell**

### **Step 4: Verify Installation**

```cmd
# Test Java
java -version

# Test ADB
adb version

# Test Android SDK
adb devices
```

### **Step 5: Fix Device Authorization**

1. **Enable Developer Options di Android:**
   - Settings → About Phone
   - Tap "Build Number" 7 kali
   - Developer Options akan muncul

2. **Enable USB Debugging:**
   - Settings → Developer Options
   - Enable "USB Debugging"
   - Enable "Install via USB"

3. **Authorize Computer:**
   ```cmd
   adb devices
   ```
   - Di device akan muncul popup "Allow USB debugging?"
   - Centang "Always allow from this computer"
   - Klik "OK"

4. **Verify Device:**
   ```cmd
   adb devices
   # Should show: PRQ4HA756DKZXWBE    device
   ```

## 🚀 **Alternative: Setup Emulator**

### **Create Android Virtual Device (AVD):**

1. **Buka Android Studio**
2. **Tools → AVD Manager**
3. **Create Virtual Device**
4. **Pilih Device:** Pixel 4 atau Pixel 6
5. **Pilih System Image:** Android 13 (API 33)
6. **Finish**

### **Start Emulator:**
```cmd
# List available emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_4_API_33
```

## 🧪 **Test React Native Build**

### **After Setup Complete:**

```cmd
# Navigate to project
cd d:\Projects\Bot-WA-KR\mobile\KakaRamaRoom

# Check React Native doctor
npx react-native doctor

# Build and run
npx react-native run-android
```

## 🔧 **Quick Fix Commands**

### **If still having issues:**

```cmd
# Clean React Native cache
npx react-native start --reset-cache

# Clean Android build
cd android
.\gradlew clean
cd ..

# Rebuild
npx react-native run-android
```

## 📱 **Expected Result**

Setelah setup berhasil:
1. ✅ `adb devices` menampilkan device
2. ✅ `java -version` menampilkan JDK 17
3. ✅ `npx react-native doctor` semua hijau
4. ✅ App terbuild dan install di device/emulator

## 🚨 **Common Issues & Solutions**

### **"adb not found"**
- Install Android SDK Platform-Tools
- Add to PATH: `%ANDROID_HOME%\platform-tools`

### **"JAVA_HOME not set"**
- Install JDK 17
- Set JAVA_HOME environment variable

### **"SDK location not found"**
- Install Android Studio
- Set ANDROID_HOME environment variable

### **"Device unauthorized"**
- Enable USB Debugging
- Allow computer access on device

### **"Gradle build failed"**
- Clean project: `cd android && .\gradlew clean`
- Check JDK version: `java -version`

## ⏱️ **Estimated Setup Time**
- **Download & Install**: 30-60 minutes
- **Configuration**: 15-30 minutes
- **First Build**: 10-20 minutes
- **Total**: 1-2 hours

---

**Next Steps After Setup:**
1. ✅ Complete environment setup
2. 🔄 Test build React Native app
3. 🔄 Test on real device
4. 🔄 Continue with Supabase integration
