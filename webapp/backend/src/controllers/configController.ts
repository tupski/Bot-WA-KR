import { Request, Response } from 'express'
import { ConfigModel, ApartmentGroup, ConfigUpdate } from '@/models/Config'
import { asyncHandler, BadRequestError, ForbiddenError } from '@/middleware/errorHandler'
import { logger } from '@/utils/logger'

export const getSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await ConfigModel.getSystemConfig()

  // Remove sensitive information
  const sanitizedConfig = {
    ...config,
    database: {
      type: config.database.type,
      // Don't expose database credentials
    },
    email: {
      enabled: config.email.enabled,
      service: config.email.service,
      user: config.email.user,
      to: config.email.to,
      from: config.email.from,
      // Don't expose email password
    }
  }

  res.json({
    success: true,
    data: sanitizedConfig
  })
})

export const updateSystemConfig = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can update system config
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can update system configuration')
  }

  const { updates } = req.body

  if (!Array.isArray(updates) || updates.length === 0) {
    throw new BadRequestError('Updates array is required')
  }

  // Validate updates
  for (const update of updates) {
    if (!update.section || !update.key || update.value === undefined) {
      throw new BadRequestError('Each update must have section, key, and value')
    }
  }

  await ConfigModel.updateConfig(updates)

  logger.info(`System config updated by user ${req.user?.email}:`, updates)

  res.json({
    success: true,
    message: 'System configuration updated successfully'
  })
})

export const getConfigSection = asyncHandler(async (req: Request, res: Response) => {
  const { section } = req.params

  if (!section) {
    throw new BadRequestError('Section is required')
  }

  const config = await ConfigModel.getSystemConfig()
  const sectionData = (config as any)[section]

  if (!sectionData) {
    throw new BadRequestError(`Configuration section '${section}' not found`)
  }

  res.json({
    success: true,
    data: {
      section,
      config: sectionData
    }
  })
})

export const updateConfigSection = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can update config sections
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can update configuration')
  }

  const { section } = req.params
  const { config } = req.body

  if (!section || !config) {
    throw new BadRequestError('Section and config data are required')
  }

  // Convert section config to updates array
  const updates: ConfigUpdate[] = []
  for (const [key, value] of Object.entries(config)) {
    updates.push({ section, key, value })
  }

  await ConfigModel.updateConfig(updates)

  logger.info(`Config section '${section}' updated by user ${req.user?.email}`)

  res.json({
    success: true,
    message: `Configuration section '${section}' updated successfully`
  })
})

export const getApartments = asyncHandler(async (req: Request, res: Response) => {
  const apartments = await ConfigModel.getApartments()

  res.json({
    success: true,
    data: {
      apartments,
      total: apartments.length
    }
  })
})

export const updateApartments = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can update apartments
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can update apartment configuration')
  }

  const { apartments } = req.body

  if (!Array.isArray(apartments)) {
    throw new BadRequestError('Apartments array is required')
  }

  // Validate apartment data
  for (const apt of apartments) {
    if (!apt.id || !apt.name || typeof apt.enabled !== 'boolean') {
      throw new BadRequestError('Each apartment must have id, name, and enabled fields')
    }
  }

  await ConfigModel.updateApartments(apartments)

  logger.info(`Apartments configuration updated by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Apartments configuration updated successfully'
  })
})

export const getCommissionRates = asyncHandler(async (req: Request, res: Response) => {
  const rates = await ConfigModel.getCommissionRates()

  res.json({
    success: true,
    data: {
      rates
    }
  })
})

export const updateCommissionRates = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can update commission rates
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can update commission rates')
  }

  const { rates } = req.body

  if (!rates || typeof rates !== 'object') {
    throw new BadRequestError('Commission rates object is required')
  }

  // Validate rates
  for (const [cs, rate] of Object.entries(rates)) {
    if (typeof rate !== 'number' || rate < 0) {
      throw new BadRequestError(`Invalid commission rate for ${cs}: must be a positive number`)
    }
  }

  await ConfigModel.updateCommissionRates(rates)

  logger.info(`Commission rates updated by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Commission rates updated successfully'
  })
})

export const getOwnerNumbers = asyncHandler(async (req: Request, res: Response) => {
  const numbers = await ConfigModel.getOwnerNumbers()

  res.json({
    success: true,
    data: {
      ownerNumbers: numbers
    }
  })
})

export const updateOwnerNumbers = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can update owner numbers
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can update owner numbers')
  }

  const { numbers } = req.body

  if (!Array.isArray(numbers)) {
    throw new BadRequestError('Owner numbers array is required')
  }

  // Validate phone numbers
  for (const number of numbers) {
    if (typeof number !== 'string' || !/^\d+$/.test(number)) {
      throw new BadRequestError(`Invalid phone number format: ${number}`)
    }
  }

  await ConfigModel.updateOwnerNumbers(numbers)

  logger.info(`Owner numbers updated by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Owner numbers updated successfully'
  })
})

export const resetConfiguration = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can reset configuration
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can reset configuration')
  }

  await ConfigModel.resetToDefaults()

  logger.warn(`Configuration reset to defaults by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Configuration reset to defaults successfully'
  })
})

export const exportConfiguration = asyncHandler(async (req: Request, res: Response) => {
  const config = await ConfigModel.exportConfig()

  // Remove sensitive data for export
  const exportConfig = {
    ...config,
    database: {
      type: config.database.type,
      // Don't export database credentials
    },
    email: {
      enabled: config.email.enabled,
      service: config.email.service,
      user: config.email.user,
      to: config.email.to,
      from: config.email.from,
      // Don't export email password
    }
  }

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="system-config.json"')

  res.json({
    success: true,
    data: exportConfig,
    exportedAt: new Date().toISOString()
  })

  logger.info(`Configuration exported by user ${req.user?.email}`)
})

export const importConfiguration = asyncHandler(async (req: Request, res: Response) => {
  // Only admin can import configuration
  if (req.user?.role !== 'admin') {
    throw new ForbiddenError('Only admin can import configuration')
  }

  const { config } = req.body

  if (!config || typeof config !== 'object') {
    throw new BadRequestError('Configuration object is required')
  }

  await ConfigModel.importConfig(config)

  logger.warn(`Configuration imported by user ${req.user?.email}`)

  res.json({
    success: true,
    message: 'Configuration imported successfully'
  })
})

export const validateConfiguration = asyncHandler(async (req: Request, res: Response) => {
  const config = await ConfigModel.getSystemConfig()
  const errors: string[] = []

  // Basic validation
  if (!config.owner.allowedNumbers.length) {
    errors.push('No owner numbers configured')
  }

  if (!config.apartments.groups.length) {
    errors.push('No apartment groups configured')
  }

  if (config.email.enabled && (!config.email.user || !config.email.password)) {
    errors.push('Email is enabled but credentials are missing')
  }

  // Validate commission rates
  for (const [cs, rate] of Object.entries(config.commission)) {
    if (typeof rate !== 'number' || rate < 0) {
      errors.push(`Invalid commission rate for ${cs}`)
    }
  }

  const isValid = errors.length === 0

  res.json({
    success: true,
    data: {
      isValid,
      errors,
      validatedAt: new Date().toISOString()
    }
  })
})
