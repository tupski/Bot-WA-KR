import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import BotStatusMonitor from '@/components/monitoring/BotStatusMonitor'
import SystemAlerts from '@/components/monitoring/SystemAlerts'
import PerformanceMetrics from '@/components/monitoring/PerformanceMetrics'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  Activity, 
  RefreshCw,
  Settings,
  Play,
  Pause,
  Download,
  Bell
} from 'lucide-react'
import toast from 'react-hot-toast'

const MonitoringPage: React.FC = () => {
  const [isRealTime, setIsRealTime] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5000)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleToggleRealTime = () => {
    setIsRealTime(!isRealTime)
    toast.success(isRealTime ? 'Real-time monitoring paused' : 'Real-time monitoring enabled')
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success('Monitoring data refreshed')
    setIsRefreshing(false)
  }

  const handleExportReport = () => {
    toast.success('Generating monitoring report...')
  }

  const handleConfigureAlerts = () => {
    toast.success('Alert configuration would open here')
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="System Monitoring"
        subtitle="Real-time monitoring of bot status, system health, and performance metrics"
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleConfigureAlerts}
              leftIcon={<Bell className="h-4 w-4" />}
            >
              Configure Alerts
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportReport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export Report
            </Button>
            
            <Button
              variant={isRealTime ? 'default' : 'outline'}
              onClick={handleToggleRealTime}
              leftIcon={isRealTime ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            >
              {isRealTime ? 'Pause' : 'Start'} Live
            </Button>
            
            <Button
              variant="outline"
              onClick={handleRefresh}
              loading={isRefreshing}
              disabled={isRefreshing}
              leftIcon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </Button>
          </div>
        }
      >
        {/* Real-time Status Indicator */}
        {isRealTime && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-800 font-medium">
                    Real-time monitoring active
                  </span>
                  <span className="text-green-600 text-sm">
                    Updates every {refreshInterval / 1000}s
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-600">Refresh rate:</span>
                  <select
                    aria-label="Refresh rate"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="border border-green-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value={1000}>1s</option>
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bot Status Monitor */}
        <BotStatusMonitor
          onRefresh={handleRefresh}
          autoRefresh={isRealTime}
          refreshInterval={refreshInterval}
        />

        {/* System Alerts */}
        <SystemAlerts
          maxAlerts={5}
          autoRefresh={isRealTime}
          onAlertClick={(alert) => {
            toast.success(`Viewing alert: ${alert.title}`)
          }}
        />

        {/* Performance Metrics */}
        <PerformanceMetrics
          autoRefresh={isRealTime}
          refreshInterval={refreshInterval}
          timeRange={60}
        />

        {/* System Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>System Overview</span>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Uptime */}
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-900 mb-2">
                  99.9%
                </div>
                <div className="text-sm text-green-600 mb-1">System Uptime</div>
                <div className="text-xs text-green-500">
                  Last 30 days
                </div>
              </div>

              {/* Total Requests */}
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-900 mb-2">
                  2.8K
                </div>
                <div className="text-sm text-blue-600 mb-1">Requests Today</div>
                <div className="text-xs text-blue-500">
                  +12% from yesterday
                </div>
              </div>

              {/* Error Rate */}
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-900 mb-2">
                  0.1%
                </div>
                <div className="text-sm text-yellow-600 mb-1">Error Rate</div>
                <div className="text-xs text-yellow-500">
                  Within acceptable range
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.success('Restarting bot service...')}
                >
                  Restart Bot
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.success('Clearing cache...')}
                >
                  Clear Cache
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.success('Running health check...')}
                >
                  Health Check
                </Button>
                
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => toast.success('Viewing detailed logs...')}
                >
                  View Logs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    </DashboardLayout>
  )
}

export default MonitoringPage
