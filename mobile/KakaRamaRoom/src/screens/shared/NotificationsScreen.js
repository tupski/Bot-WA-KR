import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import NotificationService from '../../services/NotificationService';
import { useModernAlert } from '../../components/ModernAlert';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { showAlert, AlertComponent } = useModernAlert();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await NotificationService.getUserNotifications();
      
      if (result.success) {
        setNotifications(result.data);
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Gagal memuat notifikasi',
        });
      }
    } catch (error) {
      console.error('NotificationsScreen: Error loading notifications:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Terjadi kesalahan saat memuat notifikasi',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      const success = await NotificationService.markAsRead(notificationId);
      if (success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('NotificationsScreen: Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const success = await NotificationService.markAllAsRead();
      if (success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        showAlert({
          type: 'success',
          title: 'Berhasil',
          message: 'Semua notifikasi telah ditandai sebagai dibaca',
        });
      }
    } catch (error) {
      console.error('NotificationsScreen: Error marking all as read:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal menandai semua notifikasi sebagai dibaca',
      });
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit yang lalu`;
      if (diffHours < 24) return `${diffHours} jam yang lalu`;
      if (diffDays < 7) return `${diffDays} hari yang lalu`;
      
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (error) {
      return 'Tanggal tidak valid';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'checkin_reminder':
        return 'schedule';
      case 'checkout_reminder':
        return 'exit-to-app';
      case 'broadcast':
        return 'campaign';
      default:
        return 'notifications';
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.is_read && styles.unreadNotification,
      ]}
      onPress={() => markAsRead(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Icon
            name={getNotificationIcon(item.data?.type)}
            size={24}
            color={!item.is_read ? COLORS.primary : COLORS.gray400}
          />
          <View style={styles.notificationTextContainer}>
            <Text style={[
              styles.notificationTitle,
              !item.is_read && styles.unreadText,
            ]}>
              {item.title}
            </Text>
            <Text style={styles.notificationTime}>
              {formatDate(item.received_at || item.created_at)}
            </Text>
          </View>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>
        
        {item.body && (
          <Text style={styles.notificationBody}>
            {item.body}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="notifications-none" size={64} color={COLORS.gray400} />
      <Text style={styles.emptyStateText}>Tidak ada notifikasi</Text>
      <Text style={styles.emptyStateSubtext}>
        Notifikasi akan muncul di sini
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat notifikasi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifikasi</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Tandai Semua</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={notifications.length === 0 && styles.emptyContainer}
        showsVerticalScrollIndicator={false}
      />

      <AlertComponent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
    textAlign: 'center',
  },
  markAllButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  markAllText: {
    color: COLORS.primary,
    fontSize: SIZES.body,
    fontWeight: '600',
  },
  notificationItem: {
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.xs,
    borderRadius: SIZES.radius,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notificationContent: {
    padding: SIZES.md,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationTextContainer: {
    flex: 1,
    marginLeft: SIZES.sm,
  },
  notificationTitle: {
    fontSize: SIZES.body,
    color: COLORS.text,
    fontWeight: '500',
  },
  unreadText: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  notificationTime: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  notificationBody: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginLeft: SIZES.xs,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
  },
  emptyStateText: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  emptyStateSubtext: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
});

export default NotificationsScreen;
