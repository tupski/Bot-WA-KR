import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  CreditCard, 
  BarChart3, 
  Users, 
  Settings, 
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import type { NavItem } from '@/types'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navigationItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/',
      icon: 'LayoutDashboard'
    },
    {
      title: 'Transactions',
      href: '/transactions',
      icon: 'CreditCard'
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: 'BarChart3'
    },
    {
      title: 'CS Management',
      href: '/cs',
      icon: 'Users'
    },
    {
      title: 'Logs',
      href: '/logs',
      icon: 'FileText'
    },
    {
      title: 'Monitoring',
      href: '/monitoring',
      icon: 'Activity'
    }
  ]

  // Add admin-only items
  if (user?.role === 'admin') {
    navigationItems.push({
      title: 'Configuration',
      href: '/config',
      icon: 'Settings'
    })
  }

  const getIcon = (iconName: string) => {
    const icons = {
      LayoutDashboard,
      CreditCard,
      BarChart3,
      Users,
      Settings,
      FileText,
      Shield
    }
    const IconComponent = icons[iconName as keyof typeof icons]
    return IconComponent ? <IconComponent className="h-5 w-5" /> : null
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">KR</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">Kakarama Room</h1>
                <p className="text-xs text-gray-500">Dashboard</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
            title={collapsed ? item.title : undefined}
          >
            {getIcon(item.icon || '')}
            {!collapsed && <span>{item.title}</span>}
            {item.badge && !collapsed && (
              <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200">
        {!collapsed && user && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
              <div className="flex items-center">
                {user.role === 'admin' && (
                  <div title="Admin">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                user.role === 'admin' 
                  ? "bg-purple-100 text-purple-800"
                  : user.role === 'user'
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
              )}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
            </div>
          </div>
        )}
        
        <button
          type="button"
          onClick={handleLogout}
          className={cn(
            "flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

export default Sidebar
