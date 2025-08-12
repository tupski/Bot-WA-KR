# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan dalam file ini.

Format berdasarkan [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
dan proyek ini mengikuti [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1] - 2025-01-12

### Added
- Komponen GlobalHeader untuk konsistensi header di seluruh aplikasi
- Ikon notifikasi global yang terlihat di semua screen
- Filter actions yang lebih user-friendly di screen Laporan
- Scroll horizontal untuk statistik harian yang lebih compact

### Changed
- **UI/UX Improvements**: Perbaikan konsistensi dan kemudahan penggunaan
  - Standardisasi ukuran button filter apartemen (minWidth: 120px, maxWidth: 150px)
  - Ikon notifikasi dipindah ke pojok kanan atas global di semua screen
  - Footer menu navigation selalu terlihat dengan konfigurasi `display: 'flex'`
  - Statistik harian di screen Laporan dibuat lebih compact dengan scroll horizontal
  
- **Header Consistency**: Menghapus duplikasi header dan menggunakan GlobalHeader
  - Screen Manajemen Unit: Hapus title duplikat, tambah label "Tambah Unit" pada tombol
  - Screen Pengaturan: Hapus header duplikat dan section "Profil & Akun" yang redundan
  - Screen Laporan: Hapus title duplikat dan section tanggal/business day
  
- **Navigation**: Semua screen menggunakan GlobalHeader konsisten dengan ikon notifikasi

### Fixed
- Duplikasi title di berbagai screen
- Inkonsistensi ukuran button filter
- Header yang tidak konsisten antar screen
- Footer menu yang kadang tersembunyi

### Technical
- Refactor navigation structure untuk konsistensi
- Cleanup unused imports dan state variables
- Optimasi style definitions untuk performa lebih baik
- Implementasi GlobalHeader component untuk reusability

### Removed
- Header duplikat di AdminUnitsScreen, AppSettingsScreen, AdminReportsScreen
- Section tanggal/business day yang redundan di AdminReportsScreen
- Section "Profil & Akun" yang duplikat dengan "Informasi Pengguna"
- Unused imports: DateTimeHeader, UnitService, NotificationIcon (dari beberapa screen)

---

## [2.1.0] - 2025-01-08

### Added
- Sistem notifikasi push dengan Firebase Cloud Messaging
- Broadcast message untuk admin
- Email reporting otomatis
- Top marketing tracking
- Business day management
- Activity logging system

### Changed
- Upgrade React Native dan dependencies
- Improved database schema
- Enhanced security dengan RLS policies

### Fixed
- Performance improvements
- Bug fixes pada checkin/checkout flow
- Stabilitas koneksi database

---

## [2.0.0] - 2024-12-15

### Added
- Aplikasi mobile React Native
- Sistem manajemen apartemen dan unit
- Check-in/check-out digital
- Tim lapangan management
- Real-time monitoring
- Laporan harian dan bulanan

### Changed
- Migrasi dari sistem manual ke digital
- Database PostgreSQL dengan Supabase
- Authentication system

### Technical
- React Native 0.72+
- Supabase backend
- Real-time subscriptions
- Offline capability

---

**Note**: Untuk detail teknis lebih lanjut, lihat commit history di repository Git.
