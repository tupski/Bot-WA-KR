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

const FieldDashboardScreen = ({ navigation }) => {
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

  const quickActions = [
    {
      title: 'Check-in Baru',
      subtitle: 'Input data checkin tamu',
      icon: 'add-circle',
      onPress: () => navigation.navigate('FieldCheckin'),
      color: COLORS.success,
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

      {/* Recent Activity */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Aktivitas Terbaru</Text>
        <View style={styles.emptyState}>
          <Icon name="history" size={48} color={COLORS.gray400} />
          <Text style={styles.emptyText}>Belum ada aktivitas</Text>
          <Text style={styles.emptySubtext}>
            Aktivitas checkin akan muncul di sini
          </Text>
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
});

export default FieldDashboardScreen;
