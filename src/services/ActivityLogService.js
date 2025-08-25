import { supabase } from '../config/supabase';
import DatabaseManager from '../config/supabase';
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
      // Validasi input parameters
      if (!userId || !userType || !action || !description) {
        console.warn('ActivityLogService: Missing required parameters for logging activity');
        return { success: false, error: 'Missing required parameters' };
      }

      // Validasi supabase connection
      if (!supabase) {
        console.warn('ActivityLogService: Supabase not available');
        return { success: false, error: 'Database connection not available' };
      }

      // Get user info untuk detail logging dengan error handling
      let userInfo;
      try {
        userInfo = await this.getUserInfo(userId, userType);
      } catch (userInfoError) {
        console.warn('ActivityLogService: Error getting user info, using fallback:', userInfoError);
        userInfo = {
          fullName: `User ${userId}`,
          username: `user_${userId}`,
          role: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
        };
      }

      const now = new Date();

      // Format timestamp Indonesia dengan error handling
      let timestamp;
      try {
        timestamp = now.toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (timestampError) {
        console.warn('ActivityLogService: Error formatting timestamp, using ISO:', timestampError);
        timestamp = now.toISOString();
      }

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
        ip_address: additionalData?.ipAddress || null,
        user_agent: additionalData?.userAgent || 'Mobile App',
        apartment_id: additionalData?.apartmentId || null,
        unit_id: additionalData?.unitId || null,
        created_at: now.toISOString(),
      };

      // Attempt to insert to database dengan retry mechanism
      let insertAttempts = 0;
      const maxAttempts = 3;

      while (insertAttempts < maxAttempts) {
        try {
          const { error } = await supabase
            .from('activity_logs')
            .insert(logData);

          if (error) {
            if (error.code === 'PGRST116') {
              // Table doesn't exist, log locally and return success
              console.log(`📝 Activity logged (local - table not found): ${enhancedDescription}`);
              return { success: true, logged_locally: true };
            }

            if (error.code === 'PGRST301' && insertAttempts < maxAttempts - 1) {
              // Connection error, retry
              insertAttempts++;
              console.warn(`ActivityLogService: Connection error, retrying (${insertAttempts}/${maxAttempts}):`, error);
              await new Promise(resolve => setTimeout(resolve, 1000 * insertAttempts)); // Exponential backoff
              continue;
            }

            throw error;
          }

          // Success
          console.log(`✅ Activity logged to database: ${enhancedDescription}`);
          return { success: true, logged_to_database: true };

        } catch (insertError) {
          insertAttempts++;
          if (insertAttempts >= maxAttempts) {
            throw insertError;
          }
          console.warn(`ActivityLogService: Insert error, retrying (${insertAttempts}/${maxAttempts}):`, insertError);
          await new Promise(resolve => setTimeout(resolve, 1000 * insertAttempts));
        }
      }

    } catch (error) {
      console.error('❌ ActivityLogService: Critical error logging activity:', error);

      // Fallback: log to console at minimum
      const fallbackLog = `[${new Date().toISOString()}] ${userType}:${userId} - ${action} - ${description}`;
      console.log(`📝 Activity logged (fallback): ${fallbackLog}`);

      return {
        success: false,
        error: error.message,
        logged_locally: true,
        fallback_log: fallbackLog
      };
    }
  }

  /**
   * Get user info untuk logging dengan error handling yang robust
   * @param {string} userId - ID user
   * @param {string} userType - Tipe user
   */
  async getUserInfo(userId, userType) {
    try {
      // Validasi input
      if (!userId || !userType) {
        throw new Error('Missing userId or userType');
      }

      // Try to get from current user first dengan validasi
      try {
        if (AuthService && typeof AuthService.getCurrentUser === 'function') {
          const currentUser = AuthService.getCurrentUser();
          if (currentUser && currentUser.id === userId) {
            return {
              fullName: currentUser.fullName || currentUser.username || `User ${userId}`,
              username: currentUser.username || `user_${userId}`,
              role: currentUser.role === 'admin' ? 'Administrator' : 'Tim Lapangan',
            };
          }
        }
      } catch (authError) {
        console.warn('ActivityLogService: Error getting current user:', authError);
      }

      // Fallback: get from database dengan error handling
      let userData = null;
      try {
        if (userType === 'admin' || userType === 'system') {
          const { data, error } = await supabase
            .from('admins')
            .select('full_name, username')
            .eq('id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.warn('ActivityLogService: Error querying admins table:', error);
          } else {
            userData = data;
          }
        } else if (userType === 'field_team') {
          const { data, error } = await supabase
            .from('field_teams')
            .select('full_name, username')
            .eq('id', userId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.warn('ActivityLogService: Error querying field_teams table:', error);
          } else {
            userData = data;
          }
        }
      } catch (dbError) {
        console.warn('ActivityLogService: Database error getting user info:', dbError);
      }

      if (userData && userData.full_name) {
        return {
          fullName: userData.full_name || userData.username || `User ${userId}`,
          username: userData.username || `user_${userId}`,
          role: userType === 'admin' ? 'Administrator' : 'Tim Lapangan',
        };
      }

      // Ultimate fallback dengan informasi yang lebih spesifik
      const roleMap = {
        'admin': 'Administrator',
        'field_team': 'Tim Lapangan',
        'system': 'System',
      };

      return {
        fullName: roleMap[userType] || 'Unknown User',
        username: `user_${userId}`,
        role: roleMap[userType] || 'Unknown Role',
      };
    } catch (error) {
      console.error('ActivityLogService: Critical error getting user info:', error);

      // Emergency fallback
      return {
        fullName: `User ${userId}`,
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
      // Validasi supabase connection
      if (!supabase) {
        console.warn('ActivityLogService: Supabase not available for getting logs');
        return { success: true, data: [] };
      }

      // Build query dengan error handling
      let query;
      try {
        query = supabase
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
      } catch (queryError) {
        console.error('ActivityLogService: Error building query:', queryError);
        return { success: true, data: [] };
      }

      // Apply filters dengan validasi
      try {
        if (filters.userType && typeof filters.userType === 'string') {
          query = query.eq('user_type', filters.userType);
        }

        if (filters.userId) {
          query = query.eq('user_id', filters.userId);
        }

        if (filters.action && typeof filters.action === 'string') {
          query = query.eq('action', filters.action);
        }

        if (filters.apartmentId) {
          query = query.eq('apartment_id', filters.apartmentId);
        }

        if (filters.startDate) {
          try {
            const startDate = new Date(filters.startDate).toISOString();
            query = query.gte('created_at', startDate);
          } catch (dateError) {
            console.warn('ActivityLogService: Invalid startDate format:', filters.startDate);
          }
        }

        if (filters.endDate) {
          try {
            const endDate = new Date(filters.endDate).toISOString();
            query = query.lte('created_at', endDate);
          } catch (dateError) {
            console.warn('ActivityLogService: Invalid endDate format:', filters.endDate);
          }
        }

        const limit = parseInt(filters.limit) || 100;
        query = query.limit(Math.min(limit, 500)); // Max 500 records untuk performance
      } catch (filterError) {
        console.error('ActivityLogService: Error applying filters:', filterError);
        // Continue with basic query
      }

      // Execute query dengan retry mechanism
      let logs = [];
      let queryAttempts = 0;
      const maxQueryAttempts = 3;

      while (queryAttempts < maxQueryAttempts) {
        try {
          const { data: queryLogs, error } = await query;

          if (error) {
            if (error.code === 'PGRST116') {
              console.log('ActivityLogService: Activity logs table not found, returning empty array');
              return { success: true, data: [] };
            }

            if (error.code === 'PGRST301' && queryAttempts < maxQueryAttempts - 1) {
              // Connection error, retry
              queryAttempts++;
              console.warn(`ActivityLogService: Connection error, retrying (${queryAttempts}/${maxQueryAttempts}):`, error);
              await new Promise(resolve => setTimeout(resolve, 1000 * queryAttempts));
              continue;
            }

            throw error;
          }

          logs = queryLogs || [];
          break;

        } catch (queryError) {
          queryAttempts++;
          if (queryAttempts >= maxQueryAttempts) {
            throw queryError;
          }
          console.warn(`ActivityLogService: Query error, retrying (${queryAttempts}/${maxQueryAttempts}):`, queryError);
          await new Promise(resolve => setTimeout(resolve, 1000 * queryAttempts));
        }
      }

      // Transform data untuk display yang lebih baik dengan safe operations
      const transformedLogs = logs.map(log => {
        try {
          return {
            ...log,
            displayTime: this.formatDisplayTime(log.created_at),
            displayDate: this.formatDisplayDate(log.created_at),
            actionLabel: this.getActionLabel(log.action),
            userTypeLabel: this.getUserTypeLabel(log.user_type),
            apartmentName: log.apartments?.name || null,
            unitInfo: log.units ? `${log.units.unit_number} (${log.units.apartments?.name || 'Unknown'})` : null,
          };
        } catch (transformError) {
          console.error('ActivityLogService: Error transforming log:', transformError);
          return {
            ...log,
            displayTime: 'Unknown',
            displayDate: 'Unknown',
            actionLabel: log.action || 'Unknown',
            userTypeLabel: log.user_type || 'Unknown',
            apartmentName: null,
            unitInfo: null,
          };
        }
      });

      console.log(`ActivityLogService: Retrieved ${transformedLogs.length} activity logs`);
      return {
        success: true,
        data: transformedLogs,
      };
    } catch (error) {
      console.error('ActivityLogService: Critical error getting activity logs:', error);
      return {
        success: true, // Return success with empty data instead of failing
        data: [],
        message: 'Log aktivitas tidak tersedia karena terjadi kesalahan',
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

  /**
   * Get label untuk user type
   * @param {string} userType - User type code
   */
  getUserTypeLabel(userType) {
    const userTypeLabels = {
      'admin': 'Administrator',
      'field_team': 'Tim Lapangan',
      'system': 'System',
    };

    return userTypeLabels[userType] || userType || 'Unknown';
  }
}

export default new ActivityLogService();
