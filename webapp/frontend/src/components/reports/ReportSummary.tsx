import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  CreditCard,
  Users,
  MapPin,
  Calendar,
  Percent
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'

interface SummaryData {
  totalRevenue: number
  totalCommission: number
  totalBookings: number
  averageAmount: number
  topLocation: string
  topCS: string
  growthRate: number
  conversionRate: number
  period: string
}

interface ReportSummaryProps {
  data: SummaryData
  isLoading?: boolean
  comparisonPeriod?: SummaryData
}

const ReportSummary: React.FC<ReportSummaryProps> = ({
  data,
  isLoading = false,
  comparisonPeriod
}) => {
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-500" />
    return null
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const summaryItems = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
      change: comparisonPeriod ? calculateChange(data.totalRevenue, comparisonPeriod.totalRevenue) : null
    },
    {
      title: 'Total Commission',
      value: formatCurrency(data.totalCommission),
      icon: Percent,
      color: 'bg-blue-100 text-blue-600',
      change: comparisonPeriod ? calculateChange(data.totalCommission, comparisonPeriod.totalCommission) : null
    },
    {
      title: 'Total Bookings',
      value: data.totalBookings.toLocaleString(),
      icon: CreditCard,
      color: 'bg-purple-100 text-purple-600',
      change: comparisonPeriod ? calculateChange(data.totalBookings, comparisonPeriod.totalBookings) : null
    },
    {
      title: 'Average Amount',
      value: formatCurrency(data.averageAmount),
      icon: TrendingUp,
      color: 'bg-orange-100 text-orange-600',
      change: comparisonPeriod ? calculateChange(data.averageAmount, comparisonPeriod.averageAmount) : null
    }
  ]

  const insightItems = [
    {
      title: 'Top Location',
      value: data.topLocation,
      icon: MapPin,
      description: 'Highest revenue location'
    },
    {
      title: 'Top CS',
      value: data.topCS,
      icon: Users,
      description: 'Most bookings this period'
    },
    {
      title: 'Growth Rate',
      value: `${data.growthRate.toFixed(1)}%`,
      icon: TrendingUp,
      description: 'Compared to previous period'
    },
    {
      title: 'Report Period',
      value: data.period,
      icon: Calendar,
      description: 'Selected date range'
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryItems.map((item, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {item.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg", item.color)}>
                <item.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {item.value}
              </div>
              
              {item.change !== null && (
                <div className="flex items-center text-xs">
                  {getChangeIcon(item.change)}
                  <span className={cn(
                    "ml-1 font-medium",
                    getChangeColor(item.change)
                  )}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                  </span>
                  <span className="ml-1 text-gray-500">
                    vs previous period
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Key Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {insightItems.map((item, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3">
                  <item.icon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  {item.value}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {item.title}
                </div>
                <div className="text-xs text-gray-500">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Growth</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.growthRate > 0 ? '+' : ''}{data.growthRate.toFixed(1)}%
                </p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                data.growthRate > 0 ? 'bg-green-100' : 
                data.growthRate < 0 ? 'bg-red-100' : 'bg-gray-100'
              )}>
                {data.growthRate > 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : data.growthRate < 0 ? (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Commission Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {((data.totalCommission / data.totalRevenue) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Percent className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookings per Day</p>
                <p className="text-2xl font-bold text-gray-900">
                  {(data.totalBookings / 30).toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ReportSummary
