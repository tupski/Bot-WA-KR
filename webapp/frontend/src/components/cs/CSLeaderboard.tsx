import React from 'react'
import { 
  Trophy, 
  Medal, 
  Award,
  TrendingUp,
  TrendingDown,
  Star,
  Target
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn, formatCurrency } from '@/lib/utils'
import type { CSPerformance } from './CSPerformanceCard'

interface CSLeaderboardProps {
  csData: CSPerformance[]
  metric: 'revenue' | 'bookings' | 'commission' | 'rating'
  title?: string
  showTop?: number
}

const CSLeaderboard: React.FC<CSLeaderboardProps> = ({
  csData,
  metric,
  title,
  showTop = 10
}) => {
  const sortedCS = [...csData]
    .sort((a, b) => {
      switch (metric) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue
        case 'bookings':
          return b.totalBookings - a.totalBookings
        case 'commission':
          return b.totalCommission - a.totalCommission
        case 'rating':
          return b.rating - a.rating
        default:
          return 0
      }
    })
    .slice(0, showTop)

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium text-gray-600">{rank}</span>
          </div>
        )
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200'
      case 2:
        return 'bg-gray-50 border-gray-200'
      case 3:
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-white border-gray-200'
    }
  }

  const getMetricValue = (cs: CSPerformance) => {
    switch (metric) {
      case 'revenue':
        return formatCurrency(cs.totalRevenue)
      case 'bookings':
        return cs.totalBookings.toString()
      case 'commission':
        return formatCurrency(cs.totalCommission)
      case 'rating':
        return cs.rating.toFixed(1)
      default:
        return '0'
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue':
        return 'Revenue'
      case 'bookings':
        return 'Bookings'
      case 'commission':
        return 'Commission'
      case 'rating':
        return 'Rating'
      default:
        return 'Value'
    }
  }

  const defaultTitle = `Top ${showTop} CS by ${getMetricLabel()}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>{title || defaultTitle}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {sortedCS.map((cs, index) => {
          const rank = index + 1
          
          return (
            <div
              key={cs.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-gray-50",
                getRankColor(rank)
              )}
            >
              {/* Left side - Rank and CS info */}
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getRankIcon(rank)}
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {cs.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{cs.name}</h4>
                      
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        cs.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      )}>
                        {cs.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-1">
                      {/* Rating */}
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span className="text-xs text-gray-600">
                          {cs.rating.toFixed(1)}
                        </span>
                      </div>
                      
                      {/* Growth */}
                      <div className="flex items-center space-x-1">
                        {cs.growth > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : cs.growth < 0 ? (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        ) : null}
                        <span className={cn(
                          "text-xs font-medium",
                          cs.growth > 0 ? 'text-green-600' : cs.growth < 0 ? 'text-red-600' : 'text-gray-600'
                        )}>
                          {cs.growth > 0 ? '+' : ''}{cs.growth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Metric value */}
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {getMetricValue(cs)}
                </div>
                <div className="text-xs text-gray-600">
                  {getMetricLabel()}
                </div>
              </div>
            </div>
          )
        })}

        {/* Show more indicator */}
        {csData.length > showTop && (
          <div className="text-center pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing top {showTop} of {csData.length} CS
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default CSLeaderboard
