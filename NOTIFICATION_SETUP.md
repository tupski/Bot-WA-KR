# Push Notification Setup Guide

## 🚨 Error Fix: "relation users does not exist"

Jika Anda mendapat error `ERROR: 42P01: relation "users" does not exist`, ikuti langkah-langkah berikut:

## 📋 Setup Instructions

### 1. Setup Database Tables di Supabase

Jalankan salah satu script SQL berikut di **Supabase SQL Editor**:

#### Option A: Script Sederhana (Recommended)
```sql
-- Jalankan file: supabase-notification-tables-simple.sql
-- Script ini tidak bergantung pada tabel users yang mungkin belum ada
```

#### Option B: Script Lengkap
```sql
-- Jalankan file: supabase-notification-tables.sql
-- Hanya jika Anda sudah memiliki tabel users atau field_teams
```

### 2. Verifikasi Tabel Berhasil Dibuat

Setelah menjalankan script, verifikasi dengan query berikut:

```sql
-- Cek tabel yang berhasil dibuat
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_fcm_tokens', 'notifications', 'broadcast_notifications');

-- Cek struktur tabel
\d user_fcm_tokens
\d notifications
\d broadcast_notifications
```

### 3. Setup Firebase Console

1. **Buat Project Firebase**
   - Buka [Firebase Console](https://console.firebase.google.com/)
   - Klik "Add project" atau "Create a project"
   - Ikuti wizard setup

2. **Add Android App**
   - Klik "Add app" → pilih Android
   - Package name: `com.kakaramaroom`
   - App nickname: `KakaRama Room`
   - Download `google-services.json`

3. **Enable Cloud Messaging**
   - Di Firebase Console, buka "Cloud Messaging"
   - Enable Cloud Messaging API

4. **Replace google-services.json**
   ```bash
   # Replace file dummy dengan file asli dari Firebase
   cp path/to/downloaded/google-services.json mobile/KakaRamaRoom/android/app/google-services.json
   ```

### 4. Install Dependencies

```bash
cd mobile/KakaRamaRoom
npm install
```

### 5. Build dan Test

```bash
# Build APK
./deploy-apk.bat

# Atau build debug
cd mobile/KakaRamaRoom
npx react-native run-android
```

## 🔧 Troubleshooting

### Error: "relation users does not exist"

**Penyebab**: Script SQL mencoba mengakses tabel `users` yang belum ada.

**Solusi**: 
1. Gunakan `supabase-notification-tables-simple.sql` instead
2. Script ini tidak bergantung pada tabel users

### Error: "Table already exists"

**Penyebab**: Tabel sudah pernah dibuat sebelumnya.

**Solusi**: 
```sql
-- Drop tabel jika perlu reset
DROP TABLE IF EXISTS user_fcm_tokens CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS broadcast_notifications CASCADE;

-- Kemudian jalankan ulang script
```

### Error: "Permission denied"

**Penyebab**: RLS policies terlalu ketat.

**Solusi**:
```sql
-- Disable RLS sementara untuk testing
ALTER TABLE user_fcm_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_notifications DISABLE ROW LEVEL SECURITY;
```

### FCM Token tidak tersimpan

**Penyebab**: Tabel belum ada atau permission issue.

**Solusi**:
1. Pastikan tabel `user_fcm_tokens` sudah dibuat
2. Cek console log untuk error details
3. Verifikasi user sudah login

## 📱 Testing Notifications

### 1. Test FCM Token Generation

```javascript
// Di console browser atau React Native debugger
import NotificationService from './src/services/NotificationService';

// Initialize service
await NotificationService.initialize();

// Check token
console.log('FCM Token:', NotificationService.fcmToken);
```

### 2. Test Database Connection

```sql
-- Cek apakah token tersimpan
SELECT * FROM user_fcm_tokens;

-- Cek notifikasi
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;
```

### 3. Test Broadcast Notification

1. Login sebagai admin
2. Buka menu "Kirim Notifikasi"
3. Isi form dan kirim
4. Cek di tabel `broadcast_notifications`

## 🎯 Features Overview

### ✅ Implemented Features

- **FCM Token Management**: Auto-generate dan save token
- **Modern Alert Modal**: Ganti Alert native dengan modal modern
- **Notification Icon**: Badge dengan counter unread notifications
- **Admin Broadcast**: Kirim notifikasi ke semua user atau group tertentu
- **Auto Notifications**: Reminder 30 menit sebelum checkout dan overdue alerts
- **Notification List**: Halaman untuk melihat semua notifikasi
- **Mark as Read**: Individual dan bulk mark as read

### 🔄 Background Services

- **AutoNotificationService**: Berjalan otomatis untuk kirim reminder
- **Badge Counter**: Update otomatis setiap 30 detik
- **Token Refresh**: Auto-refresh FCM token saat expired

## 📊 Database Schema

```sql
-- FCM Tokens
user_fcm_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20), -- 'admin' | 'field_team'
    fcm_token TEXT NOT NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- User Notifications
notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP,
    received_at TIMESTAMP
);

-- Broadcast History
broadcast_notifications (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_user_type VARCHAR(20), -- 'all' | 'admin' | 'field_team'
    sent_by UUID NOT NULL,
    created_at TIMESTAMP,
    sent_at TIMESTAMP
);
```

## 🎨 UI Components

- **ModernAlert**: Modern modal replacement untuk Alert
- **NotificationIcon**: Icon dengan badge counter
- **NotificationsScreen**: List semua notifikasi
- **AdminBroadcastScreen**: Form kirim broadcast

## 🔐 Security

- **RLS Policies**: User hanya bisa akses notifikasi mereka sendiri
- **Token Encryption**: FCM token disimpan dengan aman
- **Permission Checks**: Admin-only features terlindungi

---

**Need Help?** Check console logs untuk error details atau contact developer.
