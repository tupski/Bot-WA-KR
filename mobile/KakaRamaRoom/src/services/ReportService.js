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

      // Get all apartments first
      const { data: apartments, error: apartmentError } = await supabase
        .from('apartments')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');

      if (apartmentError) {
        throw apartmentError;
      }

      const statistics = [];

      // For each apartment, get checkin statistics and total units
      for (const apartment of apartments || []) {
        // Get total units for this apartment
        const { data: units, error: unitsError } = await supabase
          .from('units')
          .select('id', { count: 'exact' })
          .eq('apartment_id', apartment.id);

        const totalUnits = units?.length || 0;

        let checkinQuery = supabase
          .from('checkins')
          .select('id, status, payment_amount, duration_hours, created_at')
          .eq('apartment_id', apartment.id);

        // Apply date filters
        if (filters.startDate) {
          checkinQuery = checkinQuery.gte('created_at', filters.startDate + 'T00:00:00.000Z');
        }
        if (filters.endDate) {
          checkinQuery = checkinQuery.lte('created_at', filters.endDate + 'T23:59:59.999Z');
        }

        const { data: checkins, error: checkinError } = await checkinQuery;

        if (checkinError) {
          console.error('Error getting checkins for apartment:', apartment.id, checkinError);
          continue;
        }

        // Calculate statistics
        const totalCheckins = checkins?.length || 0;
        const activeCheckins = checkins?.filter(c => c.status === 'active').length || 0;
        const extendedCheckins = checkins?.filter(c => c.status === 'extended').length || 0;
        const completedCheckins = checkins?.filter(c => c.status === 'completed').length || 0;
        const earlyCheckouts = checkins?.filter(c => c.status === 'early_checkout').length || 0;
        const totalRevenue = checkins?.reduce((sum, c) => sum + (c.payment_amount || 0), 0) || 0;
        const avgDuration = totalCheckins > 0
          ? checkins.reduce((sum, c) => sum + (c.duration_hours || 0), 0) / totalCheckins
          : 0;

        statistics.push({
          id: apartment.id,
          name: apartment.name,
          code: apartment.code,
          total_units: totalUnits,
          total_checkins: totalCheckins,
          active_checkins: activeCheckins,
          extended_checkins: extendedCheckins,
          completed_checkins: completedCheckins,
          early_checkouts: earlyCheckouts,
          total_revenue: totalRevenue,
          avg_duration: avgDuration,
        });
      }

      // Sort by total checkins descending
      statistics.sort((a, b) => b.total_checkins - a.total_checkins);

      console.log(`ReportService: Found statistics for ${statistics.length} apartments`);
      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('ReportService: Error getting apartment statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik apartemen: ' + error.message,
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

      let query = supabase
        .from('checkins')
        .select('marketing_name, payment_amount, apartment_id, created_at')
        .not('marketing_name', 'is', null)
        .neq('marketing_name', '');

      // Filter by date range
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate + 'T00:00:00.000Z');
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59.999Z');
      }

      // Filter by apartment (support both single and multi-select)
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        query = query.in('apartment_id', filters.apartmentIds);
      }

      const { data: checkins, error } = await query;

      if (error) {
        throw error;
      }

      // Group by marketing name and calculate statistics
      const marketingStats = {};

      checkins?.forEach(checkin => {
        const name = checkin.marketing_name;
        if (!marketingStats[name]) {
          marketingStats[name] = {
            marketing_name: name,
            total_checkins: 0,
            total_revenue: 0,
            apartments_served: new Set(),
          };
        }

        marketingStats[name].total_checkins++;
        marketingStats[name].total_revenue += checkin.payment_amount || 0;
        marketingStats[name].apartments_served.add(checkin.apartment_id);
      });

      // Convert to array and transform
      const marketing = Object.values(marketingStats).map(stat => ({
        marketing_name: stat.marketing_name,
        total_checkins: stat.total_checkins,
        total_revenue: stat.total_revenue,
        apartments_served: stat.apartments_served.size,
      }));

      // Sort by total checkins descending
      marketing.sort((a, b) => b.total_checkins - a.total_checkins);

      // Apply limit if specified
      const limitedMarketing = filters.limit ? marketing.slice(0, filters.limit) : marketing;

      console.log(`ReportService: Found ${limitedMarketing.length} marketing entries`);
      return {
        success: true,
        data: limitedMarketing,
      };
    } catch (error) {
      console.error('ReportService: Error getting top marketing:', error);
      return {
        success: false,
        message: 'Gagal mengambil data top marketing: ' + error.message,
      };
    }
  }

  /**
   * Get summary statistics untuk dashboard
   */
  async getSummaryStatistics() {
    try {
      console.log('ReportService: Getting summary statistics');

      const today = new Date().toISOString().split('T')[0];

      // Get total checkins
      const { count: totalCheckins, error: totalError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        console.error('Error getting total checkins:', totalError);
      }

      // Get today's checkins
      const { count: todayCheckins, error: todayError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today + 'T00:00:00.000Z')
        .lte('created_at', today + 'T23:59:59.999Z');

      if (todayError) {
        console.error('Error getting today checkins:', todayError);
      }

      // Get active checkins
      const { count: activeCheckins, error: activeError } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'extended']);

      if (activeError) {
        console.error('Error getting active checkins:', activeError);
      }

      // Get total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('checkins')
        .select('payment_amount');

      if (revenueError) {
        console.error('Error getting revenue:', revenueError);
      }

      const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.payment_amount || 0), 0) || 0;

      const summary = {
        totalCheckins: totalCheckins || 0,
        todayCheckins: todayCheckins || 0,
        activeCheckins: activeCheckins || 0,
        totalRevenue: totalRevenue,
      };

      console.log('ReportService: Summary statistics:', summary);
      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error('ReportService: Error getting summary statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik ringkasan: ' + error.message,
      };
    }
  }

  /**
   * Get statistik harian untuk periode tertentu
   * @param {Object} filters - Filter options
   */
  async getDailyStatistics(filters = {}) {
    try {
      console.log('ReportService: Getting daily statistics with filters:', filters);

      // Build date filter
      let dateFilter = null;
      if (filters.startDate) {
        dateFilter = filters.startDate;
      }

      let query = supabase
        .from('checkins')
        .select(`
          created_at,
          payment_amount,
          status
        `);

      // Apply filters
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      }

      const { data: checkins, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      // Group by date and calculate statistics
      const dailyStats = {};

      checkins?.forEach(checkin => {
        const date = checkin.created_at.split('T')[0];

        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            total_checkins: 0,
            total_revenue: 0,
            completed_checkins: 0,
            early_checkouts: 0,
          };
        }

        dailyStats[date].total_checkins++;
        dailyStats[date].total_revenue += checkin.payment_amount || 0;

        if (checkin.status === 'completed') {
          dailyStats[date].completed_checkins++;
        } else if (checkin.status === 'early_checkout') {
          dailyStats[date].early_checkouts++;
        }
      });

      const statistics = Object.values(dailyStats).sort((a, b) => b.date.localeCompare(a.date));

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('Error getting daily statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik harian',
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

      // Build date filter for Supabase
      let dateFilter = null;
      if (filters.startDate) {
        dateFilter = filters.startDate;
      }

      // Get total checkins
      let totalQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      if (dateFilter) {
        totalQuery = totalQuery.gte('created_at', dateFilter);
      }
      if (filters.endDate) {
        totalQuery = totalQuery.lte('created_at', filters.endDate);
      }
      if (filters.apartmentId) {
        totalQuery = totalQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        totalQuery = totalQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get today's checkins
      const today = new Date().toISOString().split('T')[0];
      let todayQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      if (filters.apartmentId) {
        todayQuery = todayQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        todayQuery = todayQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get active checkins
      let activeQuery = supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'extended']);

      if (filters.apartmentId) {
        activeQuery = activeQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        activeQuery = activeQuery.in('apartment_id', filters.apartmentIds);
      }

      // Get total revenue
      let revenueQuery = supabase
        .from('checkins')
        .select('payment_amount')
        .not('payment_amount', 'is', null);

      if (dateFilter) {
        revenueQuery = revenueQuery.gte('created_at', dateFilter);
      }
      if (filters.endDate) {
        revenueQuery = revenueQuery.lte('created_at', filters.endDate);
      }
      if (filters.apartmentId) {
        revenueQuery = revenueQuery.eq('apartment_id', filters.apartmentId);
      } else if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        revenueQuery = revenueQuery.in('apartment_id', filters.apartmentIds);
      }

      // Execute queries with individual error handling
      console.log('ReportService: Executing summary statistics queries...');

      let totalResult, todayResult, activeResult, revenueResult;

      try {
        totalResult = await totalQuery;
        console.log('ReportService: Total query result:', totalResult.count);
      } catch (totalError) {
        console.error('ReportService: Total query error:', totalError);
        totalResult = { count: 0 };
      }

      try {
        todayResult = await todayQuery;
        console.log('ReportService: Today query result:', todayResult.count);
      } catch (todayError) {
        console.error('ReportService: Today query error:', todayError);
        todayResult = { count: 0 };
      }

      try {
        activeResult = await activeQuery;
        console.log('ReportService: Active query result:', activeResult.count);
      } catch (activeError) {
        console.error('ReportService: Active query error:', activeError);
        activeResult = { count: 0 };
      }

      try {
        revenueResult = await revenueQuery;
        console.log('ReportService: Revenue query result:', revenueResult.data?.length || 0, 'records');
      } catch (revenueError) {
        console.error('ReportService: Revenue query error:', revenueError);
        revenueResult = { data: [] };
      }

      // Calculate total revenue safely
      const totalRevenue = revenueResult.data?.reduce((sum, item) => {
        const amount = item.payment_amount || 0;
        return sum + amount;
      }, 0) || 0;

      console.log('ReportService: Summary statistics calculated successfully');

      return {
        success: true,
        data: {
          totalCheckins: totalResult.count || 0,
          todayCheckins: todayResult.count || 0,
          activeCheckins: activeResult.count || 0,
          totalRevenue: totalRevenue,
        },
      };
    } catch (error) {
      console.error('Error getting summary statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil ringkasan statistik',
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

      // Gunakan business day range jika tidak ada filter tanggal
      let dateFilter = {};
      if (filters.startDate && filters.endDate) {
        dateFilter = {
          created_at: {
            gte: filters.startDate,
            lte: filters.endDate,
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

      // Query untuk active checkins (status = 'active')
      let activeQuery = supabase
        .from('checkins')
        .select('id', { count: 'exact' })
        .eq('status', 'active')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        activeQuery = activeQuery.in('apartment_id', filters.apartmentIds);
      }

      // Query untuk total checkins
      let totalQuery = supabase
        .from('checkins')
        .select('id', { count: 'exact' })
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        totalQuery = totalQuery.in('apartment_id', filters.apartmentIds);
      }

      // Query untuk cash transactions
      let cashQuery = supabase
        .from('checkins')
        .select('id', { count: 'exact' })
        .eq('payment_method', 'cash')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        cashQuery = cashQuery.in('apartment_id', filters.apartmentIds);
      }

      // Query untuk transfer transactions
      let transferQuery = supabase
        .from('checkins')
        .select('id', { count: 'exact' })
        .eq('payment_method', 'transfer')
        .gte('created_at', dateFilter.created_at.gte)
        .lte('created_at', dateFilter.created_at.lte);

      if (filters.apartmentIds && filters.apartmentIds.length > 0) {
        transferQuery = transferQuery.in('apartment_id', filters.apartmentIds);
      }

      // Execute all queries
      const [activeResult, totalResult, cashResult, transferResult] = await Promise.all([
        activeQuery,
        totalQuery,
        cashQuery,
        transferQuery,
      ]);

      if (activeResult.error) throw activeResult.error;
      if (totalResult.error) throw totalResult.error;
      if (cashResult.error) throw cashResult.error;
      if (transferResult.error) throw transferResult.error;

      const dailyStats = {
        activeCheckins: activeResult.count || 0,
        totalCheckins: totalResult.count || 0,
        cashTransactions: cashResult.count || 0,
        transferTransactions: transferResult.count || 0,
      };

      console.log('ReportService: Daily statistics result:', dailyStats);

      return {
        success: true,
        data: dailyStats,
      };
    } catch (error) {
      console.error('Error getting daily statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik harian',
        error,
      };
    }
  }
}

export default new ReportService();
