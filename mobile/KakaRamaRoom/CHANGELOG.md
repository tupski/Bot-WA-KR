# Changelog

Semua perubahan penting pada proyek KakaRama Room akan didokumentasikan di file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2025-08-11

### Fixed
- **🔓 Field Team Checkin Access**: Tim lapangan sekarang bisa input data checkin di semua apartemen
  - **Removed**: Pembatasan akses checkin berdasarkan apartment assignment
  - **Enhanced**: UI tetap menampilkan apartemen assigned untuk kemudahan workflow
  - **Added**: Fallback ke semua apartemen jika tidak ada assignment
  - **Added**: TestFieldTeamCheckin.js untuk testing akses
  - **Improved**: Fleksibilitas operasional untuk emergency checkin

### Technical Changes
- **CheckinService**: Removed validateAccess() restriction untuk field teams
- **TeamAssignmentService**: Added getAllApartmentsForCheckin() dan getAllUnitsForCheckin()
- **FieldCheckinScreen**: Enhanced UI dengan hint text dan fallback logic
- **AdminDashboard**: Added test utility untuk field team access

## [2.2.0] - 2025-08-11

### Added
- **🔔 Firebase Push Notification System**: Sistem notifikasi push real-time yang lengkap
  - **Auto Notifications**: Notifikasi otomatis untuk lifecycle checkin
    - Reminder 30 menit sebelum checkout
    - Notifikasi saat waktu checkout tiba
    - Notifikasi cleaning 15 menit setelah checkout
    - Notifikasi unit available 30 menit setelah cleaning
  - **Admin Broadcast**: Kirim notifikasi ke semua pengguna, admin saja, atau field team
  - **Firebase Integration**:
    - Sender ID: 241468377
    - Project ID: kr-app-12092
    - Service Account Key management yang aman
  - **Supabase Edge Function**: `send-push-notification` untuk FCM messaging
  - **Database Tables**:
    - `user_fcm_tokens` - FCM token storage
    - `notification_logs` - Sent notification tracking
    - `scheduled_notifications` - Auto notification queue
    - `pending_notifications` - Failed notification retry
    - `broadcast_notifications` - Admin broadcast history
  - **Testing Utility**: TestNotification.js dengan comprehensive testing
  - **Admin Test Panel**: Test push notification dari admin dashboard

### Enhanced
- **NotificationService**: Complete FCM integration dengan error handling
- **ScheduledNotificationProcessor**: Background processor untuk auto notifications
- **CheckinService**: Auto-schedule notifications saat checkin dibuat
- **Security**: Firebase credentials disimpan aman di folder credentials/

### Technical Details
- Firebase SDK configuration untuk Android
- Notification channels (default, checkin, admin, cleaning)
- Retry mechanism untuk failed notifications
- Real-time FCM token management
- Background processing setiap 1 menit
- Comprehensive error logging dan monitoring

### Documentation
- `TESTING_PUSH_NOTIFICATION.md` - Testing guide lengkap
- `supabase/DEPLOYMENT.md` - Edge Function deployment guide
- `QUICK_START_FIREBASE.md` - Quick start guide
- Setup scripts untuk Windows (PowerShell & Batch)

## [2.1.0] - 2025-08-10

### Added
- **Multi-Select Image Picker**: Upload hingga 5 foto bukti pembayaran dari galeri atau kamera
- **Enhanced Unit Overview**: Field pencarian dan tombol ubah status unit (Terisi, Tersedia, Cleaning, Maintenance)
- **Improved UI/UX**:
  - Hapus card form checkin untuk UI yang lebih sederhana
  - Fix modal marketing background yang transparan
  - Fix unit selection setelah apartemen dipilih

### Fixed
- **Build Release Issues**: Update react-native-image-resizer ke versi terbaru
- **Unit Selection Bug**: Perbaiki unit tidak muncul setelah pilih apartemen
- **Modal Background**: Fix background transparan di modal marketing name

### Changed
- **Image Upload**: Dari single image ke multi-select (maksimal 5 foto)
- **Unit Management**: Tim lapangan bisa ubah status unit langsung dari overview

## [1.2.0] - 2025-08-10

### Added
- **Business Day Logic**: Implementasi sistem closing harian jam 12 siang
  - 9 Agustus 12:00 - 10 Agustus 11:59 = laporan tanggal 9 Agustus
  - Standardisasi di seluruh aplikasi menggunakan BusinessDayService
- **Filter Laporan Multi-Select**: 
  - Multi-select dropdown apartemen di AdminReportsScreen
  - Filter rentang tanggal dengan quick options (hari ini, 7 hari, 30 hari)
- **Card Statistik Harian**: 
  - Checkin Hari ini (Checkin Aktif)
  - Total Checkin (Semua Apartemen)
  - Total Transaksi Tunai/Cash
  - Total Transaksi Transfer
- **Statistik per Apartemen**: Laporan harian dengan business day logic
  - Nama Apartemen
  - Jumlah Unit (Total)
  - Pendapatan
- **Marketing Terbaik**: Section marketing terbaik dengan business day logic
- **Tampilan Tanggal & Jam**: Real-time display di AdminReportsScreen
- **Logout di Pengaturan**: Pindahkan logout ke AppSettingsScreen dengan menu "Keluar"

### Fixed
- **FieldTeamService Error**: Perbaiki error "Cannot read property 'from' of undefined"
  - Fix import supabase yang salah di FieldTeamService.js
  - Fix import DatabaseManager di ActivityLogService.js
- **AdminCheckinScreen Force Close**: 
  - Perbaiki error handling yang lebih baik
  - Fix StorageService untuk handle object paymentProof
  - Tambah logging detail untuk debugging
- **Menu Tim Lapangan**: Perbaiki akses menu tim lapangan yang tidak bisa dibuka

### Changed
- **Logout Button**: Dipindahkan dari dashboard ke Pengaturan -> Keluar
- **Business Day Logic**: Standardisasi di semua komponen laporan
- **Multi-Select Support**: Update semua ReportService untuk mendukung filter multi-apartemen

### Technical Details
- Update BusinessDayService dengan logika closing jam 12 siang
- Refactor AdminReportsScreen dengan UI yang lebih baik
- Perbaiki import dependencies di semua service
- Tambah error handling yang lebih robust
- Update ReportService dengan fungsi getDailyStatistics baru

### Breaking Changes
- Filter apartemen di AdminReportsScreen sekarang menggunakan multi-select
- Business day calculation berubah dari midnight ke noon (12:00)

## [1.1.0] - 2025-08-07

### Added
- Migrasi dari SQLite ke Supabase
- Real-time synchronization
- Improved error handling

### Fixed
- Database connection issues
- Performance improvements

## [1.0.0] - 2025-08-01

### Added
- Initial release
- Basic checkin/checkout functionality
- Admin and field team dashboards
- WhatsApp bot integration
