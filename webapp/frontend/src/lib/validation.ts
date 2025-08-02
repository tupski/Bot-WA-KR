import { z } from 'zod'

// Common validation patterns
export const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
export const indonesianPhoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
export const currencyRegex = /^[0-9]+(\.[0-9]{1,2})?$/

// Sanitization helpers
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

export const sanitizeNumber = (input: number): number => {
  if (isNaN(input) || !isFinite(input)) {
    throw new Error('Invalid number')
  }
  return Math.max(0, input) // Ensure non-negative
}

// Authentication schemas
export const loginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
    .transform(sanitizeString),
  
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must not exceed 100 characters')
})

export const registerSchema = loginSchema.extend({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .transform(sanitizeString),
  
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Transaction schemas
export const transactionSchema = z.object({
  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must not exceed 20 characters')
    .transform(sanitizeString),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(50, 'Location must not exceed 50 characters')
    .transform(sanitizeString),
  
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(100000000, 'Amount is too large')
    .transform(sanitizeNumber),
  
  commission: z.number()
    .min(0, 'Commission must be 0 or greater')
    .max(10000000, 'Commission is too large')
    .transform(sanitizeNumber),
  
  csName: z.string()
    .min(1, 'CS name is required')
    .max(50, 'CS name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'CS name can only contain letters, numbers, and spaces')
    .transform(sanitizeString),
  
  paymentMethod: z.enum(['Cash', 'Transfer']),
  
  checkoutTime: z.string()
    .datetime('Invalid checkout time format'),
  
  notes: z.string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined)
})

// CS management schemas
export const csSchema = z.object({
  name: z.string()
    .min(1, 'CS name is required')
    .max(50, 'CS name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s]+$/, 'CS name can only contain letters, numbers, and spaces')
    .transform(sanitizeString),
  
  phone: z.string()
    .regex(phoneRegex, 'Invalid Indonesian phone number format')
    .transform(sanitizeString),
  
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional()
    .or(z.literal(''))
    .transform((val) => val ? sanitizeString(val) : undefined),
  
  commissionRate: z.number()
    .min(0, 'Commission rate must be 0 or greater')
    .max(100, 'Commission rate cannot exceed 100%')
    .transform(sanitizeNumber),
  
  fixedCommission: z.number()
    .min(0, 'Fixed commission must be 0 or greater')
    .max(10000000, 'Fixed commission is too large')
    .transform(sanitizeNumber),
  
  isActive: z.boolean(),
  
  notes: z.string()
    .max(500, 'Notes must not exceed 500 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined)
})

// Bot settings schemas
export const botSettingsSchema = z.object({
  botName: z.string()
    .min(1, 'Bot name is required')
    .max(100, 'Bot name must not exceed 100 characters')
    .transform(sanitizeString),
  
  welcomeMessage: z.string()
    .min(1, 'Welcome message is required')
    .max(1000, 'Welcome message must not exceed 1000 characters')
    .transform(sanitizeString),
  
  helpMessage: z.string()
    .min(1, 'Help message is required')
    .max(1000, 'Help message must not exceed 1000 characters')
    .transform(sanitizeString),
  
  errorMessage: z.string()
    .min(1, 'Error message is required')
    .max(500, 'Error message must not exceed 500 characters')
    .transform(sanitizeString),
  
  responseDelay: z.number()
    .min(0, 'Response delay must be 0 or greater')
    .max(10, 'Response delay cannot exceed 10 seconds')
    .transform(sanitizeNumber),
  
  maxRetries: z.number()
    .min(1, 'Max retries must be at least 1')
    .max(5, 'Max retries cannot exceed 5')
    .transform(sanitizeNumber),
  
  sessionTimeout: z.number()
    .min(5, 'Session timeout must be at least 5 minutes')
    .max(120, 'Session timeout cannot exceed 120 minutes')
    .transform(sanitizeNumber),
  
  enableLogging: z.boolean(),
  enableAnalytics: z.boolean(),
  maintenanceMode: z.boolean(),
  autoReply: z.boolean()
})

// Apartment settings schemas
export const apartmentSchema = z.object({
  name: z.string()
    .min(1, 'Apartment name is required')
    .max(50, 'Apartment name must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Apartment name can only contain letters, numbers, spaces, and hyphens')
    .transform(sanitizeString),
  
  location: z.string()
    .min(1, 'Location is required')
    .max(100, 'Location must not exceed 100 characters')
    .transform(sanitizeString),
  
  address: z.string()
    .min(1, 'Address is required')
    .max(255, 'Address must not exceed 255 characters')
    .transform(sanitizeString),
  
  totalUnits: z.number()
    .min(1, 'Total units must be at least 1')
    .max(10000, 'Total units cannot exceed 10,000')
    .transform(sanitizeNumber),
  
  pricePerNight: z.number()
    .min(1, 'Price must be greater than 0')
    .max(100000000, 'Price is too large')
    .transform(sanitizeNumber),
  
  commission: z.number()
    .min(0, 'Commission must be 0 or greater')
    .max(10000000, 'Commission is too large')
    .transform(sanitizeNumber),
  
  isActive: z.boolean()
})

// Report filters schemas
export const reportFiltersSchema = z.object({
  dateFrom: z.string()
    .datetime('Invalid date format'),
  
  dateTo: z.string()
    .datetime('Invalid date format'),
  
  location: z.string()
    .max(50, 'Location must not exceed 50 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined),
  
  csName: z.string()
    .max(50, 'CS name must not exceed 50 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined),
  
  reportType: z.enum(['daily', 'weekly', 'monthly', 'custom']),
  
  groupBy: z.enum(['date', 'location', 'cs', 'payment-method'])
}).refine((data) => {
  const fromDate = new Date(data.dateFrom)
  const toDate = new Date(data.dateTo)
  return fromDate <= toDate
}, {
  message: "End date must be after start date",
  path: ["dateTo"]
})

// Search and filter schemas
export const searchSchema = z.object({
  query: z.string()
    .max(100, 'Search query must not exceed 100 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined),
  
  page: z.number()
    .min(1, 'Page must be at least 1')
    .max(10000, 'Page number is too large')
    .optional()
    .default(1),
  
  limit: z.number()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .optional()
    .default(20),
  
  sortBy: z.string()
    .max(50, 'Sort field must not exceed 50 characters')
    .optional()
    .transform((val) => val ? sanitizeString(val) : undefined),
  
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc')
})

// Export validation
export const exportSchema = z.object({
  format: z.enum(['excel', 'csv', 'pdf']),
  
  filename: z.string()
    .min(1, 'Filename is required')
    .max(100, 'Filename must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Filename can only contain letters, numbers, hyphens, and underscores')
    .transform(sanitizeString),
  
  includeTimestamp: z.boolean().optional().default(true)
})

// Validation helper functions
export const validateAndSanitize = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new Error(firstError.message)
    }
    throw error
  }
}

export const validatePartial = <T>(schema: z.ZodObject<any>, data: unknown): Partial<T> => {
  try {
    return schema.partial().parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0]
      throw new Error(firstError.message)
    }
    throw error
  }
}

// Rate limiting helpers (for client-side)
export class ClientRateLimit {
  private static requests: Map<string, number[]> = new Map()

  static isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs)
    
    if (validRequests.length >= maxRequests) {
      return false
    }
    
    // Add current request
    validRequests.push(now)
    this.requests.set(key, validRequests)
    
    return true
  }

  static getRemainingRequests(key: string, maxRequests: number, windowMs: number): number {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    const validRequests = requests.filter(time => now - time < windowMs)
    
    return Math.max(0, maxRequests - validRequests.length)
  }
}
