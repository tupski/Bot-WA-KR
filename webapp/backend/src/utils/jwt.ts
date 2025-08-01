import jwt, { SignOptions } from 'jsonwebtoken'
import type { StringValue } from 'ms'
import crypto from 'crypto'
import { logger } from './logger'

export interface JWTPayload {
  userId: number
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
}

export class JWTService {
  private static getAccessTokenSecret(): string {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    return secret
  }

  private static getRefreshTokenSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET environment variable is required')
    }
    return secret
  }

  private static getAccessTokenExpiry(): string {
    return process.env.JWT_EXPIRES_IN || '15m'
  }

  private static getRefreshTokenExpiry(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  }

  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    try {
      const secret = this.getAccessTokenSecret()
      const expiresIn = this.getAccessTokenExpiry()

      const options: SignOptions = {
        expiresIn: expiresIn as StringValue,
        issuer: 'kakarama-dashboard',
        audience: 'kakarama-dashboard-users'
      }

      return jwt.sign(payload, secret, options)
    } catch (error) {
      logger.error('Error generating access token:', error)
      throw new Error('Failed to generate access token')
    }
  }

  static generateRefreshToken(): string {
    try {
      // Generate a secure random token
      return crypto.randomBytes(64).toString('hex')
    } catch (error) {
      logger.error('Error generating refresh token:', error)
      throw new Error('Failed to generate refresh token')
    }
  }

  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    const accessToken = this.generateAccessToken(payload)
    const refreshToken = this.generateRefreshToken()

    // Calculate expiry times in seconds
    const accessExpiresIn = this.parseExpiryToSeconds(this.getAccessTokenExpiry())
    const refreshExpiresIn = this.parseExpiryToSeconds(this.getRefreshTokenExpiry())

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn: refreshExpiresIn
    }
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      const secret = this.getAccessTokenSecret()
      
      const decoded = jwt.verify(token, secret, {
        issuer: 'kakarama-dashboard',
        audience: 'kakarama-dashboard-users'
      }) as JWTPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token')
      } else {
        logger.error('Error verifying access token:', error)
        throw new Error('Token verification failed')
      }
    }
  }

  static decodeAccessToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload
      return decoded
    } catch (error) {
      logger.error('Error decoding access token:', error)
      return null
    }
  }

  static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeAccessToken(token)
      if (!decoded || !decoded.exp) {
        return true
      }

      const currentTime = Math.floor(Date.now() / 1000)
      return decoded.exp < currentTime
    } catch (error) {
      return true
    }
  }

  static getTokenExpiryDate(token: string): Date | null {
    try {
      const decoded = this.decodeAccessToken(token)
      if (!decoded || !decoded.exp) {
        return null
      }

      return new Date(decoded.exp * 1000)
    } catch (error) {
      return null
    }
  }

  static getRefreshTokenExpiryDate(): Date {
    const expirySeconds = this.parseExpiryToSeconds(this.getRefreshTokenExpiry())
    return new Date(Date.now() + (expirySeconds * 1000))
  }

  private static parseExpiryToSeconds(expiry: string): number {
    // Parse expiry string like "15m", "7d", "1h", etc.
    const match = expiry.match(/^(\d+)([smhd])$/)
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`)
    }

    const value = parseInt(match[1])
    const unit = match[2]

    switch (unit) {
      case 's': return value
      case 'm': return value * 60
      case 'h': return value * 60 * 60
      case 'd': return value * 60 * 60 * 24
      default: throw new Error(`Invalid expiry unit: ${unit}`)
    }
  }

  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    return authHeader.substring(7) // Remove "Bearer " prefix
  }

  static generatePasswordResetToken(): string {
    try {
      return crypto.randomBytes(32).toString('hex')
    } catch (error) {
      logger.error('Error generating password reset token:', error)
      throw new Error('Failed to generate password reset token')
    }
  }

  static generateAPIKey(): string {
    try {
      const prefix = 'kr_'
      const randomPart = crypto.randomBytes(32).toString('hex')
      return prefix + randomPart
    } catch (error) {
      logger.error('Error generating API key:', error)
      throw new Error('Failed to generate API key')
    }
  }

  static hashToken(token: string): string {
    try {
      return crypto.createHash('sha256').update(token).digest('hex')
    } catch (error) {
      logger.error('Error hashing token:', error)
      throw new Error('Failed to hash token')
    }
  }

  static verifyTokenHash(token: string, hash: string): boolean {
    try {
      const tokenHash = this.hashToken(token)
      return crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(hash))
    } catch (error) {
      logger.error('Error verifying token hash:', error)
      return false
    }
  }
}
