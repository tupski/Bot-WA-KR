import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts'
import { 
  Activity, 
  Cpu, 
  HardDrive,
  Wifi,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface MetricData {
  timestamp: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkIn: number
  networkOut: number
  responseTime: number
  activeConnections: number
}

interface PerformanceMetricsProps {
  autoRefresh?: boolean
  refreshInterval?: number
  timeRange?: number // in minutes
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
  timeRange = 60
}) => {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [currentMetrics, setCurrentMetrics] = useState({
    cpuUsage: 45.2,
    memoryUsage: 68.7,
    diskUsage: 34.1,
    responseTime: 1.2,
    activeConnections: 23,
    networkIn: 125.6,
    networkOut: 89.3
  })

  // Generate initial data
  useEffect(() => {
    const generateInitialData = () => {
      const data: MetricData[] = []
      const now = Date.now()
      
      for (let i = timeRange; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 1000).toISOString()
        data.push({
          timestamp,
          cpuUsage: Math.random() * 30 + 30, // 30-60%
          memoryUsage: Math.random() * 40 + 40, // 40-80%
          diskUsage: Math.random() * 20 + 20, // 20-40%
          networkIn: Math.random() * 200 + 50, // 50-250 KB/s
          networkOut: Math.random() * 150 + 30, // 30-180 KB/s
          responseTime: Math.random() * 2 + 0.5, // 0.5-2.5s
          activeConnections: Math.floor(Math.random() * 30) + 10 // 10-40
        })
      }
      
      setMetrics(data)
    }

    generateInitialData()
  }, [timeRange])

  // Real-time updates
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      const newMetric: MetricData = {
        timestamp: new Date().toISOString(),
        cpuUsage: Math.max(0, Math.min(100, currentMetrics.cpuUsage + (Math.random() - 0.5) * 10)),
        memoryUsage: Math.max(0, Math.min(100, currentMetrics.memoryUsage + (Math.random() - 0.5) * 5)),
        diskUsage: Math.max(0, Math.min(100, currentMetrics.diskUsage + (Math.random() - 0.5) * 2)),
        networkIn: Math.max(0, currentMetrics.networkIn + (Math.random() - 0.5) * 50),
        networkOut: Math.max(0, currentMetrics.networkOut + (Math.random() - 0.5) * 30),
        responseTime: Math.max(0.1, currentMetrics.responseTime + (Math.random() - 0.5) * 0.5),
        activeConnections: Math.max(1, currentMetrics.activeConnections + Math.floor((Math.random() - 0.5) * 4))
      }

      setCurrentMetrics({
        cpuUsage: newMetric.cpuUsage,
        memoryUsage: newMetric.memoryUsage,
        diskUsage: newMetric.diskUsage,
        responseTime: newMetric.responseTime,
        activeConnections: newMetric.activeConnections,
        networkIn: newMetric.networkIn,
        networkOut: newMetric.networkOut
      })

      setMetrics(prev => [...prev.slice(1), newMetric])
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, currentMetrics])

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'cpuUsage':
      case 'memoryUsage':
      case 'diskUsage':
        return [`${value.toFixed(1)}%`, name]
      case 'responseTime':
        return [`${value.toFixed(2)}s`, name]
      case 'networkIn':
      case 'networkOut':
        return [`${value.toFixed(1)} KB/s`, name]
      default:
        return [value.toFixed(0), name]
    }
  }

  const getMetricStatus = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'critical'
    if (value >= thresholds.warning) return 'warning'
    return 'healthy'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'text-red-600'
      case 'warning':
        return 'text-yellow-600'
      case 'healthy':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'warning':
        return <Activity className="h-4 w-4 text-yellow-500" />
      case 'healthy':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const metricCards = [
    {
      title: 'CPU Usage',
      value: currentMetrics.cpuUsage,
      unit: '%',
      icon: Cpu,
      status: getMetricStatus(currentMetrics.cpuUsage, { warning: 70, critical: 90 }),
      thresholds: { warning: 70, critical: 90 }
    },
    {
      title: 'Memory Usage',
      value: currentMetrics.memoryUsage,
      unit: '%',
      icon: HardDrive,
      status: getMetricStatus(currentMetrics.memoryUsage, { warning: 80, critical: 95 }),
      thresholds: { warning: 80, critical: 95 }
    },
    {
      title: 'Response Time',
      value: currentMetrics.responseTime,
      unit: 's',
      icon: Clock,
      status: getMetricStatus(currentMetrics.responseTime, { warning: 2, critical: 5 }),
      thresholds: { warning: 2, critical: 5 }
    },
    {
      title: 'Active Connections',
      value: currentMetrics.activeConnections,
      unit: '',
      icon: Wifi,
      status: getMetricStatus(currentMetrics.activeConnections, { warning: 50, critical: 100 }),
      thresholds: { warning: 50, critical: 100 }
    }
  ]

  return (
    <div className="space-y-6">
      {/* Current Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metric.value.toFixed(1)}{metric.unit}
                  </p>
                </div>
                
                <div className="flex flex-col items-end space-y-1">
                  <metric.icon className={cn(
                    "h-6 w-6",
                    getStatusColor(metric.status)
                  )} />
                  {getStatusIcon(metric.status)}
                </div>
              </div>
              
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      metric.status === 'critical' ? 'bg-red-500' :
                      metric.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ 
                      width: `${Math.min(100, (metric.value / metric.thresholds.critical) * 100)}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>{metric.thresholds.critical}{metric.unit}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & Memory Chart */}
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(label) => new Date(label).toLocaleString('id-ID')}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cpuUsage" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="CPU Usage"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="memoryUsage" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Memory Usage"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Network & Response Time Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Network & Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                  stroke="#666"
                  fontSize={12}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                />
                <Tooltip 
                  formatter={formatTooltipValue}
                  labelFormatter={(label) => new Date(label).toLocaleString('id-ID')}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="networkIn"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Network In"
                />
                <Area
                  type="monotone"
                  dataKey="networkOut"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.6}
                  name="Network Out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PerformanceMetrics
