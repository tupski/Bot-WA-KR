// Number Formatter Utility Module
const logger = require('./logger');

class NumberFormatter {
    constructor() {
        this.locale = 'id-ID';
        this.currency = 'IDR';
    }

    /**
     * Format number as Indonesian Rupiah currency
     * @param {number|string} amount - The amount to format
     * @param {boolean} showSymbol - Whether to show Rp symbol (default: true)
     * @param {boolean} showDecimals - Whether to show decimal places (default: false)
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount, showSymbol = true, showDecimals = false) {
        try {
            // Convert to number if string
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            
            // Handle invalid numbers
            if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
                return showSymbol ? 'Rp0' : '0';
            }

            // Round to avoid floating point issues
            const roundedAmount = showDecimals ? Math.round(numAmount * 100) / 100 : Math.round(numAmount);

            // Format with Indonesian locale
            const formatted = roundedAmount.toLocaleString(this.locale, {
                minimumFractionDigits: showDecimals ? 2 : 0,
                maximumFractionDigits: showDecimals ? 2 : 0
            });

            return showSymbol ? `Rp${formatted}` : formatted;

        } catch (error) {
            logger.error('Error formatting currency:', error);
            return showSymbol ? 'Rp0' : '0';
        }
    }

    /**
     * Format number with thousand separators (no currency symbol)
     * @param {number|string} number - The number to format
     * @param {boolean} showDecimals - Whether to show decimal places (default: false)
     * @returns {string} Formatted number string
     */
    formatNumber(number, showDecimals = false) {
        return this.formatCurrency(number, false, showDecimals);
    }

    /**
     * Format percentage
     * @param {number|string} value - The value to format as percentage
     * @param {number} decimals - Number of decimal places (default: 1)
     * @returns {string} Formatted percentage string
     */
    formatPercentage(value, decimals = 1) {
        try {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            
            if (isNaN(numValue) || numValue === null || numValue === undefined) {
                return '0%';
            }

            return numValue.toLocaleString(this.locale, {
                style: 'percent',
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });

        } catch (error) {
            logger.error('Error formatting percentage:', error);
            return '0%';
        }
    }

    /**
     * Parse currency string to number
     * @param {string} currencyString - Currency string to parse (e.g., "Rp1,500,000")
     * @returns {number} Parsed number
     */
    parseCurrency(currencyString) {
        try {
            if (!currencyString || typeof currencyString !== 'string') {
                return 0;
            }

            // Remove currency symbols, spaces, and dots used as thousand separators
            const cleanString = currencyString
                .replace(/[Rp\s]/g, '')
                .replace(/\./g, '')
                .replace(/,/g, '.');

            const parsed = parseFloat(cleanString);
            return isNaN(parsed) ? 0 : parsed;

        } catch (error) {
            logger.error('Error parsing currency:', error);
            return 0;
        }
    }

    /**
     * Format large numbers with K, M, B suffixes
     * @param {number|string} number - The number to format
     * @param {number} decimals - Number of decimal places (default: 1)
     * @returns {string} Formatted number with suffix
     */
    formatLargeNumber(number, decimals = 1) {
        try {
            const numValue = typeof number === 'string' ? parseFloat(number) : number;
            
            if (isNaN(numValue) || numValue === null || numValue === undefined) {
                return '0';
            }

            const absValue = Math.abs(numValue);
            const sign = numValue < 0 ? '-' : '';

            if (absValue >= 1000000000) {
                return sign + (absValue / 1000000000).toFixed(decimals) + 'B';
            } else if (absValue >= 1000000) {
                return sign + (absValue / 1000000).toFixed(decimals) + 'M';
            } else if (absValue >= 1000) {
                return sign + (absValue / 1000).toFixed(decimals) + 'K';
            } else {
                return sign + absValue.toString();
            }

        } catch (error) {
            logger.error('Error formatting large number:', error);
            return '0';
        }
    }

    /**
     * Format currency for WhatsApp messages (compact format)
     * @param {number|string} amount - The amount to format
     * @returns {string} Formatted currency string for WhatsApp
     */
    formatCurrencyForWhatsApp(amount) {
        try {
            const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
            
            if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
                return 'Rp0';
            }

            // For WhatsApp, use simpler formatting to avoid issues
            const roundedAmount = Math.round(numAmount);
            
            if (roundedAmount >= 1000000) {
                // Format millions
                const millions = roundedAmount / 1000000;
                if (millions % 1 === 0) {
                    return `Rp${millions}jt`;
                } else {
                    return `Rp${millions.toFixed(1)}jt`;
                }
            } else if (roundedAmount >= 1000) {
                // Format thousands
                const thousands = roundedAmount / 1000;
                if (thousands % 1 === 0) {
                    return `Rp${thousands}rb`;
                } else {
                    return `Rp${thousands.toFixed(0)}rb`;
                }
            } else {
                return `Rp${roundedAmount}`;
            }

        } catch (error) {
            logger.error('Error formatting currency for WhatsApp:', error);
            return 'Rp0';
        }
    }

    /**
     * Format currency with full formatting (for reports and Excel)
     * @param {number|string} amount - The amount to format
     * @returns {string} Fully formatted currency string
     */
    formatCurrencyFull(amount) {
        return this.formatCurrency(amount, true, false);
    }

    /**
     * Format duration in hours to readable format
     * @param {number|string} hours - Duration in hours
     * @returns {string} Formatted duration string
     */
    formatDuration(hours) {
        try {
            const numHours = typeof hours === 'string' ? parseFloat(hours) : hours;
            
            if (isNaN(numHours) || numHours === null || numHours === undefined) {
                return '0 jam';
            }

            if (numHours < 1) {
                const minutes = Math.round(numHours * 60);
                return `${minutes} menit`;
            } else if (numHours % 1 === 0) {
                return `${numHours} jam`;
            } else {
                const wholeHours = Math.floor(numHours);
                const minutes = Math.round((numHours - wholeHours) * 60);
                return `${wholeHours} jam ${minutes} menit`;
            }

        } catch (error) {
            logger.error('Error formatting duration:', error);
            return '0 jam';
        }
    }

    /**
     * Calculate and format average
     * @param {number} total - Total amount
     * @param {number} count - Number of items
     * @param {boolean} asCurrency - Whether to format as currency (default: true)
     * @returns {string} Formatted average
     */
    formatAverage(total, count, asCurrency = true) {
        try {
            if (!count || count === 0) {
                return asCurrency ? 'Rp0' : '0';
            }

            const average = total / count;
            return asCurrency ? this.formatCurrency(average) : this.formatNumber(average);

        } catch (error) {
            logger.error('Error formatting average:', error);
            return asCurrency ? 'Rp0' : '0';
        }
    }

    /**
     * Format growth percentage
     * @param {number} current - Current value
     * @param {number} previous - Previous value
     * @param {number} decimals - Number of decimal places (default: 1)
     * @returns {string} Formatted growth percentage with arrow indicator
     */
    formatGrowth(current, previous, decimals = 1) {
        try {
            if (!previous || previous === 0) {
                return '0%';
            }

            const growth = ((current - previous) / previous) * 100;
            const arrow = growth > 0 ? '↗️' : growth < 0 ? '↘️' : '➡️';
            const sign = growth > 0 ? '+' : '';
            
            return `${arrow} ${sign}${growth.toFixed(decimals)}%`;

        } catch (error) {
            logger.error('Error formatting growth:', error);
            return '0%';
        }
    }

    /**
     * Format number range
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @param {boolean} asCurrency - Whether to format as currency (default: true)
     * @returns {string} Formatted range
     */
    formatRange(min, max, asCurrency = true) {
        try {
            const formatFunc = asCurrency ? this.formatCurrency.bind(this) : this.formatNumber.bind(this);
            
            if (min === max) {
                return formatFunc(min);
            } else {
                return `${formatFunc(min)} - ${formatFunc(max)}`;
            }

        } catch (error) {
            logger.error('Error formatting range:', error);
            return asCurrency ? 'Rp0 - Rp0' : '0 - 0';
        }
    }

    /**
     * Validate if string is a valid currency format
     * @param {string} currencyString - String to validate
     * @returns {boolean} True if valid currency format
     */
    isValidCurrency(currencyString) {
        try {
            if (!currencyString || typeof currencyString !== 'string') {
                return false;
            }

            // Check if it matches Indonesian currency patterns
            const patterns = [
                /^Rp[\d,\.]+$/,           // Rp1,000,000 or Rp1.000.000
                /^[\d,\.]+$/,             // 1,000,000 or 1.000.000
                /^Rp\s*[\d,\.]+$/         // Rp 1,000,000
            ];

            return patterns.some(pattern => pattern.test(currencyString.trim()));

        } catch (error) {
            logger.error('Error validating currency:', error);
            return false;
        }
    }

    /**
     * Get formatting options for different contexts
     * @param {string} context - Context: 'whatsapp', 'excel', 'email', 'report'
     * @returns {object} Formatting options
     */
    getFormattingOptions(context) {
        const options = {
            whatsapp: {
                compact: true,
                showSymbol: true,
                showDecimals: false,
                useShortForm: true
            },
            excel: {
                compact: false,
                showSymbol: true,
                showDecimals: false,
                useShortForm: false
            },
            email: {
                compact: false,
                showSymbol: true,
                showDecimals: false,
                useShortForm: false
            },
            report: {
                compact: false,
                showSymbol: true,
                showDecimals: false,
                useShortForm: false
            }
        };

        return options[context] || options.report;
    }

    /**
     * Format amount based on context
     * @param {number|string} amount - Amount to format
     * @param {string} context - Context for formatting
     * @returns {string} Formatted amount
     */
    formatByContext(amount, context = 'report') {
        const options = this.getFormattingOptions(context);
        
        if (context === 'whatsapp' && options.useShortForm) {
            return this.formatCurrencyForWhatsApp(amount);
        } else {
            return this.formatCurrency(amount, options.showSymbol, options.showDecimals);
        }
    }
}

module.exports = new NumberFormatter();
