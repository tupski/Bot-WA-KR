import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import ReportFilters, { type ReportFilters as RFilters } from '@/components/reports/ReportFilters'
import ReportCharts from '@/components/reports/ReportCharts'
import ReportSummary from '@/components/reports/ReportSummary'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { 
  BarChart3, 
  Download,
  FileText,
  Calendar,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

const ReportsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [filters, setFilters] = useState<RFilters>({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    reportType: 'monthly',
    groupBy: 'date'
  })

  // Generate mock report data
  const generateReportData = async (reportFilters: RFilters) => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Mock data generation based on filters
      const days = Math.ceil((new Date(reportFilters.dateTo).getTime() - new Date(reportFilters.dateFrom).getTime()) / (1000 * 60 * 60 * 24))
      
      const chartData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
        const date = new Date(new Date(reportFilters.dateFrom).getTime() + i * 24 * 60 * 60 * 1000)
        return {
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 3000000) + 1000000,
          commission: Math.floor(Math.random() * 300000) + 100000,
          bookings: Math.floor(Math.random() * 25) + 10,
          csName: ['Amel', 'KR', 'APK'][Math.floor(Math.random() * 3)],
          location: ['SKY1', 'SKY2', 'SKY3'][Math.floor(Math.random() * 3)]
        }
      })

      const summaryData = {
        totalRevenue: chartData.reduce((sum, item) => sum + item.revenue, 0),
        totalCommission: chartData.reduce((sum, item) => sum + item.commission, 0),
        totalBookings: chartData.reduce((sum, item) => sum + item.bookings, 0),
        averageAmount: chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length,
        topLocation: 'SKY1',
        topCS: 'Amel',
        growthRate: Math.random() * 40 - 10, // -10% to +30%
        conversionRate: Math.random() * 20 + 80, // 80% to 100%
        period: `${reportFilters.dateFrom} to ${reportFilters.dateTo}`
      }

      // Group data based on groupBy filter
      let processedData = chartData
      if (reportFilters.groupBy === 'location') {
        const locationData = ['SKY1', 'SKY2', 'SKY3'].map(location => {
          const locationItems = chartData.filter(item => item.location === location)
          return {
            name: location,
            revenue: locationItems.reduce((sum, item) => sum + item.revenue, 0),
            commission: locationItems.reduce((sum, item) => sum + item.commission, 0),
            bookings: locationItems.reduce((sum, item) => sum + item.bookings, 0)
          }
        })
        processedData = locationData as any
      } else if (reportFilters.groupBy === 'cs') {
        const csData = ['Amel', 'KR', 'APK'].map(cs => {
          const csItems = chartData.filter(item => item.csName === cs)
          return {
            csName: cs,
            revenue: csItems.reduce((sum, item) => sum + item.revenue, 0),
            commission: csItems.reduce((sum, item) => sum + item.commission, 0),
            bookings: csItems.reduce((sum, item) => sum + item.bookings, 0)
          }
        })
        processedData = csData as any
      }

      setReportData({
        chartData: processedData,
        summaryData,
        filters: reportFilters
      })

      toast.success('Report generated successfully')
    } catch (error) {
      toast.error('Failed to generate report')
    } finally {
      setIsLoading(false)
    }
  }

  // Load initial report
  useEffect(() => {
    generateReportData(filters)
  }, [])

  const handleFiltersChange = (newFilters: RFilters) => {
    setFilters(newFilters)
  }

  const handleGenerate = () => {
    generateReportData(filters)
  }

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    toast.success(`Exporting report as ${format.toUpperCase()}...`)
    // In real app, this would call the export API
  }

  const getChartType = () => {
    switch (filters.groupBy) {
      case 'location':
        return 'location-analysis'
      case 'cs':
        return 'cs-performance'
      case 'payment-method':
        return 'revenue'
      default:
        return 'revenue'
    }
  }

  const getChartTitle = () => {
    switch (filters.groupBy) {
      case 'location':
        return 'Revenue by Location'
      case 'cs':
        return 'CS Performance Analysis'
      case 'payment-method':
        return 'Payment Method Analysis'
      default:
        return 'Revenue Trends'
    }
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="Reports & Analytics"
        subtitle="Generate comprehensive reports and analyze business performance"
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
              leftIcon={<Download className="h-4 w-4" />}
              disabled={isLoading || !reportData}
            >
              Export PDF
            </Button>
            
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
              leftIcon={<FileText className="h-4 w-4" />}
              disabled={isLoading || !reportData}
            >
              Export Excel
            </Button>
            
            <Button
              onClick={handleGenerate}
              leftIcon={<BarChart3 className="h-4 w-4" />}
              loading={isLoading}
              disabled={isLoading}
            >
              Generate Report
            </Button>
          </div>
        }
      >
        {/* Report Filters */}
        <ReportFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onGenerate={handleGenerate}
          onExport={handleExport}
          isLoading={isLoading}
        />

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="p-12">
              <Loading size="lg" text="Generating report..." />
            </CardContent>
          </Card>
        )}

        {/* Report Content */}
        {!isLoading && reportData && (
          <>
            {/* Summary */}
            <ReportSummary
              data={reportData.summaryData}
              isLoading={isLoading}
            />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Chart */}
              <div className="lg:col-span-2">
                <ReportCharts
                  data={reportData.chartData}
                  type={getChartType() as any}
                  title={getChartTitle()}
                  description={`Analysis for ${reportData.summaryData.period}`}
                  height={400}
                />
              </div>
            </div>

            {/* Additional Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bookings Trend */}
              <ReportCharts
                data={reportData.chartData}
                type="bookings"
                title="Bookings Trend"
                description="Daily booking volume analysis"
                height={300}
              />

              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-800">Gross Revenue</span>
                      <span className="text-lg font-bold text-green-900">
                        {formatCurrency(reportData.summaryData.totalRevenue)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">Total Commission</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(reportData.summaryData.totalCommission)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm font-medium text-purple-800">Net Revenue</span>
                      <span className="text-lg font-bold text-purple-900">
                        {formatCurrency(reportData.summaryData.totalRevenue - reportData.summaryData.totalCommission)}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Commission Rate</span>
                        <span className="text-sm font-medium">
                          {((reportData.summaryData.totalCommission / reportData.summaryData.totalRevenue) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !reportData && (
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Report Generated
              </h3>
              <p className="text-gray-600 mb-4">
                Configure your filters and click "Generate Report" to view analytics
              </p>
              <Button
                onClick={handleGenerate}
                leftIcon={<BarChart3 className="h-4 w-4" />}
              >
                Generate Your First Report
              </Button>
            </CardContent>
          </Card>
        )}
      </PageWrapper>
    </DashboardLayout>
  )
}

export default ReportsPage
