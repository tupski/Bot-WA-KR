import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SIZES, USER_ROLES } from '../../config/constants';
import ActivityLogService from '../../services/ActivityLogService';
import { useModernAlert } from '../../components/ModernAlert';

const AdminActivityLogsScreen = () => {
  // Modern Alert Hook
  const { showAlert, AlertComponent } = useModernAlert();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, admin, field_team

  useEffect(() => {
    loadActivityLogs();
  }, [filter]);

  const loadActivityLogs = async () => {
    try {
      console.log('AdminActivityLogsScreen: Loading activity logs with filter:', filter);
      setLoading(true);

      // Validasi ActivityLogService
      if (!ActivityLogService || typeof ActivityLogService.getActivityLogs !== 'function') {
        throw new Error('ActivityLogService tidak tersedia');
      }

      const result = await ActivityLogService.getActivityLogs({
        userType: filter === 'all' ? null : filter,
        limit: 100,
      });

      console.log('AdminActivityLogsScreen: Activity logs result:', result);

      if (result && result.success) {
        const logData = Array.isArray(result.data) ? result.data : [];
        setLogs(logData);
        console.log(`AdminActivityLogsScreen: Loaded ${logData.length} activity logs`);

        if (logData.length === 0) {
          showAlert({
            type: 'info',
            title: 'Info',
            message: 'Belum ada log aktivitas yang tersedia.',
          });
        }
      } else {
        console.error('AdminActivityLogsScreen: Failed to load logs:', result?.message);
        showAlert({
          type: 'error',
          title: 'Error',
          message: result?.message || 'Gagal memuat log aktivitas',
        });
        setLogs([]);
      }
    } catch (error) {
      console.error('AdminActivityLogsScreen: Error loading activity logs:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: `Gagal memuat log aktivitas: ${error.message || 'Unknown error'}`,
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivityLogs();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case USER_ROLES.ADMIN:
        return COLORS.primary;
      case USER_ROLES.FIELD_TEAM:
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const renderLogItem = ({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <View style={styles.userInfo}>
          <Text style={[styles.userType, { color: getUserTypeColor(item.user_type) }]}>
            {item.user_type === USER_ROLES.ADMIN ? 'ADMIN' : 'TIM LAPANGAN'}
          </Text>
          <Text style={styles.userName}>{item.user_name || `User ${item.user_id}`}</Text>
        </View>
        <Text style={styles.timestamp}>{formatDate(item.created_at)}</Text>
      </View>

      <View style={styles.logContent}>
        <Text style={styles.action}>{item.action.toUpperCase()}</Text>
        <Text style={styles.description}>{item.description}</Text>

        {item.related_table && (
          <Text style={styles.relatedInfo}>
            Terkait: {item.related_table} #{item.related_id}
          </Text>
        )}

        {item.ip_address && (
          <Text style={styles.ipAddress}>IP: {item.ip_address}</Text>
        )}
      </View>
    </View>
  );

  const renderFilterButton = (filterType, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat log aktivitas...</Text>
        <AlertComponent />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Aktivitas Tim</Text>
        <Text style={styles.subtitle}>Tracking aktivitas admin dan tim lapangan</Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'Semua')}
        {renderFilterButton('admin', 'Admin')}
        {renderFilterButton('field_team', 'Tim Lapangan')}
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada log aktivitas</Text>
            <Text style={styles.emptySubtext}>
              Log aktivitas akan muncul setelah ada aktivitas dari tim
            </Text>
          </View>
        }
      />

      {/* Modern Alert Component */}
      <AlertComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  header: {
    padding: SIZES.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginRight: SIZES.sm,
    borderRadius: SIZES.sm,
    backgroundColor: COLORS.lightGray,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    padding: SIZES.md,
  },
  logItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.sm,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  userInfo: {
    flex: 1,
  },
  userType: {
    fontSize: SIZES.caption,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  userName: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  timestamp: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  logContent: {
    marginTop: SIZES.xs,
  },
  action: {
    fontSize: SIZES.caption,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  description: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  relatedInfo: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  ipAddress: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.h4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
});

export default AdminActivityLogsScreen;
