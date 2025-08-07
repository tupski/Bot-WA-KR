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
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          c.id,
          c.created_at,
          c.checkout_time,
          c.duration_hours,
          c.payment_method,
          c.payment_amount,
          c.marketing_name,
          c.status,
          u.unit_number,
          a.name as apartment_name,
          a.code as apartment_code,
          ft.full_name as team_name
        FROM checkins c
        INNER JOIN units u ON c.unit_id = u.id
        INNER JOIN apartments a ON c.apartment_id = a.id
        INNER JOIN field_teams ft ON c.team_id = ft.id
        WHERE 1=1
      `;
      
      const params = [];

      // Filter by apartment
      if (filters.apartmentId) {
        query += ' AND c.apartment_id = ?';
        params.push(filters.apartmentId);
      }

      // Filter by status
      if (filters.status) {
        query += ' AND c.status = ?';
        params.push(filters.status);
      }

      // Filter by date range
      if (filters.startDate) {
        query += ' AND DATE(c.created_at) >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(c.created_at) <= ?';
        params.push(filters.endDate);
      }

      // Filter by marketing
      if (filters.marketingName) {
        query += ' AND c.marketing_name LIKE ?';
        params.push(`%${filters.marketingName}%`);
      }

      // Order by created_at desc
      query += ' ORDER BY c.created_at DESC';

      // Limit
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const result = await db.executeSql(query, params);
      const checkins = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        checkins.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: checkins,
      };
    } catch (error) {
      console.error('Error getting checkin report:', error);
      return {
        success: false,
        message: 'Gagal mengambil laporan checkin',
      };
    }
  }

  /**
   * Get statistik checkin per apartemen
   * @param {Object} filters - Filter options
   */
  async getApartmentStatistics(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          a.id,
          a.name,
          a.code,
          COUNT(c.id) as total_checkins,
          COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_checkins,
          COUNT(CASE WHEN c.status = 'extended' THEN 1 END) as extended_checkins,
          COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_checkins,
          COUNT(CASE WHEN c.status = 'early_checkout' THEN 1 END) as early_checkouts,
          SUM(c.payment_amount) as total_revenue,
          AVG(c.duration_hours) as avg_duration
        FROM apartments a
        LEFT JOIN checkins c ON a.id = c.apartment_id
      `;

      const params = [];

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        query += ' AND (';
        if (filters.startDate) {
          query += 'DATE(c.created_at) >= ?';
          params.push(filters.startDate);
        }
        if (filters.endDate) {
          if (filters.startDate) query += ' AND ';
          query += 'DATE(c.created_at) <= ?';
          params.push(filters.endDate);
        }
        query += ')';
      }

      query += ' GROUP BY a.id, a.name, a.code ORDER BY total_checkins DESC';

      const result = await db.executeSql(query, params);
      const statistics = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        statistics.push({
          ...row,
          total_revenue: row.total_revenue || 0,
          avg_duration: row.avg_duration || 0,
        });
      }

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('Error getting apartment statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik apartemen',
      };
    }
  }

  /**
   * Get top marketing berdasarkan jumlah checkin
   * @param {Object} filters - Filter options
   */
  async getTopMarketing(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          c.marketing_name,
          COUNT(c.id) as total_checkins,
          SUM(c.payment_amount) as total_revenue,
          COUNT(DISTINCT c.apartment_id) as apartments_served
        FROM checkins c
        WHERE c.marketing_name IS NOT NULL AND c.marketing_name != ''
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

      query += ' GROUP BY c.marketing_name ORDER BY total_checkins DESC';

      // Limit
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const result = await db.executeSql(query, params);
      const marketing = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        marketing.push({
          ...row,
          total_revenue: row.total_revenue || 0,
        });
      }

      return {
        success: true,
        data: marketing,
      };
    } catch (error) {
      console.error('Error getting top marketing:', error);
      return {
        success: false,
        message: 'Gagal mengambil data top marketing',
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
