import { Router } from 'express'
import * as authController from '@/controllers/authController'
import { authenticateToken, rateLimitByIP, checkAccountLockout } from '@/middleware/auth'
import {
  validateRegister,
  validateLogin,
  validateRefreshToken,
  validateChangePassword
} from '@/middleware/validation'

const router = Router()

// Public routes with rate limiting
// Registration disabled for internal application
// router.post('/register',
//   rateLimitByIP(5, 15), // 5 attempts per 15 minutes per IP
//   validateRegister,
//   authController.register
// )

router.post('/login',
  rateLimitByIP(10, 15), // 10 attempts per 15 minutes per IP
  checkAccountLockout,
  validateLogin,
  authController.login
)

router.post('/refresh',
  rateLimitByIP(20, 15), // 20 refresh attempts per 15 minutes per IP
  validateRefreshToken,
  authController.refreshToken
)

// Protected routes
router.post('/logout',
  authenticateToken,
  authController.logout
)

router.get('/me',
  authenticateToken,
  authController.me
)

router.post('/change-password',
  authenticateToken,
  validateChangePassword,
  authController.changePassword
)

export default router
