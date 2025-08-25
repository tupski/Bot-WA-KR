// Real-time sync service untuk mobile app
import { supabase } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

class RealtimeService {
  constructor() {
    this.subscriptions = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  // Initialize real-time connection
  async initialize() {
    try {
      console.log('🔄 Initializing real-time sync...');
      
      // Test connection first
      const { data, error } = await supabase
        .from('apartments')
        .select('count', { count: 'exact', head: true });

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      this.isConnected = true;
      console.log('✅ Real-time sync initialized');
      
      // Setup subscriptions
      await this.setupSubscriptions();
      
    } catch (error) {
      console.error('❌ Failed to initialize real-time sync:', error);
      this.isConnected = false;
      
      // Retry connection
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Retrying connection (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.initialize(), 5000);
      }
    }
  }

  // Setup real-time subscriptions
  async setupSubscriptions() {
    try {
      // Subscribe to checkins changes
      this.subscribeToCheckins();
      
      // Subscribe to units status changes
      this.subscribeToUnits();
      
      // Subscribe to apartments changes
      this.subscribeToApartments();
      
      // Subscribe to activity logs
      this.subscribeToActivityLogs();
      
      console.log('✅ Real-time subscriptions setup complete');
    } catch (error) {
      console.error('❌ Failed to setup subscriptions:', error);
    }
  }

  // Subscribe to checkins table changes
  subscribeToCheckins() {
    const subscription = supabase
      .channel('checkins-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'checkins' 
        }, 
        (payload) => {
          console.log('🔄 Checkins change detected:', payload);
          this.handleCheckinChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('checkins', subscription);
  }

  // Subscribe to units table changes
  subscribeToUnits() {
    const subscription = supabase
      .channel('units-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'units' 
        }, 
        (payload) => {
          console.log('🔄 Units change detected:', payload);
          this.handleUnitChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('units', subscription);
  }

  // Subscribe to apartments table changes
  subscribeToApartments() {
    const subscription = supabase
      .channel('apartments-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'apartments' 
        }, 
        (payload) => {
          console.log('🔄 Apartments change detected:', payload);
          this.handleApartmentChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('apartments', subscription);
  }

  // Subscribe to activity logs
  subscribeToActivityLogs() {
    const subscription = supabase
      .channel('activity-logs-changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'activity_logs' 
        }, 
        (payload) => {
          console.log('🔄 New activity log:', payload);
          this.handleActivityLogChange(payload);
        }
      )
      .subscribe();

    this.subscriptions.set('activity_logs', subscription);
  }

  // Handle checkin changes
  handleCheckinChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Store change in AsyncStorage for app components to read
    this.storeChange('checkins', {
      type: eventType,
      data: newRecord || oldRecord,
      timestamp: new Date().toISOString()
    });

    // Trigger custom event for components to listen
    this.triggerChangeEvent('checkin_changed', {
      eventType,
      data: newRecord || oldRecord
    });
  }

  // Handle unit changes
  handleUnitChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    this.storeChange('units', {
      type: eventType,
      data: newRecord || oldRecord,
      timestamp: new Date().toISOString()
    });

    this.triggerChangeEvent('unit_changed', {
      eventType,
      data: newRecord || oldRecord
    });
  }

  // Handle apartment changes
  handleApartmentChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    this.storeChange('apartments', {
      type: eventType,
      data: newRecord || oldRecord,
      timestamp: new Date().toISOString()
    });

    this.triggerChangeEvent('apartment_changed', {
      eventType,
      data: newRecord || oldRecord
    });
  }

  // Handle activity log changes
  handleActivityLogChange(payload) {
    const { new: newRecord } = payload;
    
    this.storeChange('activity_logs', {
      type: 'INSERT',
      data: newRecord,
      timestamp: new Date().toISOString()
    });

    this.triggerChangeEvent('activity_log_added', {
      data: newRecord
    });
  }

  // Store change in AsyncStorage
  async storeChange(table, changeData) {
    try {
      const key = `realtime_${table}_changes`;
      const existingChanges = await AsyncStorage.getItem(key);
      const changes = existingChanges ? JSON.parse(existingChanges) : [];
      
      // Keep only last 50 changes per table
      changes.push(changeData);
      if (changes.length > 50) {
        changes.splice(0, changes.length - 50);
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(changes));
    } catch (error) {
      console.error('Error storing change:', error);
    }
  }

  // Trigger custom event for components
  triggerChangeEvent(eventName, data) {
    // For React Native, we can use a simple event system
    // Components can listen to these events using listeners
    if (this.eventListeners && this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Event listener system
  eventListeners = {};

  addEventListener(eventName, callback) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push(callback);
  }

  removeEventListener(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName] = this.eventListeners[eventName]
        .filter(cb => cb !== callback);
    }
  }

  // Get recent changes
  async getRecentChanges(table, limit = 10) {
    try {
      const key = `realtime_${table}_changes`;
      const changes = await AsyncStorage.getItem(key);
      if (changes) {
        const parsedChanges = JSON.parse(changes);
        return parsedChanges.slice(-limit);
      }
      return [];
    } catch (error) {
      console.error('Error getting recent changes:', error);
      return [];
    }
  }

  // Cleanup subscriptions
  cleanup() {
    console.log('🧹 Cleaning up real-time subscriptions...');
    
    this.subscriptions.forEach((subscription, key) => {
      try {
        supabase.removeChannel(subscription);
        console.log(`✅ Unsubscribed from ${key}`);
      } catch (error) {
        console.error(`❌ Error unsubscribing from ${key}:`, error);
      }
    });
    
    this.subscriptions.clear();
    this.isConnected = false;
    this.eventListeners = {};
    
    console.log('✅ Real-time cleanup complete');
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptions: Array.from(this.subscriptions.keys()),
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Export singleton instance
export default new RealtimeService();
