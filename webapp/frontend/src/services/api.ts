import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

class ApiService {
  private client: AxiosInstance
  private baseURL: string

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add timestamp to prevent caching
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          }
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        return response
      },
      async (error) => {
        const originalRequest = error.config

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            const refreshToken = localStorage.getItem('refreshToken')
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              })

              const { accessToken } = response.data.data
              localStorage.setItem('accessToken', accessToken)

              // Retry original request
              originalRequest.headers.Authorization = `Bearer ${accessToken}`
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.handleAuthError()
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private handleAuthError() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  // Generic request method
  private async request<T = any>(
    config: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.request<ApiResponse<T>>(config)
      return response.data
    } catch (error: any) {
      if (error.response?.data) {
        throw error.response.data
      }
      
      throw {
        success: false,
        error: {
          message: error.message || 'Network error',
          statusCode: error.response?.status || 500,
        },
        timestamp: new Date().toISOString(),
        path: config.url || '',
        method: config.method || 'GET',
      } as ApiResponse
    }
  }

  // HTTP methods
  async get<T = any>(url: string, params?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, params })
  }

  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data })
  }

  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PUT', url, data })
  }

  async patch<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'PATCH', url, data })
  }

  async delete<T = any>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url })
  }

  // File upload
  async upload<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(progress)
        }
      },
    })
  }

  // Download file
  async download(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.client.get(url, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('Download failed:', error)
      throw error
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health')
      return true
    } catch {
      return false
    }
  }
}

export const apiService = new ApiService()
export default apiService
