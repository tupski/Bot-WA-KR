import React, { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import CSPerformanceCard, { type CSPerformance } from '@/components/cs/CSPerformanceCard'
import CSLeaderboard from '@/components/cs/CSLeaderboard'
import CSForm from '@/components/cs/CSForm'
import ExportDialog from '@/components/export/ExportDialog'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import Loading from '@/components/ui/Loading'
import { 
  Plus, 
  Users, 
  TrendingUp,
  Award,
  Target,
  Filter,
  Download
} from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

const CSPage: React.FC = () => {
  const [csData, setCSData] = useState<CSPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCS, setEditingCS] = useState<CSPerformance | null>(null)
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'bookings' | 'commission' | 'rating'>('revenue')
  const [viewMode, setViewMode] = useState<'grid' | 'leaderboard'>('grid')
  const [showExportDialog, setShowExportDialog] = useState(false)

  // Mock data - in real app, this would come from API
  useEffect(() => {
    const loadCSData = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockCSData: CSPerformance[] = [
        {
          id: 1,
          name: 'Amel',
          totalBookings: 145,
          totalRevenue: 28500000,
          totalCommission: 7250000,
          averageAmount: 196551,
          conversionRate: 85.2,
          responseTime: 2.5,
          rating: 4.8,
          rank: 1,
          growth: 15.3,
          isActive: true,
          lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          joinDate: '2023-01-15'
        },
        {
          id: 2,
          name: 'KR',
          totalBookings: 132,
          totalRevenue: 25800000,
          totalCommission: 5940000,
          averageAmount: 195454,
          conversionRate: 78.9,
          responseTime: 3.2,
          rating: 4.6,
          rank: 2,
          growth: 8.7,
          isActive: true,
          lastActivity: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          joinDate: '2023-02-01'
        },
        {
          id: 3,
          name: 'APK',
          totalBookings: 98,
          totalRevenue: 19200000,
          totalCommission: 3920000,
          averageAmount: 195918,
          conversionRate: 72.1,
          responseTime: 4.1,
          rating: 4.3,
          rank: 3,
          growth: -2.1,
          isActive: true,
          lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          joinDate: '2023-03-10'
        }
      ]
      
      setCSData(mockCSData)
      setIsLoading(false)
    }

    loadCSData()
  }, [])

  const handleViewDetails = (cs: CSPerformance) => {
    // In real app, this would open a detailed modal or navigate to detail page
    toast.success(`Viewing details for ${cs.name}`)
  }

  const handleEdit = (cs: CSPerformance) => {
    setEditingCS(cs)
    setShowForm(true)
  }

  const handleFormSubmit = async (data: any) => {
    try {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingCS) {
        // Update existing CS
        setCSData(prev => prev.map(cs => 
          cs.id === editingCS.id 
            ? { ...cs, ...data }
            : cs
        ))
        toast.success('CS updated successfully')
      } else {
        // Create new CS
        const newCS: CSPerformance = {
          id: Math.max(...csData.map(cs => cs.id)) + 1,
          name: data.name,
          totalBookings: 0,
          totalRevenue: 0,
          totalCommission: 0,
          averageAmount: 0,
          conversionRate: 0,
          responseTime: 0,
          rating: 5.0,
          rank: csData.length + 1,
          growth: 0,
          isActive: data.isActive,
          lastActivity: new Date().toISOString(),
          joinDate: new Date().toISOString().split('T')[0]
        }
        setCSData(prev => [...prev, newCS])
        toast.success('CS added successfully')
      }
      
      setShowForm(false)
      setEditingCS(null)
    } catch (error) {
      toast.error('Failed to save CS')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  // Calculate summary stats
  const summaryStats = {
    totalCS: csData.length,
    activeCS: csData.filter(cs => cs.isActive).length,
    totalRevenue: csData.reduce((sum, cs) => sum + cs.totalRevenue, 0),
    totalCommission: csData.reduce((sum, cs) => sum + cs.totalCommission, 0),
    averageRating: csData.reduce((sum, cs) => sum + cs.rating, 0) / csData.length,
    topPerformer: csData.find(cs => cs.rank === 1)?.name || 'N/A'
  }

  if (showForm) {
    return (
      <DashboardLayout>
        <PageWrapper
          title={editingCS ? 'Edit CS' : 'Add New CS'}
          subtitle={editingCS ? 'Update CS information and settings' : 'Add a new customer service representative'}
        >
          <CSForm
            cs={editingCS || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false)
              setEditingCS(null)
            }}
            isLoading={isLoading}
          />
        </PageWrapper>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="CS Management"
        subtitle="Manage customer service representatives and track their performance"
        actions={
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleExport}
              leftIcon={<Download className="h-4 w-4" />}
            >
              Export Data
            </Button>
            
            <Button
              onClick={() => setShowForm(true)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Add CS
            </Button>
          </div>
        }
      >
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total CS</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.totalCS}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {summaryStats.activeCS} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summaryStats.totalRevenue)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                All CS combined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Commission</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summaryStats.totalCommission)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {((summaryStats.totalCommission / summaryStats.totalRevenue) * 100).toFixed(1)}% rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top Performer</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryStats.topPerformer}</p>
                </div>
                <Award className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⭐ {summaryStats.averageRating.toFixed(1)} avg rating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* View Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>CS Performance</CardTitle>
              
              <div className="flex items-center space-x-3">
                {/* Metric Selector */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Sort by:</span>
                  <label htmlFor="metric-select" className="sr-only">
                    Sort by metric
                  </label>
                  <select
                    id="metric-select"
                    aria-label="Sort by metric"
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as any)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value="revenue">Revenue</option>
                    <option value="bookings">Bookings</option>
                    <option value="commission">Commission</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    Grid
                  </Button>
                  <Button
                    variant={viewMode === 'leaderboard' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('leaderboard')}
                    className="rounded-l-none"
                  >
                    Leaderboard
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Loading size="lg" text="Loading CS data..." />
        )}

        {/* CS Data Display */}
        {!isLoading && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {csData.map((cs) => (
                  <CSPerformanceCard
                    key={cs.id}
                    cs={cs}
                    onViewDetails={handleViewDetails}
                    onEdit={handleEdit}
                    showRank={true}
                  />
                ))}
              </div>
            ) : (
              <CSLeaderboard
                csData={csData}
                metric={selectedMetric}
                title={`CS Leaderboard - ${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}`}
                showTop={10}
              />
            )}
          </>
        )}

        {/* Empty State */}
        {!isLoading && csData.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No CS Found
              </h3>
              <p className="text-gray-600 mb-4">
                Start by adding your first customer service representative
              </p>
              <Button
                onClick={() => setShowForm(true)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Your First CS
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          data={csData}
          dataType="cs-performance"
          title="Export CS Performance"
        />
      </PageWrapper>
    </DashboardLayout>
  )
}

export default CSPage
