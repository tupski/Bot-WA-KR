# 🏢 Setup Multi-Grup Apartemen

Bot WhatsApp ini dirancang untuk mengelola 6 grup apartemen berbeda dengan laporan terpisah untuk masing-masing apartemen.

## 📋 Konfigurasi Grup

### 1. **Pengaturan Apartemen**

Edit file `config/config.js` bagian `apartments`:

```javascript
apartments: {
    // Mapping nama grup WhatsApp ke nama apartemen
    groupMapping: {
        'SKY HOUSE': 'SKY HOUSE',
        'BLUE TOWER': 'BLUE TOWER', 
        'GREEN RESIDENCE': 'GREEN RESIDENCE',
        'GOLD APARTMENT': 'GOLD APARTMENT',
        'SILVER SUITES': 'SILVER SUITES',
        'DIAMOND TOWER': 'DIAMOND TOWER'
    },
    
    // Grup yang diizinkan (opsional - untuk keamanan)
    allowedGroups: [
        'SKY HOUSE',
        'BLUE TOWER', 
        'GREEN RESIDENCE',
        'GOLD APARTMENT',
        'SILVER SUITES',
        'DIAMOND TOWER'
    ],

    // Default apartemen jika grup tidak dikenali
    defaultApartment: 'UNKNOWN APARTMENT'
}
```

### 2. **Cara Kerja Sistem**

1. **Deteksi Grup Otomatis**
   - Bot mendeteksi pesan dari grup mana berdasarkan chat ID
   - Mengambil nama grup dengan `getGroupName()`
   - Mapping nama grup ke nama apartemen

2. **Penyimpanan Data Terpisah**
   - Setiap transaksi disimpan dengan field `location` = nama apartemen
   - Data tidak tercampur antar apartemen

3. **Laporan Per Apartemen**
   - Command `!rekap` = laporan global semua apartemen
   - Command `!apartemen` = laporan khusus apartemen tersebut

## 🚀 **Penggunaan**

### **Format Pesan Booking (Sama untuk Semua Grup)**

```
Unit      :L3/30N
Cek out: 05:00
Untuk   : 6 jam
Cash/Tf: tf kr 250
Cs    : dreamy
Komisi: 50
```

### **Command yang Tersedia**

#### 1. **!rekap** - Laporan Global
```
!rekap                    # Laporan hari ini (semua apartemen)
!rekap 28062025          # Laporan tanggal tertentu (semua apartemen)
```

#### 2. **!apartemen** - Laporan Per Apartemen
```
!apartemen               # Laporan hari ini (apartemen ini saja)
!apartemen 28062025      # Laporan tanggal tertentu (apartemen ini saja)
```

## 📊 **Contoh Laporan**

### **Laporan Global (!rekap)**
```
📊 LAPORAN HARIAN SKY HOUSE
📅 2025-06-28

📈 RINGKASAN
Total Transaksi: 15
Total Pendapatan: Rp 3,750,000
Total Komisi: Rp 750,000
Pendapatan Bersih: Rp 3,000,000

📍 LOKASI
SKY HOUSE: 8 transaksi
BLUE TOWER: 4 transaksi
GREEN RESIDENCE: 3 transaksi
```

### **Laporan Apartemen (!apartemen)**
```
📊 LAPORAN SKY HOUSE
📅 2025-06-28

📈 RINGKASAN
Total Transaksi: 8
Total Pendapatan: Rp 2,000,000
Total Komisi: Rp 400,000
Pendapatan Bersih: Rp 1,600,000

👥 RINGKASAN CS
dreamy: 3 transaksi - Rp 600,000
rini: 2 transaksi - Rp 400,000
amel: 3 transaksi - Rp 600,000
```

## 🔒 **Keamanan**

### **Grup yang Diizinkan**
- Bot hanya memproses pesan dari grup yang terdaftar di `allowedGroups`
- Grup tidak terdaftar akan diabaikan

### **Validasi Pesan**
- Format pesan tetap ketat dengan validasi
- Pesan salah format akan dihapus + peringatan
- Field kurang akan di-mention dengan pesan spesifik

## 🛠️ **Setup Langkah demi Langkah**

### 1. **Persiapan Grup WhatsApp**
- Buat 6 grup WhatsApp untuk masing-masing apartemen
- Pastikan nama grup sesuai dengan konfigurasi
- Tambahkan bot ke semua grup

### 2. **Konfigurasi Bot**
- Update `config/config.js` dengan nama grup yang benar
- Sesuaikan `groupMapping` dengan nama grup aktual
- Set `allowedGroups` untuk keamanan

### 3. **Testing**
- Kirim pesan booking di masing-masing grup
- Test command `!apartemen` di setiap grup
- Verifikasi laporan terpisah per apartemen

### 4. **Monitoring**
- Cek log untuk memastikan grup terdeteksi dengan benar
- Monitor database untuk memastikan data tersimpan dengan `location` yang tepat

## 📝 **Tips Penggunaan**

1. **Nama Grup Konsisten**
   - Gunakan nama grup yang mudah diingat
   - Hindari karakter khusus yang bisa menyebabkan error

2. **Backup Data**
   - Data disimpan per apartemen, backup secara teratur
   - Export Excel akan include semua apartemen

3. **Monitoring**
   - Gunakan `!apartemen` untuk monitoring harian per apartemen
   - Gunakan `!rekap` untuk overview semua apartemen

4. **Troubleshooting**
   - Jika grup tidak terdeteksi, cek nama grup di log
   - Update `groupMapping` jika nama grup berubah
