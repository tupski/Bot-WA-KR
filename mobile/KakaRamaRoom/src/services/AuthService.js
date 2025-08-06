import AsyncStorage from '@react-native-async-storage/async-storage';
import DatabaseManager from '../config/database';
import { USER_ROLES, TIME_CONSTANTS } from '../config/constants';
import ActivityLogService from './ActivityLogService';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionTimeout = null;
  }

  // Login untuk Admin
  async loginAdmin(username, password) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        'SELECT * FROM admins WHERE username = ? AND password = ?',
        [username, password]
      );

      if (result[0].rows.length > 0) {
        const user = result[0].rows.item(0);
        const userData = {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: USER_ROLES.ADMIN,
          loginTime: new Date().toISOString(),
        };

        await this.setCurrentUser(userData);
        await this.startSession();
        
        // Log aktivitas login
        await ActivityLogService.logActivity(
          user.id,
          USER_ROLES.ADMIN,
          'login',
          `Admin ${user.username} berhasil login`
        );

        return {
          success: true,
          user: userData,
        };
      } else {
        return {
          success: false,
          message: 'Username atau password salah',
        };
      }
    } catch (error) {
      console.error('Login admin error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat login',
      };
    }
  }

  // Login untuk Tim Lapangan
  async loginFieldTeam(username, password) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT ft.*, GROUP_CONCAT(a.name) as apartment_names, 
                GROUP_CONCAT(a.id) as apartment_ids
         FROM field_teams ft
         LEFT JOIN team_apartment_assignments taa ON ft.id = taa.team_id
         LEFT JOIN apartments a ON taa.apartment_id = a.id
         WHERE ft.username = ? AND ft.password = ? AND ft.status = 'active'
         GROUP BY ft.id`,
        [username, password]
      );

      if (result[0].rows.length > 0) {
        const user = result[0].rows.item(0);
        const apartmentIds = user.apartment_ids ? user.apartment_ids.split(',').map(id => parseInt(id)) : [];
        const apartmentNames = user.apartment_names ? user.apartment_names.split(',') : [];

        const userData = {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          email: user.email,
          phone: user.phone,
          role: USER_ROLES.FIELD_TEAM,
          apartmentIds,
          apartmentNames,
          loginTime: new Date().toISOString(),
        };

        await this.setCurrentUser(userData);
        await this.startSession();
        
        // Log aktivitas login
        await ActivityLogService.logActivity(
          user.id,
          USER_ROLES.FIELD_TEAM,
          'login',
          `Tim lapangan ${user.username} berhasil login`
        );

        return {
          success: true,
          user: userData,
        };
      } else {
        return {
          success: false,
          message: 'Username atau password salah, atau akun tidak aktif',
        };
      }
    } catch (error) {
      console.error('Login field team error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat login',
      };
    }
  }

  // Set current user dan simpan ke AsyncStorage
  async setCurrentUser(userData) {
    this.currentUser = userData;
    await AsyncStorage.setItem('currentUser', JSON.stringify(userData));
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Load user dari AsyncStorage saat app start
  async loadUserFromStorage() {
    try {
      const userData = await AsyncStorage.getItem('currentUser');
      if (userData) {
        this.currentUser = JSON.parse(userData);
        await this.startSession();
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Load user from storage error:', error);
      return null;
    }
  }

  // Start session dengan timeout
  async startSession() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(async () => {
      await this.logout();
    }, TIME_CONSTANTS.SESSION_TIMEOUT);
  }

  // Extend session
  async extendSession() {
    if (this.currentUser) {
      await this.startSession();
    }
  }

  // Logout
  async logout() {
    try {
      if (this.currentUser) {
        // Log aktivitas logout
        await ActivityLogService.logActivity(
          this.currentUser.id,
          this.currentUser.role,
          'logout',
          `${this.currentUser.role === USER_ROLES.ADMIN ? 'Admin' : 'Tim lapangan'} ${this.currentUser.username} logout`
        );
      }

      // Clear session timeout
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
        this.sessionTimeout = null;
      }

      // Clear user data
      this.currentUser = null;
      await AsyncStorage.removeItem('currentUser');

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat logout',
      };
    }
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  }

  // Check if user is admin
  isAdmin() {
    return this.currentUser && this.currentUser.role === USER_ROLES.ADMIN;
  }

  // Check if user is field team
  isFieldTeam() {
    return this.currentUser && this.currentUser.role === USER_ROLES.FIELD_TEAM;
  }

  // Get user's assigned apartments (for field team)
  getUserApartments() {
    if (this.isFieldTeam()) {
      return {
        ids: this.currentUser.apartmentIds || [],
        names: this.currentUser.apartmentNames || [],
      };
    }
    return { ids: [], names: [] };
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          message: 'User tidak ditemukan',
        };
      }

      const db = DatabaseManager.getDatabase();
      const table = this.isAdmin() ? 'admins' : 'field_teams';
      
      // Verify current password
      const verifyResult = await db.executeSql(
        `SELECT id FROM ${table} WHERE id = ? AND password = ?`,
        [this.currentUser.id, currentPassword]
      );

      if (verifyResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Password lama tidak sesuai',
        };
      }

      // Update password
      await db.executeSql(
        `UPDATE ${table} SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [newPassword, this.currentUser.id]
      );

      // Log aktivitas
      await ActivityLogService.logActivity(
        this.currentUser.id,
        this.currentUser.role,
        'change_password',
        'Password berhasil diubah'
      );

      return {
        success: true,
        message: 'Password berhasil diubah',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat mengubah password',
      };
    }
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      if (!this.currentUser) {
        return {
          success: false,
          message: 'User tidak ditemukan',
        };
      }

      const db = DatabaseManager.getDatabase();
      const table = this.isAdmin() ? 'admins' : 'field_teams';
      
      const { fullName, email, phone } = profileData;
      
      await db.executeSql(
        `UPDATE ${table} SET full_name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [fullName, email, phone, this.currentUser.id]
      );

      // Update current user data
      this.currentUser.fullName = fullName;
      this.currentUser.email = email;
      this.currentUser.phone = phone;
      
      await this.setCurrentUser(this.currentUser);

      // Log aktivitas
      await ActivityLogService.logActivity(
        this.currentUser.id,
        this.currentUser.role,
        'update_profile',
        'Profil berhasil diperbarui'
      );

      return {
        success: true,
        message: 'Profil berhasil diperbarui',
      };
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan saat memperbarui profil',
      };
    }
  }
}

export default new AuthService();
