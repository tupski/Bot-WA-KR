import React from 'react'
import { Link } from 'react-router-dom'
import { 
  CreditCard, 
  Users, 
  FileText, 
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils'

interface Activity {
  id: string
  type: 'transaction' | 'report' | 'user' | 'system' | 'error'
  title: string
  description: string
  timestamp: string
  amount?: number
  status?: 'success' | 'warning' | 'error' | 'info'
  user?: string
  metadata?: Record<string, any>
}

interface RecentActivitiesProps {
  activities: Activity[]
  title?: string
  description?: string
  showViewAll?: boolean
  maxItems?: number
}

const RecentActivities: React.FC<RecentActivitiesProps> = ({
  activities,
  title = 'Recent Activities',
  description = 'Latest system activities and transactions',
  showViewAll = true,
  maxItems = 10
}) => {
  const getActivityIcon = (type: string, status?: string) => {
    const iconClass = "h-4 w-4"
    
    switch (type) {
      case 'transaction':
        return <CreditCard className={iconClass} />
      case 'report':
        return <FileText className={iconClass} />
      case 'user':
        return <Users className={iconClass} />
      case 'system':
        return <Settings className={iconClass} />
      case 'error':
        return <AlertCircle className={iconClass} />
      default:
        return <Clock className={iconClass} />
    }
  }

  const getActivityColor = (type: string, status?: string) => {
    if (status === 'error') return 'bg-red-100 text-red-600'
    if (status === 'warning') return 'bg-yellow-100 text-yellow-600'
    if (status === 'success') return 'bg-green-100 text-green-600'
    
    switch (type) {
      case 'transaction':
        return 'bg-blue-100 text-blue-600'
      case 'report':
        return 'bg-purple-100 text-purple-600'
      case 'user':
        return 'bg-green-100 text-green-600'
      case 'system':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'error':
        return <AlertCircle className="h-3 w-3 text-red-500" />
      case 'warning':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />
      default:
        return null
    }
  }

  const displayedActivities = activities.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {showViewAll && (
            <Link to="/logs">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent activities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                  getActivityColor(activity.type, activity.status)
                )}>
                  {getActivityIcon(activity.type, activity.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    {getStatusIcon(activity.status)}
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatRelativeTime(activity.timestamp)}</span>
                      {activity.user && (
                        <>
                          <span>•</span>
                          <span>by {activity.user}</span>
                        </>
                      )}
                    </div>
                    
                    {activity.amount && (
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activities.length > maxItems && (
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <Link to="/logs">
              <Button variant="outline" size="sm">
                View {activities.length - maxItems} more activities
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RecentActivities
