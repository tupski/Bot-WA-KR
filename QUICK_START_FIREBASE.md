# 🚀 Quick Start - Firebase Push Notification

## ⚡ **Instalasi Cepat (5 Menit)**

### **Step 1: Install Supabase CLI**

**Windows (pilih salah satu):**

```bash
# Via Chocolatey (Recommended)
choco install supabase

# Via Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Manual Download
# https://github.com/supabase/cli/releases
```

### **Step 2: Run Setup Script**

```bash
# PowerShell (Recommended)
.\scripts\setup-firebase-push.ps1

# atau Command Prompt
.\scripts\setup-firebase-push.bat
```

### **Step 3: Deploy Edge Function**

```bash
# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref rvcknyuinfssgpgkfetx

# Set Firebase Service Account (copy dari credentials\firebase-service-account-base64.txt)
supabase secrets set FIREBASE_SERVICE_ACCOUNT="<paste_base64_here>"

# Deploy function
supabase functions deploy send-push-notification
```

### **Step 4: Build & Test APK**

```bash
# Build APK
cd mobile\KakaRamaRoom\android
.\gradlew assembleRelease

# Install di device fisik
# APK location: android\app\build\outputs\apk\release\app-release.apk
```

---

## 🧪 **Testing (2 Menit)**

### **1. Test FCM Token**
- Buka aplikasi di device fisik
- Login sebagai admin
- Tap "Test Push Notification" → "Test FCM Token"
- Check console log untuk token

### **2. Test Manual Push**
- Tap "Test Push Notification" → "Test Manual Push"
- Notification harus muncul di device

### **3. Test Admin Broadcast**
- Masuk ke menu "Kirim Notifikasi"
- Isi form dan kirim
- Notification harus diterima

### **4. Test Auto Notifications**
- Buat checkin baru dengan durasi 1 jam
- Tunggu atau ubah waktu sistem untuk testing
- Check 4 jenis auto notification

---

## 🔧 **Troubleshooting Cepat**

### **❌ Supabase CLI install gagal**
```bash
# Manual download
# https://github.com/supabase/cli/releases
# Extract dan tambahkan ke PATH
```

### **❌ FCM Token tidak generate**
```bash
# Check permissions di Settings → Apps → KR App → Permissions
# Pastikan "Notifications" enabled
# Test di device fisik, bukan emulator
```

### **❌ Edge Function error**
```bash
# Check secrets
supabase secrets list

# Re-set secret
supabase secrets set FIREBASE_SERVICE_ACCOUNT="<base64>"
```

### **❌ Notification tidak muncul**
```bash
# Check notification settings di device
# Test dengan app dalam foreground
# Check console logs untuk error
```

---

## 📊 **Monitoring**

### **Database Logs**
```sql
-- Check notification logs
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;

-- Check FCM tokens
SELECT * FROM user_fcm_tokens WHERE is_active = true;
```

### **Edge Function Logs**
```bash
supabase functions logs send-push-notification
```

### **React Native Logs**
```bash
npx react-native log-android
```

---

## ✅ **Success Checklist**

- [x] Supabase CLI installed
- [x] Edge Function deployed
- [x] APK built and installed
- [x] FCM token generated
- [x] Manual push notification works
- [x] Admin broadcast works
- [x] Auto notifications work

---

## 🎯 **Production Ready**

Setelah semua test berhasil:

1. **Deploy ke Play Store** atau distribute APK
2. **Monitor production** dengan Supabase dashboard
3. **Setup alerting** untuk failed notifications
4. **Regular maintenance** untuk expired FCM tokens

---

## 📚 **Dokumentasi Lengkap**

- **Testing Guide**: `TESTING_PUSH_NOTIFICATION.md`
- **Deployment Guide**: `supabase/DEPLOYMENT.md`
- **Architecture**: README.md

---

## 🆘 **Need Help?**

1. Check console logs first
2. Verify all prerequisites
3. Test on physical device
4. Check Firebase Console for delivery reports
5. Monitor Supabase Edge Function logs

**Firebase Push Notification is now ready! 🎉**
