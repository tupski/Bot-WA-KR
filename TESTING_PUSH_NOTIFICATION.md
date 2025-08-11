# Testing Push Notification - Firebase Integration

## 📋 **Checklist Sebelum Testing**

### ✅ **Prerequisites**
- [x] Firebase Sender ID: `241468377` sudah dikonfigurasi
- [x] Firebase Service Account Key sudah dipindahkan ke `credentials/firebase-service-account.json`
- [x] Android permissions sudah ditambahkan di AndroidManifest.xml
- [x] Firebase configuration sudah diupdate di aplikasi
- [x] Supabase Edge Function sudah dibuat
- [x] NotificationService sudah diupdate

### 🔧 **Setup yang Diperlukan**

#### 1. Deploy Supabase Edge Function
```bash
# Masuk ke folder project
cd D:\Projects\Bot-WA-KR

# Install Supabase CLI (jika belum)
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref rvcknyuinfssgpgkfetx

# Set environment variable untuk Firebase Service Account
# Convert JSON ke base64 dulu:
$content = Get-Content "credentials/firebase-service-account.json" -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
$base64 = [System.Convert]::ToBase64String($bytes)
Write-Output $base64

# Set secret di Supabase
supabase secrets set FIREBASE_SERVICE_ACCOUNT="<base64_result_dari_atas>"

# Deploy function
supabase functions deploy send-push-notification
```

#### 2. Build dan Install APK
```bash
# Masuk ke folder React Native
cd mobile/KakaRamaRoom

# Build APK
npx react-native run-android --variant=release
# atau
cd android && ./gradlew assembleRelease
```

## 🧪 **Testing Steps**

### **Step 1: Test FCM Token Generation**

1. Install APK di device fisik (bukan emulator)
2. Buka aplikasi dan login
3. Check console log untuk FCM token:
   ```
   NotificationService: FCM token obtained: eXXXXXXXXXXXXXXXXXXXX...
   ```
4. Token akan tersimpan di tabel `user_fcm_tokens`

### **Step 2: Test Manual Push Notification**

#### Via Supabase Dashboard:
1. Buka Supabase Dashboard → Edge Functions
2. Test function `send-push-notification` dengan payload:
```json
{
  "token": "FCM_TOKEN_DARI_STEP_1",
  "title": "Test Manual",
  "body": "Testing push notification manual",
  "data": {
    "type": "test",
    "channel": "kakarama_notifications"
  }
}
```

#### Via curl:
```bash
curl -X POST 'https://rvcknyuinfssgpgkfetx.supabase.co/functions/v1/send-push-notification' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "FCM_TOKEN_DARI_STEP_1",
    "title": "Test via curl",
    "body": "Testing push notification via curl",
    "data": {
      "type": "test",
      "channel": "kakarama_notifications"
    }
  }'
```

### **Step 3: Test Admin Broadcast**

1. Login sebagai admin di aplikasi
2. Masuk ke menu "Kirim Notifikasi"
3. Isi form:
   - **Target**: Pilih "Semua Pengguna" atau "Field Team"
   - **Judul**: "Test Broadcast"
   - **Pesan**: "Testing broadcast notification dari admin"
4. Tap "Kirim Notifikasi"
5. Check apakah notifikasi diterima di device

### **Step 4: Test Auto Notifications**

#### Test Checkout Reminder (30 menit sebelum):
1. Buat checkin baru dengan durasi 1 jam
2. Tunggu 30 menit, atau ubah waktu sistem untuk testing
3. Check apakah notifikasi "⏰ Reminder Checkout" diterima

#### Test Checkout Time:
1. Tunggu sampai waktu checkout tiba
2. Check apakah notifikasi "🏁 Waktu Checkout" diterima
3. Check apakah status checkin berubah menjadi "completed"

#### Test Cleaning Time:
1. Setelah checkout, tunggu 15 menit
2. Check apakah notifikasi "🧹 Waktu Cleaning" diterima
3. Check apakah status unit berubah menjadi "cleaning"

#### Test Unit Available:
1. Setelah cleaning, tunggu 30 menit
2. Check apakah notifikasi "✅ Unit Siap" diterima
3. Check apakah status unit berubah menjadi "available"

## 🔍 **Monitoring & Debugging**

### **Check Logs**

#### Supabase Edge Function Logs:
```bash
supabase functions logs send-push-notification
```

#### Database Logs:
```sql
-- Check notification logs
SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 10;

-- Check scheduled notifications
SELECT * FROM scheduled_notifications WHERE is_sent = false ORDER BY scheduled_time ASC;

-- Check pending notifications
SELECT * FROM pending_notifications WHERE status = 'pending' ORDER BY created_at DESC;

-- Check FCM tokens
SELECT * FROM user_fcm_tokens WHERE is_active = true;
```

#### React Native Logs:
```bash
# Android
adb logcat | grep -i "NotificationService\|Firebase\|FCM"

# atau via React Native
npx react-native log-android
```

### **Common Issues & Solutions**

#### ❌ **FCM Token tidak generate**
- **Cause**: Permission tidak granted atau Google Play Services tidak tersedia
- **Solution**: 
  - Check Android permission di Settings → Apps → KR App → Permissions
  - Install Google Play Services di device
  - Test di device fisik, bukan emulator

#### ❌ **Edge Function error: "Firebase service account not configured"**
- **Cause**: Environment variable tidak di-set dengan benar
- **Solution**:
  ```bash
  # Check secrets
  supabase secrets list
  
  # Re-set secret
  supabase secrets set FIREBASE_SERVICE_ACCOUNT="<base64_service_account>"
  ```

#### ❌ **Notification tidak muncul**
- **Cause**: 
  - FCM token expired
  - Notification channel tidak terdaftar
  - App dalam background dan notification di-block
- **Solution**:
  - Refresh FCM token
  - Check notification settings di device
  - Test dengan app dalam foreground

#### ❌ **Auto notification tidak jalan**
- **Cause**: ScheduledNotificationProcessor tidak berjalan
- **Solution**:
  - Check App.tsx apakah processor sudah di-start
  - Check console log untuk processor status
  - Restart aplikasi

## ✅ **Success Criteria**

### **Manual Test**
- [x] FCM token berhasil di-generate dan tersimpan
- [x] Manual push notification via Edge Function berhasil
- [x] Admin broadcast berhasil dikirim dan diterima

### **Auto Notifications**
- [x] Checkout reminder (30 menit sebelum) ✅
- [x] Checkout time notification ✅
- [x] Cleaning time notification ✅
- [x] Unit available notification ✅

### **Database Integration**
- [x] FCM tokens tersimpan di `user_fcm_tokens`
- [x] Notification logs tersimpan di `notification_logs`
- [x] Scheduled notifications tersimpan di `scheduled_notifications`
- [x] Broadcast history tersimpan di `broadcast_notifications`

### **Error Handling**
- [x] Fallback ke pending_notifications jika Edge Function gagal
- [x] Retry mechanism untuk failed notifications
- [x] Proper error logging dan monitoring

## 📱 **Production Deployment**

Setelah semua testing berhasil:

1. **Build Production APK**:
   ```bash
   cd mobile/KakaRamaRoom/android
   ./gradlew assembleRelease
   ```

2. **Deploy ke Play Store** atau distribute APK

3. **Monitor Production**:
   - Setup alerting untuk failed notifications
   - Monitor Edge Function usage
   - Check notification delivery rates

## 🎉 **Final Result**

Aplikasi KakaRama Room sekarang memiliki:
- ✅ **Real-time Push Notifications** dengan Firebase FCM
- ✅ **Auto Notifications** untuk checkin lifecycle
- ✅ **Admin Broadcast** capability
- ✅ **Robust Error Handling** dan retry mechanism
- ✅ **Complete Monitoring** dan logging system

**Firebase Integration Complete!** 🚀
