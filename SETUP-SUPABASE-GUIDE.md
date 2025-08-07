# 🚀 Setup Supabase untuk KakaRama Room - Panduan Lengkap

## 📋 **Langkah-langkah Setup**

### **Step 1: Setup Database Schema**

1. **Buka Supabase Dashboard**
   - URL: https://app.supabase.com/project/rvcknyuinfssgpgkfetx
   - Login dengan akun Anda

2. **Masuk ke SQL Editor**
   - Klik menu **SQL Editor** di sidebar kiri
   - Klik **New Query**

3. **Jalankan Schema SQL**
   ```sql
   -- Copy paste isi file: supabase-schema.sql
   -- Atau gunakan versi simple: supabase-schema-simple.sql
   ```
   - Klik **Run** untuk menjalankan
   - Tunggu sampai selesai (ada progress messages)

### **Step 2: Import Sample Data**

1. **Di SQL Editor yang sama**
   ```sql
   -- Copy paste isi file: migration-clean-data.sql
   ```
   - Klik **Run** untuk import sample data
   - File ini sudah UUID-compatible dan aman

2. **Verifikasi Data**
   - Buka **Table Editor**
   - Check tabel: `apartments`, `field_teams`, `units`, `transactions`
   - Pastikan data sudah masuk

### **Step 3: Test Koneksi**

1. **Test dengan SQL Query**
   ```sql
   -- Test query di SQL Editor
   SELECT * FROM apartments;
   SELECT * FROM units_with_apartment;
   SELECT * FROM checkins_with_details;
   ```

2. **Test Functions**
   ```sql
   -- Test functions
   SELECT * FROM get_active_checkins();
   SELECT * FROM process_auto_checkout();
   ```

## 📊 **Struktur Database yang Dibuat**

### **Main Tables (13 tabel):**
- ✅ `admins` - Data administrator
- ✅ `apartments` - Data apartemen + WhatsApp Group
- ✅ `field_teams` - Data tim lapangan  
- ✅ `units` - Data unit dengan status
- ✅ `checkins` - Data checkin utama
- ✅ `checkin_extensions` - History extend checkin
- ✅ `team_apartment_assignments` - Assignment tim ke apartemen
- ✅ `activity_logs` - Log aktivitas sistem
- ✅ `transactions` - Data transaksi bot
- ✅ `cs_summary` - Summary per CS
- ✅ `daily_summary` - Summary harian
- ✅ `processed_messages` - Tracking pesan WhatsApp
- ✅ `config` - Konfigurasi bot

### **Views (2 views):**
- ✅ `checkins_with_details` - Checkin dengan detail lengkap
- ✅ `units_with_apartment` - Unit dengan info apartemen

### **Functions (3 functions):**
- ✅ `get_active_checkins()` - Get checkin yang aktif
- ✅ `process_auto_checkout()` - Proses auto-checkout
- ✅ `update_updated_at_column()` - Trigger function

## 🔧 **Konfigurasi Aplikasi**

### **Credentials Supabase:**
```javascript
// Untuk Bot WhatsApp (Node.js)
const supabaseUrl = 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDUyMTY5OCwiZXhwIjoyMDcwMDk3Njk4fQ.c-TsCsWk7rG-l-Z-BvFc111oCpAsJ8wXKTqydj9sWIc';

// Untuk React Native
const supabaseUrl = 'https://rvcknyuinfssgpgkfetx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2Y2tueXVpbmZzc2dwZ2tmZXR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MjE2OTgsImV4cCI6MjA3MDA5NzY5OH0.FXWPp9L4xZ3uw34Iob7QvlEsePTdBmGmgRufXBZZ34c';
```

### **Default Login:**
- **Username**: `admin`
- **Password**: `admin123`
- **Email**: `admin@kakarama.com`

## 📁 **File yang Tersedia**

### **Schema Files:**
1. **`supabase-schema.sql`** - Schema lengkap dengan DROP ALL TABLES
2. **`supabase-schema-simple.sql`** - Schema aman tanpa DROP
3. **`verify-supabase-schema.sql`** - Verifikasi schema

### **Migration Files:**
1. **`migration-clean-data.sql`** - Sample data UUID-compatible ✅
2. **`migration-data-fixed.sql`** - Data original yang sudah diperbaiki
3. **`migration-data.sql.backup`** - Backup data original

### **Config Files:**
1. **`bot-whatsapp-supabase-config.js`** - Config untuk bot WhatsApp
2. **`react-native-supabase-config.js`** - Config untuk React Native
3. **`mobile/KakaRamaRoom/src/config/supabase.js`** - Config terintegrasi

## 🧪 **Testing & Verifikasi**

### **1. Test Database Schema**
```bash
# Jalankan script verifikasi
# Copy paste verify-supabase-schema.sql ke SQL Editor
```

### **2. Test Bot WhatsApp Connection**
```javascript
const { SupabaseBot } = require('./config/supabase');

// Test get apartments
SupabaseBot.getApartmentByGroupId('120363297431494475-1234567890@g.us')
  .then(result => console.log('Test result:', result));
```

### **3. Test React Native Connection**
```javascript
import { supabase } from './src/config/supabase';

// Test query
const testConnection = async () => {
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .limit(1);
    
  console.log('Test result:', { data, error });
};
```

## 🚨 **Troubleshooting**

### **Error: "relation does not exist"**
- Pastikan schema SQL sudah dijalankan
- Check di Table Editor apakah tabel sudah dibuat

### **Error: "JWT expired"**
- Check API keys di konfigurasi
- Pastikan menggunakan key yang benar (anon vs service_role)

### **Error: "column is of type uuid but expression is of type integer"**
- Gunakan `migration-clean-data.sql` (sudah diperbaiki)
- Atau jalankan `fix-migration-data.py` untuk fix data existing

### **Error: "Row Level Security"**
- Pastikan RLS policies sudah dibuat
- Atau disable RLS untuk testing

## 🎯 **Next Steps Setelah Setup**

1. **✅ Database Schema** - Sudah selesai
2. **🔄 Update Bot WhatsApp** - Ganti SQLite dengan Supabase
3. **🔄 Update React Native** - Ganti SQLite dengan Supabase  
4. **🔄 Test Real-time Sync** - Test sync antara bot dan app
5. **🔄 Deploy to Production** - Deploy bot dan app

## 📞 **Support**

Jika ada masalah:
1. Check Supabase logs di Dashboard
2. Periksa network connectivity
3. Verifikasi API keys
4. Test dengan Postman/curl

---

**Project**: KakaRama Room  
**Database**: Supabase PostgreSQL  
**URL**: https://rvcknyuinfssgpgkfetx.supabase.co  
**Status**: ✅ Ready for Integration
