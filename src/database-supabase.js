// Supabase Database module for WhatsApp Bot
const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
require('dotenv').config();

class SupabaseDatabase {
    constructor() {
        this.supabase = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            // Load Supabase credentials from environment
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

            if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Missing Supabase environment variables. Please check .env file.');
            }

            // Create Supabase client with service role key for full access
            this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            });

            // Test connection
            await this.testConnection();
            
            this.initialized = true;
            logger.info('Supabase database berhasil diinisialisasi');
        } catch (error) {
            logger.error('Error menginisialisasi Supabase database:', error);
            throw error;
        }
    }

    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('apartments')
                .select('count', { count: 'exact', head: true });

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            logger.info('Koneksi ke Supabase berhasil');
        } catch (error) {
            logger.error('Test koneksi Supabase gagal:', error);
            throw error;
        }
    }

    // Apartment methods
    async getApartments() {
        try {
            const { data, error } = await this.supabase
                .from('apartments')
                .select('*')
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error getting apartments:', error);
            return [];
        }
    }

    async getApartmentByGroupId(groupId) {
        try {
            const { data, error } = await this.supabase
                .from('apartments')
                .select('*')
                .eq('whatsapp_group_id', groupId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            logger.error('Error getting apartment by group ID:', error);
            return null;
        }
    }

    async addApartment(apartmentData) {
        try {
            const { data, error } = await this.supabase
                .from('apartments')
                .insert(apartmentData)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error adding apartment:', error);
            throw error;
        }
    }

    // Unit methods
    async getUnits(apartmentId = null) {
        try {
            let query = this.supabase
                .from('units')
                .select(`
                    *,
                    apartments (
                        name,
                        code
                    )
                `);

            if (apartmentId) {
                query = query.eq('apartment_id', apartmentId);
            }

            const { data, error } = await query.order('unit_number');

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error getting units:', error);
            return [];
        }
    }

    async getAvailableUnits(apartmentId) {
        try {
            const { data, error } = await this.supabase
                .from('units')
                .select('*')
                .eq('apartment_id', apartmentId)
                .eq('status', 'available')
                .order('unit_number');

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error getting available units:', error);
            return [];
        }
    }

    async updateUnitStatus(unitId, status) {
        try {
            const { data, error } = await this.supabase
                .from('units')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', unitId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error updating unit status:', error);
            throw error;
        }
    }

    // Checkin methods
    async addCheckin(checkinData) {
        try {
            const { data, error } = await this.supabase
                .from('checkins')
                .insert({
                    ...checkinData,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error adding checkin:', error);
            throw error;
        }
    }

    async getActiveCheckins(apartmentId = null) {
        try {
            let query = this.supabase
                .from('checkins')
                .select(`
                    *,
                    units (
                        unit_number,
                        apartments (
                            name,
                            code
                        )
                    )
                `)
                .eq('status', 'active');

            if (apartmentId) {
                query = query.eq('apartment_id', apartmentId);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error getting active checkins:', error);
            return [];
        }
    }

    async updateCheckin(checkinId, updateData) {
        try {
            const { data, error } = await this.supabase
                .from('checkins')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', checkinId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            logger.error('Error updating checkin:', error);
            throw error;
        }
    }

    // Transaction methods (for reports)
    async getTransactionsByDateRange(startDate, endDate, apartmentName = null) {
        try {
            let query = this.supabase
                .from('checkins')
                .select(`
                    *,
                    units (
                        unit_number,
                        apartments (
                            name,
                            code
                        )
                    )
                `)
                .gte('created_at', startDate)
                .lte('created_at', endDate);

            if (apartmentName) {
                query = query.eq('units.apartments.name', apartmentName);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error('Error getting transactions by date range:', error);
            return [];
        }
    }

    // Activity log methods
    async addActivityLog(logData) {
        try {
            const { data, error } = await this.supabase
                .from('activity_logs')
                .insert({
                    ...logData,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            logger.error('Error adding activity log:', error);
            return null;
        }
    }

    // Utility methods
    async close() {
        // Supabase doesn't need explicit closing
        this.initialized = false;
        logger.info('Supabase database connection closed');
    }

    isInitialized() {
        return this.initialized;
    }
}

module.exports = new SupabaseDatabase();
