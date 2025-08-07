import { supabase } from '../config/supabase';
import { ACTIVITY_ACTIONS } from '../config/constants';

class ActivityLogService {
  // Log aktivitas user
  async logActivity(userId, userType, action, description, relatedTable = null, relatedId = null, ipAddress = null, userAgent = null) {
    try {
      const { error } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          user_type: userType,
          action,
          description,
          related_table: relatedTable,
          related_id: relatedId,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist, just log to console
          console.log(`Activity logged (local): ${userType} ${userId} - ${action}`);
          return;
        }
        throw error;
      }

      console.log(`Activity logged: ${userType} ${userId} - ${action}`);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // Get activity logs dengan filter
  async getActivityLogs(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT al.*, 
               CASE 
                 WHEN al.user_type = 'admin' THEN a.full_name
                 WHEN al.user_type = 'field_team' THEN ft.full_name
               END as user_name,
               CASE 
                 WHEN al.user_type = 'admin' THEN a.username
                 WHEN al.user_type = 'field_team' THEN ft.username
               END as username
        FROM activity_logs al
        LEFT JOIN admins a ON al.user_type = 'admin' AND al.user_id = a.id
        LEFT JOIN field_teams ft ON al.user_type = 'field_team' AND al.user_id = ft.id
        WHERE 1=1
      `;
      
      const params = [];

      // Filter by user type
      if (filters.userType) {
        query += ' AND al.user_type = ?';
        params.push(filters.userType);
      }

      // Filter by user ID
      if (filters.userId) {
        query += ' AND al.user_id = ?';
        params.push(filters.userId);
      }

      // Filter by action
      if (filters.action) {
        query += ' AND al.action = ?';
        params.push(filters.action);
      }

      // Filter by date range
      if (filters.startDate) {
        query += ' AND DATE(al.created_at) >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ' AND DATE(al.created_at) <= ?';
        params.push(filters.endDate);
      }

      // Filter by related table
      if (filters.relatedTable) {
        query += ' AND al.related_table = ?';
        params.push(filters.relatedTable);
      }

      // Order by created_at desc
      query += ' ORDER BY al.created_at DESC';

      // Limit
      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const result = await db.executeSql(query, params);
      const logs = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        logs.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: logs,
      };
    } catch (error) {
      console.error('Error getting activity logs:', error);
      return {
        success: false,
        message: 'Gagal mengambil log aktivitas',
      };
    }
  }

  // Get activity logs untuk tim lapangan tertentu
  async getFieldTeamActivityLogs(teamId, limit = 50) {
    return await this.getActivityLogs({
      userType: 'field_team',
      userId: teamId,
      limit,
    });
  }

  // Get activity logs untuk admin
  async getAdminActivityLogs(adminId = null, limit = 100) {
    const filters = {
      userType: 'admin',
      limit,
    };

    if (adminId) {
      filters.userId = adminId;
    }

    return await this.getActivityLogs(filters);
  }

  // Get activity logs berdasarkan aksi tertentu
  async getActivityLogsByAction(action, limit = 50) {
    return await this.getActivityLogs({
      action,
      limit,
    });
  }

  // Get activity logs hari ini
  async getTodayActivityLogs(limit = 100) {
    const today = new Date().toISOString().split('T')[0];
    return await this.getActivityLogs({
      startDate: today,
      endDate: today,
      limit,
    });
  }

  // Get activity logs untuk checkin
  async getCheckinActivityLogs(limit = 50) {
    return await this.getActivityLogs({
      action: ACTIVITY_ACTIONS.CREATE_CHECKIN,
      limit,
    });
  }

  // Get activity logs untuk extend checkin
  async getExtendActivityLogs(limit = 50) {
    return await this.getActivityLogs({
      action: ACTIVITY_ACTIONS.EXTEND_CHECKIN,
      limit,
    });
  }

  // Get activity logs untuk early checkout
  async getEarlyCheckoutActivityLogs(limit = 50) {
    return await this.getActivityLogs({
      action: ACTIVITY_ACTIONS.EARLY_CHECKOUT,
      limit,
    });
  }

  // Get statistik aktivitas
  async getActivityStatistics(startDate = null, endDate = null) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          action,
          user_type,
          COUNT(*) as count,
          DATE(created_at) as date
        FROM activity_logs
        WHERE 1=1
      `;
      
      const params = [];

      if (startDate) {
        query += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY action, user_type, DATE(created_at) ORDER BY date DESC, count DESC';

      const result = await db.executeSql(query, params);
      const statistics = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        statistics.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: statistics,
      };
    } catch (error) {
      console.error('Error getting activity statistics:', error);
      return {
        success: false,
        message: 'Gagal mengambil statistik aktivitas',
      };
    }
  }

  // Clean old activity logs (hapus log lebih dari X hari)
  async cleanOldLogs(daysToKeep = 90) {
    try {
      const db = DatabaseManager.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await db.executeSql(
        'DELETE FROM activity_logs WHERE created_at < ?',
        [cutoffDate.toISOString()]
      );

      console.log(`Cleaned ${result[0].rowsAffected} old activity logs`);
      
      return {
        success: true,
        deletedCount: result[0].rowsAffected,
      };
    } catch (error) {
      console.error('Error cleaning old logs:', error);
      return {
        success: false,
        message: 'Gagal membersihkan log lama',
      };
    }
  }

  // Get most active users
  async getMostActiveUsers(limit = 10, startDate = null, endDate = null) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT 
          al.user_id,
          al.user_type,
          COUNT(*) as activity_count,
          CASE 
            WHEN al.user_type = 'admin' THEN a.full_name
            WHEN al.user_type = 'field_team' THEN ft.full_name
          END as user_name,
          CASE 
            WHEN al.user_type = 'admin' THEN a.username
            WHEN al.user_type = 'field_team' THEN ft.username
          END as username
        FROM activity_logs al
        LEFT JOIN admins a ON al.user_type = 'admin' AND al.user_id = a.id
        LEFT JOIN field_teams ft ON al.user_type = 'field_team' AND al.user_id = ft.id
        WHERE 1=1
      `;
      
      const params = [];

      if (startDate) {
        query += ' AND DATE(al.created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(al.created_at) <= ?';
        params.push(endDate);
      }

      query += ' GROUP BY al.user_id, al.user_type ORDER BY activity_count DESC LIMIT ?';
      params.push(limit);

      const result = await db.executeSql(query, params);
      const users = [];

      for (let i = 0; i < result[0].rows.length; i++) {
        users.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: users,
      };
    } catch (error) {
      console.error('Error getting most active users:', error);
      return {
        success: false,
        message: 'Gagal mengambil data pengguna paling aktif',
      };
    }
  }
}

export default new ActivityLogService();
