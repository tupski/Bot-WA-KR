/**
 * Utility functions untuk handling waktu dan timezone
 * Menggunakan timezone Asia/Jakarta (WIB) sebagai standar
 */

/**
 * Get current time in WIB timezone
 * @returns {Date} - Current date in WIB
 */
export const getCurrentWIBTime = () => {
  const now = new Date();
  // Convert to WIB (UTC+7)
  const wibOffset = 7 * 60; // 7 hours in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wibTime = new Date(utc + (wibOffset * 60000));
  return wibTime;
};

/**
 * Convert any date to WIB timezone
 * @param {Date|string} date - Date to convert
 * @returns {Date} - Date in WIB timezone
 */
export const convertToWIB = (date) => {
  try {
    const inputDate = new Date(date);
    if (isNaN(inputDate.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Convert to WIB (UTC+7)
    const wibOffset = 7 * 60; // 7 hours in minutes
    const utc = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
    const wibTime = new Date(utc + (wibOffset * 60000));
    return wibTime;
  } catch (error) {
    console.error('TimeUtils: Error converting to WIB:', error);
    return new Date(); // Return current time as fallback
  }
};

/**
 * Calculate checkout time based on duration
 * @param {number} durationHours - Duration in hours
 * @param {Date} startTime - Start time (optional, defaults to current WIB time)
 * @returns {Date} - Checkout time in WIB
 */
export const calculateCheckoutTime = (durationHours, startTime = null) => {
  try {
    const duration = parseInt(durationHours);
    if (isNaN(duration) || duration <= 0) {
      throw new Error('Invalid duration');
    }

    const baseTime = startTime ? convertToWIB(startTime) : getCurrentWIBTime();
    const checkoutTime = new Date(baseTime.getTime() + (duration * 60 * 60 * 1000));
    
    return checkoutTime;
  } catch (error) {
    console.error('TimeUtils: Error calculating checkout time:', error);
    return getCurrentWIBTime(); // Return current time as fallback
  }
};

/**
 * Format date to Indonesian locale string
 * @param {Date|string} date - Date to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDateTimeWIB = (date, options = {}) => {
  try {
    const wibDate = convertToWIB(date);
    
    const defaultOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
      ...options
    };

    return wibDate.toLocaleString('id-ID', defaultOptions);
  } catch (error) {
    console.error('TimeUtils: Error formatting date:', error);
    return '-';
  }
};

/**
 * Format date to ISO string in WIB timezone
 * @param {Date|string} date - Date to format
 * @returns {string} - ISO string in WIB timezone
 */
export const formatToISOWIB = (date) => {
  try {
    const wibDate = convertToWIB(date);
    return wibDate.toISOString();
  } catch (error) {
    console.error('TimeUtils: Error formatting to ISO WIB:', error);
    return new Date().toISOString(); // Return current time as fallback
  }
};

/**
 * Calculate remaining time until checkout
 * @param {Date|string} checkoutTime - Checkout time
 * @returns {Object} - Object with remaining time info
 */
export const calculateRemainingTime = (checkoutTime) => {
  try {
    if (!checkoutTime) {
      return { isOvertime: true, text: 'Tidak diketahui', color: '#FF6B6B' };
    }

    const checkout = convertToWIB(checkoutTime);
    const now = getCurrentWIBTime();

    if (isNaN(checkout.getTime())) {
      return { isOvertime: true, text: 'Tidak valid', color: '#FF6B6B' };
    }

    const diffMs = checkout.getTime() - now.getTime();
    const isOvertime = diffMs <= 0;

    if (isOvertime) {
      const overtimeMs = Math.abs(diffMs);
      const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60));
      const overtimeMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return {
        isOvertime: true,
        text: `Lewat ${overtimeHours}j ${overtimeMinutes}m`,
        color: '#FF6B6B'
      };
    }

    const remainingHours = Math.floor(diffMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let color = '#4CAF50'; // Green
    if (remainingHours < 1) {
      color = '#FF9800'; // Orange
    } else if (remainingHours < 2) {
      color = '#FFC107'; // Yellow
    }

    return {
      isOvertime: false,
      text: `${remainingHours}j ${remainingMinutes}m`,
      color
    };
  } catch (error) {
    console.error('TimeUtils: Error calculating remaining time:', error);
    return { isOvertime: true, text: 'Error', color: '#FF6B6B' };
  }
};

/**
 * Get business day range (12:00 WIB to 11:59 WIB next day)
 * @param {Date|string} date - Base date (optional, defaults to current date)
 * @returns {Object} - Object with start and end times
 */
export const getBusinessDayRange = (date = null) => {
  try {
    const baseDate = date ? convertToWIB(date) : getCurrentWIBTime();
    
    // Business day starts at 12:00 WIB
    const startTime = new Date(baseDate);
    startTime.setHours(12, 0, 0, 0);
    
    // Business day ends at 11:59 WIB next day
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(11, 59, 59, 999);
    
    return {
      start: startTime,
      end: endTime,
      startISO: startTime.toISOString(),
      endISO: endTime.toISOString()
    };
  } catch (error) {
    console.error('TimeUtils: Error getting business day range:', error);
    const now = getCurrentWIBTime();
    return {
      start: now,
      end: now,
      startISO: now.toISOString(),
      endISO: now.toISOString()
    };
  }
};

/**
 * Check if current time is within business hours
 * @returns {boolean} - True if within business hours
 */
export const isWithinBusinessHours = () => {
  try {
    const now = getCurrentWIBTime();
    const currentHour = now.getHours();
    
    // Business hours: 12:00 WIB to 23:59 WIB
    return currentHour >= 12 && currentHour <= 23;
  } catch (error) {
    console.error('TimeUtils: Error checking business hours:', error);
    return true; // Default to true as fallback
  }
};

export default {
  getCurrentWIBTime,
  convertToWIB,
  calculateCheckoutTime,
  formatDateTimeWIB,
  formatToISOWIB,
  calculateRemainingTime,
  getBusinessDayRange,
  isWithinBusinessHours
};
