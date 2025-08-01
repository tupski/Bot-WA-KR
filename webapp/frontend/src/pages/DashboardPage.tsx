import React from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Download
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const DashboardPage: React.FC = () => {
  const { user } = useAuth()

  // Mock data - in real app, this would come from API
  const stats = [
    {
      title: 'Total Revenue',
      value: 'Rp 45,231,000',
      change: '+20.1%',
      changeType: 'increase' as const,
      icon: TrendingUp,
      description: 'from last month'
    },
    {
      title: 'Total Bookings',
      value: '2,350',
      change: '+180',
      changeType: 'increase' as const,
      icon: CreditCard,
      description: 'this month'
    },
    {
      title: 'Active CS',
      value: '12',
      change: '+2',
      changeType: 'increase' as const,
      icon: Users,
      description: 'currently online'
    },
    {
      title: 'System Health',
      value: '99.9%',
      change: '-0.1%',
      changeType: 'decrease' as const,
      icon: Activity,
      description: 'uptime'
    }
  ]

  const recentTransactions = [
    {
      id: 1,
      unit: 'SKY1-A101',
      location: 'SKY1',
      amount: 150000,
      cs: 'Amel',
      time: '2 minutes ago',
      status: 'completed'
    },
    {
      id: 2,
      unit: 'SKY2-B205',
      location: 'SKY2',
      amount: 200000,
      cs: 'KR',
      time: '15 minutes ago',
      status: 'completed'
    },
    {
      id: 3,
      unit: 'SKY3-C301',
      location: 'SKY3',
      amount: 175000,
      cs: 'APK',
      time: '1 hour ago',
      status: 'completed'
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="Dashboard"
        subtitle={`Welcome back, ${user?.username}! Here's what's happening with your business today.`}
        actions={
          <div className="flex space-x-3">
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export Report
            </Button>
            <Button leftIcon={<Plus className="h-4 w-4" />}>
              New Transaction
            </Button>
          </div>
        }
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.changeType === 'increase' ? (
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  <span className={stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}>
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest booking activities from your WhatsApp bot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {transaction.unit}
                          </p>
                          <p className="text-sm text-gray-600">
                            {transaction.location} • CS: {transaction.cs}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {transaction.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button variant="outline" className="w-full">
                    View All Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & System Status */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Manage CS
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Activity className="h-4 w-4 mr-2" />
                  System Logs
                </Button>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current system health and bot status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">WhatsApp Bot</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Connected</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Server</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">Running</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm text-gray-600">2 hours ago</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </DashboardLayout>
  )
}

export default DashboardPage
