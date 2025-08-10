# CHANGELOG

## [Unreleased] - 2025-01-10

### Added
- **Format Excel Baru**: Semua laporan Excel sekarang dimulai dari kolom B baris 3 untuk konsistensi format
- **Command Baru `!exportapartemen`**: Grup apartemen dapat mengekspor laporan Excel khusus apartemen mereka
  - `!exportapartemen` - Export business day kemarin
  - `!exportapartemen DDMMYYYY` - Export tanggal tertentu
  - Hanya bisa digunakan di grup apartemen
  - File Excel berisi data khusus apartemen tersebut
- **Parameter Baru untuk `!export`**: Kontrol pengiriman laporan dengan parameter baru
  - `!export email [tanggal]` - Kirim ke email saja (hanya private message)
  - `!export disini [tanggal]` - Kirim ke chat saja (hanya private message)
  - Jika tidak ada tanggal, menggunakan business day range hari ini

### Changed
- **Pengiriman Laporan Harian**: 
  - Owner tetap menerima file Excel lengkap (semua apartemen)
  - Grup apartemen hanya menerima laporan teks (tanpa file Excel)
  - Mengurangi ukuran attachment yang dikirim ke grup

### Fixed
- **Format Laporan Excel**:
  - Laporan Cash: Judul dan data dimulai dari B3
  - Laporan Transaksi: Judul dan data dimulai dari B3  
  - Laporan Komisi Marketing: Judul dan data dimulai dari B3
  - Konsistensi column width dan positioning
  - Perbaikan merge cells dan alignment

### Technical Details
- Menambah method `exportApartmentReport()` di ExcelExporter
- Mengubah scheduler untuk menggunakan `sendDailyReportsToGroups()` (teks only)
- Memperbaiki semua worksheet creation methods untuk format B3
- Update help message untuk command baru

### Breaking Changes
- Format file Excel berubah (data dimulai dari B3 bukan A1)
- Grup tidak lagi menerima file Excel otomatis (hanya teks laporan)

---

## Previous Versions
(Dokumentasi versi sebelumnya akan ditambahkan di sini)
