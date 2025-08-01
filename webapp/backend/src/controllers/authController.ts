import { Request, Response } from 'express'
import { UserModel } from '@/models/User'
import { UserSessionModel } from '@/models/UserSession'
import { LoginAttemptModel } from '@/models/LoginAttempt'
import { JWTService } from '@/utils/jwt'
import { asyncHandler, BadRequestError, UnauthorizedError, ConflictError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

interface LoginRequest {
  email: string
  password: string
}

interface RefreshTokenRequest {
  refreshToken: string
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password, confirmPassword }: RegisterRequest = req.body

  // Validation
  if (!username || !email || !password || !confirmPassword) {
    throw new BadRequestError('All fields are required')
  }

  if (password !== confirmPassword) {
    throw new BadRequestError('Passwords do not match')
  }

  if (password.length < 6) {
    throw new BadRequestError('Password must be at least 6 characters long')
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new BadRequestError('Invalid email format')
  }

  try {
    // Create user
    const user = await UserModel.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: 'user', // Default role
      isActive: true
    })

    // Generate tokens
    const tokenPair = JWTService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Save refresh token
    const expiresAt = JWTService.getRefreshTokenExpiryDate()
    await UserSessionModel.create({
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: expiresAt.toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Log successful registration
    logger.info(`User registered: ${user.email} (ID: ${user.id})`)

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      },
      message: 'User registered successfully'
    })

  } catch (error: any) {
    if (error.message.includes('already exists')) {
      throw new ConflictError(error.message)
    }
    throw error
  }
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password }: LoginRequest = req.body
  const ipAddress = req.ip || 'unknown'
  const userAgent = req.get('User-Agent')

  // Validation
  if (!email || !password) {
    throw new BadRequestError('Email and password are required')
  }

  try {
    // Find user
    const user = await UserModel.findByEmail(email.toLowerCase().trim())
    
    if (!user) {
      // Log failed attempt
      await LoginAttemptModel.create({
        email: email.toLowerCase().trim(),
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'User not found'
      })
      
      throw new UnauthorizedError('Invalid email or password')
    }

    if (!user.isActive) {
      // Log failed attempt
      await LoginAttemptModel.create({
        email: user.email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Account inactive'
      })
      
      throw new UnauthorizedError('Account is inactive')
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(password, user.passwordHash)
    
    if (!isValidPassword) {
      // Log failed attempt
      await LoginAttemptModel.create({
        email: user.email,
        ipAddress,
        userAgent,
        success: false,
        failureReason: 'Invalid password'
      })
      
      throw new UnauthorizedError('Invalid email or password')
    }

    // Generate tokens
    const tokenPair = JWTService.generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    })

    // Save refresh token
    const expiresAt = JWTService.getRefreshTokenExpiryDate()
    await UserSessionModel.create({
      userId: user.id,
      refreshToken: tokenPair.refreshToken,
      expiresAt: expiresAt.toISOString(),
      ipAddress,
      userAgent
    })

    // Update last login
    await UserModel.update(user.id, {
      lastLogin: new Date().toISOString()
    })

    // Log successful login
    await LoginAttemptModel.create({
      email: user.email,
      ipAddress,
      userAgent,
      success: true
    })

    logger.info(`User logged in: ${user.email} (ID: ${user.id})`)

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        },
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: tokenPair.expiresIn
      },
      message: 'Login successful'
    })

  } catch (error) {
    throw error
  }
})

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: RefreshTokenRequest = req.body

  if (!refreshToken) {
    throw new BadRequestError('Refresh token is required')
  }

  // Find session
  const session = await UserSessionModel.findByRefreshToken(refreshToken)
  
  if (!session || !session.isActive) {
    throw new UnauthorizedError('Invalid refresh token')
  }

  // Check if session is expired
  const now = new Date()
  const expiresAt = new Date(session.expiresAt)
  
  if (now > expiresAt) {
    // Invalidate expired session
    await UserSessionModel.invalidate(session.id)
    throw new UnauthorizedError('Refresh token expired')
  }

  // Get user
  const user = await UserModel.findById(session.userId)
  
  if (!user || !user.isActive) {
    await UserSessionModel.invalidate(session.id)
    throw new UnauthorizedError('User not found or inactive')
  }

  // Generate new access token
  const newAccessToken = JWTService.generateAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role
  })

  // Update session activity
  await UserSessionModel.updateActivity(session.id)

  res.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      expiresIn: JWTService.parseExpiryToSeconds(process.env.JWT_EXPIRES_IN || '15m')
    },
    message: 'Token refreshed successfully'
  })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken }: RefreshTokenRequest = req.body

  if (refreshToken) {
    // Invalidate specific session
    await UserSessionModel.invalidateByRefreshToken(refreshToken)
  } else if (req.user) {
    // Invalidate all user sessions if no specific refresh token provided
    await UserSessionModel.invalidateAllUserSessions(req.user.id)
  }

  logger.info(`User logged out: ${req.user?.email || 'Unknown'}`)

  res.json({
    success: true,
    message: 'Logout successful'
  })
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required')
  }

  const user = await UserModel.findById(req.user.id)
  
  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  })
})

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required')
  }

  const { currentPassword, newPassword, confirmPassword } = req.body

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new BadRequestError('All password fields are required')
  }

  if (newPassword !== confirmPassword) {
    throw new BadRequestError('New passwords do not match')
  }

  if (newPassword.length < 6) {
    throw new BadRequestError('New password must be at least 6 characters long')
  }

  // Get user with password hash
  const user = await UserModel.findById(req.user.id)
  
  if (!user) {
    throw new UnauthorizedError('User not found')
  }

  // Verify current password
  const isValidPassword = await UserModel.verifyPassword(currentPassword, user.passwordHash)
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect')
  }

  // Update password
  await UserModel.updatePassword(user.id, newPassword)

  // Invalidate all sessions to force re-login
  await UserSessionModel.invalidateAllUserSessions(user.id)

  logger.info(`Password changed for user: ${user.email} (ID: ${user.id})`)

  res.json({
    success: true,
    message: 'Password changed successfully. Please login again.'
  })
})
