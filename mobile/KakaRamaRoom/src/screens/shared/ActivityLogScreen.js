import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ActivityLogService from '../../services/ActivityLogService';
import AuthService from '../../services/AuthService';

const ActivityLogScreen = ({ navigation }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    userType: null,
    action: null,
    limit: 50,
  });

  useEffect(() => {
    loadActivityLogs();
  }, [filters]);

  const loadActivityLogs = async () => {
    try {
      setLoading(true);
      const result = await ActivityLogService.getActivityLogs(filters);
      
      if (result.success) {
        setLogs(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal memuat log aktivitas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadActivityLogs();
    setRefreshing(false);
  };

  const showLogDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const getActionIcon = (action) => {
    const iconMap = {
      login: 'login',
      logout: 'logout',
      create_checkin: 'add-circle',
      extend_checkin: 'schedule',
      early_checkout: 'exit-to-app',
      auto_checkout: 'timer',
      create_apartment: 'apartment',
      update_apartment: 'edit',
      delete_apartment: 'delete',
      create_unit: 'meeting-room',
      update_unit: 'edit',
      delete_unit: 'delete',
      update_unit_status: 'swap-horiz',
      create_team: 'group-add',
      update_team: 'group',
      delete_team: 'group-remove',
      assign_team: 'assignment',
      export_report: 'file-download',
    };

    return iconMap[action] || 'info';
  };

  const getActionColor = (action) => {
    if (action.includes('create') || action.includes('add')) return COLORS.success;
    if (action.includes('delete') || action.includes('remove')) return COLORS.error;
    if (action.includes('update') || action.includes('edit')) return COLORS.warning;
    if (action.includes('login')) return COLORS.info;
    if (action.includes('logout')) return COLORS.textSecondary;
    return COLORS.primary;
  };

  const renderLogItem = ({ item }) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => showLogDetail(item)}
    >
      <View style={styles.logHeader}>
        <View style={[styles.actionIcon, { backgroundColor: getActionColor(item.action) + '20' }]}>
          <Icon 
            name={getActionIcon(item.action)} 
            size={20} 
            color={getActionColor(item.action)} 
          />
        </View>
        <View style={styles.logInfo}>
          <Text style={styles.actionText}>{item.actionLabel}</Text>
          <Text style={styles.userText}>
            {item.user_name || item.user_username} ({item.userTypeLabel})
          </Text>
        </View>
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>{item.displayTime}</Text>
          <Text style={styles.dateText}>{item.displayDate}</Text>
        </View>
      </View>
      
      <Text style={styles.descriptionText} numberOfLines={2}>
        {item.description}
      </Text>
      
      {(item.apartmentName || item.unitInfo) && (
        <View style={styles.locationInfo}>
          {item.apartmentName && (
            <Text style={styles.locationText}>📍 {item.apartmentName}</Text>
          )}
          {item.unitInfo && (
            <Text style={styles.locationText}>🏠 {item.unitInfo}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detail Log Aktivitas</Text>
            <TouchableOpacity
              onPress={() => setShowDetailModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedLog && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Aksi:</Text>
                <Text style={styles.detailValue}>{selectedLog.actionLabel}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>User:</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.user_name || selectedLog.user_username} ({selectedLog.userTypeLabel})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Waktu:</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.displayDate} {selectedLog.displayTime}
                </Text>
              </View>

              {selectedLog.apartmentName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Apartemen:</Text>
                  <Text style={styles.detailValue}>{selectedLog.apartmentName}</Text>
                </View>
              )}

              {selectedLog.unitInfo && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Unit:</Text>
                  <Text style={styles.detailValue}>{selectedLog.unitInfo}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Deskripsi:</Text>
                <Text style={styles.detailValue}>{selectedLog.description}</Text>
              </View>

              {selectedLog.related_table && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tabel Terkait:</Text>
                  <Text style={styles.detailValue}>{selectedLog.related_table}</Text>
                </View>
              )}

              {selectedLog.related_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>ID Terkait:</Text>
                  <Text style={styles.detailValue}>{selectedLog.related_id}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Aktivitas</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
        >
          <Icon name="refresh" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLogItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color={COLORS.gray300} />
            <Text style={styles.emptyText}>Belum ada log aktivitas</Text>
          </View>
        }
      />

      {renderDetailModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    paddingTop: SIZES.xl,
  },
  backButton: {
    padding: SIZES.sm,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
    textAlign: 'center',
  },
  refreshButton: {
    padding: SIZES.sm,
  },
  listContainer: {
    padding: SIZES.md,
  },
  logItem: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  logInfo: {
    flex: 1,
  },
  actionText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SIZES.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  locationText: {
    fontSize: SIZES.caption,
    color: COLORS.info,
    backgroundColor: COLORS.info + '20',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radius / 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray300,
  },
  modalTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SIZES.sm,
  },
  modalBody: {
    padding: SIZES.md,
  },
  detailRow: {
    marginBottom: SIZES.md,
  },
  detailLabel: {
    fontSize: SIZES.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  detailValue: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});

export default ActivityLogScreen;
