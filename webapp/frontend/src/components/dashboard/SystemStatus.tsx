import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Database, 
  Wifi, 
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatRelativeTime } from '@/lib/utils'

interface SystemHealth {
  component: string
  status: 'online' | 'offline' | 'warning' | 'error'
  message: string
  lastCheck: string
  responseTime?: number
  uptime?: number
}

interface SystemStatusProps {
  title?: string
  description?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

const SystemStatus: React.FC<SystemStatusProps> = ({
  title = 'System Status',
  description = 'Current system health and bot status',
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Mock data - in real app, this would come from API
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([
    {
      component: 'WhatsApp Bot',
      status: 'online',
      message: 'Connected and receiving messages',
      lastCheck: new Date().toISOString(),
      uptime: 99.9
    },
    {
      component: 'Database',
      status: 'online',
      message: 'All queries responding normally',
      lastCheck: new Date().toISOString(),
      responseTime: 45
    },
    {
      component: 'API Server',
      status: 'online',
      message: 'All endpoints operational',
      lastCheck: new Date().toISOString(),
      responseTime: 120
    },
    {
      component: 'File Storage',
      status: 'warning',
      message: 'Disk usage at 85%',
      lastCheck: new Date().toISOString()
    }
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'error':
      case 'offline':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getOverallStatus = () => {
    const hasError = systemHealth.some(h => h.status === 'error' || h.status === 'offline')
    const hasWarning = systemHealth.some(h => h.status === 'warning')
    
    if (hasError) return { status: 'error', label: 'System Issues', color: 'text-red-600' }
    if (hasWarning) return { status: 'warning', label: 'Minor Issues', color: 'text-yellow-600' }
    return { status: 'online', label: 'All Systems Operational', color: 'text-green-600' }
  }

  const refreshStatus = async () => {
    setIsRefreshing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // In real app, fetch from API
    // const response = await apiService.get('/logs/system-health')
    // setSystemHealth(response.data)
    
    setLastRefresh(new Date())
    setIsRefreshing(false)
  }

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refreshStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const overallStatus = getOverallStatus()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{title}</span>
              <div className={cn(
                "w-2 h-2 rounded-full",
                overallStatus.status === 'online' ? 'bg-green-500' :
                overallStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              )} />
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshStatus}
            disabled={isRefreshing}
            leftIcon={<RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Overall Status */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg mb-4",
          overallStatus.status === 'online' ? 'bg-green-50' :
          overallStatus.status === 'warning' ? 'bg-yellow-50' : 'bg-red-50'
        )}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(overallStatus.status)}
            <span className={cn("font-medium", overallStatus.color)}>
              {overallStatus.label}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Last updated: {formatRelativeTime(lastRefresh)}
          </span>
        </div>

        {/* Individual Components */}
        <div className="space-y-3">
          {systemHealth.map((health, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getStatusIcon(health.status)}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {health.component}
                  </p>
                  <p className="text-xs text-gray-600">
                    {health.message}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(health.status)
                )}>
                  {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
                </span>
                
                {(health.responseTime || health.uptime) && (
                  <div className="text-xs text-gray-500 mt-1">
                    {health.responseTime && `${health.responseTime}ms`}
                    {health.uptime && `${health.uptime}% uptime`}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* System Metrics */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">99.9%</div>
              <div className="text-xs text-gray-600">Uptime</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">45ms</div>
              <div className="text-xs text-gray-600">Avg Response</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SystemStatus
