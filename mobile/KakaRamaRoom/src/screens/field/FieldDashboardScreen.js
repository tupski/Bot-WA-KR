import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, CHECKIN_STATUS } from '../../config/constants';
import AuthService from '../../services/AuthService';
import CheckinService from '../../services/CheckinService';

const FieldDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeCheckins, setActiveCheckins] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadActiveCheckins();
    }
  }, [currentUser]);

  // Auto refresh setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentUser) {
        loadActiveCheckins();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const loadUserData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  /**
   * Load checkin aktif untuk tim lapangan
   */
  const loadActiveCheckins = async () => {
    try {
      if (!currentUser) return;

      const result = await CheckinService.getActiveCheckins(currentUser.id);
      if (result.success) {
        setActiveCheckins(result.data);
      } else {
        console.error('Load active checkins error:', result.message);
      }
    } catch (error) {
      console.error('Load active checkins error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveCheckins();
    setRefreshing(false);
  };

  /**
   * Konfirmasi early checkout
   * @param {Object} checkin - Data checkin yang akan di-checkout
   */
  const confirmEarlyCheckout = (checkin) => {
    const checkoutTime = new Date(checkin.checkout_time);
    const now = new Date();
    const remainingHours = Math.ceil((checkoutTime - now) / (1000 * 60 * 60));

    Alert.alert(
      'Konfirmasi Early Checkout',
      `Apakah Anda yakin ingin checkout unit ${checkin.unit_number} sekarang?\n\nSisa waktu: ${remainingHours > 0 ? remainingHours + ' jam' : 'Sudah lewat waktu'}`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Checkout',
          style: 'destructive',
          onPress: () => handleEarlyCheckout(checkin.id),
        },
      ]
    );
  };

  /**
   * Proses early checkout
   * @param {number} checkinId - ID checkin yang akan di-checkout
   */
  const handleEarlyCheckout = async (checkinId) => {
    try {
      const result = await CheckinService.earlyCheckout(
        checkinId,
        currentUser.id,
        'field_team'
      );

      if (result.success) {
        Alert.alert('Sukses', result.message);
        await loadActiveCheckins();
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Early checkout error:', error);
      Alert.alert('Error', 'Gagal melakukan early checkout');
    }
  };

  /**
   * Navigate ke extend screen
   * @param {Object} checkin - Data checkin yang akan di-extend
   */
  const navigateToExtend = (checkin) => {
    navigation.navigate('FieldExtend', { checkinData: checkin });
  };

  /**
   * Hitung sisa waktu checkin
   * @param {string} checkoutTime - Waktu checkout dalam ISO string
   * @returns {Object} - Object dengan informasi sisa waktu
   */
  const calculateRemainingTime = (checkoutTime) => {
    const checkout = new Date(checkoutTime);
    const now = new Date();
    const diff = checkout - now;

    if (diff <= 0) {
      return { isOvertime: true, text: 'Sudah lewat waktu', color: COLORS.error };
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 1) {
      return {
        isOvertime: false,
        text: `${minutes} menit lagi`,
        color: COLORS.warning
      };
    }

    return {
      isOvertime: false,
      text: `${hours} jam ${minutes} menit lagi`,
      color: hours < 2 ? COLORS.warning : COLORS.success
    };
  };

  const handleLogout = async () => {
    Alert.alert(
      'Konfirmasi Logout',
      'Apakah Anda yakin ingin keluar dari aplikasi?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const result = await AuthService.logout();
            if (result.success) {
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  const quickActions = [
    {
      title: 'Check-in Baru',
      subtitle: 'Input data checkin tamu',
      icon: 'add-circle',
      onPress: () => navigation.navigate('FieldCheckin'),
      color: COLORS.success,
    },
    {
      title: 'Unit Overview',
      subtitle: 'Lihat semua unit & booking langsung',
      icon: 'view-module',
      onPress: () => navigation.navigate('FieldUnitsOverview'),
      color: COLORS.primary,
    },
    {
      title: 'Status Unit',
      subtitle: 'Lihat status unit apartemen',
      icon: 'meeting-room',
      onPress: () => navigation.navigate('FieldUnits'),
      color: COLORS.info,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Selamat Datang,</Text>
          <Text style={styles.nameText}>{currentUser?.fullName || 'Tim Lapangan'}</Text>
          <Text style={styles.roleText}>Tim Lapangan</Text>
          {currentUser?.apartmentNames && (
            <Text style={styles.apartmentText}>
              {currentUser.apartmentNames.join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="apartment" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>
            {currentUser?.apartmentIds?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Apartemen</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="check-circle" size={32} color={COLORS.success} />
          <Text style={styles.statNumber}>-</Text>
          <Text style={styles.statLabel}>Checkin Hari Ini</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="meeting-room" size={32} color={COLORS.warning} />
          <Text style={styles.statNumber}>-</Text>
          <Text style={styles.statLabel}>Unit Terisi</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        {quickActions.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={24} color={COLORS.background} />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={COLORS.gray400} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Active Checkins */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Checkin Aktif</Text>
        {activeCheckins.length > 0 ? (
          <FlatList
            data={activeCheckins}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const remainingTime = calculateRemainingTime(item.checkout_time);

              return (
                <View style={styles.checkinCard}>
                  <View style={styles.checkinHeader}>
                    <View style={styles.checkinInfo}>
                      <Text style={styles.unitNumber}>{item.unit_number}</Text>
                      <Text style={styles.apartmentName}>{item.apartment_name}</Text>
                      <Text style={styles.checkoutTime}>
                        Checkout: {new Date(item.checkout_time).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: item.status === CHECKIN_STATUS.ACTIVE ? COLORS.success : COLORS.warning },
                      ]}
                    >
                      <Text style={styles.statusText}>
                        {item.status === CHECKIN_STATUS.ACTIVE ? 'Aktif' : 'Extended'}
                      </Text>
                    </View>
                  </View>

                  {/* Remaining Time */}
                  <View style={styles.remainingTimeContainer}>
                    <Icon
                      name={remainingTime.isOvertime ? 'warning' : 'schedule'}
                      size={16}
                      color={remainingTime.color}
                    />
                    <Text style={[styles.remainingTimeText, { color: remainingTime.color }]}>
                      {remainingTime.text}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.extendButton]}
                      onPress={() => navigateToExtend(item)}
                    >
                      <Icon name="access-time" size={18} color={COLORS.background} />
                      <Text style={styles.actionButtonText}>Extend</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.checkoutButton]}
                      onPress={() => confirmEarlyCheckout(item)}
                    >
                      <Icon name="exit-to-app" size={18} color={COLORS.background} />
                      <Text style={styles.actionButtonText}>Checkout</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Tidak ada checkin aktif</Text>
            <Text style={styles.emptySubtext}>
              Checkin aktif akan muncul di sini
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray100,
  },
  header: {
    backgroundColor: COLORS.primary,
    padding: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: SIZES.body,
    color: COLORS.background,
    opacity: 0.8,
  },
  nameText: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
    marginTop: SIZES.xs,
  },
  roleText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    opacity: 0.8,
    marginTop: SIZES.xs / 2,
  },
  apartmentText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    opacity: 0.9,
    marginTop: SIZES.xs / 2,
    fontWeight: '500',
  },
  logoutButton: {
    padding: SIZES.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SIZES.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SIZES.xs,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  statLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs / 2,
  },
  menuContainer: {
    padding: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  menuItem: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs / 2,
  },
  emptyState: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.xl,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptyText: {
    fontSize: SIZES.h6,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  checkinCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  checkinHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  checkinInfo: {
    flex: 1,
  },
  unitNumber: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs / 2,
  },
  apartmentName: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs / 2,
  },
  checkoutTime: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: SIZES.radius / 2,
  },
  statusText: {
    fontSize: SIZES.caption,
    color: COLORS.background,
    fontWeight: '500',
  },
  remainingTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius / 2,
  },
  remainingTimeText: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: SIZES.radius,
    flex: 1,
    marginHorizontal: SIZES.xs,
  },
  extendButton: {
    backgroundColor: COLORS.warning,
  },
  checkoutButton: {
    backgroundColor: COLORS.error,
  },
  actionButtonText: {
    fontSize: SIZES.body,
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
});

export default FieldDashboardScreen;
