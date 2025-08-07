import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import AuthService from '../../services/AuthService';

const AdminDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh data here
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleLogout = async () => {
    const result = await AuthService.logout();
    if (result.success) {
      navigation.replace('Login');
    }
  };

  const menuItems = [
    {
      title: 'Laporan Checkin',
      subtitle: 'Lihat laporan data checkin per apartemen',
      icon: 'assessment',
      onPress: () => navigation.navigate('AdminReports'),
      color: COLORS.primary,
    },
    {
      title: 'Manajemen Apartemen',
      subtitle: 'Kelola data apartemen dan grup WhatsApp',
      icon: 'apartment',
      onPress: () => navigation.navigate('AdminApartments'),
      color: COLORS.success,
    },
    {
      title: 'Manajemen Tim Lapangan',
      subtitle: 'Kelola tim lapangan dan assignment',
      icon: 'group',
      onPress: () => navigation.navigate('AdminTeams'),
      color: COLORS.warning,
    },
    {
      title: 'Manajemen Unit',
      subtitle: 'Kelola unit dan status unit',
      icon: 'meeting-room',
      onPress: () => navigation.navigate('AdminUnits'),
      color: COLORS.info,
    },
    {
      title: 'Log Aktivitas',
      subtitle: 'Lihat aktivitas tim lapangan',
      icon: 'history',
      onPress: () => navigation.navigate('AdminActivityLogs'),
      color: COLORS.secondary,
    },
    {
      title: 'Auto-Checkout System',
      subtitle: 'Monitor dan kontrol sistem auto-checkout',
      icon: 'schedule',
      onPress: () => navigation.navigate('AdminAutoCheckout'),
      color: COLORS.warning,
    },
    {
      title: 'Top Marketing',
      subtitle: 'Lihat marketing terbaik',
      icon: 'star',
      onPress: () => navigation.navigate('AdminTopMarketing'),
      color: COLORS.error,
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
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={24} color={COLORS.background} />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="apartment" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>7</Text>
          <Text style={styles.statLabel}>Apartemen</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="group" size={32} color={COLORS.success} />
          <Text style={styles.statNumber}>-</Text>
          <Text style={styles.statLabel}>Tim Lapangan</Text>
        </View>
        <View style={styles.statCard}>
          <Icon name="meeting-room" size={32} color={COLORS.warning} />
          <Text style={styles.statNumber}>-</Text>
          <Text style={styles.statLabel}>Unit Aktif</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Menu Utama</Text>
        {menuItems.map((item, index) => (
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
});

export default AdminDashboardScreen;
