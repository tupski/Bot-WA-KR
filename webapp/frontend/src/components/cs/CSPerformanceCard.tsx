import React from 'react'
import { 
  User, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  CreditCard,
  Clock,
  Star,
  Award,
  Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency } from '@/lib/utils'

export interface CSPerformance {
  id: number
  name: string
  totalBookings: number
  totalRevenue: number
  totalCommission: number
  averageAmount: number
  conversionRate: number
  responseTime: number
  rating: number
  rank: number
  growth: number
  isActive: boolean
  lastActivity: string
  joinDate: string
}

interface CSPerformanceCardProps {
  cs: CSPerformance
  onViewDetails: (cs: CSPerformance) => void
  onEdit: (cs: CSPerformance) => void
  showRank?: boolean
  compact?: boolean
}

const CSPerformanceCard: React.FC<CSPerformanceCardProps> = ({
  cs,
  onViewDetails,
  onEdit,
  showRank = true,
  compact = false
}) => {
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { color: 'bg-yellow-100 text-yellow-800', icon: '🥇' }
    if (rank === 2) return { color: 'bg-gray-100 text-gray-800', icon: '🥈' }
    if (rank === 3) return { color: 'bg-orange-100 text-orange-800', icon: '🥉' }
    return { color: 'bg-blue-100 text-blue-800', icon: `#${rank}` }
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp className="h-3 w-3" />
    if (growth < 0) return <TrendingDown className="h-3 w-3" />
    return null
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
  }

  const rankBadge = getRankBadge(cs.rank)

  if (compact) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">
                  {cs.name.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-gray-900">{cs.name}</h3>
                  {showRank && (
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      rankBadge.color
                    )}>
                      {rankBadge.icon}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {cs.totalBookings} bookings • {formatCurrency(cs.totalRevenue)}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center space-x-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < Math.floor(cs.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {cs.rating.toFixed(1)} rating
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">
                {cs.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{cs.name}</span>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(cs.isActive)
                )}>
                  {cs.isActive ? 'Active' : 'Inactive'}
                </span>
              </CardTitle>
              
              <div className="flex items-center space-x-4 mt-1">
                {showRank && (
                  <span className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    rankBadge.color
                  )}>
                    {rankBadge.icon} Rank {cs.rank}
                  </span>
                )}
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < Math.floor(cs.rating) ? "text-yellow-400 fill-current" : "text-gray-300"
                      )}
                    />
                  ))}
                  <span className="text-xs text-gray-600 ml-1">
                    ({cs.rating.toFixed(1)})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(cs.totalRevenue)}
            </div>
            <div className="text-xs text-green-600">Total Revenue</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <CreditCard className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-blue-900">
              {cs.totalBookings}
            </div>
            <div className="text-xs text-blue-600">Total Bookings</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Commission</span>
            <span className="font-medium">{formatCurrency(cs.totalCommission)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg. Amount</span>
            <span className="font-medium">{formatCurrency(cs.averageAmount)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Conversion Rate</span>
            <span className="font-medium">{cs.conversionRate.toFixed(1)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Response Time</span>
            <span className="font-medium">{cs.responseTime}min</span>
          </div>
        </div>

        {/* Growth Indicator */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Growth</span>
          <div className="flex items-center space-x-1">
            {getGrowthIcon(cs.growth)}
            <span className={cn("font-medium", getGrowthColor(cs.growth))}>
              {cs.growth > 0 ? '+' : ''}{cs.growth.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(cs)}
            className="flex-1"
          >
            View Details
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(cs)}
            className="flex-1"
          >
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CSPerformanceCard
