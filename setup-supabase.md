# 🚀 Setup Supabase untuk KakaRama Room

## Langkah-langkah Setup

### 1. Setup Database Schema di Supabase

1. Buka [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda: `rvcknyuinfssgpgkfetx`
3. Buka **SQL Editor**
4. Copy dan paste isi file `supabase-schema.sql`
5. Klik **Run** untuk membuat semua tabel dan fungsi

### 2. Migrasi Data dari SQLite

```bash
# Install dependencies untuk migration
npm install sqlite3 @supabase/supabase-js

# Jalankan migration script
node migrate-sqlite-to-supabase.js

# Atau upload langsung ke Supabase
node migrate-sqlite-to-supabase.js --upload
```

### 3. Verifikasi Data di Supabase

1. Buka **Table Editor** di Supabase Dashboard
2. Periksa tabel-tabel berikut:
   - `apartments`
   - `field_teams` 
   - `units`
   - `checkins`
   - `activity_logs`

### 4. Update Bot WhatsApp

```bash
# Di folder bot WhatsApp
npm install @supabase/supabase-js

# Copy file konfigurasi
cp bot-whatsapp-supabase-config.js bot-whatsapp/config/supabase.js

# Update import di file bot
# Ganti: const db = require('./database')
# Dengan: const { SupabaseBot } = require('./config/supabase')
```

### 5. Update Aplikasi React Native

```bash
# Di folder mobile/KakaRamaRoom
npm install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage

# File sudah dibuat di: src/config/supabase.js
```

### 6. Update Services di React Native

Ganti semua service untuk menggunakan Supabase:

```javascript
// Contoh: ApartmentService.js
import { supabase } from '../config/supabase';

class ApartmentService {
  async getAllApartments() {
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('*')
        .order('name');

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
```

## Keuntungan Setelah Migrasi

✅ **Real-time Sync** - Data sync otomatis antara bot dan app
✅ **Cloud Database** - Tidak perlu setup server
✅ **Backup Otomatis** - Data aman di cloud
✅ **Scalable** - Auto-scaling berdasarkan usage
✅ **API Ready** - REST API built-in
✅ **Dashboard** - Web interface untuk monitoring

## Troubleshooting

### Error: "relation does not exist"
- Pastikan schema SQL sudah dijalankan di Supabase
- Periksa nama tabel di SQL Editor

### Error: "JWT expired"
- Periksa API keys di konfigurasi
- Pastikan menggunakan service_role key untuk bot

### Error: "Row Level Security"
- Pastikan RLS policies sudah dibuat
- Atau disable RLS untuk testing

## Testing

### Test Koneksi Bot WhatsApp
```javascript
const { SupabaseBot } = require('./config/supabase');

// Test get apartments
SupabaseBot.getAllApartments()
  .then(result => console.log('Apartments:', result))
  .catch(error => console.error('Error:', error));
```

### Test Koneksi React Native
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

## Next Steps

1. ✅ Setup database schema
2. ✅ Migrasi data existing
3. 🔄 Update bot WhatsApp services
4. 🔄 Update React Native services  
5. 🔄 Test real-time sync
6. 🔄 Deploy to production

## Support

Jika ada masalah:
1. Cek Supabase logs di Dashboard
2. Periksa network connectivity
3. Verifikasi API keys
4. Test dengan Postman/curl

---

**Project**: KakaRama Room
**Database**: Supabase PostgreSQL
**URL**: https://rvcknyuinfssgpgkfetx.supabase.co
