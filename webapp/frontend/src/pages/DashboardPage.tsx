import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import MetricsGrid from '@/components/dashboard/MetricsGrid'
import RevenueChart, { PaymentMethodChart } from '@/components/charts/RevenueChart'
import RecentActivities from '@/components/dashboard/RecentActivities'
import QuickActions from '@/components/dashboard/QuickActions'
import SystemStatus from '@/components/dashboard/SystemStatus'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import {
  Plus,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Mock data - in real app, this would come from API
  const [dashboardData, setDashboardData] = useState({
    metrics: [
      {
        title: 'Total Revenue',
        value: 45231000,
        change: '+20.1%',
        changeType: 'increase' as const,
        icon: 'DollarSign',
        description: 'from last month',
        color: 'bg-green-100 text-green-600'
      },
      {
        title: 'Total Bookings',
        value: '2,350',
        change: '+180',
        changeType: 'increase' as const,
        icon: 'CreditCard',
        description: 'this month',
        color: 'bg-blue-100 text-blue-600'
      },
      {
        title: 'Active CS',
        value: '12',
        change: '+2',
        changeType: 'increase' as const,
        icon: 'Users',
        description: 'currently online',
        color: 'bg-purple-100 text-purple-600'
      },
      {
        title: 'System Health',
        value: '99.9%',
        change: '-0.1%',
        changeType: 'decrease' as const,
        icon: 'Activity',
        description: 'uptime',
        color: 'bg-orange-100 text-orange-600'
      }
    ],
    revenueData: [
      { date: '2024-01-01', revenue: 1500000, commission: 150000, bookings: 12 },
      { date: '2024-01-02', revenue: 2100000, commission: 210000, bookings: 18 },
      { date: '2024-01-03', revenue: 1800000, commission: 180000, bookings: 15 },
      { date: '2024-01-04', revenue: 2400000, commission: 240000, bookings: 20 },
      { date: '2024-01-05', revenue: 2200000, commission: 220000, bookings: 19 },
      { date: '2024-01-06', revenue: 2800000, commission: 280000, bookings: 24 },
      { date: '2024-01-07', revenue: 3100000, commission: 310000, bookings: 26 }
    ],
    paymentMethodData: [
      { method: 'Cash', value: 15500000, percentage: 65 },
      { method: 'Transfer', value: 8300000, percentage: 35 }
    ]
  })

  const recentActivities = [
    {
      id: '1',
      type: 'transaction' as const,
      title: 'New booking recorded',
      description: 'SKY1-A101 checked out by CS Amel',
      timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      amount: 150000,
      status: 'success' as const,
      user: 'Amel'
    },
    {
      id: '2',
      type: 'transaction' as const,
      title: 'Payment received',
      description: 'SKY2-B205 transfer payment confirmed',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      amount: 200000,
      status: 'success' as const,
      user: 'KR'
    },
    {
      id: '3',
      type: 'report' as const,
      title: 'Daily report generated',
      description: 'Automated daily summary completed',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      status: 'success' as const,
      user: 'System'
    },
    {
      id: '4',
      type: 'user' as const,
      title: 'User login',
      description: 'Admin user logged in from new device',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'info' as const,
      user: user?.username
    },
    {
      id: '5',
      type: 'system' as const,
      title: 'Database backup',
      description: 'Scheduled backup completed successfully',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'success' as const,
      user: 'System'
    }
  ]

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleRefresh = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setLastRefresh(new Date())
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <Loading size="lg" text="Loading dashboard..." fullScreen />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="Dashboard"
        subtitle={`Welcome back, ${user?.username}! Here's what's happening with your business today.`}
        actions={
          <div className="flex space-x-3">
            <Button
              variant="outline"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={handleRefresh}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export Report
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              New Transaction
            </Button>
          </div>
        }
      >
        {/* Metrics Grid */}
        <MetricsGrid metrics={dashboardData.metrics} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <RevenueChart
              data={dashboardData.revenueData}
              title="Revenue Trends"
              description="Daily revenue and commission over the last 7 days"
              height={350}
            />
          </div>

          {/* Payment Method Distribution */}
          <div>
            <PaymentMethodChart
              data={dashboardData.paymentMethodData}
              title="Payment Methods"
              description="Distribution of payment methods this month"
            />
          </div>
        </div>

        {/* Activities and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <RecentActivities
              activities={recentActivities}
              title="Recent Activities"
              description="Latest system activities and transactions"
              maxItems={8}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActions />

            {/* System Status */}
            <SystemStatus />
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Today's Summary</span>
              </CardTitle>
              <CardDescription>
                Performance summary for {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Bookings</span>
                  <span className="font-semibold">26</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Revenue</span>
                  <span className="font-semibold">{formatCurrency(3100000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Commission Earned</span>
                  <span className="font-semibold">{formatCurrency(310000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active CS</span>
                  <span className="font-semibold">8</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Insights</span>
              </CardTitle>
              <CardDescription>
                Key insights and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">
                    📈 Revenue up 20% this month
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Great performance compared to last month
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">
                    🏆 Top CS: Amel (45 bookings)
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Leading in bookings this week
                  </p>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-800">
                    ⚠️ Peak hours: 7-9 PM
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Consider adding more CS during peak times
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </DashboardLayout>
  )
}

export default DashboardPage
