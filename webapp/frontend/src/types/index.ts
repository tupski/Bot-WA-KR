// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    message: string
    statusCode: number
    details?: any
  }
  timestamp: string
  path: string
  method: string
}

// User Types
export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user' | 'viewer'
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// Transaction Types
export interface Transaction {
  id: number
  messageId: string
  location: string
  unit: string
  checkoutTime: string
  duration: string
  paymentMethod: 'Cash' | 'Transfer'
  csName: string
  commission: number
  amount: number
  netAmount: number
  skipFinancial: boolean
  createdAt: string
  dateOnly: string
}

export interface TransactionFilters {
  location?: string
  csName?: string
  paymentMethod?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// CS Types
export interface CSPerformance {
  csName: string
  totalBookings: number
  totalCash: number
  totalTransfer: number
  totalCommission: number
  averageCommission: number
  date: string
}

// Report Types
export interface DailyReport {
  date: string
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  netRevenue: number
  csSummary: CSPerformance[]
  locationStats: LocationStats[]
}

export interface LocationStats {
  location: string
  totalBookings: number
  totalRevenue: number
  percentage: number
}

// Chart Types
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
    borderWidth?: number
  }[]
}

// System Types
export interface SystemConfig {
  botStatus: 'online' | 'offline' | 'error'
  lastActivity: string
  totalMessages: number
  uptime: number
  version: string
}

export interface LogEntry {
  id: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  timestamp: string
  source?: string
  details?: any
}

// Form Types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date' | 'checkbox'
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

// Navigation Types
export interface NavItem {
  title: string
  href: string
  icon?: string
  badge?: string | number
  children?: NavItem[]
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

// Status Types
export type Status = 'idle' | 'loading' | 'success' | 'error'

// Export utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
