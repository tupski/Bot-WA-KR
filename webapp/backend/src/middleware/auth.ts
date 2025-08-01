import { Request, Response, NextFunction } from 'express'
import { JWTService } from '@/utils/jwt'
import { UserModel } from '@/models/User'
import { LoginAttemptModel } from '@/models/LoginAttempt'
import { UnauthorizedError, ForbiddenError } from './errorHandler'
import { logger } from '@/utils/logger'

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number
        email: string
        role: string
        username: string
      }
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization
    const token = JWTService.extractTokenFromHeader(authHeader || '')

    if (!token) {
      throw new UnauthorizedError('Access token required')
    }

    // Verify token
    const payload = JWTService.verifyAccessToken(token)
    
    // Get user from database to ensure user still exists and is active
    const user = await UserModel.findById(payload.userId)
    
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive')
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username
    }

    next()
  } catch (error: any) {
    if (error.message === 'Access token expired') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Token expired',
          statusCode: 401,
          code: 'TOKEN_EXPIRED'
        }
      })
    }

    if (error.message === 'Invalid access token') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid token',
          statusCode: 401,
          code: 'INVALID_TOKEN'
        }
      })
    }

    logger.error('Authentication error:', error)
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication failed',
        statusCode: 401
      }
    })
  }
}

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required')
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    
    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}`)
    }

    next()
  }
}

export const requireAdmin = requireRole('admin')
export const requireUserOrAdmin = requireRole(['user', 'admin'])

export const rateLimitByIP = (maxAttempts: number = 10, windowMinutes: number = 15) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown'
      
      const isBlocked = await LoginAttemptModel.isIPBlocked(ipAddress, maxAttempts, windowMinutes)
      
      if (isBlocked) {
        return res.status(429).json({
          success: false,
          error: {
            message: `Too many requests from this IP. Try again in ${windowMinutes} minutes.`,
            statusCode: 429,
            code: 'IP_RATE_LIMITED'
          }
        })
      }

      next()
    } catch (error) {
      logger.error('Rate limiting error:', error)
      next() // Continue on error to not block legitimate requests
    }
  }
}

export const checkAccountLockout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body
    
    if (!email) {
      return next()
    }

    const isLocked = await LoginAttemptModel.isAccountLocked(email)
    
    if (isLocked) {
      return res.status(423).json({
        success: false,
        error: {
          message: 'Account temporarily locked due to too many failed login attempts. Try again later.',
          statusCode: 423,
          code: 'ACCOUNT_LOCKED'
        }
      })
    }

    next()
  } catch (error) {
    logger.error('Account lockout check error:', error)
    next() // Continue on error
  }
}

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    const token = JWTService.extractTokenFromHeader(authHeader || '')

    if (token) {
      try {
        const payload = JWTService.verifyAccessToken(token)
        const user = await UserModel.findById(payload.userId)
        
        if (user && user.isActive) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            username: user.username
          }
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }

    next()
  } catch (error) {
    logger.error('Optional auth error:', error)
    next() // Continue on error
  }
}

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now()
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const userInfo = req.user ? `User: ${req.user.email} (${req.user.role})` : 'Anonymous'
    
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${userInfo}`)
  })

  next()
}
