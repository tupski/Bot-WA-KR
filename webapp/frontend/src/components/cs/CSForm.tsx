import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Save, User, Phone, Mail, DollarSign, Percent } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatCurrency } from '@/lib/utils'
import type { CSPerformance } from './CSPerformanceCard'

const csSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name must not exceed 50 characters'),
  phone: z.string().min(1, 'Phone is required').regex(/^[0-9+\-\s()]+$/, 'Invalid phone format'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  commissionRate: z.number().min(0, 'Commission rate must be 0 or greater').max(100, 'Commission rate cannot exceed 100%'),
  fixedCommission: z.number().min(0, 'Fixed commission must be 0 or greater'),
  isActive: z.boolean(),
  notes: z.string().optional()
})

type CSFormData = z.infer<typeof csSchema>

interface CSFormProps {
  cs?: CSPerformance
  onSubmit: (data: CSFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const CSForm: React.FC<CSFormProps> = ({
  cs,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const isEditing = !!cs

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<CSFormData>({
    resolver: zodResolver(csSchema),
    defaultValues: cs ? {
      name: cs.name,
      phone: '', // Would come from API
      email: '', // Would come from API
      commissionRate: 10, // Default percentage
      fixedCommission: cs.totalCommission / Math.max(cs.totalBookings, 1), // Calculate from existing data
      isActive: cs.isActive,
      notes: ''
    } : {
      name: '',
      phone: '',
      email: '',
      commissionRate: 10,
      fixedCommission: 50000,
      isActive: true,
      notes: ''
    }
  })

  const commissionRate = watch('commissionRate')
  const fixedCommission = watch('fixedCommission')

  const handleFormSubmit = async (data: CSFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isEditing ? 'Edit CS' : 'Add New CS'}
            </CardTitle>
            <CardDescription>
              {isEditing 
                ? 'Update CS information and commission settings'
                : 'Add a new customer service representative'
              }
            </CardDescription>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('name')}
                label="CS Name"
                placeholder="e.g., Amel, KR, APK"
                leftIcon={<User className="h-4 w-4" />}
                error={errors.name?.message}
                disabled={isLoading || isSubmitting}
                required
              />

              <Input
                {...register('phone')}
                label="Phone Number"
                placeholder="e.g., +62812345678"
                leftIcon={<Phone className="h-4 w-4" />}
                error={errors.phone?.message}
                disabled={isLoading || isSubmitting}
                required
              />
            </div>

            <Input
              {...register('email')}
              type="email"
              label="Email Address"
              placeholder="cs@example.com (optional)"
              leftIcon={<Mail className="h-4 w-4" />}
              error={errors.email?.message}
              disabled={isLoading || isSubmitting}
              helperText="Optional - for notifications and reports"
            />
          </div>

          {/* Commission Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Commission Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('commissionRate', { valueAsNumber: true })}
                type="number"
                label="Commission Rate (%)"
                placeholder="10"
                leftIcon={<Percent className="h-4 w-4" />}
                error={errors.commissionRate?.message}
                disabled={isLoading || isSubmitting}
                helperText="Percentage of transaction amount"
                min={0}
                max={100}
                step={0.1}
              />

              <Input
                {...register('fixedCommission', { valueAsNumber: true })}
                type="number"
                label="Fixed Commission (IDR)"
                placeholder="50000"
                leftIcon={<DollarSign className="h-4 w-4" />}
                error={errors.fixedCommission?.message}
                disabled={isLoading || isSubmitting}
                helperText="Fixed amount per transaction"
                min={0}
                step={1000}
              />
            </div>

            {/* Commission Preview */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Commission Preview</h4>
              <div className="text-sm text-blue-800">
                For a transaction of Rp 200,000:
                <ul className="mt-2 space-y-1">
                  <li>• Percentage: {formatCurrency((200000 * (commissionRate || 0)) / 100)}</li>
                  <li>• Fixed: {formatCurrency(fixedCommission || 0)}</li>
                  <li className="font-medium">• Total: {formatCurrency(((200000 * (commissionRate || 0)) / 100) + (fixedCommission || 0))}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Status & Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Status & Settings</h3>
            
            <div className="flex items-center space-x-2">
              <input
                {...register('isActive')}
                type="checkbox"
                id="isActive"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={isLoading || isSubmitting}
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active CS
              </label>
              <span className="text-xs text-gray-500">
                (Only active CS can receive new bookings)
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                {...register('notes')}
                placeholder="Optional notes about this CS..."
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isSubmitting}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </div>

          {/* Performance Summary (for editing) */}
          {isEditing && cs && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Current Performance</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-900">
                    {formatCurrency(cs.totalRevenue)}
                  </div>
                  <div className="text-xs text-green-600">Total Revenue</div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-900">
                    {cs.totalBookings}
                  </div>
                  <div className="text-xs text-blue-600">Total Bookings</div>
                </div>
                
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-lg font-bold text-purple-900">
                    {formatCurrency(cs.totalCommission)}
                  </div>
                  <div className="text-xs text-purple-600">Total Commission</div>
                </div>
                
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-900">
                    #{cs.rank}
                  </div>
                  <div className="text-xs text-yellow-600">Current Rank</div>
                </div>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              loading={isLoading || isSubmitting}
              disabled={isLoading || isSubmitting}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isEditing ? 'Update CS' : 'Add CS'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default CSForm
