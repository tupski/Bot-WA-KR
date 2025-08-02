import React, { useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import PageWrapper from '@/components/layout/PageWrapper'
import BotSettings from '@/components/settings/BotSettings'
import ApartmentSettings from '@/components/settings/ApartmentSettings'
import UserPermissions from '@/components/settings/UserPermissions'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { 
  Bot, 
  Building, 
  Users, 
  Shield,
  Save,
  Settings as SettingsIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bot' | 'apartments' | 'users'>('bot')
  const [isLoading, setIsLoading] = useState(false)

  const tabs = [
    {
      id: 'bot' as const,
      label: 'Bot Settings',
      icon: Bot,
      description: 'Configure bot behavior and messages'
    },
    {
      id: 'apartments' as const,
      label: 'Apartments',
      icon: Building,
      description: 'Manage apartment locations and pricing'
    },
    {
      id: 'users' as const,
      label: 'User Management',
      icon: Users,
      description: 'Manage users, roles, and permissions'
    }
  ]

  const handleSaveBotSettings = async (data: any) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real app, this would call the API
      console.log('Saving bot settings:', data)
      
      toast.success('Bot settings saved successfully')
    } catch (error) {
      toast.error('Failed to save bot settings')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveApartments = async (apartments: any[]) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real app, this would call the API
      console.log('Saving apartments:', apartments)
      
      toast.success('Apartment settings saved successfully')
    } catch (error) {
      toast.error('Failed to save apartment settings')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveUsers = async (users: any[]) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // In real app, this would call the API
      console.log('Saving users:', users)
      
      toast.success('User settings saved successfully')
    } catch (error) {
      toast.error('Failed to save user settings')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <PageWrapper
        title="System Configuration"
        subtitle="Configure bot settings, apartments, and user permissions"
        actions={
          <Button
            variant="outline"
            leftIcon={<Save className="h-4 w-4" />}
            disabled={isLoading}
          >
            Save All Changes
          </Button>
        }
      >
        {/* Tab Navigation */}
        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  {tabs.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="text-sm text-gray-600">
                  {tabs.find(tab => tab.id === activeTab)?.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'bot' && (
            <BotSettings
              onSave={handleSaveBotSettings}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'apartments' && (
            <ApartmentSettings
              onSave={handleSaveApartments}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'users' && (
            <UserPermissions
              onSave={handleSaveUsers}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* System Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <SettingsIcon className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">System Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-900">v1.0.0</div>
                <div className="text-sm text-blue-600">System Version</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-900">99.9%</div>
                <div className="text-sm text-green-600">Uptime</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-900">
                  {new Date().toLocaleDateString('id-ID')}
                </div>
                <div className="text-sm text-purple-600">Last Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    </DashboardLayout>
  )
}

export default SettingsPage
