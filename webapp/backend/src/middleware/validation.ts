import { Request, Response, NextFunction } from 'express'
import { body, validationResult } from 'express-validator'
import { BadRequestError } from './errorHandler'

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg
    }))
    
    throw new BadRequestError('Validation failed', errorMessages)
  }
  
  next()
}

export const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match')
      }
      return true
    }),
    
  handleValidationErrors
]

export const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
    
  handleValidationErrors
]

export const validateRefreshToken = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isLength({ min: 10 })
    .withMessage('Invalid refresh token format'),
    
  handleValidationErrors
]

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('New passwords do not match')
      }
      return true
    }),
    
  handleValidationErrors
]

export const validateEmail = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
    
  handleValidationErrors
]

export const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
    
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match')
      }
      return true
    }),
    
  handleValidationErrors
]

// Custom validation functions
export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return strongPasswordRegex.test(password)
}

export const isValidUsername = (username: string): boolean => {
  // 3-50 characters, alphanumeric, underscore, hyphen only
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/
  return usernameRegex.test(username)
}

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '')
}

// Rate limiting validation
export const validateRateLimit = (req: Request, res: Response, next: NextFunction): void | Response => {
  const rateLimitHeader = res.getHeader('X-RateLimit-Remaining')
  
  if (rateLimitHeader && parseInt(rateLimitHeader as string) <= 0) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests. Please try again later.',
        statusCode: 429,
        code: 'RATE_LIMITED'
      }
    })
  }
  
  next()
}
