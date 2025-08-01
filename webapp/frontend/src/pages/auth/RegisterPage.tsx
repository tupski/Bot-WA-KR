import React from 'react'
import { Navigate } from 'react-router-dom'
import AuthLayout from '@/components/layouts/AuthLayout'
import RegisterForm from '@/components/auth/RegisterForm'
import { useAuth } from '@/contexts/AuthContext'

const RegisterPage: React.FC = () => {
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
      title="Create Account"
      subtitle="Join us and start managing your bot dashboard"
    >
      <RegisterForm />
    </AuthLayout>
  )
}

export default RegisterPage
