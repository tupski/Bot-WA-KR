// Sync Status Indicator Component
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../config/constants';

const SyncStatusIndicator = ({ style }) => {
  // Simplified - always show online since we're using Supabase
  return (
    <View style={[styles.container, style]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: COLORS.success }]} />
        <Text style={styles.statusText}>Online</Text>
      </View>
      <Text style={styles.lastSyncText}>
        Real-time sync
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
