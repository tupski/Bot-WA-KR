import { supabase } from '../config/supabase';
import DatabaseManager from '../config/supabase';
import ActivityLogService from './ActivityLogService';
import UnitService from './UnitService';
import TeamAssignmentService from './TeamAssignmentService';
import StorageService from './StorageService';
import { ACTIVITY_ACTIONS, UNIT_STATUS, CHECKIN_STATUS } from '../config/constants';

/**
 * Service untuk mengelola data checkin
 * Menangani create, update, extend, dan early checkout
 */
class CheckinService {
  /**
   * Buat checkin baru
   * @param {Object} checkinData - Data checkin
   * @param {number} userId - ID user yang membuat checkin (optional for admin)
   * @param {string} userType - Tipe user (admin/field_team)
   */
  async createCheckin(checkinData, userId = null, userType = 'admin') {
    try {
      console.log('CheckinService: Creating checkin with data:', checkinData);

      // Validate input data
      if (!checkinData) {
        return {
          success: false,
          message: 'Data checkin tidak valid',
        };
      }

      const {
        apartmentId,
        unitId,
        durationHours,
        checkoutTime,
        paymentMethod,
        paymentAmount,
        marketingCommission,
        paymentProofPath,
        paymentProofs, // New field for multiple file objects/paths
        marketingName,
        notes,
        createdBy,
      } = checkinData;

      // Validate required fields
      if (!apartmentId || !unitId || !durationHours || !paymentAmount) {
        return {
          success: false,
          message: 'Data checkin tidak lengkap',
        };
      }

      // Validate access untuk tim lapangan
      if (userType === 'field_team') {
        const canAccess = await TeamAssignmentService.validateAccess('apartment', apartmentId);
        if (!canAccess) {
          return {
            success: false,
            message: 'Tidak memiliki akses ke apartemen ini',
          };
        }
      }

      // Use createdBy from checkinData if provided, otherwise use userId
      const finalUserId = createdBy || userId;

      // Cek apakah unit tersedia
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('status')
        .eq('id', unitId)
        .single();

      if (unitError) {
        console.error('CheckinService: Unit check error:', unitError);
        return {
          success: false,
          message: 'Unit tidak ditemukan',
        };
      }

      if (unit?.status !== 'available') {
        return {
          success: false,
          message: 'Unit tidak tersedia untuk checkin',
        };
      }

      // Calculate checkout time if not provided
      let finalCheckoutTime = checkoutTime;
      if (!finalCheckoutTime) {
        try {
          const now = new Date();
          if (isNaN(now.getTime())) {
            throw new Error('Invalid date');
          }
          finalCheckoutTime = new Date(now.getTime() + (durationHours * 60 * 60 * 1000)).toISOString();
        } catch (error) {
          console.error('CheckinService: Error calculating checkout time:', error);
          return {
            success: false,
            message: 'Gagal menghitung waktu checkout',
          };
        }
      }

      // Upload payment proofs if provided (support multiple files)
      let uploadedPaymentProofUrls = [];

      if (paymentProofs && Array.isArray(paymentProofs) && paymentProofs.length > 0) {
        console.log(`CheckinService: Uploading ${paymentProofs.length} payment proofs to Supabase Storage`);

        // Generate temporary checkin ID for file naming
        const tempCheckinId = `temp_${Date.now()}`;

        for (let i = 0; i < paymentProofs.length; i++) {
          const proof = paymentProofs[i];
          try {
            const uploadResult = await StorageService.uploadPaymentProof(proof, `${tempCheckinId}_${i + 1}`);

            if (uploadResult.success) {
              uploadedPaymentProofUrls.push(uploadResult.data.publicUrl);
              console.log(`CheckinService: Payment proof ${i + 1} uploaded successfully:`, uploadResult.data.publicUrl);
            } else {
              console.error(`CheckinService: Payment proof ${i + 1} upload failed:`, uploadResult.message);
              // Continue with other files
            }
          } catch (uploadError) {
            console.error(`CheckinService: Error uploading payment proof ${i + 1}:`, uploadError);
            // Continue with other files
          }
        }
      }

      // Convert array to JSON string for storage
      const uploadedPaymentProofUrl = uploadedPaymentProofUrls.length > 0
        ? JSON.stringify(uploadedPaymentProofUrls)
        : paymentProofPath || null;

      // Insert checkin baru
      const { data: newCheckin, error: insertError } = await supabase
        .from('checkins')
        .insert([{
          apartment_id: apartmentId,
          unit_id: unitId,
          team_id: userType === 'field_team' ? finalUserId : null,
          duration_hours: durationHours,
          checkout_time: finalCheckoutTime,
          payment_method: paymentMethod,
          payment_amount: paymentAmount,
          marketing_commission: marketingCommission || 0,
          payment_proof_path: uploadedPaymentProofUrl,
          marketing_name: marketingName,
          notes: notes,
          status: 'active',
          created_by: finalUserId
        }])
        .select()
        .single();

      if (insertError) {
        console.error('CheckinService: Insert error:', insertError);
        throw insertError;
      }

      const checkinId = newCheckin.id;

      // Update status unit menjadi occupied
      await UnitService.updateUnitStatus(unitId, UNIT_STATUS.OCCUPIED, finalUserId, userType);

      // Log aktivitas dengan detail lengkap
      await ActivityLogService.logActivity(
        finalUserId,
        userType,
        ACTIVITY_ACTIONS.CREATE_CHECKIN || 'create_checkin',
        `Checkin baru - Durasi: ${durationHours} jam, Pembayaran: ${paymentMethod}, Marketing: ${marketingName || 'N/A'}`,
        'checkins',
        checkinId,
        {
          apartmentId: apartmentId,
          unitId: unitId,
        }
      );

      console.log('CheckinService: Checkin created successfully:', newCheckin);
      return {
        success: true,
        data: { ...newCheckin, checkoutTime: finalCheckoutTime },
        message: 'Checkin berhasil dibuat',
      };
    } catch (error) {
      console.error('CheckinService: Error creating checkin:', error);
      return {
        success: false,
        message: 'Gagal membuat checkin: ' + error.message,
      };
    }
  }

  /**
   * Extend checkin yang sudah ada
   * @param {number} checkinId - ID checkin yang akan di-extend
   * @param {Object} extendData - Data extend
   * @param {number} userId - ID user yang melakukan extend
   * @param {string} userType - Tipe user
   */
  async extendCheckin(checkinId, extendData, userId, userType = 'field_team') {
    try {
      const { additionalHours, paymentMethod, paymentAmount, paymentProofPath, notes } = extendData;

      const db = DatabaseManager.getDatabase();

      // Get checkin yang akan di-extend
      const checkinResult = await db.executeSql(
        'SELECT * FROM checkins WHERE id = ? AND status IN (?, ?)',
        [checkinId, CHECKIN_STATUS.ACTIVE, CHECKIN_STATUS.EXTENDED]
      );

      if (checkinResult[0].rows.length === 0) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const checkin = checkinResult[0].rows.item(0);
      const currentCheckoutTime = new Date(checkin.checkout_time);
      const newCheckoutTime = new Date(currentCheckoutTime.getTime() + (additionalHours * 60 * 60 * 1000));

      // Insert extend record
      await db.executeSql(
        `INSERT INTO checkin_extensions 
         (checkin_id, additional_hours, new_checkout_time, payment_method, 
          payment_amount, payment_proof_path, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          checkinId,
          additionalHours,
          newCheckoutTime.toISOString(),
          paymentMethod,
          paymentAmount,
          paymentProofPath,
          notes,
          userId,
        ]
      );

      // Update checkin dengan waktu checkout baru
      await db.executeSql(
        `UPDATE checkins 
         SET checkout_time = ?, status = 'extended', updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [newCheckoutTime.toISOString(), checkinId]
      );

      // Log aktivitas
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.EXTEND_CHECKIN,
        `Extend checkin ${checkinId} selama ${additionalHours} jam`,
        'checkins',
        checkinId
      );

      return {
        success: true,
        message: 'Checkin berhasil di-extend',
      };
    } catch (error) {
      console.error('Error extending checkin:', error);
      return {
        success: false,
        message: 'Gagal extend checkin',
      };
    }
  }

  /**
   * Early checkout sebelum waktu habis
   * @param {number} checkinId - ID checkin
   * @param {number} userId - ID user yang melakukan checkout
   * @param {string} userType - Tipe user
   */
  async earlyCheckout(checkinId, userId, userType = 'field_team') {
    try {
      console.log('CheckinService: Processing early checkout for:', checkinId);

      // Get checkin data
      const { data: checkin, error: checkinError } = await supabase
        .from('checkins')
        .select('*')
        .eq('id', checkinId)
        .in('status', [CHECKIN_STATUS.ACTIVE, CHECKIN_STATUS.EXTENDED])
        .single();

      if (checkinError || !checkin) {
        return {
          success: false,
          message: 'Checkin tidak ditemukan atau sudah selesai',
        };
      }

      const now = new Date().toISOString();

      // Update status checkin menjadi early_checkout
      const { error: updateError } = await supabase
        .from('checkins')
        .update({
          status: CHECKIN_STATUS.EARLY_CHECKOUT,
          updated_at: now
        })
        .eq('id', checkinId);

      if (updateError) {
        throw updateError;
      }

      // Update status unit menjadi cleaning dengan timer
      await UnitService.updateUnitStatus(checkin.unit_id, UNIT_STATUS.CLEANING, userId, userType);

      // Start cleaning timer
      const CleaningService = require('./CleaningService').default;
      await CleaningService.startCleaning(checkin.unit_id, userId, userType);

      // Log aktivitas dengan detail lengkap
      await ActivityLogService.logActivity(
        userId,
        userType,
        ACTIVITY_ACTIONS.EARLY_CHECKOUT,
        `Early checkout - Unit akan masuk proses cleaning`,
        'checkins',
        checkinId,
        {
          apartmentId: checkin.apartment_id,
          unitId: checkin.unit_id,
        }
      );

      return {
        success: true,
        message: 'Early checkout berhasil, unit dalam proses cleaning',
      };
    } catch (error) {
      console.error('Error early checkout:', error);
      return {
        success: false,
        message: 'Gagal melakukan early checkout',
      };
    }
  }

  /**
   * Get active checkins untuk tim lapangan
   * @param {number} teamId - ID tim lapangan
   */
  async getActiveCheckins(teamId = null) {
    try {
      console.log('CheckinService: Getting active checkins for team:', teamId);

      // Use TeamAssignmentService untuk filtering
      // Note: teamId might be userId, so we filter by created_by instead
      const result = await TeamAssignmentService.getAccessibleCheckins({
        status: ['active', 'extended'],
        createdBy: teamId, // Use createdBy instead of teamId
      });

      if (!result.success) {
        return result;
      }

      // Transform data untuk compatibility
      const transformedCheckins = result.data.map(checkin => ({
        ...checkin,
        unit_number: checkin.units?.unit_number,
        apartment_name: checkin.apartments?.name,
        apartment_code: checkin.apartments?.code,
        team_name: checkin.field_teams?.full_name,
      }));

      return {
        success: true,
        data: transformedCheckins,
      };
    } catch (error) {
      console.error('Error getting active checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin aktif',
      };
    }
  }

  /**
   * Get checkin history untuk tim lapangan
   * @param {number} teamId - ID tim lapangan
   * @param {number} limit - Limit data
   */
  async getCheckinHistory(teamId, limit = 50) {
    try {
      const db = DatabaseManager.getDatabase();
      const result = await db.executeSql(
        `SELECT c.*, u.unit_number, a.name as apartment_name
         FROM checkins c
         INNER JOIN units u ON c.unit_id = u.id
         INNER JOIN apartments a ON c.apartment_id = a.id
         WHERE c.team_id = ?
         ORDER BY c.created_at DESC
         LIMIT ?`,
        [teamId, limit]
      );

      const checkins = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        checkins.push(result[0].rows.item(i));
      }

      return {
        success: true,
        data: checkins,
      };
    } catch (error) {
      console.error('Error getting checkin history:', error);
      return {
        success: false,
        message: 'Gagal mengambil riwayat checkin',
      };
    }
  }

  /**
   * Get all checkins untuk admin dengan filter
   * @param {Object} filters - Filter options
   */
  async getAllCheckins(filters = {}) {
    try {
      const db = DatabaseManager.getDatabase();
      let query = `
        SELECT c.*, u.unit_number, a.name as apartment_name, ft.full_name as team_name
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
      console.error('Error getting all checkins:', error);
      return {
        success: false,
        message: 'Gagal mengambil data checkin',
      };
    }
  }

  /**
   * Get active checkin by unit ID
   * @param {string} unitId - Unit ID
   * @returns {Promise<Object>}
   */
  async getActiveCheckinByUnit(unitId) {
    try {
      console.log('CheckinService: Getting active checkin for unit:', unitId);

      // Validate unitId
      if (!unitId) {
        return {
          success: false,
          message: 'Unit ID tidak valid',
        };
      }

      const { data: checkin, error } = await supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            id,
            name,
            code
          ),
          units (
            id,
            unit_number,
            status
          ),
          field_teams (
            id,
            full_name,
            username
          )
        `)
        .eq('unit_id', unitId)
        .in('status', ['active', 'extended']) // Use string literals instead of constants
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('CheckinService: Query result:', { checkin, error });

      if (error) {
        console.error('CheckinService: Supabase error:', error);
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: 'Tidak ada checkin aktif untuk unit ini',
          };
        }
        throw error;
      }

      if (!checkin) {
        return {
          success: false,
          message: 'Tidak ada checkin aktif untuk unit ini',
        };
      }

      console.log('CheckinService: Found active checkin:', checkin);

      return {
        success: true,
        data: checkin,
      };
    } catch (error) {
      console.error('CheckinService: Error getting active checkin by unit:', error);
      return {
        success: false,
        message: `Gagal mengambil data checkin aktif: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Get checkin by ID with full details
   * @param {string} checkinId - Checkin ID
   * @returns {Promise<Object>}
   */
  async getCheckinById(checkinId) {
    try {
      console.log('CheckinService: Getting checkin by ID:', checkinId);

      const { data: checkin, error } = await supabase
        .from('checkins')
        .select(`
          *,
          apartments (
            id,
            name,
            code
          ),
          units (
            id,
            unit_number,
            status
          ),
          field_teams (
            id,
            full_name,
            username
          )
        `)
        .eq('id', checkinId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            message: 'Checkin tidak ditemukan',
          };
        }
        throw error;
      }

      return {
        success: true,
        data: checkin,
      };
    } catch (error) {
      console.error('Error getting checkin by ID:', error);
      return {
        success: false,
        message: 'Gagal mengambil detail checkin',
      };
    }
  }
}

export default new CheckinService();
