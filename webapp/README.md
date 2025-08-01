# Dashboard Web Kakarama Room

Dashboard web untuk mengelola bot WhatsApp Kakarama Room dengan fitur authentication dan manajemen data lengkap.

## 🚀 Fitur Utama

- **Authentication & Authorization**: Login/register dengan JWT
- **Dashboard Overview**: Statistik real-time dan key metrics
- **Transaction Management**: CRUD operations untuk data booking
- **Reports & Analytics**: Laporan harian/mingguan/bulanan dengan charts
- **CS Management**: Kelola data CS dan tracking komisi
- **System Configuration**: Pengaturan bot dan apartemen
- **Logs Viewer**: Monitor aktivitas dan troubleshooting
- **Real-time Monitoring**: Status bot dan health check
- **Export Data**: Export ke Excel, CSV, PDF

## 🛠️ Tech Stack

### Frontend
- **React 18** dengan TypeScript
- **Tailwind CSS** untuk styling
- **React Router** untuk routing
- **React Query** untuk state management
- **Chart.js** untuk visualisasi data
- **React Hook Form** untuk form handling

### Backend
- **Express.js** dengan TypeScript
- **JWT** untuk authentication
- **SQLite/MySQL** (shared dengan bot existing)
- **Multer** untuk file uploads
- **Winston** untuk logging

## 📁 Struktur Project

```
webapp/
├── frontend/          # React TypeScript app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── public/
│   └── package.json
├── backend/           # Express API server
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   ├── controllers/   # Route controllers
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── utils/         # Utility functions
│   └── package.json
├── shared/            # Shared types and utilities
│   ├── types/         # Shared TypeScript types
│   └── utils/         # Shared utility functions
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm atau yarn
- Database yang sama dengan bot existing

### Installation

1. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Frontend dependencies
   cd frontend && npm install
   
   # Backend dependencies
   cd ../backend && npm install
   ```

2. **Setup environment variables**
   ```bash
   # Copy environment files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually
   npm run dev:frontend
   npm run dev:backend
   ```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Build
npm run build           # Build both frontend and backend
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only

# Testing
npm run test           # Run all tests
npm run test:frontend  # Run frontend tests
npm run test:backend   # Run backend tests

# Linting
npm run lint           # Lint all code
npm run lint:fix       # Fix linting issues
```

## 📊 API Documentation

API documentation tersedia di `/api/docs` setelah server backend berjalan.

## 🔐 Authentication

Dashboard menggunakan JWT-based authentication dengan:
- Access token (15 menit)
- Refresh token (7 hari)
- Role-based permissions

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
docker-compose up -d
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📝 License

Private project untuk Kakarama Room.
