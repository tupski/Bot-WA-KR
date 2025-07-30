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

Bot memproses pesan yang memiliki indikator lingkaran berwarna di baris pertama dan "Unit" di baris kedua. Format angka menggunakan ribuan yang disingkat (250 = 250.000).

### Format Pesan Standar

```
🟢SKY HOUSE CHEKIN
Unit      : L3/30N
Cek out   : 05:00
Untuk     : 6 jam
Cash/Tf   : tf kr 250
Cs        : dreamy
Komisi    : 50
```

### Grup Apartemen yang Didukung

| **Grup WhatsApp** | **Emoji** | **Apartemen** |
|-------------------|-----------|---------------|
| SKY HOUSE CHEKIN | 🟢 | SKY HOUSE |
| TREE PARK BSD CHEKIN | 🟡 | TREEPARK BSD |
| SPRINGWOOD CHEKIN | ⚪ | SPRINGWOOD RESIDENCES |
| EMERALD CHEKIN | ⚫ | EMERALD BINTARO |
| TOKYO PIK2 CHEKIN | 🤎 | TOKYO RIVERSIDE PIK2 |
| SERPONG GARDEN CHEKIN | 🟠 | SERPONG GARDEN |

### Komponen Pesan

- **[EMOJI][NAMA GRUP]**: Prefix dengan emoji warna per apartemen
- **Unit**: Identifier unit/kamar (L3/30N, A1, B2, dll.)
- **Cek out**: Waktu checkout dalam format HH:MM
- **Untuk**: Durasi dalam jam (contoh: "6 jam", "2.5 jam")
- **Cash/Tf**: Metode pembayaran dan jumlah dalam ribuan
  - Format: "cash 250" (= Rp250.000) atau "tf kr 250" (= Rp250.000)
  - Komisi akan dikurangi dari jumlah Cash/Tf
- **Cs**: Nama customer (CS = Customer)
- **Komisi**: Jumlah komisi dalam ribuan (contoh: "50" = Rp50.000)

### Format Angka (Ribuan Disingkat)

- **Input**: 250 → **Database**: 250.000
- **Input**: 150 → **Database**: 150.000
- **Input**: 75 → **Database**: 75.000

### Kasus Khusus

- **CS APK**: Komisi = 0, tidak dihitung dalam perhitungan marketing
- **CS Amel**: Komisi = 0, tidak dihitung dalam perhitungan marketing
- **Tf Amel**: Tanpa jumlah (amount = 0), hanya mencatat transaksi
- **Cash APK**: Tanpa jumlah (amount = 0), hanya mencatat transaksi
- **Spasi Fleksibel**: Bot dapat menangani variasi spasi di sekitar tanda titik dua

## Command System

### Command !rekap

**Format**: `!rekap [apartemen] [tanggal]`

#### Contoh Penggunaan:

```
!rekap
```
*Rekap semua apartemen hari ini dari jam 12:00 WIB*

```
!rekap emerald
```
*Rekap apartemen Emerald Bintaro hari ini dari jam 12:00 WIB*

```
!rekap 30072025
```
*Rekap semua apartemen tanggal 30 Juli 2025 (12:00 WIB - 11:59 WIB hari berikutnya)*

```
!rekap emerald 30072025
```
*Rekap apartemen Emerald Bintaro tanggal 30 Juli 2025*

#### Contoh Output !rekap:

```
📊 *REKAP LAPORAN 30/07/2025*
🏢 Kakarama Room
🏠 EMERALD BINTARO
📅 30/07/2025 12:00 - 14:25 WIB

👥 *TOTAL CS*
- total cs amel: 2
- total cs apk: 1
- total cs kr: 5

- Jumlah CS: 8
----------------------

💰 *KEUANGAN*
- total cash amel: Rp150.000
- total cash kr: Rp1.200.000
- total tf KR: Rp800.000

- total kotor: Rp2.150.000
- total komisi: Rp450.000
- total bersih: Rp1.700.000

🎯 *KOMISI MARKETING*
- Dreamy: Rp150.000
- Tupas: Rp200.000
- Budi: Rp100.000

- Total Komisi Marketing: Rp450.000
```

### Command !detailrekap

**Format**: `!detailrekap [apartemen] [tanggal]`

#### Contoh Penggunaan:

```
!detailrekap
```
*Detail rekap semua apartemen hari ini dari jam 12:00 WIB*

```
!detailrekap sky
```
*Detail rekap apartemen Sky House hari ini dari jam 12:00 WIB*

```
!detailrekap 29072025
```
*Detail rekap semua apartemen tanggal 29 Juli 2025 (12:00 WIB - 11:59 WIB hari berikutnya)*

```
!detailrekap sky 29072025
```
*Detail rekap apartemen Sky House tanggal 29 Juli 2025*

#### Contoh Output !detailrekap:

```
📋 DETAIL REKAP CHECKIN
🏢 Kakarama Room
📅 30/07/2025
🏠 SKY HOUSE

Tanggal & Jam input: 30/07/2025 14:25
Unit      : L3/10D
Cek out: 19:18
Untuk   : 6jam
Cash/tf: cash 200
Cs         : tupas
komisi : 50
===========================================

Tanggal & Jam input: 30/07/2025 15:30
Unit      : L2/05A
Cek out: 20:30
Untuk   : 8jam
Cash/tf: tf 150
Cs         : dreamy
komisi : 30
===========================================
```

### Command !apartemen

**Format**: `!apartemen [nama_apartemen] [tanggal]`

#### Contoh Penggunaan:

```
!apartemen
```
*Laporan semua apartemen hari ini*

```
!apartemen sky house
```
*Laporan apartemen Sky House hari ini*

```
!apartemen sky house 30072025
```
*Laporan apartemen Sky House tanggal 30 Juli 2025*

### Pencarian Apartemen Cerdas

Bot mendukung pencarian apartemen berdasarkan nama parsial:

| **Input** | **Hasil** |
|-----------|-----------|
| `emerald` | EMERALD BINTARO |
| `sky` | SKY HOUSE |
| `tree` | TREEPARK BSD |
| `spring` | SPRINGWOOD RESIDENCES |
| `tokyo` | TOKYO RIVERSIDE PIK2 |
| `serpong` | SERPONG GARDEN |

## Laporan

### Laporan Harian Otomatis (12:00 WIB)

Bot mengirim laporan otomatis setiap hari jam 12:00 WIB ke semua grup yang terdaftar.

#### Contoh Laporan Harian WhatsApp:

```
📊 *LAPORAN HARIAN KAKARAMA ROOM*
📅 30/07/2025

🏢 *RINGKASAN BISNIS*
- Total Booking: 15
- Total Pendapatan: Rp3.750.000
- Total Komisi: Rp750.000
- Pendapatan Bersih: Rp3.000.000

👥 *PERFORMA CS*
- CS Amel: 5 booking (Rp1.250.000)
- CS KR: 8 booking (Rp2.000.000)
- CS APK: 2 booking (Rp500.000)

💰 *BREAKDOWN PEMBAYARAN*
- Cash: Rp2.250.000 (60%)
- Transfer: Rp1.500.000 (40%)

🏠 *STATISTIK APARTEMEN*
- SKY HOUSE: 6 booking
- EMERALD BINTARO: 4 booking
- TREEPARK BSD: 3 booking
- SPRINGWOOD: 2 booking

📧 Laporan Excel telah dikirim ke email.
```

### Laporan Excel Harian

File Excel otomatis dibuat setiap hari dengan 4 sheet:

#### 1. **Sheet "Transaksi"**
| Tanggal | Unit | Checkout | Durasi | Metode | Amount | CS | Komisi | Apartemen |
|---------|------|----------|--------|--------|--------|----|---------|-----------|
| 30/07/2025 14:25 | L3/10D | 19:18 | 6jam | Cash | 250.000 | Tupas | 50.000 | SKY HOUSE |
| 30/07/2025 15:30 | L2/05A | 20:30 | 8jam | TF | 150.000 | Dreamy | 30.000 | EMERALD BINTARO |

#### 2. **Sheet "Ringkasan CS"**
| CS Name | Total Booking | Total Cash | Total TF | Total Amount | Avg per Booking |
|---------|---------------|------------|----------|--------------|-----------------|
| Tupas | 3 | 450.000 | 200.000 | 650.000 | 216.667 |
| Dreamy | 2 | 0 | 300.000 | 300.000 | 150.000 |
| Amel | 1 | 100.000 | 0 | 100.000 | 100.000 |

#### 3. **Sheet "Komisi Marketing"**
| CS Name | Total Booking | Total Komisi | Avg Komisi |
|---------|---------------|--------------|------------|
| Tupas | 3 | 150.000 | 50.000 |
| Dreamy | 2 | 60.000 | 30.000 |
| Budi | 1 | 40.000 | 40.000 |

#### 4. **Sheet "Summary Apartemen"**
| Apartemen | Total Booking | Total Amount | Avg per Booking |
|-----------|---------------|--------------|-----------------|
| SKY HOUSE | 6 | 1.500.000 | 250.000 |
| EMERALD BINTARO | 4 | 800.000 | 200.000 |
| TREEPARK BSD | 3 | 600.000 | 200.000 |

### Laporan Email Otomatis

#### Format Email Harian:

**Subject**: `Laporan Harian Kakarama Room - 30/07/2025`

**Body**:
```html
<h2>📊 Laporan Harian Kakarama Room</h2>
<p><strong>Tanggal:</strong> 30 Juli 2025</p>

<h3>🏢 Ringkasan Bisnis</h3>
<ul>
  <li>Total Booking: 15</li>
  <li>Total Pendapatan: Rp3.750.000</li>
  <li>Total Komisi: Rp750.000</li>
  <li>Pendapatan Bersih: Rp3.000.000</li>
</ul>

<h3>👥 Top Performer</h3>
<ul>
  <li>CS Terbaik: Tupas (8 booking)</li>
  <li>Pendapatan Tertinggi: Rp2.000.000</li>
</ul>

<p><strong>📎 File Excel terlampir untuk detail lengkap.</strong></p>
```

**Attachment**: `Laporan_Kakarama_Room_30072025.xlsx`

## Validasi Format Pesan

Bot melakukan validasi ketat terhadap format pesan dengan respon yang tegas:

### Respon Validasi

#### 1. **Format Salah Keseluruhan**
```
❌ Salah anjing. yang bener gini:

🟢SKY HOUSE CHEKIN
Unit      : L3/30N
Cek out   : 05:00
Untuk     : 6 jam
Cash/Tf   : tf kr 250
Cs        : dreamy
Komisi    : 50
```

#### 2. **Field Kosong dengan Mention**
```
@username Komisinya mana?
```
```
@username Unit-nya mana?
```
```
@username Cash/Tf-nya mana?
```

#### 3. **Format Valid**
```
✅ Data berhasil disimpan:
Unit L3/30N - SKY HOUSE
Checkout: 05:00 (6 jam)
Cash/TF: Rp250.000 (TF)
CS: Dreamy, Komisi: Rp50.000
```

### Status Code Sistem

Bot menggunakan status code untuk tracking:

| **Status** | **Keterangan** |
|------------|----------------|
| `VALID` | Pesan berhasil diproses |
| `INVALID_FORMAT` | Format pesan salah |
| `MISSING_FIELD` | Ada field yang kosong |
| `DUPLICATE` | Pesan sudah pernah diproses |
| `ERROR` | Error sistem |

### Sistem Checkpoint & Recovery

Bot memiliki sistem checkpoint untuk mencegah kehilangan data:

#### Fitur Checkpoint:
- **Message Tracking**: Melacak pesan yang sudah diproses berdasarkan ID unik
- **Offline Recovery**: Memproses pesan yang tertinggal saat bot disconnect
- **Time-based Recovery**: Hanya memproses pesan dari jam 12:00 WIB ke atas
- **Duplicate Prevention**: Mencegah pemrosesan pesan yang sama berulang kali

#### Proses Recovery:
1. Bot menyimpan checkpoint setiap pesan yang diproses
2. Saat bot restart, sistem mengecek pesan yang belum diproses
3. Memfilter pesan berdasarkan waktu (≥ 12:00 WIB)
4. Memproses pesan yang tertinggal secara otomatis
5. Update checkpoint untuk mencegah duplikasi

#### Log Recovery:
```
]: Bot memulai proses recovery pesan tertinggal...
]: Ditemukan 3 pesan yang belum diproses dari jam 12:00 WIB
]: Memproses pesan tertinggal: Unit L3/10D - SKY HOUSE
]: Recovery selesai: 3 pesan berhasil diproses
```

## Schema Database

### Tabel

1. **transactions**: Record booking individual
2. **cs_summary**: Agregat performa CS harian
3. **daily_summary**: Ringkasan bisnis harian
4. **processed_messages**: Tracking pesan yang sudah diproses

### SQLite vs MySQL

- **SQLite**: Default, berbasis file, tidak perlu server
- **MySQL**: Untuk produksi, performa lebih baik, akses concurrent

## Scripts & Utilitas

### Scripts Utama

```bash
# Jalankan bot
npm start

# Mode development dengan auto-restart
npm run dev

# Jalankan test
npm test

# Bersihkan database (development)
node clear_database.js
```

### Utilitas Tambahan

#### 1. **Clear Database Script**
```bash
node clear_database.js
```
*Membersihkan semua data transaksi untuk testing*

#### 2. **Manual Test Script**
```bash
node manual_test.js
```
*Test manual parsing pesan dan database*

#### 3. **Debug Database Script**
```bash
node debug_database.js
```
*Melihat isi database untuk debugging*

### Environment Variables Lengkap

```env
# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./session
PUPPETEER_HEADLESS=true

# Database Configuration
DB_TYPE=sqlite
SQLITE_PATH=./data/bot-kr.db

# MySQL Configuration (jika menggunakan MySQL)
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=kakarama_room

# Email Configuration
EMAIL_ENABLED=true
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_TO=kakaramaroom@gmail.com

# Logging Configuration
LOG_LEVEL=info
LOG_ENABLE_FILE=true
LOG_MAX_FILES=10
LOG_MAX_SIZE=50m

# Security Configuration
ALLOWED_GROUPS=group1@g.us,group2@g.us

# Timezone Configuration
TIMEZONE=Asia/Jakarta
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

### Masalah Umum & Solusi

#### 1. **QR Code tidak muncul**
```bash
# Solusi:
- Periksa port 3000 tersedia: netstat -an | grep 3000
- Set PUPPETEER_HEADLESS=false untuk debugging
- Restart bot: pm2 restart whatsapp-bot
```

#### 2. **Error koneksi database**
```bash
# SQLite:
- Periksa permission: chmod 755 ./data/
- Verifikasi path: ls -la ./data/bot-kr.db

# MySQL:
- Test koneksi: mysql -u user -p -h host database
- Periksa service: systemctl status mysql
```

#### 3. **Email tidak terkirim**
```bash
# Debugging:
- Verifikasi Gmail app password
- Test SMTP: telnet smtp.gmail.com 587
- Periksa log: tail -f logs/app.log | grep email
```

#### 4. **Pesan tidak diproses**
```bash
# Debugging:
- Cek format: pastikan ada emoji + "Unit" di baris 2
- Monitor log: tail -f logs/app.log | grep "parse"
- Test manual: node manual_test.js
```

#### 5. **Bot tidak merespon di grup**
```bash
# Solusi:
- Cek grup diizinkan: grep ALLOWED_GROUPS .env
- Pastikan bot admin grup (untuk delete pesan)
- Verifikasi nama grup: cek config/config.js
```

#### 6. **Data tidak muncul di !rekap**
```bash
# Debugging:
- Cek timezone: date (harus WIB)
- Verifikasi data: node debug_database.js
- Periksa range waktu: !rekap mencari dari jam 12:00 WIB
```

#### 7. **Bot disconnect sering**
```bash
# Solusi:
- Periksa koneksi internet stabil
- Monitor memory: free -h
- Restart berkala: pm2 restart whatsapp-bot
```

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

## Fitur Lanjutan

### 1. **Multi-Group Support**
- Bot dapat beroperasi di multiple grup apartemen
- Setiap grup memiliki mapping apartemen sendiri
- Data terpisah per apartemen untuk laporan

### 2. **Offline Message Processing**
- Bot memproses pesan yang tertinggal saat disconnect
- Checkpoint system mencegah data loss
- Recovery otomatis saat bot restart

### 3. **Smart Number Formatting**
- Input: 250 → Output: Rp250.000
- Otomatis konversi ribuan yang disingkat
- Konsisten di semua laporan

### 4. **Advanced Reporting**
- Laporan per apartemen dengan filter
- Detail transaksi dengan timestamp
- Export Excel multi-sheet otomatis

### 5. **CS Performance Tracking**
- Mapping CS untuk breakdown keuangan
- Komisi marketing terpisah dari CS operasional
- Performance metrics per CS

## Monitoring & Maintenance

### Log Files
```bash
# Real-time monitoring
tail -f logs/app.log

# Error monitoring
tail -f logs/error.log | grep ERROR

# Specific search
grep "VALID" logs/app.log | tail -20
```

### Database Maintenance
```bash
# Backup database (SQLite)
cp data/bot-kr.db backup/bot-kr-$(date +%Y%m%d).db

# Check database size
du -sh data/bot-kr.db

# Vacuum database (SQLite optimization)
sqlite3 data/bot-kr.db "VACUUM;"
```

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h

# Network monitoring
netstat -an | grep :3000
```

## Support & Maintenance

### Untuk masalah dan pertanyaan:
1. **Periksa troubleshooting section** - Solusi masalah umum
2. **Review log files** - `tail -f logs/app.log` untuk error terbaru
3. **Verifikasi konfigurasi** - Pastikan .env dan config.js benar
4. **Test format pesan** - Gunakan format standar untuk testing
5. **Pastikan bot admin grup** - Diperlukan untuk fitur delete pesan
6. **Monitor resource usage** - CPU, memory, disk space
7. **Backup data berkala** - Database dan konfigurasi

### Maintenance Schedule:
- **Harian**: Monitor log dan performance
- **Mingguan**: Backup database dan update dependencies
- **Bulanan**: Review dan optimize database
- **Quarterly**: Security update dan server maintenance

## Lisensi

Proyek ini adalah software proprietary untuk operasional bisnis Kakarama Room.

---

**Catatan**: Bot ini memerlukan koneksi internet yang stabil dan akses WhatsApp Web. Pastikan server/komputer Anda tetap online untuk operasi berkelanjutan.
