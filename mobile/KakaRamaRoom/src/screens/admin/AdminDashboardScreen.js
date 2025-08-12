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
import AuthService from '../../services/AuthService';
import SyncStatusIndicator from '../../components/SyncStatusIndicator';
import { useAutoRefresh } from '../../hooks/useRealtime';
import ApartmentService from '../../services/ApartmentService';
import UnitService from '../../services/UnitService';
import CheckinService from '../../services/CheckinService';
import TestNotification from '../../utils/TestNotification';
import UnitStatusFixService from '../../services/UnitStatusFixService';
import BusinessDayService from '../../services/BusinessDayService';
import { supabase } from '../../config/supabase';

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
      console.log('AdminDashboardScreen: Loading dashboard statistics');

      // Get total apartments
      const apartmentsResult = await ApartmentService.getAllApartments();
      const totalApartments = apartmentsResult.success ? (apartmentsResult.data?.length || 0) : 0;
      console.log('AdminDashboardScreen: Total apartments:', totalApartments);

      // Get all units
      const unitsResult = await UnitService.getAllUnits();
      let availableUnits = 0;
      let occupiedUnits = 0;

      if (unitsResult.success && unitsResult.data) {
        const allUnits = unitsResult.data;
        console.log('AdminDashboardScreen: Total units:', allUnits.length);

        // Count units by status
        availableUnits = allUnits.filter(unit => unit.status === 'available').length;
        occupiedUnits = allUnits.filter(unit => unit.status === 'occupied').length;

        console.log('AdminDashboardScreen: Available units:', availableUnits);
        console.log('AdminDashboardScreen: Occupied units:', occupiedUnits);

        // Alternative: Get occupied units from active checkins
        try {
          const { data: activeCheckins, error: checkinError } = await supabase
            .from('checkins')
            .select('unit_id')
            .eq('status', 'active');

          if (!checkinError && activeCheckins) {
            const occupiedFromCheckins = activeCheckins.length;
            const availableFromCheckins = allUnits.length - occupiedFromCheckins;

            console.log('AdminDashboardScreen: Occupied from checkins:', occupiedFromCheckins);
            console.log('AdminDashboardScreen: Available from checkins:', availableFromCheckins);

            // Use checkin data if it seems more accurate
            if (occupiedFromCheckins > 0) {
              occupiedUnits = occupiedFromCheckins;
              availableUnits = availableFromCheckins;
            }
          }
        } catch (checkinError) {
          console.warn('AdminDashboardScreen: Error getting checkin data:', checkinError);
        }
      } else {
        console.warn('AdminDashboardScreen: Failed to load units:', unitsResult);
      }

      const newStats = {
        totalApartments,
        availableUnits,
        occupiedUnits,
      };

      console.log('AdminDashboardScreen: Final stats:', newStats);
      setStats(newStats);

    } catch (error) {
      console.error('AdminDashboardScreen: Error loading dashboard stats:', error);
      // Set fallback stats
      setStats({
        totalApartments: 0,
        availableUnits: 0,
        occupiedUnits: 0,
      });
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

  const testPushNotification = async () => {
    Alert.alert(
      'Test Push Notification',
      'Pilih jenis test yang ingin dijalankan:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Test FCM Token',
          onPress: async () => {
            const result = await TestNotification.testFCMToken();
            Alert.alert(
              result ? 'Success' : 'Failed',
              result ? 'FCM Token test passed!' : 'FCM Token test failed. Check console logs.'
            );
          },
        },
        {
          text: 'Test Manual Push',
          onPress: async () => {
            const result = await TestNotification.testManualPushNotification();
            Alert.alert(
              result ? 'Success' : 'Failed',
              result ? 'Manual push notification sent!' : 'Manual push failed. Check console logs.'
            );
          },
        },
        {
          text: 'Run All Tests',
          onPress: async () => {
            const results = await TestNotification.runAllTests();
            const passedCount = Object.values(results).filter(Boolean).length;
            const totalCount = Object.keys(results).length;
            Alert.alert(
              'Test Results',
              `${passedCount}/${totalCount} tests passed. Check console for details.`
            );
          },
        },
      ]
    );
  };

  const fixUnitStatus = async () => {
    Alert.alert(
      'Fix Unit Status',
      'Perbaiki status unit yang tidak konsisten:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Fix Orphaned Occupied',
          onPress: async () => {
            const result = await UnitStatusFixService.fixOrphanedOccupiedUnits();
            Alert.alert(
              result.success ? 'Success' : 'Failed',
              `${result.message}\nFixed: ${result.fixed} units`
            );
          },
        },
        {
          text: 'Fix Stuck Cleaning',
          onPress: async () => {
            const result = await UnitStatusFixService.fixStuckCleaningUnits();
            Alert.alert(
              result.success ? 'Success' : 'Failed',
              `${result.message}\nFixed: ${result.fixed} units`
            );
          },
        },
        {
          text: 'Fix All Issues',
          onPress: async () => {
            const results = await UnitStatusFixService.runAllFixes();
            Alert.alert(
              'Fix Results',
              `Total fixed: ${results.totalFixed} units\nCheck console for details.`
            );
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

  // Tools & Debug - kategori terpisah dengan ikon compact
  const debugTools = [
    {
      title: 'Test Push Notification',
      icon: 'bug-report',
      onPress: () => testPushNotification(),
      color: '#FF9800',
    },
    {
      title: 'Fix Unit Status',
      icon: 'build',
      onPress: () => fixUnitStatus(),
      color: '#9C27B0',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section - Header konten dipindah ke sini tanpa notifikasi */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Selamat Datang,</Text>
          <Text style={styles.nameText}>{currentUser?.fullName || 'Admin'}</Text>
          <Text style={styles.roleText}>Administrator</Text>
        </View>
        <View style={styles.welcomeActions}>
          <SyncStatusIndicator />
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
          {quickActions.map((item, index) => (
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

      {/* Debug Tools - Compact Section */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugSectionTitle}>Tools & Debug</Text>
        <View style={styles.debugGrid}>
          {debugTools.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.debugItem}
              onPress={item.onPress}
            >
              <View style={[styles.debugIcon, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={20} color={COLORS.background} />
              </View>
              <Text style={styles.debugTitle}>{item.title}</Text>
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
  // Welcome section - menggantikan header lama
  welcomeSection: {
    backgroundColor: COLORS.primary,
    padding: SIZES.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeActions: {
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
  // Debug Tools Styles - Compact
  debugContainer: {
    backgroundColor: COLORS.background,
    margin: SIZES.md,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  debugSectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  debugGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  debugItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: SIZES.xs,
  },
  debugIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  debugTitle: {
    fontSize: SIZES.caption,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },
});

export default AdminDashboardScreen;
