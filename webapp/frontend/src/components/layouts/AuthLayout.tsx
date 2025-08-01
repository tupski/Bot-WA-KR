import React from 'react'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title = "Welcome Back", 
  subtitle = "Sign in to your account to continue" 
}) => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <h1 className="text-4xl font-bold mb-4">
              Kakarama Room Dashboard
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Manage your WhatsApp bot and track room bookings with ease
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-blue-100">Monitoring</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">Real-time</div>
                <div className="text-blue-100">Analytics</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">Secure</div>
                <div className="text-blue-100">Access</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl font-bold">Easy</div>
                <div className="text-blue-100">Management</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo for mobile */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              Kakarama Room
            </Link>
          </div>

          {/* Header */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900">
              {title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {subtitle}
            </p>
          </div>

          {/* Form */}
          <div className="mt-8">
            {children}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              © 2024 Kakarama Room Dashboard. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
