import { supabase } from '../config/supabase';
import { ACTIVITY_ACTIONS } from '../config/constants';
import AuthService from './AuthService';

class ActivityLogService {
  /**
   * Log aktivitas user dengan detail lengkap
   * @param {string} userId - ID user
   * @param {string} userType - Tipe user (admin/field_team)
   * @param {string} action - Action yang dilakukan
   * @param {string} description - Deskripsi detail
   * @param {string} relatedTable - Tabel terkait
   * @param {string} relatedId - ID record terkait
   * @param {Object} additionalData - Data tambahan
   */
  async logActivity(userId, userType, action, description, relatedTable = null, relatedId = null, additionalData = {}) {
    try {
      // Get user info untuk detail logging
      const userInfo = await this.getUserInfo(userId, userType);
      const now = new Date();

      // Format timestamp Indonesia
      const timestamp = now.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Enhanced description dengan user info
      const enhancedDescription = `[${timestamp}] ${userInfo.fullName} (${userInfo.role}) - ${description}`;

      const logData = {
        user_id: userId,
        user_type: userType,
        user_name: userInfo.fullName,
        user_username: userInfo.username,
        action,
        description: enhancedDescription,
        related_table: relatedTable,
        related_id: relatedId,
        ip_address: additionalData.ipAddress || null,
        user_agent: additionalData.userAgent || 'Mobile App',
        apartment_id: additionalData.apartmentId || null,
        unit_id: additionalData.unitId || null,
        created_at: now.toISOString(),
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert(logData);

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist, just log to console
          console.log(`Activity logged (local): ${enhancedDescription}`);
          return { success: true };
        }
        throw error;
      }

      console.log(`✅ Activity logged: ${enhancedDescription}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user info untuk logging
   * @param {string} userId - ID user
   * @param {string} userType - Tipe user
   */
  async getUserInfo(userId, userType) {
    try {
      // Try to get from current user first
      const currentUser = AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        return {
          fullName: currentUser.fullName || currentUser.username,
          username: currentUser.username,
          role: currentUser.role === 'admin' ? 'Administrator' : 'Tim Lapangan',
        };
      }

      // Fallback: get from database
      let userData = null;
      if (userType === 'admin') {
        const { data } = await supabase
          .from('admins')
          .select('full_name, username')
          .eq('id', userId)
          .single();
        userData = data;
      } else if (userType === 'field_team') {
        const { data } = await supabase
          .from('field_teams')
          .select('full_name, username')
          .eq('id', userId)
          .single();
        userData = data;
      }

      if (userData) {
        return {
          fullName: userData.full_name || userData.username,
          username: userData.username,
          role: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
        };
      }

      // Ultimate fallback
      return {
        fullName: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
        username: `user_${userId}`,
        role: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
      };
    } catch (error) {
      console.error('Error getting user info for logging:', error);
      return {
        fullName: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
        username: `user_${userId}`,
        role: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
      };
    }
  }

  /**
   * Get activity logs dengan filter dan detail lengkap
   * @param {Object} filters - Filter options
   */
  async getActivityLogs(filters = {}) {
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          apartments (
            name,
            code
          ),
          units (
            unit_number,
            apartments (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.userType) {
        query = query.eq('user_type', filters.userType);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.apartmentId) {
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100); // Default limit
      }

      const { data: logs, error } = await query;

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      // Transform data untuk display yang lebih baik
      const transformedLogs = logs?.map(log => ({
        ...log,
        displayTime: this.formatDisplayTime(log.created_at),
        displayDate: this.formatDisplayDate(log.created_at),
        actionLabel: this.getActionLabel(log.action),
        userTypeLabel: log.user_type === 'admin' ? 'Administrator' : 'Tim Lapangan',
        apartmentName: log.apartments?.name || null,
        unitInfo: log.units ? `${log.units.unit_number} (${log.units.apartments?.name})` : null,
      })) || [];

      return {
        success: true,
        data: transformedLogs,
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

  /**
   * Format waktu untuk display
   * @param {string} timestamp - ISO timestamp
   */
  formatDisplayTime(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * Format tanggal untuk display
   * @param {string} timestamp - ISO timestamp
   */
  formatDisplayDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('id-ID', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * Get label untuk action
   * @param {string} action - Action code
   */
  getActionLabel(action) {
    const actionLabels = {
      [ACTIVITY_ACTIONS.LOGIN]: 'Login',
      [ACTIVITY_ACTIONS.LOGOUT]: 'Logout',
      [ACTIVITY_ACTIONS.CREATE_CHECKIN]: 'Buat Checkin',
      [ACTIVITY_ACTIONS.EXTEND_CHECKIN]: 'Perpanjang Checkin',
      [ACTIVITY_ACTIONS.EARLY_CHECKOUT]: 'Early Checkout',
      [ACTIVITY_ACTIONS.AUTO_CHECKOUT]: 'Auto Checkout',
      [ACTIVITY_ACTIONS.CREATE_APARTMENT]: 'Buat Apartemen',
      [ACTIVITY_ACTIONS.UPDATE_APARTMENT]: 'Update Apartemen',
      [ACTIVITY_ACTIONS.DELETE_APARTMENT]: 'Hapus Apartemen',
      [ACTIVITY_ACTIONS.CREATE_TEAM]: 'Buat Tim',
      [ACTIVITY_ACTIONS.UPDATE_TEAM]: 'Update Tim',
      [ACTIVITY_ACTIONS.DELETE_TEAM]: 'Hapus Tim',
      [ACTIVITY_ACTIONS.ASSIGN_TEAM]: 'Assign Tim',
      [ACTIVITY_ACTIONS.CREATE_UNIT]: 'Buat Unit',
      [ACTIVITY_ACTIONS.UPDATE_UNIT]: 'Update Unit',
      [ACTIVITY_ACTIONS.DELETE_UNIT]: 'Hapus Unit',
      [ACTIVITY_ACTIONS.UPDATE_UNIT_STATUS]: 'Update Status Unit',
      [ACTIVITY_ACTIONS.EXPORT_REPORT]: 'Export Laporan',
    };

    return actionLabels[action] || action;
  }
}

export default new ActivityLogService();
