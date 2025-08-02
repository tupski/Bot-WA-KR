import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  CreditCard, 
  BarChart3, 
  Users, 
  Settings,
  FileText,
  Activity,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface MobileNavigationProps {
  isOpen: boolean
  onToggle: () => void
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  isOpen,
  onToggle
}) => {
  const location = useLocation()

  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/',
      icon: Home
    },
    {
      title: 'Transactions',
      href: '/transactions',
      icon: CreditCard
    },
    {
      title: 'Reports',
      href: '/reports',
      icon: BarChart3
    },
    {
      title: 'CS Management',
      href: '/cs',
      icon: Users
    },
    {
      title: 'Logs',
      href: '/logs',
      icon: FileText
    },
    {
      title: 'Monitoring',
      href: '/monitoring',
      icon: Activity
    },
    {
      title: 'Settings',
      href: '/config',
      icon: Settings
    }
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 bg-white shadow-md"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 md:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">KR</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Kakarama Room</h2>
              <p className="text-xs text-gray-600">Dashboard</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.href

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onToggle}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <IconComponent className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-xs text-gray-500">Version 1.0.0</p>
            <p className="text-xs text-gray-400">© 2024 Kakarama Room</p>
          </div>
        </div>
      </div>

      {/* Bottom Navigation for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-30">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navigationItems.slice(0, 4).map((item) => {
            const IconComponent = item.icon
            const isActive = location.pathname === item.href

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <IconComponent className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium truncate">{item.title}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

export default MobileNavigation
