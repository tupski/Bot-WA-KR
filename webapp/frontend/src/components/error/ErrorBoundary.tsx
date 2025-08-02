import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // In production, you would send this to your error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-6 w-6" />
                <span>Something went wrong</span>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bug className="h-8 w-8 text-red-600" />
                </div>
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Oops! An unexpected error occurred
                </h2>
                
                <p className="text-gray-600 mb-6">
                  We're sorry for the inconvenience. The error has been logged and our team will investigate.
                </p>
              </div>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="space-y-4">
                  <details className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <summary className="font-medium text-red-900 cursor-pointer">
                      Error Details (Development)
                    </summary>
                    
                    <div className="mt-3 space-y-3">
                      <div>
                        <h4 className="font-medium text-red-900">Error Message:</h4>
                        <pre className="text-sm text-red-800 bg-red-100 p-2 rounded mt-1 overflow-x-auto">
                          {this.state.error.message}
                        </pre>
                      </div>
                      
                      {this.state.error.stack && (
                        <div>
                          <h4 className="font-medium text-red-900">Stack Trace:</h4>
                          <pre className="text-xs text-red-800 bg-red-100 p-2 rounded mt-1 overflow-x-auto max-h-40">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <h4 className="font-medium text-red-900">Component Stack:</h4>
                          <pre className="text-xs text-red-800 bg-red-100 p-2 rounded mt-1 overflow-x-auto max-h-40">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={this.handleRetry}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Try Again
                </Button>
                
                <Button
                  variant="outline"
                  onClick={this.handleGoHome}
                  leftIcon={<Home className="h-4 w-4" />}
                  className="w-full sm:w-auto"
                >
                  Go to Dashboard
                </Button>
              </div>

              {/* Support Info */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  If this problem persists, please contact support with the error details above.
                </p>
                <p className="mt-1">
                  Error ID: {this.state.error?.message.slice(0, 8) || 'unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
