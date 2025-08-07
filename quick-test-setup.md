# 🚀 Quick Test Setup - KakaRama Room

## 🎯 **Untuk Testing Cepat Tanpa Setup Android Studio**

### **Option A: Install Minimal Android Tools**

1. **Download Platform Tools Only**
   - URL: https://developer.android.com/studio/releases/platform-tools
   - Extract ke: `C:\platform-tools`

2. **Set PATH untuk ADB**
   ```cmd
   setx PATH "%PATH%;C:\platform-tools" /M
   ```

3. **Download JDK 17 Portable**
   - URL: https://adoptium.net/temurin/releases/
   - Extract ke: `C:\jdk-17`

4. **Set JAVA_HOME**
   ```cmd
   setx JAVA_HOME "C:\jdk-17" /M
   setx PATH "%PATH%;C:\jdk-17\bin" /M
   ```

5. **Restart Command Prompt dan Test**
   ```cmd
   java -version
   adb version
   ```

### **Option B: Use Expo Development Build**

1. **Install Expo CLI**
   ```cmd
   npm install -g @expo/cli
   ```

2. **Convert to Expo Project**
   ```cmd
   cd mobile\KakaRamaRoom
   npx expo install --fix
   ```

3. **Install Expo Go di Android**
   - Download dari Play Store: "Expo Go"

4. **Start Development Server**
   ```cmd
   npx expo start
   ```

5. **Scan QR Code dengan Expo Go**

## 🔧 **Current Status & Immediate Actions**

### **Berdasarkan check environment:**
- ✅ Node.js v22.16.0 (Good)
- ❌ Java not found
- ❌ Android SDK not found  
- ❌ ADB not found

### **Minimal Setup untuk Build APK:**

1. **Install JDK 17** (Required)
   ```cmd
   # Download dari: https://adoptium.net/temurin/releases/
   # Install atau extract ke C:\jdk-17
   setx JAVA_HOME "C:\jdk-17" /M
   ```

2. **Install Android Command Line Tools** (Required)
   ```cmd
   # Download dari: https://developer.android.com/studio#command-tools
   # Extract ke C:\android-sdk
   setx ANDROID_HOME "C:\android-sdk" /M
   setx PATH "%PATH%;C:\android-sdk\platform-tools;C:\android-sdk\cmdline-tools\latest\bin" /M
   ```

3. **Install SDK Components**
   ```cmd
   sdkmanager "platform-tools" "platforms;android-33" "build-tools;33.0.0"
   ```

## 📱 **Test Device Connection**

### **Fix Device Authorization:**

1. **Di Android Device:**
   - Settings → About Phone
   - Tap "Build Number" 7x (enable Developer Options)
   - Settings → Developer Options
   - Enable "USB Debugging"

2. **Test Connection:**
   ```cmd
   adb devices
   # Should show: PRQ4HA756DKZXWBE    device (not unauthorized)
   ```

3. **If still unauthorized:**
   - Disconnect/reconnect USB
   - Di device akan muncul popup "Allow USB debugging?"
   - Centang "Always allow from this computer"
   - Klik "OK"

## ⚡ **Quick Build Test**

### **After minimal setup:**

```cmd
cd d:\Projects\Bot-WA-KR\mobile\KakaRamaRoom

# Check environment
npx react-native doctor

# Clean and build
npx react-native start --reset-cache
npx react-native run-android
```

## 🎯 **Recommended Approach**

### **For immediate testing:**
1. **Install JDK 17** (15 minutes)
2. **Download Platform Tools** (5 minutes)  
3. **Set environment variables** (5 minutes)
4. **Fix device authorization** (5 minutes)
5. **Test build** (10 minutes)

**Total time: ~40 minutes**

### **For long-term development:**
Follow complete `SETUP-ANDROID-DEV.md` guide for full Android Studio setup.

## 🚨 **Current Blocker**

**Device Status:** `PRQ4HA756DKZXWBE unauthorized`

**Fix Steps:**
1. Enable USB Debugging di device
2. Allow computer access saat popup muncul
3. Verify dengan `adb devices`

**Expected Result:** `PRQ4HA756DKZXWBE device`

---

**Next Action:** Pilih Option A (minimal setup) atau Option B (Expo) untuk testing cepat, atau ikuti setup lengkap untuk development jangka panjang.
