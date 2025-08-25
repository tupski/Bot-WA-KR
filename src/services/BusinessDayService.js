import { supabase } from '../config/supabase';

class BusinessDayService {
  /**
   * Get business day range berdasarkan sistem closing harian jam 12 siang
   * Contoh: 9 Agustus 12:00 - 10 Agustus 11:59 = laporan tanggal 9 Agustus
   * @param {Date} date - Tanggal referensi (default: hari ini)
   * @returns {Object} - Start dan end time untuk business day
   */
  getBusinessDayRange(date = new Date()) {
    // Convert to WIB timezone
    const wibTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const currentHour = wibTime.getHours();

    // Tentukan business date berdasarkan jam saat ini
    let businessDate = new Date(wibTime);

    // Jika sekarang sebelum jam 12:00, maka business day adalah hari sebelumnya
    if (currentHour < 12) {
      businessDate.setDate(businessDate.getDate() - 1);
    }

    // Business day start: jam 12:00 WIB pada business date
    const startTime = new Date(businessDate);
    startTime.setHours(12, 0, 0, 0);

    // Business day end: jam 11:59:59 WIB hari berikutnya
    const endTime = new Date(businessDate);
    endTime.setDate(endTime.getDate() + 1);
    endTime.setHours(11, 59, 59, 999);

    // Convert to UTC for database storage
    const startUTC = new Date(startTime.getTime() - (7 * 60 * 60 * 1000)); // WIB is UTC+7
    const endUTC = new Date(endTime.getTime() - (7 * 60 * 60 * 1000));

    return {
      start: startUTC.toISOString(),
      end: endUTC.toISOString(),
      startWIB: startTime.toISOString(),
      endWIB: endTime.toISOString(),
      businessDate: this.formatBusinessDate(businessDate),
      businessDateString: businessDate.toISOString().split('T')[0], // YYYY-MM-DD format
    };
  }

  /**
   * Get business day range untuk tanggal tertentu
   * @param {string} dateString - Tanggal dalam format YYYY-MM-DD
   * @returns {Object} - Start dan end time untuk business day
   */
  getBusinessDayRangeForDate(dateString) {
    const date = new Date(dateString + 'T00:00:00.000Z');
    return this.getBusinessDayRange(date);
  }

  /**
   * Get current business day range
   * @returns {Object} - Start dan end time untuk business day saat ini
   */
  getCurrentBusinessDayRange() {
    return this.getBusinessDayRange();
  }

  /**
   * Get business date untuk waktu tertentu
   * @param {Date} date - Tanggal dan waktu (default: sekarang)
   * @returns {string} - Business date dalam format YYYY-MM-DD
   */
  getBusinessDate(date = new Date()) {
    const wibTime = new Date(date.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const currentHour = wibTime.getHours();

    // Jika sekarang sebelum jam 12:00, maka business date adalah hari sebelumnya
    if (currentHour < 12) {
      wibTime.setDate(wibTime.getDate() - 1);
    }

    return wibTime.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  /**
   * Check apakah sekarang masih dalam business day yang sama
   * @param {string} businessDateString - Business date dalam format YYYY-MM-DD
   * @returns {boolean}
   */
  isCurrentBusinessDay(businessDateString) {
    const currentBusinessDate = this.getBusinessDate();
    return currentBusinessDate === businessDateString;
  }

  /**
   * Get previous business day range
   * @returns {Object} - Start dan end time untuk business day kemarin
   */
  getPreviousBusinessDayRange() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.getBusinessDayRange(yesterday);
  }

  /**
   * Format business date untuk display
   * @param {Date} date - Tanggal
   * @returns {string} - Formatted date string
   */
  formatBusinessDate(date) {
    return date.toLocaleDateString('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Check apakah waktu tertentu masuk dalam business day range
   * @param {string} timestamp - ISO timestamp
   * @param {Object} businessDayRange - Business day range object
   * @returns {boolean}
   */
  isInBusinessDayRange(timestamp, businessDayRange) {
    const time = new Date(timestamp);
    const start = new Date(businessDayRange.start);
    const end = new Date(businessDayRange.end);
    
    return time >= start && time <= end;
  }

  /**
   * Get checkins dalam business day range
   * @param {Object} businessDayRange - Business day range
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getCheckinsInBusinessDay(businessDayRange, filters = {}) {
    try {
      let query = supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            name,
            code
          ),
          units (
            unit_number
          ),
          field_teams (
            full_name
          )
        `)
        .gte('created_at', businessDayRange.start)
        .lte('created_at', businessDayRange.end)
        .order('created_at', { ascending: false });

      // Apply additional filters
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      const { data: checkins, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: checkins || [],
        businessDate: businessDayRange.businessDate,
        range: {
          start: businessDayRange.startWIB,
          end: businessDayRange.endWIB,
        },
      };
    } catch (error) {
      console.error('Error getting checkins in business day:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin business day',
      };
    }
  }

  /**
   * Get business day statistics
   * @param {Object} businessDayRange - Business day range
   * @param {Object} filters - Additional filters
   * @returns {Promise<Object>}
   */
  async getBusinessDayStatistics(businessDayRange, filters = {}) {
    try {
      const checkinsResult = await this.getCheckinsInBusinessDay(businessDayRange, filters);
      
      if (!checkinsResult.success) {
        return checkinsResult;
      }

      const checkins = checkinsResult.data;
      
      // Calculate statistics
      const stats = {
        totalCheckins: checkins.length,
        completedCheckins: checkins.filter(c => c.status === 'completed').length,
        activeCheckins: checkins.filter(c => c.status === 'active').length,
        extendedCheckins: checkins.filter(c => c.status === 'extended').length,
        earlyCheckouts: checkins.filter(c => c.status === 'early_checkout').length,
        
        // Payment method breakdown
        paymentMethods: {
          cash: checkins.filter(c => c.payment_method === 'cash').length,
          transfer: checkins.filter(c => c.payment_method === 'transfer').length,
          qris: checkins.filter(c => c.payment_method === 'qris').length,
        },
        
        // Duration statistics
        totalRevenue: checkins.reduce((sum, c) => sum + (c.payment_amount || 0), 0),
        averageDuration: checkins.length > 0 
          ? checkins.reduce((sum, c) => sum + (c.duration_hours || 0), 0) / checkins.length 
          : 0,
        
        // Apartment breakdown
        apartmentStats: this.calculateApartmentStats(checkins),
        
        // Team breakdown
        teamStats: this.calculateTeamStats(checkins),
        
        // Hourly breakdown
        hourlyStats: this.calculateHourlyStats(checkins),
      };

      return {
        success: true,
        data: stats,
        businessDate: businessDayRange.businessDate,
        range: {
          start: businessDayRange.startWIB,
          end: businessDayRange.endWIB,
        },
      };
    } catch (error) {
      console.error('Error getting business day statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik business day',
      };
    }
  }

  /**
   * Calculate apartment statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateApartmentStats(checkins) {
    const apartmentMap = {};
    
    checkins.forEach(checkin => {
      const apartmentName = checkin.apartments?.name || 'Unknown';
      if (!apartmentMap[apartmentName]) {
        apartmentMap[apartmentName] = {
          name: apartmentName,
          count: 0,
          revenue: 0,
        };
      }
      apartmentMap[apartmentName].count++;
      apartmentMap[apartmentName].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(apartmentMap);
  }

  /**
   * Calculate team statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateTeamStats(checkins) {
    const teamMap = {};
    
    checkins.forEach(checkin => {
      const teamName = checkin.field_teams?.full_name || 'Unknown';
      if (!teamMap[teamName]) {
        teamMap[teamName] = {
          name: teamName,
          count: 0,
          revenue: 0,
        };
      }
      teamMap[teamName].count++;
      teamMap[teamName].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(teamMap);
  }

  /**
   * Calculate hourly statistics
   * @param {Array} checkins - Array of checkins
   * @returns {Object}
   */
  calculateHourlyStats(checkins) {
    const hourlyMap = {};
    
    checkins.forEach(checkin => {
      const hour = new Date(checkin.created_at).getHours();
      if (!hourlyMap[hour]) {
        hourlyMap[hour] = {
          hour: hour,
          count: 0,
          revenue: 0,
        };
      }
      hourlyMap[hour].count++;
      hourlyMap[hour].revenue += checkin.payment_amount || 0;
    });
    
    return Object.values(hourlyMap).sort((a, b) => a.hour - b.hour);
  }

  /**
   * Get business day range untuk beberapa hari terakhir
   * @param {number} days - Jumlah hari
   * @returns {Array} - Array of business day ranges
   */
  getLastBusinessDays(days = 7) {
    const ranges = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      ranges.push(this.getBusinessDayRange(date));
    }
    
    return ranges;
  }
}

export default new BusinessDayService();
