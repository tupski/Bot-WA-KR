import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  MapPin,
  User,
  CreditCard,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export interface TransactionFilters {
  search?: string
  dateFrom?: string
  dateTo?: string
  location?: string
  csName?: string
  paymentMethod?: string
  minAmount?: number
  maxAmount?: number
}

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
  onReset: () => void
  isLoading?: boolean
}

const TransactionFiltersComponent: React.FC<TransactionFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  isLoading = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const { register, handleSubmit, reset, watch } = useForm<TransactionFilters>({
    defaultValues: filters
  })

  const watchedValues = watch()

  const onSubmit = (data: TransactionFilters) => {
    // Remove empty values
    const cleanedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        acc[key as keyof TransactionFilters] = value
      }
      return acc
    }, {} as TransactionFilters)
    
    onFiltersChange(cleanedData)
  }

  const handleReset = () => {
    reset({})
    onReset()
    setShowAdvanced(false)
  }

  const hasActiveFilters = Object.values(watchedValues).some(value => 
    value !== '' && value !== undefined && value !== null
  )

  // Mock data for dropdowns - in real app, this would come from API
  const locations = ['SKY1', 'SKY2', 'SKY3', 'All Locations']
  const csNames = ['Amel', 'KR', 'APK', 'All CS']
  const paymentMethods = ['Cash', 'Transfer', 'All Methods']

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
            
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                leftIcon={<RotateCcw className="h-3 w-3" />}
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <Input
              {...register('search')}
              placeholder="Search transactions..."
              leftIcon={<Search className="h-4 w-4" />}
              disabled={isLoading}
            />

            {/* Date From */}
            <Input
              {...register('dateFrom')}
              type="date"
              label="From Date"
              leftIcon={<Calendar className="h-4 w-4" />}
              disabled={isLoading}
            />

            {/* Date To */}
            <Input
              {...register('dateTo')}
              type="date"
              label="To Date"
              leftIcon={<Calendar className="h-4 w-4" />}
              disabled={isLoading}
            />

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  {...register('location')}
                  className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading}
                >
                  <option value="">All Locations</option>
                  {locations.slice(0, -1).map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              {/* CS Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">CS Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    {...register('csName')}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="">All CS</option>
                    {csNames.slice(0, -1).map(cs => (
                      <option key={cs} value={cs}>{cs}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    {...register('paymentMethod')}
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <option value="">All Methods</option>
                    {paymentMethods.slice(0, -1).map(method => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Min Amount */}
              <Input
                {...register('minAmount', { valueAsNumber: true })}
                type="number"
                label="Min Amount"
                placeholder="0"
                disabled={isLoading}
              />

              {/* Max Amount */}
              <Input
                {...register('maxAmount', { valueAsNumber: true })}
                type="number"
                label="Max Amount"
                placeholder="999999999"
                disabled={isLoading}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {hasActiveFilters ? 'Filters applied' : 'No filters applied'}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                type="submit"
                disabled={isLoading}
                loading={isLoading}
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default TransactionFiltersComponent
