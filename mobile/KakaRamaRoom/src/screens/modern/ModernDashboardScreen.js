/**
 * Modern Dashboard Screen untuk KakaRama Room
 * Menggunakan UI Kit baru dengan design yang lebih modern
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import * as Animatable from 'react-native-animatable';

// Import UI Components
import { DashboardHeader } from '../../components/ui/Header';
import { StatsCard, ActionCard, InfoCard } from '../../components/ui/Card';
import { PrimaryButton, SecondaryButton, FAB } from '../../components/ui/Button';

// Import Theme
import { COLORS, SPACING, LAYOUT } from '../../config/theme';

// Import Services (akan dibuat nanti)
// import AuthService from '../../services/AuthService';
// import DashboardService from '../../services/DashboardService';

const { width } = Dimensions.get('window');

const ModernDashboardScreen = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    name: 'Admin KakaRama',
    role: 'admin',
  });
  const [dashboardStats, setDashboardStats] = useState({
    totalApartments: 3,
    availableUnits: 12,
    activeCheckins: 8,
    todayRevenue: 2500000,
  });

  // Mock data untuk development
  const headerStats = [
    { value: '3', label: 'Apartemen' },
    { value: '12', label: 'Unit Tersedia' },
    { value: '8', label: 'Check-in Aktif' },
  ];

  const quickActions = [
    {
      title: 'Manajemen Unit',
      subtitle: 'Kelola status unit apartemen',
      icon: 'apartment',
      iconColor: COLORS.primary,
      onPress: () => navigation.navigate('AdminUnits'),
    },
    {
      title: 'Check-in Baru',
      subtitle: 'Proses check-in tamu baru',
      icon: 'login',
      iconColor: COLORS.secondary,
      onPress: () => navigation.navigate('AdminCheckin'),
    },
    {
      title: 'Laporan Harian',
      subtitle: 'Lihat laporan dan statistik',
      icon: 'assessment',
      iconColor: COLORS.info,
      onPress: () => navigation.navigate('AdminReports'),
    },
    {
      title: 'Tim Lapangan',
      subtitle: 'Kelola tim dan assignment',
      icon: 'group',
      iconColor: COLORS.warning,
      onPress: () => navigation.navigate('AdminTeams'),
    },
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // TODO: Load real data from services
      console.log('Loading dashboard data...');
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleMenuPress = () => {
    // TODO: Open drawer or menu
    console.log('Menu pressed');
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <View style={styles.container}>
      {/* Modern Header with Stats */}
      <DashboardHeader
        title="Dashboard"
        subtitle={`Selamat datang, ${currentUser.name}`}
        stats={headerStats}
        onMenuPress={handleMenuPress}
        onNotificationPress={handleNotificationPress}
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Cards */}
        <View style={styles.section}>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Unit Tersedia"
              value={dashboardStats.availableUnits}
              icon="home"
              iconColor={COLORS.success}
              trend="+2 dari kemarin"
              trendColor={COLORS.success}
              onPress={() => navigation.navigate('AdminUnits')}
              style={styles.statsCardHalf}
              animationDelay={100}
            />
            <StatsCard
              title="Check-in Aktif"
              value={dashboardStats.activeCheckins}
              icon="login"
              iconColor={COLORS.primary}
              trend="+3 hari ini"
              trendColor={COLORS.success}
              onPress={() => navigation.navigate('AdminCheckin')}
              style={styles.statsCardHalf}
              animationDelay={200}
            />
          </View>
          
          <StatsCard
            title="Pendapatan Hari Ini"
            value={formatCurrency(dashboardStats.todayRevenue)}
            icon="attach-money"
            iconColor={COLORS.secondary}
            trend="+15% dari kemarin"
            trendColor={COLORS.success}
            onPress={() => navigation.navigate('AdminReports')}
            animationDelay={300}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Animatable.Text 
            animation="fadeInUp" 
            delay={400}
            style={styles.sectionTitle}
          >
            Aksi Cepat
          </Animatable.Text>
          
          {quickActions.map((action, index) => (
            <ActionCard
              key={index}
              title={action.title}
              subtitle={action.subtitle}
              icon={action.icon}
              iconColor={action.iconColor}
              onPress={action.onPress}
              animationDelay={500 + (index * 100)}
            />
          ))}
        </View>

        {/* Info Cards */}
        <View style={styles.section}>
          <InfoCard
            type="info"
            title="Tips Hari Ini"
            message="Pastikan semua unit sudah dicek kebersihannya sebelum check-in tamu baru."
            animationDelay={900}
          />
          
          <InfoCard
            type="success"
            title="Sistem Berjalan Normal"
            message="Semua layanan berjalan dengan baik. Tidak ada masalah yang terdeteksi."
            animationDelay={1000}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <View style={styles.buttonRow}>
            <PrimaryButton
              title="Check-in Baru"
              icon="add"
              onPress={() => navigation.navigate('AdminCheckin')}
              style={styles.buttonHalf}
            />
            <SecondaryButton
              title="Lihat Laporan"
              icon="assessment"
              onPress={() => navigation.navigate('AdminReports')}
              style={styles.buttonHalf}
            />
          </View>
        </View>

        {/* Bottom spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="add"
        onPress={() => navigation.navigate('AdminCheckin')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: LAYOUT.screenPadding,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statsCardHalf: {
    width: (width - (LAYOUT.screenPadding * 2) - SPACING.md) / 2,
  },
  
  // Button Row
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonHalf: {
    width: (width - (LAYOUT.screenPadding * 2) - SPACING.md) / 2,
  },
  
  // Bottom spacing
  bottomSpacing: {
    height: 80, // Space for FAB
  },
});

export default ModernDashboardScreen;
