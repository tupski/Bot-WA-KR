import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export interface ErrorState {
  hasError: boolean
  error: Error | null
  errorType: 'network' | 'server' | 'validation' | 'generic'
  retryCount: number
}

export interface UseErrorHandlerOptions {
  maxRetries?: number
  showToast?: boolean
  logErrors?: boolean
  onError?: (error: Error, errorType: string) => void
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const {
    maxRetries = 3,
    showToast = true,
    logErrors = true,
    onError
  } = options

  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorType: 'generic',
    retryCount: 0
  })

  const handleError = useCallback((error: Error | string, type: ErrorState['errorType'] = 'generic') => {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    // Log error if enabled
    if (logErrors) {
      console.error(`[${type.toUpperCase()}] Error:`, errorObj)
    }

    // Update error state
    setErrorState(prev => ({
      hasError: true,
      error: errorObj,
      errorType: type,
      retryCount: prev.retryCount
    }))

    // Show toast notification if enabled
    if (showToast) {
      const message = getErrorMessage(errorObj, type)
      toast.error(message)
    }

    // Call custom error handler if provided
    onError?.(errorObj, type)
  }, [logErrors, showToast, onError])

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorType: 'generic',
      retryCount: 0
    })
  }, [])

  const retry = useCallback(() => {
    if (errorState.retryCount < maxRetries) {
      setErrorState(prev => ({
        ...prev,
        hasError: false,
        retryCount: prev.retryCount + 1
      }))
      return true
    }
    return false
  }, [errorState.retryCount, maxRetries])

  const canRetry = errorState.retryCount < maxRetries

  return {
    errorState,
    handleError,
    clearError,
    retry,
    canRetry
  }
}

// Helper function to get user-friendly error messages
const getErrorMessage = (error: Error, type: ErrorState['errorType']): string => {
  switch (type) {
    case 'network':
      return 'Network connection failed. Please check your internet connection.'
    
    case 'server':
      if (error.message.includes('500')) {
        return 'Server error occurred. Please try again later.'
      }
      if (error.message.includes('404')) {
        return 'The requested resource was not found.'
      }
      if (error.message.includes('403')) {
        return 'You do not have permission to access this resource.'
      }
      return 'Server error occurred. Please try again.'
    
    case 'validation':
      return error.message || 'Please check your input and try again.'
    
    default:
      return error.message || 'An unexpected error occurred. Please try again.'
  }
}

// Hook for API calls with automatic error handling
export const useApiCall = <T = any>(options: UseErrorHandlerOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<T | null>(null)
  const { errorState, handleError, clearError, retry } = useErrorHandler(options)

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setIsLoading(true)
    clearError()

    try {
      const result = await apiCall()
      setData(result)
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      
      // Determine error type based on error properties
      let errorType: ErrorState['errorType'] = 'generic'
      
      if (errorObj.message.includes('fetch') || errorObj.message.includes('network')) {
        errorType = 'network'
      } else if (errorObj.message.includes('400') || errorObj.message.includes('validation')) {
        errorType = 'validation'
      } else if (errorObj.message.includes('500') || errorObj.message.includes('server')) {
        errorType = 'server'
      }
      
      handleError(errorObj, errorType)
      throw errorObj
    } finally {
      setIsLoading(false)
    }
  }, [handleError, clearError])

  const retryCall = useCallback((apiCall: () => Promise<T>) => {
    if (retry()) {
      return execute(apiCall)
    }
    return Promise.reject(new Error('Maximum retry attempts reached'))
  }, [retry, execute])

  return {
    isLoading,
    data,
    errorState,
    execute,
    retryCall,
    clearError
  }
}

// Hook for form submissions with error handling
export const useFormSubmission = <T = any>(options: UseErrorHandlerOptions = {}) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { errorState, handleError, clearError } = useErrorHandler(options)

  const submit = useCallback(async (submitFn: () => Promise<T>) => {
    setIsSubmitting(true)
    clearError()

    try {
      const result = await submitFn()
      toast.success('Operation completed successfully')
      return result
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      handleError(errorObj, 'validation')
      throw errorObj
    } finally {
      setIsSubmitting(false)
    }
  }, [handleError, clearError])

  return {
    isSubmitting,
    errorState,
    submit,
    clearError
  }
}
