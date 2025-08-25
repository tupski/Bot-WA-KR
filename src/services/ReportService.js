import { supabase } from '../config/supabase';
import BusinessDayService from './BusinessDayService';

/**
 * Service untuk mengelola laporan dan statistik
 * Menangani laporan checkin, statistik apartemen, dan export data
 */
class ReportService {
  /**
   * Get laporan checkin dengan filter
   * @param {Object} filters - Filter options
   */
  async getCheckinReport(filters = {}) {
    try {
      console.log('ReportService: Getting checkin report with filters:', filters);

      let query = supabase
        .from('checkins')
        .select(`
          id,
          created_at,
          checkout_time,
          duration_hours,
          payment_method,
          payment_amount,
          marketing_name,
          status,
          notes,
          units!inner(
            unit_number,
            apartments!inner(
              name,
              code
            )
          ),
          field_teams(
            full_name
          )
        `);

      // Filter by apartment
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      }

      // Filter by status
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Filter by date range
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate + 'T00:00:00.000Z');
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59.999Z');
      }

      // Filter by marketing
      if (filters.marketingName) {
        query = query.ilike('marketing_name', `%${filters.marketingName}%`);
      }

      // Order by created_at desc and apply limit
      query = query.order('created_at', { ascending: false });

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data: checkins, error } = await query;

      if (error) {
        throw error;
      }

      // Transform data to match expected format
      const transformedCheckins = checkins?.map(checkin => ({
        ...checkin,
        apartment_name: checkin.units?.apartments?.name,
        apartment_code: checkin.units?.apartments?.code,
        unit_number: checkin.units?.unit_number,
        team_name: checkin.field_teams?.full_name,
      })) || [];

      console.log(`ReportService: Found ${transformedCheckins.length} checkins`);
      return {
        success: true,
        data: transformedCheckins,
      };
    } catch (error) {
      console.error('ReportService: Error getting checkin report:', error);
      return {
        success: false,
        message: 'Gagal mengambil laporan checkin: ' + error.message,
      };
    }
  }

  /**
   * Get statistik checkin per apartemen
   * @param {Object} filters - Filter options
   */
  async getApartmentStatistics(filters = {}) {
    try {
      console.log('ReportService: Getting apartment statistics with filters:', filters);

      // Get all apartments first dengan error handling
      let apartments = [];
      try {
        const { data: apartmentData, error: apartmentError } = await supabase
          .from('apartments')
          .select('id, name, code')
          .eq('status', 'active')
          .order('name');

        if (apartmentError) {
          if (apartmentError.code === 'PGRST116') {
            console.log('ReportService: Apartments table not found, returning empty statistics');
            return { success: true, data: [] };
          }
          throw apartmentError;
        }

        apartments = apartmentData || [];
      } catch (apartmentError) {
        console.error('ReportService: Error loading apartments:', apartmentError);
        return { success: true, data: [] };
      }

      if (apartments.length === 0) {
        console.log('ReportService: No apartments found');
        return { success: true, data: [] };
      }

      const statistics = [];

      // For each apartment, get checkin statistics and total units
      for (const apartment of apartments) {
        try {
          // Get total units for this apartment dengan error handling
          let totalUnits = 0;
          try {
            const { count: unitsCount, error: unitsError } = await supabase
              .from('units')
              .select('*', { count: 'exact', head: true })
              .eq('apartment_id', apartment.id);

            if (unitsError && unitsError.code !== 'PGRST116') {
              console.error('Error getting units count for apartment:', apartment.id, unitsError);
            } else {
              totalUnits = unitsCount || 0;
            }
          } catch (unitsError) {
            console.error('Error getting units for apartment:', apartment.id, unitsError);
            totalUnits = 0;
          }

          // Get checkin statistics dengan error handling
          let checkins = [];
          try {
            let checkinQuery = supabase
              .from('checkins')
              .select('id, status, payment_amount, duration_hours, created_at')
              .eq('apartment_id', apartment.id);

            // Apply date filters dengan validasi
            if (filters.startDate) {
              try {
                const startDate = new Date(filters.startDate).toISOString();
                checkinQuery = checkinQuery.gte('created_at', startDate);
              } catch (dateError) {
                console.warn('Invalid startDate format:', filters.startDate);
              }
            }
            if (filters.endDate) {
              try {
                const endDate = new Date(filters.endDate).toISOString();
                checkinQuery = checkinQuery.lte('created_at', endDate);
              } catch (dateError) {
                console.warn('Invalid endDate format:', filters.endDate);
              }
            }

            const { data: checkinData, error: checkinError } = await checkinQuery;

            if (checkinError) {
              if (checkinError.code === 'PGRST116') {
                console.log('Checkins table not found for apartment:', apartment.id);
              } else {
                console.error('Error getting checkins for apartment:', apartment.id, checkinError);
              }
              checkins = [];
            } else {
              checkins = checkinData || [];
            }
          } catch (checkinError) {
            console.error('Error querying checkins for apartment:', apartment.id, checkinError);
            checkins = [];
          }

          // Calculate statistics dengan safe operations
          const totalCheckins = checkins.length;
          const activeCheckins = checkins.filter(c => c?.status === 'active').length;
          const extendedCheckins = checkins.filter(c => c?.status === 'extended').length;
          const completedCheckins = checkins.filter(c => c?.status === 'completed').length;
          const earlyCheckouts = checkins.filter(c => c?.status === 'early_checkout').length;

          const totalRevenue = checkins.reduce((sum, c) => {
            const amount = parseFloat(c?.payment_amount) || 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);

          const avgDuration = totalCheckins > 0
            ? checkins.reduce((sum, c) => {
                const duration = parseFloat(c?.duration_hours) || 0;
                return sum + (isNaN(duration) ? 0 : duration);
              }, 0) / totalCheckins
            : 0;

          statistics.push({
            id: apartment.id,
            name: apartment.name || 'Unknown',
            code: apartment.code || 'N/A',
            total_units: Math.max(0, totalUnits),
            total_checkins: Math.max(0, totalCheckins),
            active_checkins: Math.max(0, activeCheckins),
            extended_checkins: Math.max(0, extendedCheckins),
            completed_checkins: Math.max(0, completedCheckins),
            early_checkouts: Math.max(0, earlyCheckouts),
            total_revenue: Math.max(0, totalRevenue),
            avg_duration: Math.max(0, avgDuration),
          });
        } catch (apartmentProcessError) {
          console.error('Error processing apartment:', apartment.id, apartmentProcessError);
          // Continue with next apartment
          continue;
        }
      }

      // Sort by total checkins descending
      statistics.sort((a, b) => (b.total_checkins || 0) - (a.total_checkins || 0));

      console.log(`ReportService: Found statistics for ${statistics.length} apartments`);
      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('ReportService: Critical error in getApartmentStatistics:', error);
      return {
        success: true, // Return success with empty data instead of failing
        data: [],
        message: 'Data statistik apartemen tidak tersedia karena terjadi kesalahan',
      };
    }
  }

  /**
   * Get top marketing berdasarkan jumlah checkin
   * @param {Object} filters - Filter options
   */
  async getTopMarketing(filters = {}) {
    try {
      console.log('ReportService: Getting top marketing with filters:', filters);

      // Build query dengan error handling
      let query = supabase
        .from('checkins')
        .select('marketing_name, payment_amount, apartment_id, created_at')
        .not('marketing_name', 'is', null)
        .neq('marketing_name', '');

      // Filter by date range dengan validasi
      if (filters.startDate) {
        try {
          const startDate = new Date(filters.startDate).toISOString();
          query = query.gte('created_at', startDate);
        } catch (dateError) {
          console.warn('ReportService: Invalid startDate format:', filters.startDate);
        }
      }

      if (filters.endDate) {
        try {
          const endDate = new Date(filters.endDate).toISOString();
          query = query.lte('created_at', endDate);
        } catch (dateError) {
          console.warn('ReportService: Invalid endDate format:', filters.endDate);
        }
      }

      // Filter by apartment (support both single and multi-select) dengan validasi
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0) {
        query = query.in('apartment_id', filters.apartmentIds);
      }

      let checkins = [];
      try {
        const { data: checkinData, error } = await query;

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('ReportService: Checkins table not found, returning empty marketing data');
            return { success: true, data: [] };
          }
          throw error;
        }

        checkins = checkinData || [];
      } catch (queryError) {
        console.error('ReportService: Error querying checkins for marketing:', queryError);
        return { success: true, data: [] };
      }

      if (checkins.length === 0) {
        console.log('ReportService: No checkins found for marketing statistics');
        return { success: true, data: [] };
      }

      // Group by marketing name and calculate statistics dengan safe operations
      const marketingStats = {};

      checkins.forEach(checkin => {
        try {
          const name = checkin?.marketing_name?.trim();
          if (!name) return; // Skip empty names

          if (!marketingStats[name]) {
            marketingStats[name] = {
              marketing_name: name,
              total_checkins: 0,
              total_revenue: 0,
              apartments_served: new Set(),
            };
          }

          marketingStats[name].total_checkins++;

          const amount = parseFloat(checkin?.payment_amount) || 0;
          marketingStats[name].total_revenue += isNaN(amount) ? 0 : amount;

          if (checkin?.apartment_id) {
            marketingStats[name].apartments_served.add(checkin.apartment_id);
          }
        } catch (processingError) {
          console.error('ReportService: Error processing checkin for marketing:', processingError);
          // Continue with next checkin
        }
      });

      // Convert to array and transform dengan safe operations
      const marketing = Object.values(marketingStats).map(stat => ({
        marketing_name: stat.marketing_name || 'Unknown',
        total_checkins: Math.max(0, stat.total_checkins || 0),
        total_revenue: Math.max(0, stat.total_revenue || 0),
        apartments_served: Math.max(0, stat.apartments_served?.size || 0),
      }));

      // Sort by total checkins descending
      marketing.sort((a, b) => (b.total_checkins || 0) - (a.total_checkins || 0));

      // Apply limit if specified dengan validasi
      const limit = parseInt(filters.limit) || 0;
      const limitedMarketing = (limit > 0 && limit < marketing.length)
        ? marketing.slice(0, limit)
        : marketing;

      console.log(`ReportService: Found ${limitedMarketing.length} marketing entries`);
      return {
        success: true,
        data: limitedMarketing,
      };
    } catch (error) {
      console.error('ReportService: Critical error in getTopMarketing:', error);
      return {
        success: true, // Return success with empty data instead of failing
        data: [],
        message: 'Data top marketing tidak tersedia karena terjadi kesalahan',
      };
    }
  }





  /**
   * Get summary statistik untuk dashboard
   * @param {Object} filters - Filter options
   */
  async getSummaryStatistics(filters = {}) {
    try {
      console.log('ReportService: Getting summary statistics with filters:', filters);

      // Fallback values untuk error handling
      const defaultStats = {
        totalCheckins: 0,
        todayCheckins: 0,
        activeCheckins: 0,
        totalRevenue: 0,
      };

      // Build date filter for Supabase dengan validasi
      let dateFilter = null;
      if (filters.startDate) {
        try {
          dateFilter = new Date(filters.startDate).toISOString();
        } catch (dateError) {
          console.warn('ReportService: Invalid startDate format:', filters.startDate);
          dateFilter = null;
        }
      }

      let endDateFilter = null;
      if (filters.endDate) {
        try {
          endDateFilter = new Date(filters.endDate).toISOString();
        } catch (dateError) {
          console.warn('ReportService: Invalid endDate format:', filters.endDate);
          endDateFilter = null;
        }
      }

      // Get total checkins dengan error handling
      let totalQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      if (dateFilter) {
        totalQuery = totalQuery.gte('created_at', dateFilter);
      }
      if (endDateFilter) {
        totalQuery = totalQuery.lte('created_at', endDateFilter);
      }
      if (filters.apartmentId) {
        totalQuery = totalQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0) {
        totalQuery = totalQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get today's checkins dengan error handling
      const today = new Date().toISOString().split('T')[0];
      let todayQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00.000Z')
        .lte('created_at', today + 'T23:59:59.999Z');

      if (filters.apartmentId) {
        todayQuery = todayQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0) {
        todayQuery = todayQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get active checkins dengan error handling
      let activeQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'extended']);

      if (filters.apartmentId) {
        activeQuery = activeQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0) {
        activeQuery = activeQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get total revenue dengan error handling
      let revenueQuery = supabase
        .from('checkins')
        .select('payment_amount')
        .not('payment_amount', 'is', null);

      if (dateFilter) {
        revenueQuery = revenueQuery.gte('created_at', dateFilter);
      }
      if (endDateFilter) {
        revenueQuery = revenueQuery.lte('created_at', endDateFilter);
      }
      if (filters.apartmentId) {
        revenueQuery = revenueQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0) {
        revenueQuery = revenueQuery.in('apartment_id', filters.apartmentIds);
      }

      // Execute queries with individual error handling dan timeout
      console.log('ReportService: Executing summary statistics queries...');

      let totalResult = { count: 0 };
      let todayResult = { count: 0 };
      let activeResult = { count: 0 };
      let revenueResult = { data: [] };

      // Execute queries dengan Promise.allSettled untuk menghindari crash
      const queryPromises = [
        totalQuery.then(result => ({ type: 'total', result })).catch(error => ({ type: 'total', error })),
        todayQuery.then(result => ({ type: 'today', result })).catch(error => ({ type: 'today', error })),
        activeQuery.then(result => ({ type: 'active', result })).catch(error => ({ type: 'active', error })),
        revenueQuery.then(result => ({ type: 'revenue', result })).catch(error => ({ type: 'revenue', error }))
      ];

      try {
        const results = await Promise.allSettled(queryPromises);

        results.forEach((promiseResult, index) => {
          if (promiseResult.status === 'fulfilled' && promiseResult.value) {
            const { type, result, error } = promiseResult.value;

            if (error) {
              console.error(`ReportService: ${type} query error:`, error);
              // Handle specific error codes
              if (error.code === 'PGRST116') {
                console.log(`ReportService: Table not found for ${type} query, using default value`);
              }
            } else if (result) {
              switch (type) {
                case 'total':
                  totalResult = result;
                  console.log('ReportService: Total query result:', result.count);
                  break;
                case 'today':
                  todayResult = result;
                  console.log('ReportService: Today query result:', result.count);
                  break;
                case 'active':
                  activeResult = result;
                  console.log('ReportService: Active query result:', result.count);
                  break;
                case 'revenue':
                  revenueResult = result;
                  console.log('ReportService: Revenue query result:', result.data?.length || 0, 'records');
                  break;
              }
            }
          } else {
            console.error(`ReportService: Promise ${index} rejected:`, promiseResult.reason);
          }
        });
      } catch (promiseError) {
        console.error('ReportService: Error executing queries:', promiseError);
        // Continue with default values
      }

      // Calculate total revenue safely dengan additional validation
      let totalRevenue = 0;
      try {
        if (revenueResult.data && Array.isArray(revenueResult.data)) {
          totalRevenue = revenueResult.data.reduce((sum, item) => {
            const amount = parseFloat(item?.payment_amount) || 0;
            return sum + (isNaN(amount) ? 0 : amount);
          }, 0);
        }
      } catch (revenueCalcError) {
        console.error('ReportService: Error calculating revenue:', revenueCalcError);
        totalRevenue = 0;
      }

      const finalStats = {
        totalCheckins: Math.max(0, totalResult.count || 0),
        todayCheckins: Math.max(0, todayResult.count || 0),
        activeCheckins: Math.max(0, activeResult.count || 0),
        totalRevenue: Math.max(0, totalRevenue),
      };

      console.log('ReportService: Summary statistics calculated successfully:', finalStats);

      return {
        success: true,
        data: finalStats,
      };
    } catch (error) {
      console.error('ReportService: Critical error in getSummaryStatistics:', error);
      return {
        success: true, // Return success with default values instead of failing
        data: defaultStats,
        message: 'Data statistik menggunakan nilai default karena terjadi kesalahan',
      };
    }
  }

  /**
   * Get top marketing report berdasarkan jumlah checkin
   * @param {string} period - Periode laporan (week, month, year, all)
   */
  async getTopMarketingReport(period = 'month') {
    try {
      let dateFilter = '';
      const now = new Date();

      switch (period) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = weekAgo.toISOString();
          break;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = monthAgo.toISOString();
          break;
        case 'year':
          const yearAgo = new Date(now.getFullYear(), 0, 1);
          dateFilter = yearAgo.toISOString();
          break;
        case 'all':
        default:
          dateFilter = null;
          break;
      }

      let query = supabase
        .from('checkins')
        .select(`
          marketing_name,
          payment_amount,
          created_at
        `)
        .not('marketing_name', 'is', null)
        .neq('marketing_name', '');

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: checkins, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      // Group by marketing name and calculate stats
      const marketingStats = {};

      checkins?.forEach(checkin => {
        const marketingName = checkin.marketing_name;

        if (!marketingStats[marketingName]) {
          marketingStats[marketingName] = {
            marketing_name: marketingName,
            total_checkins: 0,
            total_revenue: 0,
            last_checkin: null,
          };
        }

        marketingStats[marketingName].total_checkins += 1;
        marketingStats[marketingName].total_revenue += checkin.payment_amount || 0;

        // Update last checkin date
        const checkinDate = new Date(checkin.created_at);
        if (!marketingStats[marketingName].last_checkin ||
            checkinDate > new Date(marketingStats[marketingName].last_checkin)) {
          marketingStats[marketingName].last_checkin = checkin.created_at;
        }
      });

      // Convert to array and calculate average revenue
      const marketingArray = Object.values(marketingStats).map(marketing => ({
        ...marketing,
        avg_revenue: marketing.total_checkins > 0
          ? Math.round(marketing.total_revenue / marketing.total_checkins)
          : 0,
      }));

      // Sort by total checkins (descending), then by total revenue
      marketingArray.sort((a, b) => {
        if (b.total_checkins !== a.total_checkins) {
          return b.total_checkins - a.total_checkins;
        }
        return b.total_revenue - a.total_revenue;
      });

      return {
        success: true,
        data: marketingArray,
      };
    } catch (error) {
      console.error('Error getting top marketing report:', error);
      return {
        success: false,
        message: 'Gagal mengambil laporan top marketing',
      };
    }
  }

  /**
   * Get business day report (12:00 WIB - 11:59 WIB hari berikutnya)
   * @param {string} date - Tanggal dalam format YYYY-MM-DD (optional, default: hari ini)
   * @param {Object} filters - Additional filters
   */
  async getBusinessDayReport(date = null, filters = {}) {
    try {
      console.log('ReportService: Getting business day report for date:', date);

      // Get business day range
      const businessDayRange = date
        ? BusinessDayService.getBusinessDayRangeForDate(date)
        : BusinessDayService.getCurrentBusinessDayRange();

      // Get checkins and statistics
      const [checkinsResult, statsResult] = await Promise.all([
        BusinessDayService.getCheckinsInBusinessDay(businessDayRange, filters),
        BusinessDayService.getBusinessDayStatistics(businessDayRange, filters)
      ]);

      if (!checkinsResult.success || !statsResult.success) {
        return {
          success: false,
          message: 'Gagal mengambil data business day report',
        };
      }

      return {
        success: true,
        data: {
          checkins: checkinsResult.data,
          statistics: statsResult.data,
          businessDate: businessDayRange.businessDate,
          range: {
            start: businessDayRange.startWIB,
            end: businessDayRange.endWIB,
          },
        },
      };
    } catch (error) {
      console.error('Error getting business day report:', error);
      return {
        success: false,
        message: 'Gagal mengambil business day report',
      };
    }
  }

  /**
   * Get business day summary untuk beberapa hari terakhir
   * @param {number} days - Jumlah hari (default: 7)
   * @param {Object} filters - Additional filters
   */
  async getBusinessDaySummary(days = 7, filters = {}) {
    try {
      console.log('ReportService: Getting business day summary for', days, 'days');

      const businessDayRanges = BusinessDayService.getLastBusinessDays(days);
      const summaryPromises = businessDayRanges.map(range =>
        BusinessDayService.getBusinessDayStatistics(range, filters)
      );

      const results = await Promise.all(summaryPromises);

      const summary = results
        .filter(result => result.success)
        .map(result => ({
          businessDate: result.businessDate,
          range: result.range,
          statistics: result.data,
        }));

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error('Error getting business day summary:', error);
      return {
        success: false,
        message: 'Gagal mengambil business day summary',
      };
    }
  }

  /**
   * Get daily statistics dengan business day logic
   * @param {Object} filters - Filter options
   */
  async getDailyStatistics(filters = {}) {
    try {
      console.log('ReportService: Getting daily statistics with filters:', filters);

      // Default values untuk error handling
      const defaultDailyStats = {
        activeCheckins: 0,
        totalCheckins: 0,
        cashTransactions: 0,
        transferTransactions: 0,
      };

      // Gunakan business day range jika tidak ada filter tanggal dengan error handling
      let dateFilter = {};
      try {
        if (filters.startDate && filters.endDate) {
          const startDate = new Date(filters.startDate).toISOString();
          const endDate = new Date(filters.endDate).toISOString();
          dateFilter = {
            created_at: {
              gte: startDate,
              lte: endDate,
            }
          };
        } else {
          const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
          dateFilter = {
            created_at: {
              gte: businessDayRange.start,
              lte: businessDayRange.end,
            }
          };
        }
      } catch (dateError) {
        console.error('ReportService: Error setting date filter:', dateError);
        // Fallback to today
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        dateFilter = {
          created_at: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };
      }

      // Build queries dengan error handling
      const apartmentFilter = filters.apartmentIds && Array.isArray(filters.apartmentIds) && filters.apartmentIds.length > 0
        ? filters.apartmentIds
        : null;

      // Query untuk active checkins (status = 'active')
      let activeQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (apartmentFilter) {
        activeQuery = activeQuery.in('apartment_id', apartmentFilter);
      }

      // Query untuk total checkins
      let totalQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (apartmentFilter) {
        totalQuery = totalQuery.in('apartment_id', apartmentFilter);
      }

      // Query untuk cash transactions
      let cashQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', 'cash')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (apartmentFilter) {
        cashQuery = cashQuery.in('apartment_id', apartmentFilter);
      }

      // Query untuk transfer transactions
      let transferQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .eq('payment_method', 'transfer')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (apartmentFilter) {
        transferQuery = transferQuery.in('apartment_id', apartmentFilter);
      }

      // Execute all queries dengan Promise.allSettled untuk menghindari crash
      const queryPromises = [
        activeQuery.then(result => ({ type: 'active', result })).catch(error => ({ type: 'active', error })),
        totalQuery.then(result => ({ type: 'total', result })).catch(error => ({ type: 'total', error })),
        cashQuery.then(result => ({ type: 'cash', result })).catch(error => ({ type: 'cash', error })),
        transferQuery.then(result => ({ type: 'transfer', result })).catch(error => ({ type: 'transfer', error }))
      ];

      let activeCount = 0, totalCount = 0, cashCount = 0, transferCount = 0;

      try {
        const results = await Promise.allSettled(queryPromises);

        results.forEach((promiseResult, index) => {
          if (promiseResult.status === 'fulfilled' && promiseResult.value) {
            const { type, result, error } = promiseResult.value;

            if (error) {
              console.error(`ReportService: ${type} query error:`, error);
              if (error.code === 'PGRST116') {
                console.log(`ReportService: Table not found for ${type} query, using default value`);
              }
            } else if (result) {
              const count = result.count || 0;
              switch (type) {
                case 'active':
                  activeCount = count;
                  console.log('ReportService: Active query result:', count);
                  break;
                case 'total':
                  totalCount = count;
                  console.log('ReportService: Total query result:', count);
                  break;
                case 'cash':
                  cashCount = count;
                  console.log('ReportService: Cash query result:', count);
                  break;
                case 'transfer':
                  transferCount = count;
                  console.log('ReportService: Transfer query result:', count);
                  break;
              }
            }
          } else {
            console.error(`ReportService: Promise ${index} rejected:`, promiseResult.reason);
          }
        });
      } catch (promiseError) {
        console.error('ReportService: Error executing daily statistics queries:', promiseError);
        // Continue with default values
      }

      const dailyStats = {
        activeCheckins: Math.max(0, activeCount),
        totalCheckins: Math.max(0, totalCount),
        cashTransactions: Math.max(0, cashCount),
        transferTransactions: Math.max(0, transferCount),
      };

      console.log('ReportService: Daily statistics result:', dailyStats);

      return {
        success: true,
        data: dailyStats,
      };
    } catch (error) {
      console.error('ReportService: Critical error in getDailyStatistics:', error);
      return {
        success: true, // Return success with default values instead of failing
        data: defaultDailyStats,
        message: 'Data statistik harian menggunakan nilai default karena terjadi kesalahan',
      };
    }
  }
}

export default new ReportService();
