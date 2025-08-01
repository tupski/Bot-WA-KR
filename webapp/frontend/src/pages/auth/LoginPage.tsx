import React from 'react'
import { Navigate } from 'react-router-dom'
import AuthLayout from '@/components/layouts/AuthLayout'
import LoginForm from '@/components/auth/LoginForm'
import { useAuth } from '@/contexts/AuthContext'

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account to continue"
    >
      <LoginForm />
    </AuthLayout>
  )
}

export default LoginPage
