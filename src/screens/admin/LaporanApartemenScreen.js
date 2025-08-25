import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ReportService from '../../services/ReportService';
import { useModernAlert } from '../../components/ModernAlert';

const { width } = Dimensions.get('window');

/**
 * Screen laporan detail per apartemen
 * Menampilkan grafik pendapatan harian, total booking, dan statistik lainnya
 */
const LaporanApartemenScreen = ({ route, navigation }) => {
  const { apartmentId, apartmentName } = route.params || {};
  const { showAlert, AlertComponent } = useModernAlert();

  // State untuk data laporan
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apartmentData, setApartmentData] = useState({
    dailyRevenue: [],
    dailyBookings: [],
    monthlyStats: {},
    unitStats: {},
  });

  useEffect(() => {
    loadApartmentData();
  }, [apartmentId]);

  /**
   * Load data laporan apartemen
   */
  const loadApartmentData = async () => {
    try {
      setLoading(true);
      console.log('LaporanApartemenScreen: Loading data for apartment:', apartmentId);

      // Simulasi data untuk sementara
      // TODO: Implement actual API calls
      const mockData = {
        dailyRevenue: [
          { date: '2025-01-08', revenue: 2500000 },
          { date: '2025-01-09', revenue: 3200000 },
          { date: '2025-01-10', revenue: 2800000 },
          { date: '2025-01-11', revenue: 3500000 },
          { date: '2025-01-12', revenue: 4100000 },
        ],
        dailyBookings: [
          { date: '2025-01-08', bookings: 5 },
          { date: '2025-01-09', bookings: 8 },
          { date: '2025-01-10', bookings: 6 },
          { date: '2025-01-11', bookings: 9 },
          { date: '2025-01-12', bookings: 12 },
        ],
        monthlyStats: {
          totalRevenue: 15600000,
          totalBookings: 40,
          averageDaily: 3120000,
          occupancyRate: 85,
        },
        unitStats: {
          totalUnits: 20,
          availableUnits: 3,
          occupiedUnits: 17,
          maintenanceUnits: 0,
        },
      };

      setApartmentData(mockData);
    } catch (error) {
      console.error('LaporanApartemenScreen: Error loading data:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat data laporan apartemen',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Refresh data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadApartmentData();
    setRefreshing(false);
  };

  /**
   * Format currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    });
  };

  /**
   * Render stat card
   */
  const renderStatCard = (title, value, icon, color, subtitle) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  /**
   * Render simple chart (placeholder)
   */
  const renderSimpleChart = (data, title, valueKey, color) => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.chartBars}>
        {data.map((item, index) => {
          const maxValue = Math.max(...data.map(d => d[valueKey]));
          const height = (item[valueKey] / maxValue) * 100;
          
          return (
            <View key={index} style={styles.chartBarContainer}>
              <View 
                style={[
                  styles.chartBar, 
                  { 
                    height: `${height}%`, 
                    backgroundColor: color 
                  }
                ]} 
              />
              <Text style={styles.chartLabel}>
                {formatDate(item.date)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat laporan apartemen...</Text>
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
          <Icon name="arrow-back" size={24} color={COLORS.background} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Laporan Apartemen</Text>
          <Text style={styles.headerSubtitle}>{apartmentName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistik Bulanan</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Pendapatan',
              formatCurrency(apartmentData.monthlyStats.totalRevenue),
              'attach-money',
              COLORS.success,
              'Bulan ini'
            )}
            {renderStatCard(
              'Total Booking',
              apartmentData.monthlyStats.totalBookings.toString(),
              'event',
              COLORS.primary,
              'Bulan ini'
            )}
            {renderStatCard(
              'Rata-rata Harian',
              formatCurrency(apartmentData.monthlyStats.averageDaily),
              'trending-up',
              COLORS.warning,
              'Per hari'
            )}
            {renderStatCard(
              'Tingkat Hunian',
              `${apartmentData.monthlyStats.occupancyRate}%`,
              'home',
              COLORS.info,
              'Occupancy rate'
            )}
          </View>
        </View>

        {/* Unit Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status Unit</Text>
          <View style={styles.unitStatusContainer}>
            <View style={styles.unitStatusItem}>
              <Text style={styles.unitStatusNumber}>
                {apartmentData.unitStats.totalUnits}
              </Text>
              <Text style={styles.unitStatusLabel}>Total Unit</Text>
            </View>
            <View style={styles.unitStatusItem}>
              <Text style={[styles.unitStatusNumber, { color: COLORS.success }]}>
                {apartmentData.unitStats.availableUnits}
              </Text>
              <Text style={styles.unitStatusLabel}>Tersedia</Text>
            </View>
            <View style={styles.unitStatusItem}>
              <Text style={[styles.unitStatusNumber, { color: COLORS.warning }]}>
                {apartmentData.unitStats.occupiedUnits}
              </Text>
              <Text style={styles.unitStatusLabel}>Terisi</Text>
            </View>
            <View style={styles.unitStatusItem}>
              <Text style={[styles.unitStatusNumber, { color: COLORS.error }]}>
                {apartmentData.unitStats.maintenanceUnits}
              </Text>
              <Text style={styles.unitStatusLabel}>Maintenance</Text>
            </View>
          </View>
        </View>

        {/* Daily Revenue Chart */}
        <View style={styles.section}>
          {renderSimpleChart(
            apartmentData.dailyRevenue,
            'Pendapatan Harian (5 Hari Terakhir)',
            'revenue',
            COLORS.success
          )}
        </View>

        {/* Daily Bookings Chart */}
        <View style={styles.section}>
          {renderSimpleChart(
            apartmentData.dailyBookings,
            'Total Booking Harian (5 Hari Terakhir)',
            'bookings',
            COLORS.primary
          )}
        </View>
      </ScrollView>

      <AlertComponent />
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
    padding: SIZES.lg,
    paddingTop: 40,
  },
  backButton: {
    marginRight: SIZES.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  headerSubtitle: {
    fontSize: SIZES.body,
    color: COLORS.background,
    opacity: 0.8,
    marginTop: SIZES.xs,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.background,
    margin: SIZES.md,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: SIZES.h5,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.gray100,
    borderRadius: SIZES.radius,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  statTitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginLeft: SIZES.xs,
    flex: 1,
  },
  statValue: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statSubtitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  unitStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  unitStatusItem: {
    alignItems: 'center',
  },
  unitStatusNumber: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  unitStatusLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  chartContainer: {
    marginTop: SIZES.sm,
  },
  chartTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: SIZES.sm,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 2,
  },
  chartBar: {
    width: '80%',
    minHeight: 10,
    borderRadius: 2,
    marginBottom: SIZES.xs,
  },
  chartLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
});

export default LaporanApartemenScreen;
