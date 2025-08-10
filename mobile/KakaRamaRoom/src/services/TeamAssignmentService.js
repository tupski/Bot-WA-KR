import { supabase } from '../config/supabase';
import AuthService from './AuthService';

class TeamAssignmentService {
  /**
   * Get apartment IDs yang bisa diakses oleh user saat ini
   * @returns {Array} Array of apartment IDs
   */
  getCurrentUserApartmentIds() {
    try {
      const currentUser = AuthService.getCurrentUser();

      if (!currentUser) {
        console.warn('TeamAssignmentService: No current user found');
        return [];
      }

      console.log('TeamAssignmentService: Current user:', currentUser.id, currentUser.role);

      // Admin bisa akses semua apartemen
      if (currentUser.role === 'admin') {
        console.log('TeamAssignmentService: Admin user - access to all apartments');
        return null; // null berarti semua apartemen
      }

      // Tim lapangan hanya bisa akses apartemen yang di-assign
      if (currentUser.role === 'field_team') {
        const apartmentIds = currentUser.apartmentIds || [];
        console.log('TeamAssignmentService: Field team user - apartment IDs:', apartmentIds);

        // Jika tidak ada assignment, berikan akses ke semua apartemen sebagai fallback
        if (apartmentIds.length === 0) {
          console.warn('TeamAssignmentService: Field team has no apartment assignments, allowing access to all');
          return null;
        }

        return apartmentIds;
      }

      console.warn('TeamAssignmentService: Unknown user role:', currentUser.role);
      return [];
    } catch (error) {
      console.error('TeamAssignmentService: Error in getCurrentUserApartmentIds:', error);
      return [];
    }
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
      console.log('TeamAssignmentService: Getting accessible units, apartmentId:', apartmentId);

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
        console.log('TeamAssignmentService: Filtering by specific apartment:', apartmentId);

        // Check access first
        if (!this.canAccessApartment(apartmentId)) {
          console.warn('TeamAssignmentService: No access to apartment:', apartmentId);
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
        query = query.eq('apartment_id', apartmentId);
      } else {
        console.log('TeamAssignmentService: Filtering by apartment assignment');

        // Filter by assignment
        try {
          query = this.filterByApartmentAssignment(query, 'apartment_id');
        } catch (filterError) {
          console.error('TeamAssignmentService: Error in filterByApartmentAssignment:', filterError);
          // Continue without filter as fallback
        }
      }

      console.log('TeamAssignmentService: Executing units query...');
      const { data: units, error } = await query;

      if (error) {
        console.error('TeamAssignmentService: Supabase query error:', error);
        throw error;
      }

      console.log('TeamAssignmentService: Retrieved units:', units?.length || 0);

      return {
        success: true,
        data: units || [],
      };
    } catch (error) {
      console.error('TeamAssignmentService: Critical error in getAccessibleUnits:', error);
      return {
        success: false,
        message: 'Gagal mengambil data unit: ' + (error.message || 'Unknown error'),
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
      console.log('TeamAssignmentService: Getting accessible checkins with filters:', filters);

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
      console.log('TeamAssignmentService: Applying apartment assignment filter');
      try {
        query = this.filterByApartmentAssignment(query, 'apartment_id');
      } catch (filterError) {
        console.error('TeamAssignmentService: Error in filterByApartmentAssignment:', filterError);
        // Continue without filter as fallback
      }

      // Apply additional filters
      if (filters.status) {
        console.log('TeamAssignmentService: Filtering by status:', filters.status);
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status);
        } else {
          query = query.eq('status', filters.status);
        }
      }

      if (filters.apartmentId) {
        console.log('TeamAssignmentService: Filtering by apartment ID:', filters.apartmentId);
        // Check access first
        if (!this.canAccessApartment(filters.apartmentId)) {
          console.warn('TeamAssignmentService: No access to apartment:', filters.apartmentId);
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
        query = query.eq('apartment_id', filters.apartmentId);
      }

      if (filters.teamId) {
        console.log('TeamAssignmentService: Filtering by team ID:', filters.teamId);
        query = query.eq('team_id', filters.teamId);
      }

      if (filters.createdBy) {
        console.log('TeamAssignmentService: Filtering by created_by:', filters.createdBy);
        query = query.eq('created_by', filters.createdBy);
      }

      console.log('TeamAssignmentService: Executing checkins query...');
      const { data: checkins, error } = await query;

      if (error) {
        console.error('TeamAssignmentService: Supabase query error:', error);
        throw error;
      }

      console.log('TeamAssignmentService: Retrieved checkins:', checkins?.length || 0);

      if (checkins && checkins.length > 0) {
        console.log('TeamAssignmentService: Sample checkin:', {
          id: checkins[0].id,
          status: checkins[0].status,
          created_by: checkins[0].created_by,
          apartment_id: checkins[0].apartment_id,
          unit_number: checkins[0].units?.unit_number
        });
      }

      return {
        success: true,
        data: checkins || [],
      };
    } catch (error) {
      console.error('TeamAssignmentService: Critical error in getAccessibleCheckins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin: ' + (error.message || 'Unknown error'),
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
