import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            // Variants
            "bg-blue-600 text-white hover:bg-blue-700": variant === 'default',
            "bg-red-600 text-white hover:bg-red-700": variant === 'destructive',
            "border border-gray-300 bg-white hover:bg-gray-50": variant === 'outline',
            "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === 'secondary',
            "hover:bg-gray-100": variant === 'ghost',
            "text-blue-600 underline-offset-4 hover:underline": variant === 'link',

            // Sizes
            "h-10 px-4 py-2": size === 'default',
            "h-9 rounded-md px-3": size === 'sm',
            "h-11 rounded-md px-8": size === 'lg',
            "h-10 w-10": size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button }
