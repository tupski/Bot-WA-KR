import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Info, 
  CheckCircle,
  XCircle,
  X,
  Bell,
  BellOff,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatRelativeTime } from '@/lib/utils'

export interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  isResolved: boolean
  source: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SystemAlertsProps {
  maxAlerts?: number
  autoRefresh?: boolean
  onAlertClick?: (alert: SystemAlert) => void
}

const SystemAlerts: React.FC<SystemAlertsProps> = ({
  maxAlerts = 10,
  autoRefresh = true,
  onAlertClick
}) => {
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [showAll, setShowAll] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  // Generate mock alerts
  useEffect(() => {
    const mockAlerts: SystemAlert[] = [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'High Response Time',
        message: 'API response time is above normal threshold (>2s)',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isRead: false,
        isResolved: false,
        source: 'api-server',
        severity: 'medium'
      },
      {
        id: 'alert-2',
        type: 'info',
        title: 'Scheduled Maintenance',
        message: 'System maintenance scheduled for tonight at 2:00 AM',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        isRead: true,
        isResolved: false,
        source: 'system',
        severity: 'low'
      },
      {
        id: 'alert-3',
        type: 'success',
        title: 'Backup Completed',
        message: 'Daily database backup completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isRead: true,
        isResolved: true,
        source: 'database',
        severity: 'low'
      },
      {
        id: 'alert-4',
        type: 'error',
        title: 'WhatsApp Connection Lost',
        message: 'Lost connection to WhatsApp servers. Attempting to reconnect...',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        isRead: false,
        isResolved: true,
        source: 'whatsapp-bot',
        severity: 'high'
      }
    ]

    setAlerts(mockAlerts)
  }, [])

  // Simulate new alerts
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of new alert
        const newAlert: SystemAlert = {
          id: `alert-${Date.now()}`,
          type: ['info', 'warning', 'success'][Math.floor(Math.random() * 3)] as any,
          title: 'System Update',
          message: 'New system event detected',
          timestamp: new Date().toISOString(),
          isRead: false,
          isResolved: false,
          source: 'system',
          severity: 'low'
        }
        
        setAlerts(prev => [newAlert, ...prev].slice(0, 50)) // Keep only last 50 alerts
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getAlertColor = (type: string, severity: string) => {
    if (severity === 'critical') return 'border-red-500 bg-red-50'
    if (severity === 'high') return 'border-orange-500 bg-orange-50'
    
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        colors[severity as keyof typeof colors]
      )}>
        {severity.toUpperCase()}
      </span>
    )
  }

  const handleMarkAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, isRead: true } : alert
    ))
  }

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const unreadCount = alerts.filter(alert => !alert.isRead).length
  const displayedAlerts = showAll ? alerts : alerts.slice(0, maxAlerts)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>System Alerts</span>
            {unreadCount > 0 && (
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                {unreadCount} new
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            >
              {notificationsEnabled ? (
                <Bell className="h-4 w-4 text-blue-600" />
              ) : (
                <BellOff className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            
            {alerts.length > maxAlerts && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show All (${alerts.length})`}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              All Clear!
            </h3>
            <p className="text-gray-600">
              No active alerts. System is running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm",
                  getAlertColor(alert.type, alert.severity),
                  !alert.isRead && "ring-2 ring-blue-200"
                )}
                onClick={() => {
                  handleMarkAsRead(alert.id)
                  onAlertClick?.(alert)
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getAlertIcon(alert.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        {getSeverityBadge(alert.severity)}
                        {!alert.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-700 mb-2">
                        {alert.message}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatRelativeTime(alert.timestamp)}</span>
                        </div>
                        
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {alert.source}
                        </span>
                        
                        {alert.isResolved && (
                          <span className="text-green-600 font-medium">
                            Resolved
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDismiss(alert.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SystemAlerts
