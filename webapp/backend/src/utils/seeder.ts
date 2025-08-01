import { UserModel } from '@/models/User'
import { logger } from './logger'

export class DatabaseSeeder {
  static async seedDefaultAdmin(): Promise<void> {
    try {
      // Check if admin user already exists
      const existingAdmin = await UserModel.findByEmail('admin@kakarama.com')
      
      if (existingAdmin) {
        logger.info('Default admin user already exists')
        return
      }

      // Create default admin user
      const adminUser = await UserModel.create({
        username: 'admin',
        email: 'admin@kakarama.com',
        password: 'admin123', // Should be changed on first login
        role: 'admin',
        isActive: true
      })

      logger.info(`Default admin user created: ${adminUser.email} (ID: ${adminUser.id})`)
      logger.warn('⚠️  Default admin password is "admin123" - Please change it immediately!')

    } catch (error) {
      logger.error('Error seeding default admin:', error)
      throw error
    }
  }

  static async seedTestUsers(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      logger.info('Skipping test user seeding in production')
      return
    }

    try {
      const testUsers = [
        {
          username: 'user1',
          email: 'user1@kakarama.com',
          password: 'user123',
          role: 'user' as const
        },
        {
          username: 'viewer1',
          email: 'viewer1@kakarama.com',
          password: 'viewer123',
          role: 'viewer' as const
        }
      ]

      for (const userData of testUsers) {
        const existingUser = await UserModel.findByEmail(userData.email)
        
        if (!existingUser) {
          const user = await UserModel.create(userData)
          logger.info(`Test user created: ${user.email} (${user.role})`)
        } else {
          logger.info(`Test user already exists: ${userData.email}`)
        }
      }

    } catch (error) {
      logger.error('Error seeding test users:', error)
      throw error
    }
  }

  static async runAllSeeders(): Promise<void> {
    try {
      logger.info('Running database seeders...')
      
      await this.seedDefaultAdmin()
      await this.seedTestUsers()
      
      logger.info('Database seeding completed successfully')
    } catch (error) {
      logger.error('Database seeding failed:', error)
      throw error
    }
  }
}
