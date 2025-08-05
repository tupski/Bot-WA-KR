# 🚀 Laravel WhatsApp Dashboard - KakaRama

[![Laravel](https://img.shields.io/badge/Laravel-10.x-red.svg)](https://laravel.com)
[![PHP](https://img.shields.io/badge/PHP-8.2+-blue.svg)](https://php.net)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Sistem dashboard web untuk mengelola transaksi booking apartemen melalui bot WhatsApp. Dashboard ini menyediakan interface yang user-friendly untuk monitoring, reporting, dan manajemen data transaksi real-time.

## ✨ Features

### 🏠 **Dashboard Utama**
- Overview statistik real-time
- Grafik performa harian/bulanan
- Monitoring transaksi terbaru
- Quick actions dan shortcuts

### 💰 **Manajemen Transaksi**
- CRUD transaksi lengkap
- Filter dan pencarian advanced
- Export data (Excel, PDF, CSV)
- Bulk operations
- Real-time notifications

### 📊 **Laporan & Analytics**
- Laporan harian, bulanan, custom period
- Performance analytics per CS
- Performance analytics per apartemen
- Export laporan dalam berbagai format
- Grafik interaktif dengan Chart.js

### 👥 **Manajemen Customer Service**
- Profil CS lengkap
- Target dan tracking komisi
- Performance ranking
- Manajemen rate komisi

### 🏢 **Manajemen Apartemen**
- Data apartemen dan unit
- Integrasi WhatsApp Group
- Performance tracking per lokasi
- Status management

### 🔗 **API Integration**
- Webhook endpoint untuk bot WhatsApp
- RESTful API untuk data access
- Real-time broadcasting dengan Pusher
- Secure token authentication

### 🔔 **Real-time Notifications**
- Notifikasi transaksi baru
- Alert sistem dan error
- Email notifications
- Browser push notifications

### ⚙️ **Sistem Konfigurasi**
- Pengaturan bot WhatsApp
- Konfigurasi sistem
- Manajemen notifikasi
- Backup & restore settings

### 📤 **Export & Import**
- Export laporan PDF
- Export data CSV/Excel
- Backup database
- Import/restore data

### 👤 **User Management**
- Role-based access control
- User profiles dan permissions
- Activity logging
- Session management

### 📈 **Monitoring & Logging**
- System health monitoring
- Performance metrics
- Activity logs
- Error tracking

## 🛠️ Tech Stack

- **Backend**: Laravel 10.x, PHP 8.2+
- **Frontend**: Bootstrap 5, Chart.js, Alpine.js
- **Database**: MySQL/PostgreSQL
- **Cache**: Redis
- **Queue**: Redis
- **Broadcasting**: Pusher
- **File Storage**: Local/S3
- **Testing**: PHPUnit, Feature Tests

## 📋 Requirements

- PHP 8.2 or higher
- Composer
- Node.js & NPM
- MySQL 8.0+ or PostgreSQL 13+
- Redis (optional, for caching and queues)
- Web server (Apache/Nginx)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/laravel-whatsapp-dashboard.git
cd laravel-whatsapp-dashboard
```

### 2. Install Dependencies

```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install
```

### 3. Environment Setup

```bash
# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Configure your database in .env file
```

### 4. Database Setup

```bash
# Run migrations
php artisan migrate

# Seed initial data
php artisan db:seed

# Create admin user
php artisan tinker
>>> $user = \App\Models\User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => bcrypt('password')]);
>>> $user->assignRole('admin');
```

### 5. Build Assets

```bash
# Build frontend assets
npm run build

# For development
npm run dev
```

### 6. Start Development Server

```bash
# Start Laravel development server
php artisan serve

# Start queue worker (in separate terminal)
php artisan queue:work
```

Visit `http://localhost:8000` and login with:
- **Email**: admin@example.com
- **Password**: password

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- 📧 Email: support@kakarama.com
- 📱 WhatsApp: +62-xxx-xxxx-xxxx

---

**Made with ❤️ for KakaRama Team**
