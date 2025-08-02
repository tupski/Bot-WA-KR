import React, { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import LogFilters, { type LogFilters as LFilters } from '@/components/logs/LogFilters'
import LogEntry, { type LogEntry as LogEntryType } from '@/components/logs/LogEntry'
import Pagination from '@/components/ui/Pagination'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { 
  FileText, 
  Download,
  RefreshCw,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

const LogsPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntryType[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntryType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRealTime, setIsRealTime] = useState(false)
  const [filters, setFilters] = useState<LFilters>({})
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  
  // Real-time updates
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Generate mock log data
  const generateMockLogs = (count: number = 200): LogEntryType[] => {
    const levels: Array<LogEntryType['level']> = ['error', 'warn', 'info', 'debug', 'success']
    const sources = ['whatsapp-bot', 'api-server', 'database', 'auth-service', 'payment-service']
    const messages = [
      'User authentication successful',
      'New booking request received',
      'Payment processing completed',
      'Database connection established',
      'WhatsApp message sent successfully',
      'API rate limit exceeded',
      'Session expired for user',
      'Bot response generated',
      'Transaction validation failed',
      'System health check passed',
      'Cache invalidated',
      'Webhook received from payment gateway',
      'User session started',
      'Configuration updated',
      'Backup process completed'
    ]

    return Array.from({ length: count }, (_, i) => {
      const level = levels[Math.floor(Math.random() * levels.length)]
      const source = sources[Math.floor(Math.random() * sources.length)]
      const message = messages[Math.floor(Math.random() * messages.length)]
      
      return {
        id: `log-${Date.now()}-${i}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        level,
        message,
        source,
        userId: Math.random() > 0.7 ? `user-${Math.floor(Math.random() * 100)}` : undefined,
        sessionId: Math.random() > 0.5 ? `session-${Math.random().toString(36).substr(2, 9)}` : undefined,
        details: level === 'error' || Math.random() > 0.8 ? {
          requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
          userAgent: 'WhatsApp/2.23.20.0',
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          duration: Math.floor(Math.random() * 1000) + 'ms'
        } : undefined,
        stackTrace: level === 'error' && Math.random() > 0.7 ? 
          `Error: ${message}\n    at processMessage (/app/bot.js:123:45)\n    at handleWebhook (/app/webhook.js:67:12)\n    at /app/server.js:89:23` 
          : undefined
      }
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // Load initial logs
  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockLogs = generateMockLogs()
      setLogs(mockLogs)
      setFilteredLogs(mockLogs)
      setIsLoading(false)
    }

    loadLogs()
  }, [])

  // Real-time updates
  useEffect(() => {
    if (isRealTime) {
      intervalRef.current = setInterval(() => {
        // Simulate new log entries
        const newLogs = generateMockLogs(Math.floor(Math.random() * 3) + 1)
        setLogs(prev => [...newLogs, ...prev].slice(0, 1000)) // Keep only last 1000 logs
      }, 3000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRealTime])

  // Apply filters
  useEffect(() => {
    let filtered = [...logs]

    if (filters.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(search) ||
        log.source.toLowerCase().includes(search) ||
        log.id.toLowerCase().includes(search)
      )
    }

    if (filters.level) {
      filtered = filtered.filter(log => log.level === filters.level)
    }

    if (filters.source) {
      filtered = filtered.filter(log => log.source === filters.source)
    }

    if (filters.userId) {
      filtered = filtered.filter(log => log.userId?.includes(filters.userId!))
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log => log.timestamp >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => log.timestamp <= filters.dateTo!)
    }

    setFilteredLogs(filtered)
    setCurrentPage(1)
  }, [logs, filters])

  const handleFiltersChange = (newFilters: LFilters) => {
    setFilters(newFilters)
  }

  const handleFiltersReset = () => {
    setFilters({})
  }

  const handleToggleRealTime = () => {
    setIsRealTime(!isRealTime)
    if (!isRealTime) {
      toast.success('Real-time logging enabled')
    } else {
      toast.success('Real-time logging disabled')
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockLogs = generateMockLogs()
    setLogs(mockLogs)
    toast.success('Logs refreshed')
    setIsLoading(false)
  }

  const handleExport = () => {
    toast.success('Exporting logs - you will receive an email when ready')
  }

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

  // Log level counts
  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <DashboardLayout>
      <PageWrapper
        title="System Logs"
        subtitle="Monitor system activities, errors, and performance"
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              disabled={isLoading}
            >
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        }
      >
        {/* Log Level Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-red-900">{levelCounts.error || 0}</div>
              <div className="text-sm text-red-600">Errors</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-yellow-900">{levelCounts.warn || 0}</div>
              <div className="text-sm text-yellow-600">Warnings</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Info className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-900">{levelCounts.info || 0}</div>
              <div className="text-sm text-blue-600">Info</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-900">{levelCounts.success || 0}</div>
              <div className="text-sm text-green-600">Success</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <LogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
          isLoading={isLoading}
          isRealTime={isRealTime}
          onToggleRealTime={handleToggleRealTime}
        />

        {/* Logs Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>System Logs ({filteredLogs.length})</span>
              
              {isRealTime && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live Updates</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-3">
            {/* Loading State */}
            {isLoading && (
              <Loading size="lg" text="Loading logs..." />
            )}

            {/* Logs List */}
            {!isLoading && paginatedLogs.length > 0 && (
              <div className="space-y-3">
                {paginatedLogs.map((log) => (
                  <LogEntry
                    key={log.id}
                    log={log}
                  />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Logs Found
                </h3>
                <p className="text-gray-600 mb-4">
                  No logs match your current filters. Try adjusting your search criteria.
                </p>
                <Button
                  onClick={handleFiltersReset}
                  variant="outline"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        )}
      </PageWrapper>
    </DashboardLayout>
  )
}

export default LogsPage
