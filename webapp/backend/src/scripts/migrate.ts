#!/usr/bin/env ts-node

import { connectDatabase, closeDatabase } from '@/utils/database'
import { DatabaseSeeder } from '@/utils/seeder'
import { logger } from '@/utils/logger'

async function runMigrations() {
  try {
    logger.info('Starting database migration...')
    
    // Connect to database and create tables
    await connectDatabase()
    logger.info('Database tables created successfully')
    
    // Run seeders
    await DatabaseSeeder.runAllSeeders()
    logger.info('Database seeding completed')
    
    logger.info('Migration completed successfully!')
    
  } catch (error) {
    logger.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await closeDatabase()
  }
}

async function seedOnly() {
  try {
    logger.info('Running database seeders only...')
    
    await connectDatabase()
    await DatabaseSeeder.runAllSeeders()
    
    logger.info('Seeding completed successfully!')
    
  } catch (error) {
    logger.error('Seeding failed:', error)
    process.exit(1)
  } finally {
    await closeDatabase()
  }
}

async function createAdminOnly() {
  try {
    logger.info('Creating default admin user...')
    
    await connectDatabase()
    await DatabaseSeeder.seedDefaultAdmin()
    
    logger.info('Admin user created successfully!')
    
  } catch (error) {
    logger.error('Admin creation failed:', error)
    process.exit(1)
  } finally {
    await closeDatabase()
  }
}

// Parse command line arguments
const command = process.argv[2]

switch (command) {
  case 'seed':
    seedOnly()
    break
  case 'admin':
    createAdminOnly()
    break
  case 'migrate':
  default:
    runMigrations()
    break
}
