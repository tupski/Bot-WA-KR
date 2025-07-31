# User Guide - Kakarama Room System

Panduan lengkap penggunaan sistem manajemen booking Kakarama Room untuk admin dan operator.

## 📱 Akses Sistem

### Login ke Sistem
1. Buka browser dan akses URL sistem (contoh: https://booking.kakarama.com)
2. Masukkan email dan password yang telah diberikan
3. Klik tombol "Login"
4. Anda akan diarahkan ke dashboard utama

### Instalasi sebagai PWA (Progressive Web App)
1. Buka sistem di browser mobile (Chrome/Safari)
2. Akan muncul notifikasi "Install App" atau ikon install di address bar
3. Tap "Install" atau "Add to Home Screen"
4. Aplikasi akan terinstall seperti aplikasi native
5. Buka dari home screen untuk pengalaman yang lebih baik

## 🏠 Dashboard

Dashboard adalah halaman utama yang menampilkan ringkasan sistem secara real-time.

### Informasi yang Ditampilkan
- **Booking Hari Ini**: Jumlah booking yang dibuat hari ini
- **Booking Terkonfirmasi**: Jumlah booking dengan status confirmed
- **Revenue Hari Ini**: Total pendapatan dari booking hari ini
- **Booking WhatsApp**: Jumlah booking yang berasal dari WhatsApp Bot

### Fitur Dashboard
- **Chart Tren Booking**: Grafik booking 7 hari terakhir
- **Status WhatsApp Bot**: Monitoring status dan kesehatan bot
- **Booking Terbaru**: Daftar 5 booking terbaru
- **Aksi Cepat**: Shortcut untuk fungsi-fungsi utama
- **Status Sistem**: Indikator kesehatan database, bot, dan API

### Auto-Refresh
Dashboard akan otomatis memperbarui data setiap 30 detik tanpa perlu refresh halaman.

## 📋 Manajemen Booking

### Melihat Daftar Booking
1. Klik menu "Bookings" di sidebar
2. Daftar booking akan ditampilkan dalam bentuk tabel
3. Gunakan fitur pencarian dan filter untuk menemukan booking tertentu

### Filter dan Pencarian
- **Search Box**: Cari berdasarkan nama customer, nomor telepon, atau kode booking
- **Filter Status**: Pilih status booking (Pending, Confirmed, Check In, Check Out, Cancelled)
- **Filter Sumber**: Pilih sumber booking (WhatsApp atau Manual)
- **Filter Tanggal**: Pilih tanggal tertentu
- **Items per Page**: Atur jumlah booking yang ditampilkan per halaman

### Membuat Booking Baru
1. Klik tombol "Booking Baru" di halaman booking
2. Isi form dengan informasi berikut:
   - **Nama Customer**: Nama lengkap tamu
   - **Nomor Telepon**: Nomor HP customer (akan otomatis diformat)
   - **Tipe Kamar**: Pilih dari dropdown (Standard Single, Double, Deluxe, dll)
   - **Nomor Kamar**: Nomor kamar (opsional)
   - **Tanggal Check In**: Tanggal kedatangan
   - **Tanggal Check Out**: Tanggal keberangkatan
   - **Harga per Malam**: Harga kamar per malam
   - **Total Amount**: Akan otomatis dihitung
   - **Metode Pembayaran**: Cash, Transfer, atau Credit Card
   - **Catatan**: Catatan tambahan (opsional)
3. Klik "Simpan" untuk membuat booking

### Mengedit Booking
1. Klik ikon "Edit" (pensil) pada booking yang ingin diubah
2. Ubah informasi yang diperlukan
3. Klik "Update" untuk menyimpan perubahan

### Mengubah Status Booking

#### Konfirmasi Booking (Pending → Confirmed)
1. Klik dropdown "Actions" pada booking dengan status Pending
2. Pilih "Confirm"
3. Konfirmasi tindakan
4. Status akan berubah menjadi Confirmed

#### Check In (Confirmed → Checked In)
1. Klik dropdown "Actions" pada booking dengan status Confirmed
2. Pilih "Check In"
3. Masukkan nomor kamar jika belum ada
4. Tambahkan catatan jika diperlukan
5. Konfirmasi check in

#### Check Out (Checked In → Checked Out)
1. Klik dropdown "Actions" pada booking dengan status Checked In
2. Pilih "Check Out"
3. Tambahkan catatan checkout jika diperlukan
4. Konfirmasi check out

#### Membatalkan Booking
1. Klik dropdown "Actions" pada booking
2. Pilih "Cancel"
3. Masukkan alasan pembatalan
4. Konfirmasi pembatalan

### Melihat Detail Booking
1. Klik kode booking (link biru) atau ikon "View" (mata)
2. Modal akan terbuka menampilkan detail lengkap booking
3. Informasi yang ditampilkan:
   - Data customer lengkap
   - Detail kamar dan tanggal
   - Riwayat perubahan status
   - Metadata dari WhatsApp (jika dari bot)
   - Catatan dan informasi tambahan

## 🤖 Manajemen WhatsApp Groups

### Melihat Daftar Grup
1. Klik menu "WhatsApp Groups" di sidebar
2. Daftar grup WhatsApp akan ditampilkan
3. Status aktif/non-aktif dan pengaturan auto-parse terlihat

### Menambah Grup Baru
1. Klik tombol "Tambah Grup"
2. Isi informasi grup:
   - **Nama Grup**: Nama untuk identifikasi
   - **Group ID**: ID grup WhatsApp (format: 120363...@g.us)
   - **Status Aktif**: Aktifkan monitoring grup
   - **Auto Parse**: Aktifkan parsing otomatis pesan
   - **Confidence Threshold**: Tingkat kepercayaan parsing (0.1-1.0)
3. Klik "Simpan"

### Mendapatkan Group ID WhatsApp
1. Buka WhatsApp Web di browser
2. Pilih grup yang ingin ditambahkan
3. Lihat URL di address bar
4. Copy bagian setelah "https://web.whatsapp.com/send?phone=" hingga sebelum parameter lain
5. Atau gunakan bot command `!groupinfo` di grup

### Mengatur Grup
1. Klik ikon "Edit" pada grup yang ingin diatur
2. Ubah pengaturan:
   - **Status Aktif**: On/Off monitoring
   - **Auto Parse**: On/Off parsing otomatis
   - **Confidence Threshold**: Sesuaikan tingkat kepercayaan
3. Klik "Update"

### Monitoring Status Bot
Di halaman WhatsApp Groups, Anda dapat melihat:
- **Status Bot**: Online/Offline
- **Uptime**: Berapa lama bot sudah berjalan
- **Pesan Diproses**: Jumlah pesan yang telah diproses
- **Booking Dibuat**: Jumlah booking yang berhasil dibuat dari bot

## 📊 Laporan dan Analitik

### Mengakses Laporan
1. Klik menu "Reports" di sidebar
2. Pilih jenis laporan yang diinginkan

### Jenis Laporan
- **Booking Report**: Laporan detail semua booking
- **Revenue Report**: Laporan pendapatan
- **Customer Report**: Laporan data customer
- **WhatsApp Groups Report**: Laporan aktivitas grup WhatsApp

### Filter Laporan
- **Rentang Tanggal**: Pilih dari tanggal - sampai tanggal
- **Status Booking**: Filter berdasarkan status
- **Sumber Booking**: WhatsApp atau Manual
- **Tipe Kamar**: Filter berdasarkan tipe kamar

### Export Laporan
1. Setelah mengatur filter, klik "Generate Report"
2. Pilih format export:
   - **CSV**: Untuk Excel/spreadsheet
   - **PDF**: Untuk dokumen cetak
   - **Excel**: Format Excel native
3. File akan otomatis terdownload

### Chart dan Visualisasi
- **Booking Trends**: Grafik tren booking harian/mingguan
- **Revenue Chart**: Grafik pendapatan
- **Source Distribution**: Distribusi sumber booking
- **Status Distribution**: Distribusi status booking

## 🔧 Pengaturan Sistem

### Profil User
1. Klik nama user di pojok kanan atas
2. Pilih "Profile"
3. Ubah informasi:
   - Nama lengkap
   - Email
   - Password (jika diperlukan)
4. Klik "Update Profile"

### Notifikasi
Sistem akan menampilkan notifikasi real-time untuk:
- Booking baru dari WhatsApp
- Perubahan status booking
- Status bot berubah
- Error atau peringatan sistem

### Pengaturan Tampilan
- **Dark Mode**: Toggle di pojok kanan atas
- **Language**: Pilih bahasa (Indonesia/English)
- **Timezone**: Sesuaikan zona waktu

## 📱 Fitur Mobile/PWA

### Offline Mode
Ketika tidak ada koneksi internet:
- Data yang sudah dimuat tetap dapat dilihat
- Pencarian dalam data lokal masih berfungsi
- Sistem akan otomatis sync ketika koneksi kembali

### Push Notifications
Jika diaktifkan, Anda akan menerima notifikasi untuk:
- Booking baru
- Perubahan status penting
- Alert sistem

### Instalasi di Mobile
1. Buka sistem di browser mobile
2. Tap "Add to Home Screen" ketika muncul prompt
3. Aplikasi akan terinstall seperti app native
4. Buka dari home screen untuk pengalaman terbaik

## 🤖 WhatsApp Bot Commands

### Perintah untuk Admin (di grup)

#### !rekap
Menampilkan ringkasan booking hari ini
```
!rekap
```

#### !detailrekap
Menampilkan detail booking dengan filter tanggal
```
!detailrekap 2024-12-01
!detailrekap 2024-12-01 2024-12-31
```

#### !status
Menampilkan status bot dan sistem
```
!status
```

#### !help
Menampilkan daftar perintah yang tersedia
```
!help
```

### Format Pesan Booking
Bot akan otomatis mendeteksi pesan booking dengan format:
```
Booking untuk [Nama Customer]
HP: [Nomor Telepon]
Check in: [Tanggal]
Check out: [Tanggal]
Kamar: [Tipe Kamar]
Harga: [Harga per malam]
```

Contoh:
```
Booking untuk John Doe
HP: 081234567890
Check in: 25 Desember 2024
Check out: 27 Desember 2024
Kamar: Standard Double
Harga: 350000 per malam
```

## ❗ Troubleshooting

### Bot WhatsApp Tidak Merespon
1. Cek status bot di dashboard
2. Jika offline, hubungi admin untuk restart
3. Pastikan grup sudah terdaftar dan aktif
4. Cek apakah pesan sesuai format yang benar

### Data Tidak Terupdate
1. Refresh halaman (F5)
2. Cek koneksi internet
3. Logout dan login kembali
4. Clear browser cache jika masalah berlanjut

### Error saat Membuat Booking
1. Pastikan semua field wajib terisi
2. Cek format tanggal (harus valid)
3. Pastikan nomor telepon valid
4. Cek apakah tanggal check-out setelah check-in

### Laporan Tidak Muncul
1. Cek filter tanggal (jangan terlalu lama)
2. Pastikan ada data di rentang tanggal tersebut
3. Coba dengan filter yang lebih luas
4. Refresh halaman dan coba lagi

### Notifikasi Tidak Muncul
1. Pastikan browser mengizinkan notifikasi
2. Cek pengaturan notifikasi di browser
3. Untuk mobile, pastikan PWA sudah diinstall
4. Cek pengaturan notifikasi di sistem operasi

## 📞 Bantuan dan Support

### Kontak Support
- **Email**: support@kakarama.com
- **WhatsApp**: +62 xxx-xxxx-xxxx
- **Jam Operasional**: 08:00 - 17:00 WIB

### FAQ
**Q: Bagaimana cara menambah tipe kamar baru?**
A: Hubungi admin sistem untuk menambah tipe kamar di database.

**Q: Bisakah mengubah booking yang sudah check-out?**
A: Booking yang sudah check-out tidak dapat diubah statusnya, tapi data lain masih bisa diedit.

**Q: Bagaimana cara backup data?**
A: Admin sistem melakukan backup otomatis harian. Untuk backup manual, gunakan fitur export.

**Q: Apakah bisa menggunakan multiple device?**
A: Ya, Anda bisa login dari multiple device dengan akun yang sama.

### Tips Penggunaan
1. **Gunakan PWA** untuk pengalaman mobile yang lebih baik
2. **Aktifkan notifikasi** untuk update real-time
3. **Export data berkala** sebagai backup tambahan
4. **Gunakan filter** untuk mempercepat pencarian data
5. **Cek status bot** secara berkala untuk memastikan berjalan normal
