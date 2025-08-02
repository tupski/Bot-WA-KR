import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  Download, 
  Upload,
  BarChart3,
  Users,
  Settings,
  FileText,
  RefreshCw,
  Database,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

interface QuickAction {
  title: string
  description: string
  icon: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary'
  disabled?: boolean
  requiresRole?: 'admin' | 'user' | 'viewer'
}

interface QuickActionsProps {
  title?: string
  description?: string
  actions?: QuickAction[]
}

const QuickActions: React.FC<QuickActionsProps> = ({
  title = 'Quick Actions',
  description = 'Common tasks and shortcuts',
  actions
}) => {
  const { user } = useAuth()

  const defaultActions: QuickAction[] = [
    {
      title: 'Add Transaction',
      description: 'Record new booking manually',
      icon: 'Plus',
      href: '/transactions/new',
      variant: 'default'
    },
    {
      title: 'Generate Report',
      description: 'Create custom report',
      icon: 'BarChart3',
      href: '/reports/generate',
      variant: 'outline'
    },
    {
      title: 'Export Data',
      description: 'Download transactions data',
      icon: 'Download',
      href: '/transactions?export=true',
      variant: 'outline'
    },
    {
      title: 'Manage CS',
      description: 'View CS performance',
      icon: 'Users',
      href: '/cs',
      variant: 'outline'
    },
    {
      title: 'System Logs',
      description: 'View system activities',
      icon: 'FileText',
      href: '/logs',
      variant: 'outline'
    },
    {
      title: 'Backup Data',
      description: 'Create system backup',
      icon: 'Database',
      onClick: () => console.log('Backup initiated'),
      variant: 'outline',
      requiresRole: 'admin'
    },
    {
      title: 'Bot Settings',
      description: 'Configure bot parameters',
      icon: 'Settings',
      href: '/config',
      variant: 'outline',
      requiresRole: 'admin'
    },
    {
      title: 'Refresh Data',
      description: 'Sync latest data',
      icon: 'RefreshCw',
      onClick: () => window.location.reload(),
      variant: 'secondary'
    }
  ]

  const getIcon = (iconName: string) => {
    const icons = {
      Plus,
      Download,
      Upload,
      BarChart3,
      Users,
      Settings,
      FileText,
      RefreshCw,
      Database,
      Shield
    }
    const IconComponent = icons[iconName as keyof typeof icons]
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null
  }

  const hasPermission = (action: QuickAction) => {
    if (!action.requiresRole) return true
    if (!user) return false
    
    const roleHierarchy = {
      viewer: 1,
      user: 2,
      admin: 3
    }
    
    const userLevel = roleHierarchy[user.role] || 0
    const requiredLevel = roleHierarchy[action.requiresRole] || 0
    
    return userLevel >= requiredLevel
  }

  const actionsToShow = (actions || defaultActions).filter(hasPermission)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actionsToShow.map((action, index) => {
            const buttonContent = (
              <Button
                variant={action.variant || 'outline'}
                className="w-full justify-start h-auto p-4"
                disabled={action.disabled}
                onClick={action.onClick}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="flex-shrink-0">
                    {getIcon(action.icon)}
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-sm">
                      {action.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            )

            if (action.href) {
              return (
                <Link key={index} to={action.href}>
                  {buttonContent}
                </Link>
              )
            }

            return (
              <div key={index}>
                {buttonContent}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default QuickActions
