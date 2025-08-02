import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Save, MapPin, User, CreditCard, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import type { Transaction } from '@/types'

const transactionSchema = z.object({
  unit: z.string().min(1, 'Unit is required'),
  location: z.string().min(1, 'Location is required'),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  commission: z.number().min(0, 'Commission must be 0 or greater'),
  csName: z.string().min(1, 'CS name is required'),
  paymentMethod: z.enum(['Cash', 'Transfer']),
  checkoutTime: z.string().min(1, 'Checkout time is required'),
  dateOnly: z.string().min(1, 'Date is required'),
  notes: z.string().optional()
})

type TransactionFormData = z.infer<typeof transactionSchema>

interface TransactionFormProps {
  transaction?: Transaction
  onSubmit: (data: TransactionFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onSubmit,
  onCancel,
  isLoading = false
}) => {
  const isEditing = !!transaction

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction ? {
      unit: transaction.unit,
      location: transaction.location,
      amount: transaction.amount,
      commission: transaction.commission,
      csName: transaction.csName,
      paymentMethod: transaction.paymentMethod as 'Cash' | 'Transfer',
      checkoutTime: transaction.checkoutTime.slice(0, 16), // Format for datetime-local
      dateOnly: transaction.dateOnly,
      notes: transaction.notes || ''
    } : {
      unit: '',
      location: '',
      amount: 0,
      commission: 0,
      csName: '',
      paymentMethod: 'Cash' as const,
      checkoutTime: new Date().toISOString().slice(0, 16),
      dateOnly: new Date().toISOString().slice(0, 10),
      notes: ''
    }
  })

  const amount = watch('amount')
  const csName = watch('csName')

  // Auto-calculate commission based on CS and amount
  React.useEffect(() => {
    if (amount && csName) {
      const commissionRates: { [key: string]: number } = {
        'Amel': 50000,
        'KR': 45000,
        'APK': 40000
      }
      
      const rate = commissionRates[csName] || 30000
      setValue('commission', rate)
    }
  }, [amount, csName, setValue])

  const handleFormSubmit = async (data: TransactionFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  // Mock data - in real app, this would come from API
  const locations = ['SKY1', 'SKY2', 'SKY3']
  const csNames = ['Amel', 'KR', 'APK']

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {isEditing ? 'Edit Transaction' : 'Add New Transaction'}
            </CardTitle>
            <CardDescription>
              {isEditing 
                ? 'Update transaction details below'
                : 'Fill in the transaction information below'
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
                {...register('unit')}
                label="Unit"
                placeholder="e.g., A101, B205"
                error={errors.unit?.message}
                disabled={isLoading || isSubmitting}
                required
              />

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    {...register('location')}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading || isSubmitting}
                  >
                    <option value="">Select location</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
                {errors.location && (
                  <p className="text-sm text-red-500">{errors.location.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('amount', { valueAsNumber: true })}
                type="number"
                label="Amount"
                placeholder="150000"
                error={errors.amount?.message}
                disabled={isLoading || isSubmitting}
                required
              />

              <Input
                {...register('commission', { valueAsNumber: true })}
                type="number"
                label="Commission"
                placeholder="50000"
                error={errors.commission?.message}
                disabled={isLoading || isSubmitting}
                helperText="Auto-calculated based on CS"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  {...register('paymentMethod')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || isSubmitting}
                >
                  <option value="Cash">Cash</option>
                  <option value="Transfer">Transfer</option>
                </select>
              </div>
              {errors.paymentMethod && (
                <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
              )}
            </div>
          </div>

          {/* CS Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">CS Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                CS Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  {...register('csName')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || isSubmitting}
                >
                  <option value="">Select CS</option>
                  {csNames.map(cs => (
                    <option key={cs} value={cs}>{cs}</option>
                  ))}
                </select>
              </div>
              {errors.csName && (
                <p className="text-sm text-red-500">{errors.csName.message}</p>
              )}
            </div>
          </div>

          {/* Date & Time Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Date & Time</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                {...register('dateOnly')}
                type="date"
                label="Date"
                leftIcon={<Calendar className="h-4 w-4" />}
                error={errors.dateOnly?.message}
                disabled={isLoading || isSubmitting}
                required
              />

              <Input
                {...register('checkoutTime')}
                type="datetime-local"
                label="Checkout Time"
                leftIcon={<Clock className="h-4 w-4" />}
                error={errors.checkoutTime?.message}
                disabled={isLoading || isSubmitting}
                required
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea
                {...register('notes')}
                placeholder="Optional notes about this transaction..."
                className="flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isSubmitting}
              />
              {errors.notes && (
                <p className="text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>
          </div>

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
              {isEditing ? 'Update Transaction' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default TransactionForm
