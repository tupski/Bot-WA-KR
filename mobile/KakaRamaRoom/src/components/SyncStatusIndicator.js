// Sync Status Indicator Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../config/constants';
import { useSyncStatus } from '../hooks/useRealtime';

const SyncStatusIndicator = ({ style }) => {
  const syncStatus = useSyncStatus();

  const getStatusColor = () => {
    if (syncStatus.isOnline) {
      return COLORS.success;
    }
    return COLORS.error;
  };

  const getStatusText = () => {
    if (syncStatus.isOnline) {
      return 'Online';
    }
    return 'Offline';
  };

  const formatLastSync = () => {
    if (!syncStatus.lastSync) return 'Never';
    
    const lastSyncDate = new Date(syncStatus.lastSync);
    const now = new Date();
    const diffMs = now - lastSyncDate;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return lastSyncDate.toLocaleDateString();
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      <Text style={styles.lastSyncText}>
        Last sync: {formatLastSync()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SIZES.xs,
  },
  statusText: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  lastSyncText: {
    fontSize: SIZES.caption - 1,
    color: COLORS.textSecondary,
  },
});

export default SyncStatusIndicator;
