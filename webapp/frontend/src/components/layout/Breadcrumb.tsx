import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[]
  className?: string
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className }) => {
  const location = useLocation()

  // Auto-generate breadcrumbs if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x)
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', href: '/' }
    ]

    const routeNames: { [key: string]: string } = {
      'transactions': 'Transactions',
      'reports': 'Reports & Analytics',
      'cs': 'CS Management',
      'config': 'Configuration',
      'logs': 'System Logs',
      'profile': 'Profile',
      'settings': 'Settings',
      'notifications': 'Notifications'
    }

    pathnames.forEach((pathname, index) => {
      const href = `/${pathnames.slice(0, index + 1).join('/')}`
      const isLast = index === pathnames.length - 1
      
      breadcrumbs.push({
        label: routeNames[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1),
        href: isLast ? undefined : href,
        current: isLast
      })
    })

    return breadcrumbs
  }

  const breadcrumbItems = items || generateBreadcrumbs()

  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <nav className={cn("flex items-center space-x-1 text-sm text-gray-600", className)}>
      <Home className="h-4 w-4" />
      
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          
          {item.href && !item.current ? (
            <Link
              to={item.href}
              className="hover:text-gray-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              item.current ? "text-gray-900 font-medium" : "text-gray-600"
            )}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export default Breadcrumb
