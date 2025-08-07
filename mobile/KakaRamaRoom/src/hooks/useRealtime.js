// React hook untuk real-time sync
import { useState, useEffect, useCallback } from 'react';
import RealtimeService from '../services/RealtimeService';

// Hook untuk listen real-time changes
export const useRealtime = (eventName, callback) => {
  useEffect(() => {
    if (callback && typeof callback === 'function') {
      RealtimeService.addEventListener(eventName, callback);
      
      return () => {
        RealtimeService.removeEventListener(eventName, callback);
      };
    }
  }, [eventName, callback]);
};

// Hook untuk checkin changes
export const useCheckinChanges = (onCheckinChange) => {
  useRealtime('checkin_changed', onCheckinChange);
};

// Hook untuk unit changes
export const useUnitChanges = (onUnitChange) => {
  useRealtime('unit_changed', onUnitChange);
};

// Hook untuk apartment changes
export const useApartmentChanges = (onApartmentChange) => {
  useRealtime('apartment_changed', onApartmentChange);
};

// Hook untuk activity log changes
export const useActivityLogChanges = (onActivityLogChange) => {
  useRealtime('activity_log_added', onActivityLogChange);
};

// Hook untuk connection status
export const useRealtimeStatus = () => {
  const [status, setStatus] = useState(RealtimeService.getConnectionStatus());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(RealtimeService.getConnectionStatus());
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return status;
};

// Hook untuk recent changes
export const useRecentChanges = (table, limit = 10) => {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadChanges = useCallback(async () => {
    try {
      setLoading(true);
      const recentChanges = await RealtimeService.getRecentChanges(table, limit);
      setChanges(recentChanges);
    } catch (error) {
      console.error('Error loading recent changes:', error);
    } finally {
      setLoading(false);
    }
  }, [table, limit]);
  
  useEffect(() => {
    loadChanges();
  }, [loadChanges]);
  
  // Refresh changes when relevant events occur
  useEffect(() => {
    const eventName = `${table.slice(0, -1)}_changed`; // checkins -> checkin_changed
    const handleChange = () => {
      loadChanges();
    };
    
    RealtimeService.addEventListener(eventName, handleChange);
    
    return () => {
      RealtimeService.removeEventListener(eventName, handleChange);
    };
  }, [table, loadChanges]);
  
  return { changes, loading, refresh: loadChanges };
};

// Hook untuk auto-refresh data when changes occur
export const useAutoRefresh = (refreshFunction, dependencies = []) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      if (refreshFunction && typeof refreshFunction === 'function') {
        await refreshFunction();
      }
    } catch (error) {
      console.error('Error in auto refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFunction, isRefreshing]);
  
  // Listen to all relevant changes
  useCheckinChanges(handleRefresh);
  useUnitChanges(handleRefresh);
  useApartmentChanges(handleRefresh);
  
  return { isRefreshing, refresh: handleRefresh };
};

// Hook untuk sync status indicator
export const useSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: true,
    lastSync: null,
    pendingChanges: 0
  });
  
  const status = useRealtimeStatus();
  
  useEffect(() => {
    setSyncStatus(prev => ({
      ...prev,
      isOnline: status.isConnected,
      lastSync: status.isConnected ? new Date().toISOString() : prev.lastSync
    }));
  }, [status.isConnected]);
  
  // Listen to any changes to update last sync time
  const updateLastSync = useCallback(() => {
    setSyncStatus(prev => ({
      ...prev,
      lastSync: new Date().toISOString()
    }));
  }, []);
  
  useCheckinChanges(updateLastSync);
  useUnitChanges(updateLastSync);
  useApartmentChanges(updateLastSync);
  useActivityLogChanges(updateLastSync);
  
  return syncStatus;
};
