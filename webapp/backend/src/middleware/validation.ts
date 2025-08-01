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

// Transaction validation
export const validateCreateTransaction = [
  body('messageId')
    .trim()
    .notEmpty()
    .withMessage('Message ID is required')
    .isLength({ max: 255 })
    .withMessage('Message ID must not exceed 255 characters'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),

  body('unit')
    .trim()
    .notEmpty()
    .withMessage('Unit is required')
    .isLength({ max: 50 })
    .withMessage('Unit must not exceed 50 characters'),

  body('checkoutTime')
    .trim()
    .notEmpty()
    .withMessage('Checkout time is required')
    .isLength({ max: 100 })
    .withMessage('Checkout time must not exceed 100 characters'),

  body('duration')
    .trim()
    .notEmpty()
    .withMessage('Duration is required')
    .isLength({ max: 50 })
    .withMessage('Duration must not exceed 50 characters'),

  body('paymentMethod')
    .isIn(['Cash', 'Transfer'])
    .withMessage('Payment method must be Cash or Transfer'),

  body('csName')
    .trim()
    .notEmpty()
    .withMessage('CS name is required')
    .isLength({ max: 50 })
    .withMessage('CS name must not exceed 50 characters'),

  body('commission')
    .isNumeric()
    .withMessage('Commission must be a number')
    .custom((value) => {
      if (parseFloat(value) < 0) {
        throw new Error('Commission must be non-negative')
      }
      return true
    }),

  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      return true
    }),

  body('netAmount')
    .optional()
    .isNumeric()
    .withMessage('Net amount must be a number'),

  body('skipFinancial')
    .optional()
    .isBoolean()
    .withMessage('Skip financial must be a boolean'),

  body('dateOnly')
    .isISO8601()
    .withMessage('Date must be in valid ISO format (YYYY-MM-DD)'),

  handleValidationErrors
]

export const validateUpdateTransaction = [
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),

  body('unit')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Unit must not exceed 50 characters'),

  body('checkoutTime')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Checkout time must not exceed 100 characters'),

  body('duration')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Duration must not exceed 50 characters'),

  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'Transfer'])
    .withMessage('Payment method must be Cash or Transfer'),

  body('csName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('CS name must not exceed 50 characters'),

  body('commission')
    .optional()
    .isNumeric()
    .withMessage('Commission must be a number')
    .custom((value) => {
      if (value !== undefined && parseFloat(value) < 0) {
        throw new Error('Commission must be non-negative')
      }
      return true
    }),

  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number')
    .custom((value) => {
      if (value !== undefined && parseFloat(value) <= 0) {
        throw new Error('Amount must be greater than 0')
      }
      return true
    }),

  body('netAmount')
    .optional()
    .isNumeric()
    .withMessage('Net amount must be a number'),

  body('skipFinancial')
    .optional()
    .isBoolean()
    .withMessage('Skip financial must be a boolean'),

  handleValidationErrors
]

export const validateBulkDelete = [
  body('ids')
    .isArray({ min: 1, max: 100 })
    .withMessage('IDs must be an array with 1-100 items')
    .custom((ids) => {
      if (!ids.every((id: any) => Number.isInteger(parseInt(id)))) {
        throw new Error('All IDs must be valid integers')
      }
      return true
    }),

  handleValidationErrors
]
