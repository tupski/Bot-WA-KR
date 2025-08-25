import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { USER_ROLES, TIME_CONSTANTS } from '../config/constants';
import ActivityLogService from './ActivityLogService';
import PasswordUtils from '../utils/PasswordUtils';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.sessionTimeout = null;
    this.isLoggingOut = false;
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
  async loginFieldTeam(identifier, password) {
    try {
      console.log('AuthService: Attempting field team login for:', identifier);

      // Coba cari field team berdasarkan username, email, atau phone
      const { data: ftRows, error: ftError } = await supabase
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
        .or(`username.eq.${identifier},email.eq.${identifier},phone.eq.${identifier}`)
        .eq('status', 'active');

      console.log('AuthService: Field team query result:', { ftRows, ftError });

      if (ftError) {
        throw ftError;
      }

      if (!ftRows || ftRows.length === 0) {
        return { success: false, message: 'Akun tidak ditemukan atau tidak aktif' };
      }

      const ftRow = ftRows[0]; // Ambil yang pertama jika ada multiple match

      // Verifikasi password (untuk sementara plain text, nanti bisa di-hash)
      if (ftRow.password !== password) {
        return { success: false, message: 'Password salah' };
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

  // Get current user (with logout check)
  getCurrentUser() {
    // Return null if logout is in progress
    if (this.isLoggingOut) {
      return null;
    }
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
    // Prevent multiple logout calls
    if (this.isLoggingOut) {
      console.log('AuthService: Logout already in progress, skipping');
      return { success: true };
    }

    try {
      console.log('AuthService: Starting logout process');
      this.isLoggingOut = true;

      // Clear session timeout immediately
      if (this.sessionTimeout) {
        clearTimeout(this.sessionTimeout);
        this.sessionTimeout = null;
      }

      // Clear user data immediately to prevent flicker
      console.log('AuthService: Clearing user data');
      this.currentUser = null;

      // Clear AsyncStorage with multiple attempts
      try {
        await AsyncStorage.multiRemove(['currentUser', 'user_session']);
        console.log('AuthService: AsyncStorage cleared successfully');
      } catch (storageError) {
        console.warn('AuthService: Failed to clear AsyncStorage:', storageError);
        // Try individual removal
        try {
          await AsyncStorage.removeItem('currentUser');
          await AsyncStorage.removeItem('user_session');
        } catch (fallbackError) {
          console.error('AuthService: Fallback storage clear failed:', fallbackError);
        }
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      console.log('AuthService: Logout completed successfully');
      return { success: true };
    } catch (error) {
      console.error('AuthService: Critical logout error:', error);

      // Force clear user data even on error
      this.currentUser = null;
      try {
        await AsyncStorage.multiRemove(['currentUser', 'user_session']);
      } catch (storageError) {
        console.error('AuthService: Failed to clear storage on error:', storageError);
      }

      // Return success to prevent UI issues
      return { success: true };
    } finally {
      this.isLoggingOut = false;
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
        console.error('AuthService: No current user found');
        return { success: false, message: 'User tidak ditemukan' };
      }

      console.log('AuthService: Current user:', {
        id: this.currentUser.id,
        role: this.currentUser.role,
        fullName: this.currentUser.fullName
      });

      const table = this.isAdmin() ? 'admins' : 'field_teams';
      const { fullName, email, phone, profile_image, password } = profileData;

      console.log('AuthService: Profile data received:', {
        fullName,
        email,
        phone,
        profile_image: profile_image ? 'provided' : 'not provided',
        password: password ? 'provided' : 'not provided'
      });

      // Validate required fields
      if (!fullName || fullName.trim() === '') {
        return { success: false, message: 'Nama lengkap harus diisi' };
      }

      // Prepare update data - only include fields that are not undefined/null
      const updateData = {
        full_name: fullName.trim(),
      };

      // Add email for admin, phone for field team
      if (this.isAdmin()) {
        if (email && email.trim() !== '') {
          updateData.email = email.trim();
        }
      } else {
        if (phone && phone.trim() !== '') {
          updateData.phone = phone.trim();
        }
      }

      // Add profile image if provided
      if (profile_image !== undefined) {
        updateData.profile_image = profile_image;
      }

      // Add password if provided
      if (password) {
        updateData.password = password;
      }

      console.log('AuthService: Updating profile in table:', table);
      console.log('AuthService: Update data:', {
        ...updateData,
        password: password ? '[HIDDEN]' : undefined
      });

      // Update profile row in public table
      const { data: updatedData, error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', this.currentUser.id)
        .select();

      if (error) {
        console.error('AuthService: Database update error:', error);
        console.error('AuthService: Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('AuthService: Profile updated successfully:', updatedData);

      // Optionally update auth user email/display name
      if (email && email !== this.currentUser.email) {
        await supabase.auth.updateUser({ email });
      }

      // Update current user cache
      this.currentUser.fullName = fullName;
      this.currentUser.email = email;
      this.currentUser.phone = phone;

      // Update profile image in cache if provided
      if (profile_image !== undefined) {
        this.currentUser.profileImage = profile_image;
      }

      await this.setCurrentUser(this.currentUser);

      await ActivityLogService.logActivity(
        this.currentUser.id,
        this.currentUser.role,
        'update_profile',
        'Profil berhasil diperbarui'
      );

      return { success: true, message: 'Profil berhasil diperbarui' };
    } catch (error) {
      console.error('AuthService: Update profile error:', error);
      console.error('AuthService: Error stack:', error.stack);

      // Provide more specific error messages
      let errorMessage = 'Terjadi kesalahan saat memperbarui profil';

      if (error.code === 'PGRST116') {
        errorMessage = 'User tidak ditemukan di database';
      } else if (error.code === '23505') {
        errorMessage = 'Email atau nomor telepon sudah digunakan';
      } else if (error.code === '23502') {
        errorMessage = 'Data yang diperlukan tidak lengkap';
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      return { success: false, message: errorMessage };
    }
  }
}

export default new AuthService();
