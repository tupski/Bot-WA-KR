import React, { useState, useEffect } from 'react'
import { 
  Activity, 
  Wifi, 
  WifiOff,
  Database,
  Server,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn, formatRelativeTime } from '@/lib/utils'

export interface BotStatus {
  isOnline: boolean
  lastSeen: string
  messagesSent: number
  messagesReceived: number
  activeUsers: number
  responseTime: number
  uptime: number
  version: string
  qrCodeStatus: 'connected' | 'disconnected' | 'loading'
  batteryLevel?: number
}

export interface SystemHealth {
  database: {
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
    connections: number
  }
  api: {
    status: 'healthy' | 'warning' | 'error'
    responseTime: number
    requests: number
  }
  whatsapp: {
    status: 'connected' | 'disconnected' | 'reconnecting'
    lastMessage: string
    qrCode?: string
  }
}

interface BotStatusMonitorProps {
  onRefresh?: () => void
  autoRefresh?: boolean
  refreshInterval?: number
}

const BotStatusMonitor: React.FC<BotStatusMonitorProps> = ({
  onRefresh,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [botStatus, setBotStatus] = useState<BotStatus>({
    isOnline: true,
    lastSeen: new Date().toISOString(),
    messagesSent: 1247,
    messagesReceived: 1189,
    activeUsers: 23,
    responseTime: 1.2,
    uptime: 99.8,
    version: '1.0.0',
    qrCodeStatus: 'connected',
    batteryLevel: 85
  })

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: {
      status: 'healthy',
      responseTime: 45,
      connections: 12
    },
    api: {
      status: 'healthy',
      responseTime: 120,
      requests: 2847
    },
    whatsapp: {
      status: 'connected',
      lastMessage: new Date(Date.now() - 2 * 60 * 1000).toISOString()
    }
  })

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulate real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Simulate status updates
      setBotStatus(prev => ({
        ...prev,
        lastSeen: new Date().toISOString(),
        messagesSent: prev.messagesSent + Math.floor(Math.random() * 3),
        messagesReceived: prev.messagesReceived + Math.floor(Math.random() * 2),
        activeUsers: Math.max(1, prev.activeUsers + Math.floor(Math.random() * 3) - 1),
        responseTime: Math.max(0.1, prev.responseTime + (Math.random() - 0.5) * 0.5),
        batteryLevel: Math.max(0, Math.min(100, (prev.batteryLevel || 85) + Math.floor(Math.random() * 3) - 1))
      }))

      setSystemHealth(prev => ({
        ...prev,
        database: {
          ...prev.database,
          responseTime: Math.max(10, prev.database.responseTime + Math.floor(Math.random() * 20) - 10)
        },
        api: {
          ...prev.api,
          responseTime: Math.max(50, prev.api.responseTime + Math.floor(Math.random() * 50) - 25),
          requests: prev.api.requests + Math.floor(Math.random() * 10)
        }
      }))
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    onRefresh?.()
    setIsRefreshing(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-600'
      case 'warning':
      case 'reconnecting':
        return 'text-yellow-600'
      case 'error':
      case 'disconnected':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
      case 'reconnecting':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error':
      case 'disconnected':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      healthy: 'bg-green-100 text-green-800',
      connected: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      reconnecting: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      disconnected: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
        colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
      )}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status}</span>
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main Bot Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>WhatsApp Bot Status</span>
              {autoRefresh && (
                <div className="flex items-center space-x-1 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>
              )}
            </CardTitle>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              loading={isRefreshing}
              disabled={isRefreshing}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Connection Status */}
            <div className="text-center">
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3",
                botStatus.isOnline ? 'bg-green-100' : 'bg-red-100'
              )}>
                {botStatus.isOnline ? (
                  <Wifi className="h-8 w-8 text-green-600" />
                ) : (
                  <WifiOff className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {botStatus.isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-sm text-gray-600">
                Last seen: {formatRelativeTime(botStatus.lastSeen)}
              </div>
            </div>

            {/* Messages */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {botStatus.messagesSent}
              </div>
              <div className="text-sm text-gray-600">Messages Sent</div>
              <div className="text-xs text-gray-500">
                {botStatus.messagesReceived} received
              </div>
            </div>

            {/* Active Users */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Activity className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {botStatus.activeUsers}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>

            {/* Response Time */}
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="h-8 w-8 text-orange-600" />
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {botStatus.responseTime.toFixed(1)}s
              </div>
              <div className="text-sm text-gray-600">Avg Response</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="font-medium">{botStatus.uptime}%</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Version</span>
                <span className="font-medium">v{botStatus.version}</span>
              </div>
              
              {botStatus.batteryLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Battery</span>
                  <span className="font-medium">{botStatus.batteryLevel}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>System Health</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Database */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Database className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">Database</h4>
                  <p className="text-sm text-gray-600">
                    {systemHealth.database.connections} connections • {systemHealth.database.responseTime}ms
                  </p>
                </div>
              </div>
              {getStatusBadge(systemHealth.database.status)}
            </div>

            {/* API Server */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Server className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">API Server</h4>
                  <p className="text-sm text-gray-600">
                    {systemHealth.api.requests} requests • {systemHealth.api.responseTime}ms
                  </p>
                </div>
              </div>
              {getStatusBadge(systemHealth.api.status)}
            </div>

            {/* WhatsApp Connection */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <div>
                  <h4 className="font-medium text-gray-900">WhatsApp Connection</h4>
                  <p className="text-sm text-gray-600">
                    Last message: {formatRelativeTime(systemHealth.whatsapp.lastMessage)}
                  </p>
                </div>
              </div>
              {getStatusBadge(systemHealth.whatsapp.status)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BotStatusMonitor
