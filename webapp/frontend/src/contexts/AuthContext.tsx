import React, { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import apiService from '@/services/api'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const isAuthenticated = !!user

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth()
  }, [])

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setIsLoading(false)
        return
      }

      // Verify token and get user info
      const response = await apiService.get<User>('/auth/me')
      if (response.success && response.data) {
        setUser(response.data)
      } else {
        // Token is invalid, clear it
        clearAuthData()
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      clearAuthData()
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true)
      const response = await apiService.post<AuthResponse>('/auth/login', credentials)
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        setUser(user)
        toast.success('Login successful!')
        navigate('/')
      } else {
        throw new Error(response.error?.message || 'Login failed')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      const message = error.response?.data?.error?.message || error.message || 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: RegisterRequest) => {
    try {
      setIsLoading(true)
      const response = await apiService.post<AuthResponse>('/auth/register', userData)
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data
        
        // Store tokens
        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('user', JSON.stringify(user))
        
        setUser(user)
        toast.success('Registration successful!')
        navigate('/')
      } else {
        throw new Error(response.error?.message || 'Registration failed')
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      const message = error.response?.data?.error?.message || error.message || 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await apiService.post('/auth/logout', { refreshToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      clearAuthData()
      toast.success('Logged out successfully')
      navigate('/login')
    }
  }

  const refreshToken = async () => {
    try {
      const refreshTokenValue = localStorage.getItem('refreshToken')
      if (!refreshTokenValue) {
        throw new Error('No refresh token available')
      }

      const response = await apiService.post<{ accessToken: string }>('/auth/refresh', {
        refreshToken: refreshTokenValue
      })

      if (response.success && response.data) {
        localStorage.setItem('accessToken', response.data.accessToken)
        return
      }

      throw new Error('Token refresh failed')
    } catch (error) {
      console.error('Token refresh error:', error)
      clearAuthData()
      navigate('/login')
      throw error
    }
  }

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  const clearAuthData = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
