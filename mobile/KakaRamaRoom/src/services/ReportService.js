import { supabase } from '../config/supabase';

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

      // For each apartment, get checkin statistics
      for (const apartment of apartments || []) {
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

      // Filter by apartment
      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
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
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          DATE(c.created_at) as date,
          COUNT(c.id) as total_checkins,
          SUM(c.payment_amount) as total_revenue,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_checkins,
          COUNT(CASE WHEN c.status = 'early_checkout' THEN 1 END) as early_checkouts
        FROM checkins c
        WHERE 1=1
      `;

      const params = [];

      // Filter by date range
      if (filters.startDate) {
        query += ' AND DATE(c.created_at) >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(c.created_at) <= ?';
        params.push(filters.endDate);
      }

      // Filter by apartment
      if (filters.apartmentId) {
        query += ' AND c.apartment_id = ?';
        params.push(filters.apartmentId);
      }

      query += ' GROUP BY DATE(c.created_at) ORDER BY date DESC';

      const result = await db.executeSql(query, params);
      const statistics = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        statistics.push({
          ...row,
          total_revenue: row.total_revenue || 0,
        });
      }

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
      const db = DatabaseManager.getDatabase();
      
      // Get total checkins
      let totalQuery = 'SELECT COUNT(*) as total FROM checkins WHERE 1=1';
      const totalParams = [];

      // Get today's checkins
      let todayQuery = 'SELECT COUNT(*) as today FROM checkins WHERE DATE(created_at) = DATE("now") AND 1=1';
      const todayParams = [];

      // Get active checkins
      let activeQuery = 'SELECT COUNT(*) as active FROM checkins WHERE status IN ("active", "extended")';
      const activeParams = [];

      // Get total revenue
      let revenueQuery = 'SELECT SUM(payment_amount) as revenue FROM checkins WHERE payment_amount IS NOT NULL AND 1=1';
      const revenueParams = [];

      // Apply date filters
      if (filters.startDate) {
        totalQuery += ' AND DATE(created_at) >= ?';
        totalParams.push(filters.startDate);
        todayQuery += ' AND DATE(created_at) >= ?';
        todayParams.push(filters.startDate);
        revenueQuery += ' AND DATE(created_at) >= ?';
        revenueParams.push(filters.startDate);
      }

      if (filters.endDate) {
        totalQuery += ' AND DATE(created_at) <= ?';
        totalParams.push(filters.endDate);
        todayQuery += ' AND DATE(created_at) <= ?';
        todayParams.push(filters.endDate);
        revenueQuery += ' AND DATE(created_at) <= ?';
        revenueParams.push(filters.endDate);
      }

      // Apply apartment filter
      if (filters.apartmentId) {
        totalQuery += ' AND apartment_id = ?';
        totalParams.push(filters.apartmentId);
        todayQuery += ' AND apartment_id = ?';
        todayParams.push(filters.apartmentId);
        activeQuery += ' AND apartment_id = ?';
        activeParams.push(filters.apartmentId);
        revenueQuery += ' AND apartment_id = ?';
        revenueParams.push(filters.apartmentId);
      }

      // Execute queries
      const [totalResult, todayResult, activeResult, revenueResult] = await Promise.all([
        db.executeSql(totalQuery, totalParams),
        db.executeSql(todayQuery, todayParams),
        db.executeSql(activeQuery, activeParams),
        db.executeSql(revenueQuery, revenueParams),
      ]);

      return {
        success: true,
        data: {
          totalCheckins: totalResult[0].rows.item(0).total,
          todayCheckins: todayResult[0].rows.item(0).today,
          activeCheckins: activeResult[0].rows.item(0).active,
          totalRevenue: revenueResult[0].rows.item(0).revenue || 0,
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
}

export default new ReportService();
