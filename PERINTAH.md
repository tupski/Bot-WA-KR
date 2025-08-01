# 📋 PANDUAN LENGKAP PERINTAH BOT KAKARAMA ROOM

## 🏠 **PERINTAH DI GRUP APARTEMEN**

### **!rekap**
**Fungsi:** Menampilkan rekap laporan harian apartemen grup tersebut
**Format:**
- `!rekap` - Rekap hari ini (dari jam 12:00 WIB)
- `!rekap DDMMYYYY` - Rekap tanggal tertentu

**Contoh:**
```
!rekap
!rekap 31072025
```

**Output:**
```
📊 REKAP LAPORAN 31/07/2025
🏢 KAKARAMA ROOM
🏠 SKY HOUSE BSD
📅 31/07/2025 12:00 - 00:31 WIB

👥 TOTAL CS
- total cs amel: 4
- total cs apk: 5
- total cs kr: 11
- Jumlah CS: 20

💰 KEUANGAN
- total cash amel: Rp150.000
- total cash kr: Rp1.100.000
- total tf KR: Rp1.020.000
- total kotor: Rp2.270.000

💼 KOMISI MARKETING
Dreamy:
- total cs: 5
- total komisi: Rp250.000

Total komisi marketing: Rp450.000
```

### **!detailrekap**
**Fungsi:** Menampilkan detail semua transaksi apartemen grup tersebut
**Format:**
- `!detailrekap` - Detail hari ini (dari jam 12:00 WIB)
- `!detailrekap DDMMYYYY` - Detail tanggal tertentu

**Contoh:**
```
!detailrekap
!detailrekap 30072025
```

**Output:**
```
📋 DETAIL REKAP CHECKIN
🏢 KAKARAMA ROOM
📅 31/07/2025
🏠 SKY HOUSE BSD

Tanggal & Jam input: 31/07/2025 14:06
Unit      : L3/10D
Cek out: 23:05
Untuk   : 9 jam
Cash/tf: transfer 200
Cs         : Nene
komisi : 50
---------------
(detail transaksi lainnya...)
```

---

## 👤 **PERINTAH DI PESAN PRIBADI (KHUSUS OWNER)**

### **!rekap**
**Fungsi:** Rekap laporan dengan akses ke semua apartemen
**Format:**
- `!rekap` - Rekap semua apartemen hari ini
- `!rekap apartemen` - Rekap apartemen tertentu hari ini
- `!rekap DDMMYYYY` - Rekap semua apartemen tanggal tertentu
- `!rekap apartemen DDMMYYYY` - Rekap apartemen tertentu tanggal tertentu

**Contoh:**
```
!rekap
!rekap sky
!rekap 31072025
!rekap emerald 30072025
```

**Nama apartemen yang bisa digunakan:**
- `sky` → SKY HOUSE BSD
- `treepark` → TREEPARK BSD
- `emerald` → EMERALD BINTARO
- `springwood` → SPRINGWOOD
- `serpong` → SERPONG GARDEN
- `tokyo` → TOKYO PIK 2

### **!detailrekap**
**Fungsi:** Detail rekap dengan akses ke semua apartemen
**Format:** Sama dengan !rekap

**Contoh:**
```
!detailrekap
!detailrekap sky
!detailrekap 31072025
!detailrekap emerald 30072025
```

### **!status**
**Fungsi:** Menampilkan status bot dan jadwal laporan
**Format:** `!status`

**Output:**
```
📊 STATUS BOT KAKARAMA ROOM

🤖 Bot Status: ✅ Online

📅 Jadwal Laporan Berikutnya:
• Harian: 01/08/2025 12:00:00
• Mingguan: 05/08/2025 09:00:00
• Bulanan: 01/09/2025 10:00:00

🏢 Grup Aktif: 6 grup
👤 Owner Numbers: 1 nomor

⏰ Waktu Server: 31/07/2025 23:45:00 WIB
```

### **!debug**
**Fungsi:** Informasi debug untuk troubleshooting
**Format:** `!debug`

**Output:**
```
🔍 DEBUG INFO

📋 Environment Variables:
• OWNER_NUMBER: ✅ Set
• GROUP_SKYHOUSE_ID: ✅ Set
• GROUP_SKYHOUSE_NAME: ✅ Set
• GROUP_SKYHOUSE_ENABLED: true

⚙️ Config Status:
• Group Mapping: 6 entries
• Allowed Groups: 6 groups
• Owner Numbers: 1 numbers

🏠 Group Test:
• Test Group ID: 120363317169602122@g.us
• Mapped Name: SKY HOUSE BSD
• Is Allowed: ✅ Yes

👤 Owner Test:
• Your Number: 6282211219993
• Is Owner: ✅ Yes
• Owner List: 6282211219993
```

### **!rekapulang**
**Fungsi:** Memproses ulang semua pesan di semua grup (recovery data)
**Format:** `!rekapulang`
**⚠️ Peringatan:** Proses ini memakan waktu beberapa menit

**Output:**
```
✅ Proses rekap ulang selesai!

📊 Ringkasan:
- Grup diproses: 6
- Total pesan diperiksa: 1,250
- Pesan booking ditemukan: 45
- Data baru ditambahkan: 12
- Data sudah ada (dilewati): 33
- Error: 0

⏱️ Waktu proses: 2 menit 15 detik
```

### **!export**
**Fungsi:** Export laporan Excel dan kirim via email
**Format:**
- `!export` - Export laporan business day kemarin
- `!export DDMMYYYY` - Export laporan tanggal tertentu

**Contoh:**
```
!export
!export 01082025
```

**Output:**
```
✅ Export laporan berhasil!

📊 Ringkasan:
- Periode: 01/08/2025
- Total transaksi: 25
- File: Laporan_Export_01082025_1722556800000.xlsx

📧 Laporan telah dikirim via email ke kakaramaroom@gmail.com
```

**Catatan:**
- Range waktu: Tanggal yang diminta jam 12:00 - tanggal berikutnya jam 11:59
- Contoh: `!export 01082025` = 1 Agustus 12:00 - 2 Agustus 11:59
- File Excel berisi semua transaksi dalam periode tersebut
- Otomatis dikirim via email

### **!fixenv**
**Fungsi:** Memperbaiki dan reload konfigurasi environment
**Format:** `!fixenv`

---

## 🤖 **LAPORAN OTOMATIS**

### **Laporan Harian (Closing)**
- **Waktu:** Setiap hari jam 12:00 WIB
- **Dikirim ke:** Semua grup apartemen yang aktif
- **Isi:** Rekap transaksi hari sebelumnya (jam 12:00 kemarin - 11:59 hari ini)

### **Laporan Mingguan**
- **Waktu:** Setiap Senin jam 09:00 WIB
- **Dikirim ke:** Semua grup apartemen yang aktif
- **Isi:** Rekap transaksi 7 hari terakhir

### **Laporan Bulanan**
- **Waktu:** Tanggal 1 setiap bulan jam 10:00 WIB
- **Dikirim ke:** Semua grup apartemen yang aktif
- **Isi:** Rekap transaksi bulan sebelumnya

---

## 📝 **FORMAT PESAN BOOKING**

Bot akan otomatis memproses pesan dengan format:
```
🟢NAMA APARTEMEN
Unit      : L3/10D
Cek out: 23:05
Untuk   : 9 jam
Cash/tf: transfer 200
Cs         : dreamy
komisi : 50
```

**Aturan Format:**
- Harus dimulai dengan emoji dan nama apartemen
- Setiap baris harus menggunakan format `Label : Value`
- Spasi di sekitar titik dua (:) fleksibel
- Case insensitive untuk nama CS

---

## ⚙️ **KONFIGURASI OWNER**

**Untuk menjadi owner:**
1. Tambahkan nomor WhatsApp Anda ke file `.env` di server:
```env
OWNER_NUMBER=6282211219993,628221121999
```

2. Restart bot:
```bash
pm2 restart Bot-KR
```

**Hak akses owner:**
- ✅ Akses semua perintah di pesan pribadi
- ✅ Melihat data semua apartemen
- ✅ Menggunakan perintah debug dan maintenance
- ✅ Melakukan recovery data

---

## 🏢 **APARTEMEN YANG DIDUKUNG**

1. **SKY HOUSE BSD** - `120363317169602122@g.us`
2. **TREEPARK BSD** - `120363297431494475@g.us`
3. **EMERALD BINTARO** - `120363316413016298@g.us`
4. **SPRINGWOOD** - `120363317562284069@g.us`
5. **SERPONG GARDEN** - `120363417253343745@g.us`
6. **TOKYO PIK 2** - `120363418040325725@g.us`

---

## ❌ **PESAN ERROR UMUM**

### `❌ Hanya owner yang dapat menggunakan command ini di private message.`
**Solusi:** Pastikan nomor Anda terdaftar di `OWNER_NUMBER` di file `.env`

### `❌ Di grup ini hanya bisa melihat data [NAMA APARTEMEN]`
**Solusi:** Normal, di grup hanya bisa akses data apartemen grup tersebut

### `Tidak ada data untuk apartemen [NAMA] pada periode yang diminta.`
**Solusi:** Tidak ada transaksi pada periode tersebut, atau nama apartemen salah

### `APARTEMEN TIDAK DIKETAHUI`
**Solusi:** Grup belum terdaftar di konfigurasi, hubungi admin untuk menambahkan

---

## 📞 **BANTUAN**

Jika mengalami masalah:
1. Coba perintah `!debug` untuk melihat status
2. Pastikan format perintah sudah benar
3. Pastikan Anda terdaftar sebagai owner (untuk pesan pribadi)
4. Hubungi administrator bot untuk bantuan lebih lanjut