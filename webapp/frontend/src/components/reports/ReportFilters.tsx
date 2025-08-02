import React from 'react'
import { useForm } from 'react-hook-form'
import { 
  Calendar, 
  MapPin, 
  User, 
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

export interface ReportFilters {
  dateFrom: string
  dateTo: string
  location?: string
  csName?: string
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom'
  groupBy: 'date' | 'location' | 'cs' | 'payment-method'
}

interface ReportFiltersProps {
  filters: ReportFilters
  onFiltersChange: (filters: ReportFilters) => void
  onGenerate: () => void
  onExport: (format: 'pdf' | 'excel' | 'csv') => void
  isLoading?: boolean
}

const ReportFiltersComponent: React.FC<ReportFiltersProps> = ({
  filters,
  onFiltersChange,
  onGenerate,
  onExport,
  isLoading = false
}) => {
  const { register, handleSubmit, watch, setValue } = useForm<ReportFilters>({
    defaultValues: filters
  })

  const reportType = watch('reportType')

  const onSubmit = (data: ReportFilters) => {
    onFiltersChange(data)
  }

  const handleQuickDateRange = (range: string) => {
    const today = new Date()
    let dateFrom = new Date()
    let dateTo = new Date()

    switch (range) {
      case 'today':
        dateFrom = today
        dateTo = today
        break
      case 'yesterday':
        dateFrom = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        dateTo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'last7days':
        dateFrom = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        dateTo = today
        break
      case 'last30days':
        dateFrom = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        dateTo = today
        break
      case 'thisMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth(), 1)
        dateTo = today
        break
      case 'lastMonth':
        dateFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        dateTo = new Date(today.getFullYear(), today.getMonth(), 0)
        break
    }

    setValue('dateFrom', dateFrom.toISOString().split('T')[0])
    setValue('dateTo', dateTo.toISOString().split('T')[0])
  }

  // Mock data for dropdowns
  const locations = ['SKY1', 'SKY2', 'SKY3']
  const csNames = ['Amel', 'KR', 'APK']

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Report Configuration</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'custom', label: 'Custom' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    {...register('reportType')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Date Ranges */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quick Date Ranges</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last7days', label: 'Last 7 Days' },
                { value: 'last30days', label: 'Last 30 Days' },
                { value: 'thisMonth', label: 'This Month' },
                { value: 'lastMonth', label: 'Last Month' }
              ].map(range => (
                <Button
                  key={range.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateRange(range.value)}
                  disabled={isLoading}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              {...register('dateFrom')}
              type="date"
              label="From Date"
              leftIcon={<Calendar className="h-4 w-4" />}
              disabled={isLoading}
              required
            />

            <Input
              {...register('dateTo')}
              type="date"
              label="To Date"
              leftIcon={<Calendar className="h-4 w-4" />}
              disabled={isLoading}
              required
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Filter */}
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
                  {locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* CS Filter */}
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
                  {csNames.map(cs => (
                    <option key={cs} value={cs}>{cs}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Group By */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Group By</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'date', label: 'Date' },
                { value: 'location', label: 'Location' },
                { value: 'cs', label: 'CS' },
                { value: 'payment-method', label: 'Payment Method' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    {...register('groupBy')}
                    type="radio"
                    value={option.value}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <Button
                type="submit"
                loading={isLoading}
                disabled={isLoading}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Generate Report
              </Button>
              
              <Button
                type="button"
                onClick={onGenerate}
                loading={isLoading}
                disabled={isLoading}
              >
                Apply Filters
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Export:</span>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onExport('pdf')}
                disabled={isLoading}
              >
                PDF
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onExport('excel')}
                disabled={isLoading}
              >
                Excel
              </Button>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onExport('csv')}
                disabled={isLoading}
              >
                CSV
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default ReportFiltersComponent
