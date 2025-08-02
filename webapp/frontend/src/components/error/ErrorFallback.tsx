import React from 'react'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home,
  Wifi,
  WifiOff,
  Server,
  Database
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface ErrorFallbackProps {
  error?: Error
  resetError?: () => void
  type?: 'network' | 'server' | 'database' | 'generic'
  title?: string
  message?: string
  showRetry?: boolean
  showHome?: boolean
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  type = 'generic',
  title,
  message,
  showRetry = true,
  showHome = true
}) => {
  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: WifiOff,
          iconColor: 'text-orange-600',
          bgColor: 'bg-orange-100',
          title: title || 'Network Connection Error',
          message: message || 'Unable to connect to the server. Please check your internet connection and try again.',
          suggestions: [
            'Check your internet connection',
            'Try refreshing the page',
            'Contact support if the problem persists'
          ]
        }
      
      case 'server':
        return {
          icon: Server,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: title || 'Server Error',
          message: message || 'The server encountered an error while processing your request. Please try again later.',
          suggestions: [
            'Try refreshing the page',
            'Wait a few minutes and try again',
            'Contact support if the error continues'
          ]
        }
      
      case 'database':
        return {
          icon: Database,
          iconColor: 'text-purple-600',
          bgColor: 'bg-purple-100',
          title: title || 'Database Error',
          message: message || 'Unable to retrieve data from the database. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Check if the service is under maintenance',
            'Contact support for assistance'
          ]
        }
      
      default:
        return {
          icon: AlertTriangle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-100',
          title: title || 'Something went wrong',
          message: message || 'An unexpected error occurred. Please try again.',
          suggestions: [
            'Try refreshing the page',
            'Clear your browser cache',
            'Contact support if needed'
          ]
        }
    }
  }

  const config = getErrorConfig()
  const IconComponent = config.icon

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-gray-900">
          <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
          <span>{config.title}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
          </div>
          
          <p className="text-gray-600 mb-4">
            {config.message}
          </p>
        </div>

        {/* Error Details (Development) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <summary className="font-medium text-gray-900 cursor-pointer">
              Technical Details (Development)
            </summary>
            
            <div className="mt-3">
              <pre className="text-sm text-gray-800 bg-gray-100 p-2 rounded overflow-x-auto">
                {error.message}
              </pre>
              
              {error.stack && (
                <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded mt-2 overflow-x-auto max-h-32">
                  {error.stack}
                </pre>
              )}
            </div>
          </details>
        )}

        {/* Suggestions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">What you can try:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          {showRetry && resetError && (
            <Button
              onClick={resetError}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Try Again
            </Button>
          )}
          
          {showHome && (
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              leftIcon={<Home className="h-4 w-4" />}
              className="w-full sm:w-auto"
            >
              Go to Dashboard
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ErrorFallback

// Specific error components for common scenarios
export const NetworkError: React.FC<Omit<ErrorFallbackProps, 'type'>> = (props) => (
  <ErrorFallback {...props} type="network" />
)

export const ServerError: React.FC<Omit<ErrorFallbackProps, 'type'>> = (props) => (
  <ErrorFallback {...props} type="server" />
)

export const DatabaseError: React.FC<Omit<ErrorFallbackProps, 'type'>> = (props) => (
  <ErrorFallback {...props} type="database" />
)
