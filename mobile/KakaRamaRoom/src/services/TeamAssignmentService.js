import { supabase } from '../config/supabase';
import AuthService from './AuthService';

class TeamAssignmentService {
  /**
   * Get apartment IDs yang bisa diakses oleh user saat ini
   * @returns {Array} Array of apartment IDs
   */
  getCurrentUserApartmentIds() {
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
      return [];
    }

    // Admin bisa akses semua apartemen
    if (currentUser.role === 'admin') {
      return null; // null berarti semua apartemen
    }

    // Tim lapangan hanya bisa akses apartemen yang di-assign
    if (currentUser.role === 'field_team') {
      return currentUser.apartmentIds || [];
    }

    return [];
  }

  /**
   * Filter query berdasarkan apartment assignment
   * @param {Object} query - Supabase query object
   * @param {string} apartmentColumn - Nama kolom apartment_id (default: 'apartment_id')
   * @returns {Object} Filtered query
   */
  filterByApartmentAssignment(query, apartmentColumn = 'apartment_id') {
    const apartmentIds = this.getCurrentUserApartmentIds();
    
    // Admin bisa akses semua
    if (apartmentIds === null) {
      return query;
    }

    // Tim lapangan hanya apartemen yang di-assign
    if (apartmentIds.length > 0) {
      return query.in(apartmentColumn, apartmentIds);
    }

    // Jika tidak ada assignment, return query yang tidak akan return data
    return query.eq(apartmentColumn, -1);
  }

  /**
   * Check apakah user bisa akses apartemen tertentu
   * @param {string} apartmentId - ID apartemen
   * @returns {boolean}
   */
  canAccessApartment(apartmentId) {
    const apartmentIds = this.getCurrentUserApartmentIds();
    
    // Admin bisa akses semua
    if (apartmentIds === null) {
      return true;
    }

    // Tim lapangan cek assignment
    return apartmentIds.includes(apartmentId);
  }

  /**
   * Check apakah user bisa akses unit tertentu
   * @param {string} unitId - ID unit
   * @returns {Promise<boolean>}
   */
  async canAccessUnit(unitId) {
    try {
      const { data: unit, error } = await supabase
        .from('units')
        .select('apartment_id')
        .eq('id', unitId)
        .single();

      if (error || !unit) {
        return false;
      }

      return this.canAccessApartment(unit.apartment_id);
    } catch (error) {
      console.error('Error checking unit access:', error);
      return false;
    }
  }

  /**
   * Check apakah user bisa akses checkin tertentu
   * @param {string} checkinId - ID checkin
   * @returns {Promise<boolean>}
   */
  async canAccessCheckin(checkinId) {
    try {
      const { data: checkin, error } = await supabase
        .from('checkins')
        .select('apartment_id')
        .eq('id', checkinId)
        .single();

      if (error || !checkin) {
        return false;
      }

      return this.canAccessApartment(checkin.apartment_id);
    } catch (error) {
      console.error('Error checking checkin access:', error);
      return false;
    }
  }

  /**
   * Get apartments yang bisa diakses user saat ini
   * @returns {Promise<Object>}
   */
  async getAccessibleApartments() {
    try {
      let query = supabase
        .from('apartments')
        .select('*')
        .order('name', { ascending: true });

      // Filter berdasarkan assignment
      query = this.filterByApartmentAssignment(query, 'id');

      const { data: apartments, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: apartments || [],
      };
    } catch (error) {
      console.error('Error getting accessible apartments:', error);
      return {
        success: false,
        message: 'Gagal mengambil data apartemen',
      };
    }
  }

  /**
   * Get units yang bisa diakses user saat ini
   * @param {string} apartmentId - Optional filter by apartment
   * @returns {Promise<Object>}
   */
  async getAccessibleUnits(apartmentId = null) {
    try {
      let query = supabase
        .from('units')
        .select(`
          *,
          apartments (
            name,
            code
          )
        `)
        .order('unit_number', { ascending: true });

      // Filter by specific apartment if provided
      if (apartmentId) {
        // Check access first
        if (!this.canAccessApartment(apartmentId)) {
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
        query = query.eq('apartment_id', apartmentId);
      } else {
        // Filter by assignment
        query = this.filterByApartmentAssignment(query, 'apartment_id');
      }

      const { data: units, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: units || [],
      };
    } catch (error) {
      console.error('Error getting accessible units:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit',
      };
    }
  }

  /**
   * Get checkins yang bisa diakses user saat ini
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>}
   */
  async getAccessibleCheckins(filters = {}) {
    try {
      let query = supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            name,
            code
          ),
          units (
            unit_number
          ),
          field_teams (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by assignment
      query = this.filterByApartmentAssignment(query, 'apartment_id');

      // Apply additional filters
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.apartmentId) {
        // Check access first
        if (!this.canAccessApartment(filters.apartmentId)) {
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.teamId) {
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      const { data: checkins, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: checkins || [],
      };
    } catch (error) {
      console.error('Error getting accessible checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin',
      };
    }
  }

  /**
   * Validate access before performing action
   * @param {string} resourceType - Type of resource (apartment, unit, checkin)
   * @param {string} resourceId - ID of resource
   * @returns {Promise<boolean>}
   */
  async validateAccess(resourceType, resourceId) {
    switch (resourceType) {
      case 'apartment':
        return this.canAccessApartment(resourceId);
      case 'unit':
        return await this.canAccessUnit(resourceId);
      case 'checkin':
        return await this.canAccessCheckin(resourceId);
      default:
        return false;
    }
  }
}

export default new TeamAssignmentService();
