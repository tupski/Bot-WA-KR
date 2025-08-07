import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { USER_ROLES, TIME_CONSTANTS } from '../config/constants';
import ActivityLogService from './ActivityLogService';
import PasswordUtils from '../utils/PasswordUtils';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionTimeout = null;
  }

  // Login untuk Admin
  async loginAdmin(username, password) {
    try {
      console.log('AuthService: Attempting admin login for:', username);

      // Query ke Supabase untuk admin (ambil berdasarkan username saja)
      const { data, error } = await supabase
        .from('admins')
        .select('*')
        .eq('username', username)
        .single();

      console.log('AuthService: Supabase query result:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist, use default admin
          return await this.loginDefaultAdmin(username, password);
        }
        throw error;
      }

      if (data) {
        // Verify password dengan hash
        let isPasswordValid = false;

        try {
          // Coba verify dengan bcrypt (React Native)
          if (PasswordUtils.isPasswordHashed(data.password)) {
            isPasswordValid = await PasswordUtils.verifyPassword(password, data.password);
          } else {
            // Fallback: cek dengan PostgreSQL crypt function
            const { data: cryptResult, error: cryptError } = await supabase
              .rpc('verify_password', {
                input_password: password,
                stored_hash: data.password
              });

            if (!cryptError && cryptResult) {
              isPasswordValid = cryptResult;
            } else {
              // Last fallback: plain text comparison (untuk development)
              isPasswordValid = password === data.password;
            }
          }
        } catch (error) {
          console.error('Password verification error:', error);
          // Fallback ke plain text untuk development
          isPasswordValid = password === data.password;
        }

        if (!isPasswordValid) {
          return {
            success: false,
            message: 'Username atau password salah',
          };
        }

        const userData = {
          id: data.id,
          username: data.username,
          fullName: data.full_name,
          email: data.email,
          phone: data.phone,
          role: USER_ROLES.ADMIN,
          loginTime: new Date().toISOString(),
        };

        await this.setCurrentUser(userData);
        await this.startSession();

        // Log aktivitas login
        await ActivityLogService.logActivity(
          data.id,
          USER_ROLES.ADMIN,
          'login',
          `Admin ${data.username} berhasil login`
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
      // Fallback to default admin if Supabase fails
      return await this.loginDefaultAdmin(username, password);
    }
  }

  // Default admin login (fallback)
  async loginDefaultAdmin(username, password) {
    console.log('AuthService: Using default admin login for:', username);

    // Default admin credentials (untuk fallback)
    if (username === 'admin' && password === 'admin123') {
      console.log('AuthService: Default admin credentials match (fallback mode)');
      const userData = {
        id: 1,
        username: 'admin',
        fullName: 'Administrator',
        email: 'admin@kakaramaroom.com',
        phone: '+62812345678',
        role: USER_ROLES.ADMIN,
        loginTime: new Date().toISOString(),
      };

      await this.setCurrentUser(userData);
      await this.startSession();

      // Log aktivitas login
      await ActivityLogService.logActivity(
        1,
        USER_ROLES.ADMIN,
        'login',
        'Admin default berhasil login'
      );

      return {
        success: true,
        user: userData,
      };
    }

    console.log('AuthService: Default admin credentials do not match');
    return {
      success: false,
      message: 'Username atau password salah',
    };
  }

  // Login untuk Tim Lapangan
  async loginFieldTeam(username, password) {
    try {
      // Query ke Supabase untuk field team dengan assignments
      const { data: fieldTeam, error: teamError } = await supabase
        .from('field_teams')
        .select(`
          *,
          team_apartment_assignments (
            apartment_id,
            apartments (
              id,
              name
            )
          )
        `)
        .eq('username', username)
        .eq('password', password)
        .eq('status', 'active')
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          // Table doesn't exist, return error
          return {
            success: false,
            message: 'Sistem field team belum tersedia',
          };
        }
        throw teamError;
      }

      if (fieldTeam) {
        // Extract apartment data from Supabase result
        const apartmentIds = fieldTeam.team_apartment_assignments?.map(
          assignment => assignment.apartments?.id
        ).filter(Boolean) || [];

        const apartmentNames = fieldTeam.team_apartment_assignments?.map(
          assignment => assignment.apartments?.name
        ).filter(Boolean) || [];

        const userData = {
          id: fieldTeam.id,
          username: fieldTeam.username,
          fullName: fieldTeam.full_name,
          email: fieldTeam.email,
          phone: fieldTeam.phone,
          role: USER_ROLES.FIELD_TEAM,
          apartmentIds,
          apartmentNames,
          loginTime: new Date().toISOString(),
        };

        await this.setCurrentUser(userData);
        await this.startSession();

        // Log aktivitas login
        await ActivityLogService.logActivity(
          fieldTeam.id,
          USER_ROLES.FIELD_TEAM,
          'login',
          `Tim lapangan ${fieldTeam.username} berhasil login`
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
