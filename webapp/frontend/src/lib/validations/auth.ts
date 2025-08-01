import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional()
})

export const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  role: z
    .enum(['admin', 'user', 'viewer']),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

// Password strength checker
export const getPasswordStrength = (password: string): {
  score: number
  label: string
  color: string
} => {
  let score = 0
  
  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^a-zA-Z\d]/.test(password)) score += 1
  
  // Common patterns penalty
  if (/(.)\1{2,}/.test(password)) score -= 1 // Repeated characters
  if (/123|abc|qwe/i.test(password)) score -= 1 // Sequential patterns
  
  score = Math.max(0, Math.min(5, score))
  
  const strengthMap = {
    0: { label: 'Very Weak', color: 'bg-red-500' },
    1: { label: 'Weak', color: 'bg-red-400' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-blue-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very Strong', color: 'bg-green-600' }
  }
  
  return {
    score,
    ...strengthMap[score as keyof typeof strengthMap]
  }
}
