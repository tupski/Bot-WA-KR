# Bot WhatsApp untuk Manajemen Check-in Apartemen Kakarama Room

Sistem bot WhatsApp komprehensif untuk mengelola check-in apartemen, membuat laporan, dan melacak performa CS untuk operasional bisnis Kakarama Room.

## Fitur Utama

- 🤖 **Pemrosesan Pesan Otomatis**: Memproses pesan booking yang dimulai dengan "Unit"
- � **Multi-Apartemen**: Mendukung beberapa apartemen dengan deteksi grup otomatis
- 📊 **Laporan Harian**: Laporan otomatis dikirim ke grup WhatsApp setiap jam 12:00 WIB
- 📧 **Integrasi Email**: Laporan Excel harian dikirim via email
- 💾 **Dukungan Database**: Pilihan database SQLite dan MySQL
- 📈 **Pelacakan Performa**: Monitoring performa CS dan perhitungan komisi
- 🔄 **Tugas Terjadwal**: Laporan otomatis harian, mingguan, dan bulanan
- 📱 **Export Excel**: Laporan Excel komprehensif dengan multiple sheet
- 🛡️ **Penanganan Error**: Sistem error handling dan logging yang robust
- ⚙️ **Dapat Dikonfigurasi**: Opsi konfigurasi ekstensif via environment variables
- 💬 **Validasi Format**: Validasi format pesan dengan respon yang jelas
- 🔍 **Command System**: Command !rekap dan !apartemen untuk laporan khusus
- 🔒 **Keamanan Grup**: Kontrol akses berdasarkan grup yang diizinkan

## Panduan Cepat

### Prasyarat

- Node.js 16+
- npm atau yarn
- Akun Gmail dengan app password (untuk fitur email)
- Akun WhatsApp

### Instalasi

1. **Clone repository**
   ```bash
   git clone <your-repo-url>
   cd bot-kr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi environment variables**
   ```bash
   cp .env.example .env
   # Edit .env dengan nilai yang sesuai
   ```

4. **Buat direktori data**
   ```bash
   mkdir data
   ```

5. **Jalankan bot**
   ```bash
   npm start
   ```

6. **Scan QR code**
   - Bot akan menampilkan QR code di terminal
   - Scan dengan WhatsApp di ponsel Anda
   - Tunggu pesan "Bot siap digunakan!"

## Konfigurasi

### Environment Variables

Salin `.env.example` ke `.env` dan konfigurasi sebagai berikut:

#### Pengaturan WhatsApp
```env
# Tidak perlu GROUP_CHAT_ID lagi - bot otomatis mendeteksi grup
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true
```

#### Pengaturan Database
```env
DB_TYPE=sqlite
SQLITE_PATH=./data/bot-kr.db
```

#### Pengaturan Email
```env
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EMAIL_TO=kakaramaroom@gmail.com
```

#### Pengaturan Komisi (dalam Rupiah)
```env
COMMISSION_AMEL=50000
COMMISSION_KR=45000
COMMISSION_APK=40000
COMMISSION_DEFAULT=30000
```

#### Pengaturan Multi-Apartemen
```env
# Grup yang diizinkan menggunakan bot (opsional)
ALLOWED_GROUPS=group1@g.us,group2@g.us
```

### Setup Gmail App Password

1. Aktifkan 2-factor authentication di akun Gmail Anda
2. Buka Google Account settings → Security → App passwords
3. Generate app password untuk "Mail"
4. Gunakan password ini di environment variable `EMAIL_PASS`

## Format Pesan

Bot memproses pesan yang memiliki indikator lingkaran berwarna di baris pertama dan "Unit" di baris kedua. Contoh format:

```
🟢SKY HOUSE
Unit      : L3/30N
Cek out   : 05:00
Untuk     : 6 jam
Cash/Tf   : tf kr 250
Cs        : dreamy
Komisi    : 50
```

### Komponen Pesan

- **[LINGKARAN BERWARNA][NAMA GRUP]**: Prefix dengan indikator warna per apartemen
  - 🟢 SKY HOUSE (hijau untuk Sky House)
  - 🔴 TREEPARK BSD (merah untuk Treepark)
  - 🟡 GOLDEN TOWER (kuning untuk Golden Tower)
  - 🔵 BLUE RESIDENCE (biru untuk Blue Residence)
  - Dan warna lainnya sesuai apartemen
- **Unit**: Identifier unit/kamar (L3/30N, A1, B2, dll.)
- **Cek out**: Waktu checkout dalam format HH:MM
- **Untuk**: Durasi dalam jam (contoh: "6 jam", "2.5 jam")
- **Cash/Tf**: Metode pembayaran dan jumlah
  - Format: "cash 250" atau "tf kr 250" atau "tf amel"
  - Komisi akan dikurangi dari jumlah Cash/Tf
- **Cs**: Nama customer (CS = Customer)
- **Komisi**: Jumlah komisi dalam ribu (contoh: "50" = 50.000)

### Kasus Khusus

- **CS APK**: Tidak dihitung dalam perhitungan keuangan
- **Tf Amel**: Tanpa jumlah, hanya mencatat transaksi
- **Spasi Fleksibel**: Bot dapat menangani variasi spasi di sekitar tanda titik dua
- **Multi-Apartemen**: Setiap apartemen memiliki warna indikator sendiri
- **Deteksi Otomatis**: Bot mendeteksi format berdasarkan kata "Unit" di baris kedua

## Command System

### Command !rekap

Untuk membuat laporan dari jam 12:00 WIB sampai waktu sekarang:
```
!rekap
```

Untuk laporan tanggal tertentu (format DDMMYYYY):
```
!rekap 30072025
```

### Command !apartemen

Untuk laporan apartemen tertentu:
```
!apartemen sky house
!apartemen sky house 30072025
```

## Laporan

### Laporan Harian (12:00 WIB)

Laporan otomatis harian meliputi:
- Total booking dan pendapatan
- Ringkasan performa CS
- Breakdown metode pembayaran
- Perhitungan komisi
- Statistik per apartemen

### Laporan Excel

File Excel harian berisi 3 sheet:
1. **Transaksi**: Daftar transaksi detail
2. **Ringkasan CS**: Ringkasan performa CS
3. **Komisi Marketing**: Perhitungan komisi

### Laporan Email

- Dikirim harian ke alamat email yang dikonfigurasi
- Termasuk attachment Excel
- Format HTML profesional

## Validasi Format Pesan

Bot melakukan validasi ketat terhadap format pesan:

### Respon Validasi

- **Format Salah**: "Salah anjing. yang bener gini:" + contoh format
- **Field Kosong**: Mention user + "Komisinya mana?" (atau field lain yang kosong)
- **Format Valid**: Pesan diproses dan disimpan ke database

### Sistem Checkpoint

Bot memiliki sistem checkpoint untuk mencegah kehilangan data:
- Melacak pesan yang sudah diproses
- Recovery otomatis saat bot disconnect
- Cleanup data lama secara berkala

## Schema Database

### Tabel

1. **transactions**: Record booking individual
2. **cs_summary**: Agregat performa CS harian
3. **daily_summary**: Ringkasan bisnis harian
4. **processed_messages**: Tracking pesan yang sudah diproses

### SQLite vs MySQL

- **SQLite**: Default, berbasis file, tidak perlu server
- **MySQL**: Untuk produksi, performa lebih baik, akses concurrent

## Scripts

```bash
# Jalankan bot
npm start

# Mode development dengan auto-restart
npm run dev

# Jalankan test
npm test
```

## Struktur File

```
bot-kr/
├── config/
│   └── config.js              # Manajemen konfigurasi
├── src/
│   ├── database.js            # Operasi database
│   ├── whatsappBot.js         # WhatsApp client wrapper
│   ├── messageParser.js       # Logika parsing pesan
│   ├── reportGenerator.js     # Pembuatan laporan
│   ├── scheduler.js           # Tugas terjadwal
│   ├── excelExporter.js       # Pembuatan file Excel
│   ├── emailService.js        # Fungsi email
│   ├── numberFormatter.js     # Utilitas format angka
│   ├── errorHandler.js        # Sistem penanganan error
│   └── logger.js              # Sistem logging
├── data/                      # Database dan logs
├── exports/                   # File Excel yang dibuat
├── session/                   # Data sesi WhatsApp
├── test/                      # File testing
├── .env.example               # Template environment
├── package.json
└── README.md
```

## Troubleshooting

### Masalah Umum

1. **QR Code tidak muncul**
   - Periksa apakah port 3000 tersedia
   - Pastikan PUPPETEER_HEADLESS=false untuk debugging

2. **Error koneksi database**
   - Verifikasi konfigurasi database di .env
   - Periksa permission file untuk SQLite
   - Pastikan MySQL server berjalan

3. **Email tidak terkirim**
   - Verifikasi Gmail app password
   - Periksa EMAIL_ENABLED=true
   - Review log email di console

4. **Pesan tidak diproses**
   - Verifikasi format pesan sesuai pola yang diharapkan
   - Periksa status koneksi WhatsApp
   - Review log parsing

5. **Bot tidak merespon di grup tertentu**
   - Periksa konfigurasi ALLOWED_GROUPS
   - Pastikan bot adalah admin grup (untuk delete pesan)
   - Verifikasi mapping apartemen di config

### Logs

Log disimpan di:
- Output console (real-time)
- `./data/bot.log` (file logging)

Level log: error, warn, info, debug

## Development

### Menambah Fitur Baru

1. **Format pesan baru**: Modifikasi `src/messageParser.js`
2. **Laporan tambahan**: Extend `src/reportGenerator.js`
3. **Tugas terjadwal baru**: Tambahkan ke `src/scheduler.js`
4. **Perubahan database**: Update `src/database.js`
5. **Apartemen baru**: Tambahkan mapping di `config/config.js`

### Testing

```bash
# Jalankan semua test
npm test

# Test modul tertentu
npm test -- --grep "messageParser"
```

## Deployment Produksi

### Setup yang Direkomendasikan

1. **Gunakan database MySQL**
   ```env
   DB_TYPE=mysql
   DB_HOST=your-mysql-host
   DB_USER=your-mysql-user
   DB_PASSWORD=your-mysql-password
   DB_NAME=kakarama_room_production
   ```

2. **Aktifkan process management**
   ```bash
   npm install -g pm2
   pm2 start index.js --name "kakarama-room-bot"
   pm2 startup
   pm2 save
   ```

3. **Konfigurasi logging**
   ```env
   LOG_LEVEL=info
   LOG_ENABLE_FILE=true
   LOG_MAX_FILES=10
   LOG_MAX_SIZE=50m
   ```

4. **Setup monitoring**
   ```bash
   pm2 monit
   ```

### Pertimbangan Keamanan

- Jaga keamanan file `.env` dan jangan commit ke repository
- Gunakan password MySQL yang kuat
- Update dependencies secara berkala
- Monitor log untuk aktivitas mencurigakan
- Backup database secara berkala
- Batasi akses grup dengan ALLOWED_GROUPS

## Support

Untuk masalah dan pertanyaan:
1. Periksa bagian troubleshooting
2. Review log untuk pesan error
3. Verifikasi pengaturan konfigurasi
4. Test dengan format pesan sederhana terlebih dahulu
5. Pastikan bot adalah admin grup untuk fitur delete pesan

## Lisensi

Proyek ini adalah software proprietary untuk operasional bisnis Kakarama Room.

---

**Catatan**: Bot ini memerlukan koneksi internet yang stabil dan akses WhatsApp Web. Pastikan server/komputer Anda tetap online untuk operasi berkelanjutan.
