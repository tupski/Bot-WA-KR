import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { registerSchema, type RegisterFormData, getPasswordStrength } from '@/lib/validations/auth'

const RegisterForm: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register: registerUser, isLoading } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user' as const,
      agreeToTerms: false
    }
  })

  const password = watch('password')
  const passwordStrength = password ? getPasswordStrength(password) : null

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role
      })
    } catch (error) {
      // Error is handled in the auth context
      console.error('Registration failed:', error)
    }
  }

  const isFormLoading = isLoading || isSubmitting

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Fill in the information below to create your account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username Field */}
          <Input
            {...register('username')}
            type="text"
            label="Username"
            placeholder="Enter your username"
            error={errors.username?.message}
            leftIcon={<User className="h-4 w-4" />}
            disabled={isFormLoading}
            autoComplete="username"
            required
          />

          {/* Email Field */}
          <Input
            {...register('email')}
            type="email"
            label="Email Address"
            placeholder="Enter your email"
            error={errors.email?.message}
            leftIcon={<Mail className="h-4 w-4" />}
            disabled={isFormLoading}
            autoComplete="email"
            required
          />

          {/* Password Field */}
          <div className="space-y-2">
            <Input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a strong password"
              error={errors.password?.message}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-gray-600 focus:outline-none"
                  disabled={isFormLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
              disabled={isFormLoading}
              autoComplete="new-password"
              required
            />
            
            {/* Password Strength Indicator */}
            {password && passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Password strength:</span>
                  <span className={`font-medium ${
                    passwordStrength.score >= 3 ? 'text-green-600' : 
                    passwordStrength.score >= 2 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <Input
            {...register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            label="Confirm Password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="hover:text-gray-600 focus:outline-none"
                disabled={isFormLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            disabled={isFormLoading}
            autoComplete="new-password"
            required
          />

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              {...register('role')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isFormLoading}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-2">
            <input
              {...register('agreeToTerms')}
              type="checkbox"
              id="agreeToTerms"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
              disabled={isFormLoading}
            />
            <label htmlFor="agreeToTerms" className="text-sm text-gray-600">
              I agree to the{' '}
              <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-500">{errors.agreeToTerms.message}</p>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            loading={isFormLoading}
            disabled={isFormLoading}
          >
            {isFormLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            >
              Sign in to your account
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default RegisterForm
