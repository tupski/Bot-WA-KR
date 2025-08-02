import React from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CreditCard, 
  Activity,
  DollarSign,
  Calendar,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'

interface MetricData {
  title: string
  value: string | number
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
  icon: string
  description?: string
  color?: string
}

interface MetricsGridProps {
  metrics: MetricData[]
  className?: string
}

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, className }) => {
  const getIcon = (iconName: string) => {
    const icons = {
      TrendingUp,
      TrendingDown,
      Users,
      CreditCard,
      Activity,
      DollarSign,
      Calendar,
      Clock
    }
    const IconComponent = icons[iconName as keyof typeof icons]
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null
  }

  const getChangeIcon = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return null
    }
  }

  const getChangeColor = (changeType?: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6",
      className
    )}>
      {metrics.map((metric, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {metric.title}
            </CardTitle>
            <div className={cn(
              "p-2 rounded-lg",
              metric.color || "bg-blue-100 text-blue-600"
            )}>
              {getIcon(metric.icon)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {typeof metric.value === 'number' ? formatCurrency(metric.value) : metric.value}
            </div>
            
            {metric.change && (
              <div className="flex items-center text-xs">
                {getChangeIcon(metric.changeType)}
                <span className={cn(
                  "ml-1 font-medium",
                  getChangeColor(metric.changeType)
                )}>
                  {metric.change}
                </span>
                {metric.description && (
                  <span className="ml-1 text-gray-500">
                    {metric.description}
                  </span>
                )}
              </div>
            )}
            
            {!metric.change && metric.description && (
              <p className="text-xs text-gray-500 mt-1">
                {metric.description}
              </p>
            )}
          </CardContent>
          
          {/* Decorative gradient */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-gray-50 opacity-50" />
        </Card>
      ))}
    </div>
  )
}

export default MetricsGrid
