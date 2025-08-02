import { APIRequestSecurity, CSRFProtection, SessionSecurity } from './security'
import { ClientRateLimit } from './validation'

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_REQUESTS_PER_MINUTE = 60

// API Error types
export class APIError extends Error {
  public status: number
  public code?: string
  public details?: any

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: any
  ) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network connection failed') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  public field?: string

  constructor(message: string, field?: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

// Secure API Client
export class SecureAPIClient {
  private static instance: SecureAPIClient
  private baseURL: string
  private timeout: number

  private constructor() {
    this.baseURL = API_BASE_URL
    this.timeout = REQUEST_TIMEOUT
  }

  static getInstance(): SecureAPIClient {
    if (!SecureAPIClient.instance) {
      SecureAPIClient.instance = new SecureAPIClient()
    }
    return SecureAPIClient.instance
  }

  // Make secure request
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    rateLimitKey?: string
  ): Promise<T> {
    // Rate limiting check
    if (rateLimitKey && !ClientRateLimit.isAllowed(rateLimitKey, MAX_REQUESTS_PER_MINUTE, 60000)) {
      throw new APIError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED')
    }

    // Session validation
    if (!SessionSecurity.isSessionValid()) {
      SessionSecurity.clearSession()
      throw new APIError('Session expired. Please login again.', 401, 'SESSION_EXPIRED')
    }

    // Update session activity
    SessionSecurity.updateActivity()

    // Prepare headers
    const headers = APIRequestSecurity.addSecurityHeaders(options.headers as Record<string, string>)

    // Add authorization header if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // Create request with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Validate response security
      if (!APIRequestSecurity.validateResponse(response)) {
        throw new APIError('Invalid response received', 400, 'INVALID_RESPONSE')
      }

      // Handle different response statuses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        switch (response.status) {
          case 400:
            throw new ValidationError(errorData.message || 'Invalid request data', errorData.field)
          case 401:
            SessionSecurity.clearSession()
            throw new APIError('Authentication required', 401, 'UNAUTHORIZED')
          case 403:
            throw new APIError('Access denied', 403, 'FORBIDDEN')
          case 404:
            throw new APIError('Resource not found', 404, 'NOT_FOUND')
          case 429:
            throw new APIError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED')
          case 500:
            throw new APIError('Server error', 500, 'SERVER_ERROR')
          default:
            throw new APIError(errorData.message || 'Request failed', response.status)
        }
      }

      // Parse response
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        return await response.json()
      }
      
      return await response.text() as T
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof APIError || error instanceof ValidationError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new NetworkError('Request timeout')
        }
        if (error.message.includes('fetch')) {
          throw new NetworkError('Network connection failed')
        }
      }
      
      throw new APIError('Unexpected error occurred', 500, 'UNKNOWN_ERROR')
    }
  }

  // GET request
  async get<T>(endpoint: string, rateLimitKey?: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET' }, rateLimitKey)
  }

  // POST request
  async post<T>(endpoint: string, data?: any, rateLimitKey?: string): Promise<T> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined
      },
      rateLimitKey
    )
  }

  // PUT request
  async put<T>(endpoint: string, data?: any, rateLimitKey?: string): Promise<T> {
    return this.makeRequest<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined
      },
      rateLimitKey
    )
  }

  // DELETE request
  async delete<T>(endpoint: string, rateLimitKey?: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' }, rateLimitKey)
  }

  // Upload file
  async upload<T>(endpoint: string, file: File, rateLimitKey?: string): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers = APIRequestSecurity.addSecurityHeaders()
    delete headers['Content-Type']

    return this.makeRequest<T>(
      endpoint,
      {
        method: 'POST',
        body: formData,
        headers
      },
      rateLimitKey
    )
  }
}

// API service instance
export const apiClient = SecureAPIClient.getInstance()

// Specific API services
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/auth/login', credentials, 'auth_login'),
  
  logout: () =>
    apiClient.post('/auth/logout', {}, 'auth_logout'),
  
  refresh: () =>
    apiClient.post('/auth/refresh', {}, 'auth_refresh'),
  
  me: () =>
    apiClient.get('/auth/me', 'auth_me')
}

export const transactionsAPI = {
  getAll: (params?: any) =>
    apiClient.get(`/transactions${params ? '?' + new URLSearchParams(params) : ''}`, 'transactions_list'),
  
  getById: (id: number) =>
    apiClient.get(`/transactions/${id}`, 'transactions_get'),
  
  create: (data: any) =>
    apiClient.post('/transactions', data, 'transactions_create'),
  
  update: (id: number, data: any) =>
    apiClient.put(`/transactions/${id}`, data, 'transactions_update'),
  
  delete: (id: number) =>
    apiClient.delete(`/transactions/${id}`, 'transactions_delete'),
  
  export: (format: string, filters?: any) =>
    apiClient.post('/transactions/export', { format, filters }, 'transactions_export')
}

export const reportsAPI = {
  generate: (filters: any) =>
    apiClient.post('/reports/generate', filters, 'reports_generate'),
  
  export: (format: string, data: any) =>
    apiClient.post('/reports/export', { format, data }, 'reports_export')
}

export const csAPI = {
  getAll: () =>
    apiClient.get('/cs', 'cs_list'),
  
  getById: (id: number) =>
    apiClient.get(`/cs/${id}`, 'cs_get'),
  
  create: (data: any) =>
    apiClient.post('/cs', data, 'cs_create'),
  
  update: (id: number, data: any) =>
    apiClient.put(`/cs/${id}`, data, 'cs_update'),
  
  delete: (id: number) =>
    apiClient.delete(`/cs/${id}`, 'cs_delete')
}

export const systemAPI = {
  getStatus: () =>
    apiClient.get('/system/status', 'system_status'),
  
  getLogs: (params?: any) =>
    apiClient.get(`/system/logs${params ? '?' + new URLSearchParams(params) : ''}`, 'system_logs'),
  
  getConfig: () =>
    apiClient.get('/system/config', 'system_config'),
  
  updateConfig: (data: any) =>
    apiClient.put('/system/config', data, 'system_config_update')
}

// Request interceptor for automatic token refresh
export const setupAPIInterceptors = () => {
  // Initialize CSRF token
  if (!CSRFProtection.getToken()) {
    CSRFProtection.generateToken()
  }

  // Setup automatic session validation
  setInterval(() => {
    if (!SessionSecurity.isSessionValid()) {
      SessionSecurity.clearSession()
      window.location.href = '/login'
    }
  }, 60000) // Check every minute
}
