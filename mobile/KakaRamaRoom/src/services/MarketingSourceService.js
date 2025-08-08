import { supabase } from '../config/supabase';

class MarketingSourceService {
  /**
   * Get all marketing sources
   * @returns {Promise<Object>}
   */
  async getAllMarketingSources() {
    try {
      const { data: sources, error } = await supabase
        .from('marketing_sources')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, data: [] };
        }
        throw error;
      }

      return {
        success: true,
        data: sources || [],
      };
    } catch (error) {
      console.error('Error getting marketing sources:', error);
      return {
        success: false,
        message: 'Gagal mengambil data sumber marketing',
      };
    }
  }

  /**
   * Search marketing sources
   * @param {string} searchTerm - Search term
   * @returns {Promise<Object>}
   */
  async searchMarketingSources(searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return this.getAllMarketingSources();
      }

      const { data: sources, error } = await supabase
        .from('marketing_sources')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${searchTerm.trim()}%`)
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: sources || [],
      };
    } catch (error) {
      console.error('Error searching marketing sources:', error);
      return {
        success: false,
        message: 'Gagal mencari sumber marketing',
      };
    }
  }

  /**
   * Add new marketing source if not exists
   * @param {string} name - Marketing source name
   * @returns {Promise<Object>}
   */
  async addMarketingSourceIfNotExists(name) {
    try {
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          message: 'Nama sumber marketing tidak boleh kosong',
        };
      }

      const trimmedName = name.trim();

      // Call the database function
      const { data, error } = await supabase
        .rpc('add_marketing_source_if_not_exists', {
          marketing_name: trimmedName
        });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: { id: data, name: trimmedName },
        message: 'Sumber marketing berhasil ditambahkan',
      };
    } catch (error) {
      console.error('Error adding marketing source:', error);
      return {
        success: false,
        message: 'Gagal menambahkan sumber marketing',
      };
    }
  }

  /**
   * Increment usage count for marketing source
   * @param {string} name - Marketing source name
   * @returns {Promise<Object>}
   */
  async incrementUsage(name) {
    try {
      if (!name || name.trim().length === 0) {
        return { success: true }; // No need to increment if no name
      }

      const { error } = await supabase
        .rpc('increment_marketing_usage', {
          marketing_name: name.trim()
        });

      if (error) {
        console.error('Error incrementing marketing usage:', error);
        // Don't fail the main operation if this fails
      }

      return { success: true };
    } catch (error) {
      console.error('Error incrementing marketing usage:', error);
      return { success: true }; // Don't fail the main operation
    }
  }

  /**
   * Get marketing source suggestions based on input
   * @param {string} input - User input
   * @param {number} limit - Maximum number of suggestions
   * @returns {Promise<Object>}
   */
  async getMarketingSuggestions(input = '', limit = 10) {
    try {
      let query = supabase
        .from('marketing_sources')
        .select('name')
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true })
        .limit(limit);

      // If input provided, filter by it
      if (input && input.trim().length > 0) {
        query = query.ilike('name', `%${input.trim()}%`);
      }

      const { data: sources, error } = await query;

      if (error) {
        throw error;
      }

      // Extract just the names
      const suggestions = sources?.map(source => source.name) || [];

      // If input doesn't match any existing source, add it as a suggestion
      if (input && input.trim().length > 0) {
        const trimmedInput = input.trim();
        const exactMatch = suggestions.find(s => s.toLowerCase() === trimmedInput.toLowerCase());
        
        if (!exactMatch) {
          suggestions.unshift(trimmedInput); // Add to beginning
        }
      }

      return {
        success: true,
        data: suggestions.slice(0, limit), // Ensure we don't exceed limit
      };
    } catch (error) {
      console.error('Error getting marketing suggestions:', error);
      return {
        success: false,
        message: 'Gagal mengambil saran marketing',
      };
    }
  }
}

export default new MarketingSourceService();
