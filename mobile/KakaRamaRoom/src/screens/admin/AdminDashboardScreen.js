import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES, SCREENS } from '../../config/constants';
import NotificationIcon from '../../components/NotificationIcon';
import AuthService from '../../services/AuthService';
import SyncStatusIndicator from '../../components/SyncStatusIndicator';
import { useAutoRefresh } from '../../hooks/useRealtime';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import CheckinService from '../../services/CheckinService';
import BusinessDayService from '../../services/BusinessDayService';

const AdminDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState({
    totalApartments: 0,
    availableUnits: 0,
    occupiedUnits: 0,
  });

  useEffect(() => {
    loadUserData();
    loadDashboardStats();
  }, []);

  const loadUserData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  /**
   * Get business day range menggunakan BusinessDayService
   */
  const getBusinessDayRange = () => {
    const businessDayRange = BusinessDayService.getCurrentBusinessDayRange();
    return {
      start: businessDayRange.start,
      end: businessDayRange.end,
      businessDate: businessDayRange.businessDate,
      businessDateString: businessDayRange.businessDateString,
    };
  };

  const loadDashboardStats = async () => {
    try {
      // Get total apartments
      const apartmentsResult = await ApartmentService.getAllApartments();
      const totalApartments = apartmentsResult.success ? apartmentsResult.data.length : 0;

      // Get all units
      const unitsResult = await UnitService.getAllUnits();
      if (unitsResult.success) {
        const allUnits = unitsResult.data;
        const availableUnits = allUnits.filter(unit => unit.status === 'available').length;
        const occupiedUnits = allUnits.filter(unit => unit.status === 'occupied').length;

        setStats({
          totalApartments,
          availableUnits,
          occupiedUnits,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  // Auto-refresh when real-time changes occur
  const { isRefreshing } = useAutoRefresh(() => {
    loadUserData();
    loadDashboardStats();
  });

  const onRefresh = async () => {
    setRefreshing(true);
    loadUserData();
    await loadDashboardStats();
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
              // Reset navigation stack to login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Checkin Manual',
      icon: 'add-circle',
      onPress: () => navigation.navigate('AdminCheckin'),
      color: COLORS.primary,
    },
    {
      title: 'Laporan Checkin',
      icon: 'assessment',
      onPress: () => navigation.navigate('AdminReports'),
      color: COLORS.info,
    },
    {
      title: 'Apartemen',
      icon: 'apartment',
      onPress: () => navigation.navigate('AdminApartments'),
      color: COLORS.success,
    },
    {
      title: 'Tim Lapangan',
      icon: 'group',
      onPress: () => navigation.navigate('AdminTeams'),
      color: COLORS.warning,
    },
    {
      title: 'Unit',
      icon: 'meeting-room',
      onPress: () => navigation.navigate('AdminUnits'),
      color: COLORS.secondary,
    },
    {
      title: 'Log Aktivitas',
      icon: 'history',
      onPress: () => {
        console.log('Navigating to AdminActivityLogs');
        navigation.navigate(SCREENS.ADMIN_ACTIVITY_LOGS);
      },
      color: '#9C27B0',
    },
    {
      title: 'Pengaturan SMTP',
      icon: 'email',
      onPress: () => navigation.navigate('AdminSMTPSettings'),
      color: '#FF5722',
    },
    {
      title: 'Kirim Notifikasi',
      icon: 'campaign',
      onPress: () => navigation.navigate('AdminBroadcast'),
      color: '#E91E63',
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
          <Text style={styles.nameText}>{currentUser?.fullName || 'Admin'}</Text>
          <Text style={styles.roleText}>Administrator</Text>
        </View>
        <View style={styles.headerActions}>
          <SyncStatusIndicator />
          <NotificationIcon
            onPress={() => navigation.navigate('Notifications')}
            color={COLORS.background}
          />
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color={COLORS.background} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="apartment" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{stats.totalApartments}</Text>
          <Text style={styles.statLabel}>Apartemen</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="meeting-room" size={32} color={COLORS.success} />
          <Text style={styles.statNumber}>{stats.availableUnits}</Text>
          <Text style={styles.statLabel}>Unit Tersedia</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="home" size={32} color={COLORS.warning} />
          <Text style={styles.statNumber}>{stats.occupiedUnits}</Text>
          <Text style={styles.statLabel}>Unit Terisi</Text>
        </View>
      </View>

      {/* Menu Items - Grid Layout */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Menu Utama</Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuGridItem}
              onPress={item.onPress}
            >
              <View style={[styles.menuGridIcon, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={32} color={COLORS.background} />
              </View>
              <Text style={styles.menuGridTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuGridItem: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '31%', // 3 columns with some spacing
    marginBottom: SIZES.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 100,
  },
  menuGridIcon: {
    width: 64,
    height: 64,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  menuGridTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default AdminDashboardScreen;
