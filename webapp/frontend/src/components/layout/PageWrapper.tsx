import React from 'react'
import Breadcrumb from './Breadcrumb'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string; current?: boolean }>
  className?: string
  noPadding?: boolean
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  className,
  noPadding = false
}) => {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Page header */}
      {(title || breadcrumbs || actions) && (
        <div className="space-y-4">
          {/* Breadcrumbs */}
          {breadcrumbs && (
            <Breadcrumb items={breadcrumbs} />
          )}

          {/* Title and actions */}
          {(title || actions) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-2xl font-bold text-gray-900">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-1 text-sm text-gray-600">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {actions && (
                <div className="flex items-center space-x-3">
                  {actions}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Page content */}
      <div className={cn(!noPadding && "space-y-6")}>
        {children}
      </div>
    </div>
  )
}

export default PageWrapper
