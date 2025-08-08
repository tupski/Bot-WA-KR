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

  // Helper: sign in to Supabase Auth with email/password
  async signInSupabase(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('Supabase Auth sign-in error:', error.message);
      return { success: false, message: 'Autentikasi gagal: ' + error.message };
    }
    return { success: true, session: data.session, user: data.user };
  }

  // Login untuk Admin (via Supabase Auth)
  async loginAdmin(email, password) {
    try {
      console.log('AuthService: Attempting admin login for:', email);

      // Sign in ke Supabase Auth menggunakan email + password
      const authRes = await this.signInSupabase(email, password);
      if (!authRes.success) {
        return authRes;
      }

      // Ambil profil admin berdasarkan email
      const { data: adminRow, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminError || !adminRow) {
        return { success: false, message: 'Profil admin tidak ditemukan' };
      }

      const userData = {
        id: adminRow.id,
        username: adminRow.username,
        fullName: adminRow.full_name,
        email: adminRow.email,
        phone: adminRow.phone,
        role: USER_ROLES.ADMIN,
        loginTime: new Date().toISOString(),
      };

      await this.setCurrentUser(userData);
      await this.startSession();

      // Log aktivitas login
      await ActivityLogService.logActivity(
        adminRow.id,
        USER_ROLES.ADMIN,
        'login',
        `Admin ${adminRow.username} berhasil login`
      );

      return { success: true, user: userData };
    } catch (error) {
      console.error('Login admin error:', error);
      return { success: false, message: 'Terjadi kesalahan saat login admin' };
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

  // Login untuk Tim Lapangan (menerima username/email/phone)
  async loginFieldTeam(email, password) {
    try {
      console.log('AuthService: Attempting field team login for:', email);

      // Sign in ke Supabase Auth
      const authRes = await this.signInSupabase(email, password);
      if (!authRes.success) {
        return authRes;
      }

      // Ambil profil field team berdasarkan email
      const { data: ftRow, error: ftError } = await supabase
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
        .eq('email', email)
        .eq('status', 'active')
        .single();

      console.log('AuthService: Field team query result:', { ftRow, ftError });

      if (ftError) {
        if (ftError.code === 'PGRST116') {
          return { success: false, message: 'Akun tidak ditemukan/aktif' };
        }
        throw ftError;
      }

      if (ftRow) {
        // Wajib ada email untuk Supabase Auth
        if (!ftRow.email) {
          return { success: false, message: 'Email tim lapangan tidak terdaftar' };
        }

        // Sign in ke Supabase Auth
        const authRes = await this.signInSupabase(ftRow.email, password);
        if (!authRes.success) {
          return authRes;
        }

        // Extract apartment data
        const apartmentIds = ftRow.team_apartment_assignments?.map(
          assignment => assignment.apartments?.id
        ).filter(Boolean) || [];

        const apartmentNames = ftRow.team_apartment_assignments?.map(
          assignment => assignment.apartments?.name
        ).filter(Boolean) || [];

        const userData = {
          id: ftRow.id,
          username: ftRow.username || ftRow.phone || ftRow.email,
          fullName: ftRow.full_name,
          email: ftRow.email || null,
          phone: ftRow.phone || null,
          role: USER_ROLES.FIELD_TEAM,
          apartmentIds,
          apartmentNames,
          loginTime: new Date().toISOString(),
        };

        await this.setCurrentUser(userData);
        await this.startSession();

        await ActivityLogService.logActivity(
          ftRow.id,
          USER_ROLES.FIELD_TEAM,
          'login',
          `Tim lapangan ${userData.username} berhasil login`
        );

        return { success: true, user: userData };
      } else {
        return {
          success: false,
          message: 'Nomor WhatsApp tidak ditemukan atau akun tidak aktif',
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
        return { success: false, message: 'User tidak ditemukan' };
      }

      // Reauthenticate by signing in again
      const email = this.currentUser.email;
      if (!email) {
        return { success: false, message: 'Email tidak tersedia untuk akun ini' };
      }

      const reauth = await this.signInSupabase(email, currentPassword);
      if (!reauth.success) {
        return { success: false, message: 'Password lama tidak sesuai' };
      }

      // Update password via Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        throw error;
      }

      await ActivityLogService.logActivity(
        this.currentUser.id,
        this.currentUser.role,
        'change_password',
        'Password berhasil diubah'
      );

      return { success: true, message: 'Password berhasil diubah' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Terjadi kesalahan saat mengubah password' };
    }
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      if (!this.currentUser) {
        return { success: false, message: 'User tidak ditemukan' };
      }

      const table = this.isAdmin() ? 'admins' : 'field_teams';
      const { fullName, email, phone } = profileData;

      // Update profile row in public table
      const { error } = await supabase
        .from(table)
        .update({ full_name: fullName, email, phone })
        .eq('id', this.currentUser.id);

      if (error) throw error;

      // Optionally update auth user email/display name
      if (email && email !== this.currentUser.email) {
        await supabase.auth.updateUser({ email });
      }

      // Update current user cache
      this.currentUser.fullName = fullName;
      this.currentUser.email = email;
      this.currentUser.phone = phone;
      await this.setCurrentUser(this.currentUser);

      await ActivityLogService.logActivity(
        this.currentUser.id,
        this.currentUser.role,
        'update_profile',
        'Profil berhasil diperbarui'
      );

      return { success: true, message: 'Profil berhasil diperbarui' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, message: 'Terjadi kesalahan saat memperbarui profil' };
    }
  }
}

export default new AuthService();
