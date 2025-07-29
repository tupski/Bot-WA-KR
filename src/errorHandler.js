// Error Handler Module
const logger = require('./logger');
const emailService = require('./emailService');

class ErrorHandler {
    constructor() {
        this.errorCounts = new Map();
        this.lastErrorTime = new Map();
        this.maxErrorsPerHour = 10;
        this.emailCooldown = 300000; // 5 minutes in milliseconds
    }

    /**
     * Handle and log errors with context
     */
    async handleError(error, context = '', options = {}) {
        try {
            const {
                level = 'error',
                sendEmail = false,
                throwError = false,
                retryable = false,
                userId = null,
                operation = null
            } = options;

            // Create error info object
            const errorInfo = {
                message: error.message || 'Unknown error',
                stack: error.stack || 'No stack trace available',
                context: context,
                timestamp: new Date().toISOString(),
                userId: userId,
                operation: operation,
                retryable: retryable
            };

            // Log the error
            this.logError(errorInfo, level);

            // Track error frequency
            this.trackErrorFrequency(error.message);

            // Send email notification if requested and not in cooldown
            if (sendEmail && this.shouldSendEmailAlert(error.message)) {
                await this.sendErrorAlert(errorInfo);
            }

            // Throw error if requested
            if (throwError) {
                throw error;
            }

            return errorInfo;

        } catch (handlingError) {
            // If error handling itself fails, log it simply
            logger.error('Error in error handler:', handlingError);
        }
    }

    /**
     * Log error with appropriate level
     */
    logError(errorInfo, level) {
        const logMessage = `${errorInfo.context ? `[${errorInfo.context}] ` : ''}${errorInfo.message}`;
        
        switch (level) {
            case 'warn':
                logger.warn(logMessage, { 
                    stack: errorInfo.stack,
                    userId: errorInfo.userId,
                    operation: errorInfo.operation
                });
                break;
            case 'error':
                logger.error(logMessage, { 
                    stack: errorInfo.stack,
                    userId: errorInfo.userId,
                    operation: errorInfo.operation
                });
                break;
            case 'fatal':
                logger.error(`FATAL: ${logMessage}`, { 
                    stack: errorInfo.stack,
                    userId: errorInfo.userId,
                    operation: errorInfo.operation
                });
                break;
            default:
                logger.error(logMessage, { 
                    stack: errorInfo.stack,
                    userId: errorInfo.userId,
                    operation: errorInfo.operation
                });
        }
    }

    /**
     * Track error frequency to prevent spam
     */
    trackErrorFrequency(errorMessage) {
        const key = this.getErrorKey(errorMessage);
        const now = Date.now();
        const hourAgo = now - 3600000; // 1 hour ago

        // Clean old entries
        if (this.lastErrorTime.has(key)) {
            const lastTime = this.lastErrorTime.get(key);
            if (lastTime < hourAgo) {
                this.errorCounts.delete(key);
                this.lastErrorTime.delete(key);
            }
        }

        // Update counts
        const currentCount = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, currentCount + 1);
        this.lastErrorTime.set(key, now);
    }

    /**
     * Check if email alert should be sent
     */
    shouldSendEmailAlert(errorMessage) {
        const key = this.getErrorKey(errorMessage);
        const count = this.errorCounts.get(key) || 0;
        const lastTime = this.lastErrorTime.get(key) || 0;
        const now = Date.now();

        // Don't send if too many errors of this type
        if (count > this.maxErrorsPerHour) {
            return false;
        }

        // Don't send if too recent
        if (now - lastTime < this.emailCooldown) {
            return false;
        }

        return true;
    }

    /**
     * Send error alert via email
     */
    async sendErrorAlert(errorInfo) {
        try {
            await emailService.sendErrorNotification(
                new Error(errorInfo.message),
                errorInfo.context
            );
            logger.info('Error alert email sent successfully');
        } catch (emailError) {
            logger.error('Failed to send error alert email:', emailError);
        }
    }

    /**
     * Get normalized error key for tracking
     */
    getErrorKey(errorMessage) {
        // Normalize error message to group similar errors
        return errorMessage
            .toLowerCase()
            .replace(/\d+/g, 'N') // Replace numbers with N
            .replace(/['"]/g, '') // Remove quotes
            .substring(0, 100); // Limit length
    }

    /**
     * Handle database errors specifically
     */
    async handleDatabaseError(error, operation, data = null) {
        const context = `Database Operation: ${operation}`;
        
        // Determine if error is retryable
        const retryable = this.isDatabaseErrorRetryable(error);
        
        return await this.handleError(error, context, {
            level: 'error',
            sendEmail: true,
            retryable: retryable,
            operation: operation
        });
    }

    /**
     * Handle WhatsApp errors specifically
     */
    async handleWhatsAppError(error, operation, messageId = null) {
        const context = `WhatsApp Operation: ${operation}`;
        
        // Determine if error is retryable
        const retryable = this.isWhatsAppErrorRetryable(error);
        
        return await this.handleError(error, context, {
            level: 'error',
            sendEmail: false, // Don't spam email for WhatsApp errors
            retryable: retryable,
            operation: operation,
            userId: messageId
        });
    }

    /**
     * Handle email errors specifically
     */
    async handleEmailError(error, operation, recipient = null) {
        const context = `Email Operation: ${operation}`;
        
        return await this.handleError(error, context, {
            level: 'warn', // Email errors are usually not critical
            sendEmail: false, // Don't send email about email errors
            retryable: true,
            operation: operation,
            userId: recipient
        });
    }

    /**
     * Handle parsing errors specifically
     */
    async handleParsingError(error, messageContent, messageId = null) {
        const context = 'Message Parsing';
        
        return await this.handleError(error, context, {
            level: 'warn', // Parsing errors are expected sometimes
            sendEmail: false,
            retryable: false,
            operation: 'parseMessage',
            userId: messageId
        });
    }

    /**
     * Check if database error is retryable
     */
    isDatabaseErrorRetryable(error) {
        const retryableErrors = [
            'ECONNRESET',
            'ENOTFOUND',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ER_LOCK_WAIT_TIMEOUT',
            'ER_LOCK_DEADLOCK'
        ];

        return retryableErrors.some(retryableError => 
            error.message.includes(retryableError) || 
            error.code === retryableError
        );
    }

    /**
     * Check if WhatsApp error is retryable
     */
    isWhatsAppErrorRetryable(error) {
        const retryableErrors = [
            'Rate limit',
            'Network error',
            'Connection lost',
            'Timeout',
            'ECONNRESET'
        ];

        return retryableErrors.some(retryableError => 
            error.message.toLowerCase().includes(retryableError.toLowerCase())
        );
    }

    /**
     * Create retry wrapper for functions
     */
    createRetryWrapper(fn, maxRetries = 3, delay = 1000) {
        return async (...args) => {
            let lastError;
            
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    return await fn(...args);
                } catch (error) {
                    lastError = error;
                    
                    const errorInfo = await this.handleError(error, `Retry attempt ${attempt}/${maxRetries}`, {
                        level: attempt === maxRetries ? 'error' : 'warn',
                        sendEmail: attempt === maxRetries,
                        throwError: false
                    });

                    // Don't retry if error is not retryable
                    if (!errorInfo.retryable || attempt === maxRetries) {
                        break;
                    }

                    // Wait before retry with exponential backoff
                    const waitTime = delay * Math.pow(2, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
            
            throw lastError;
        };
    }

    /**
     * Graceful shutdown handler
     */
    async handleShutdown(signal) {
        try {
            logger.info(`Received ${signal}. Starting graceful shutdown...`);
            
            // Give time for ongoing operations to complete
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
            
        } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
        }
    }

    /**
     * Setup global error handlers
     */
    setupGlobalHandlers() {
        // Handle uncaught exceptions
        process.on('uncaughtException', async (error) => {
            await this.handleError(error, 'Uncaught Exception', {
                level: 'fatal',
                sendEmail: true,
                throwError: false
            });
            
            // Give time for logging and email
            setTimeout(() => {
                process.exit(1);
            }, 5000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', async (reason, promise) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            
            await this.handleError(error, 'Unhandled Promise Rejection', {
                level: 'error',
                sendEmail: true,
                throwError: false
            });
        });

        // Handle graceful shutdown signals
        process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
        process.on('SIGINT', () => this.handleShutdown('SIGINT'));

        logger.info('Global error handlers setup completed');
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            totalErrors: 0,
            errorsByType: {},
            recentErrors: []
        };

        for (const [key, count] of this.errorCounts.entries()) {
            stats.totalErrors += count;
            stats.errorsByType[key] = count;
        }

        return stats;
    }

    /**
     * Clear error tracking data
     */
    clearErrorStats() {
        this.errorCounts.clear();
        this.lastErrorTime.clear();
        logger.info('Error statistics cleared');
    }
}

module.exports = new ErrorHandler();
