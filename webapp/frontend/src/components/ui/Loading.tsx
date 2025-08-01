import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  fullScreen?: boolean
}

const Loading: React.FC<LoadingProps> = ({ 
  size = 'md', 
  text = 'Loading...', 
  className,
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-3",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-blue-600",
        sizeClasses[size]
      )} />
      {text && (
        <p className={cn(
          "text-gray-600 font-medium",
          textSizeClasses[size]
        )}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {content}
      </div>
    )
  }

  return content
}

// Skeleton loading components
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse", className)}>
    <div className="bg-gray-200 rounded-lg p-6 space-y-4">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-8 bg-gray-300 rounded w-1/2"></div>
      <div className="h-3 bg-gray-300 rounded w-full"></div>
    </div>
  </div>
)

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="animate-pulse space-y-4">
    {/* Header */}
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-300 rounded"></div>
      ))}
    </div>
    
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    ))}
  </div>
)

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-gray-200 rounded-lg", className)}>
    <div className="h-64 flex items-end justify-around p-4 space-x-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-300 rounded-t"
          style={{ 
            height: `${Math.random() * 60 + 20}%`,
            width: '12%'
          }}
        ></div>
      ))}
    </div>
  </div>
)

export default Loading
