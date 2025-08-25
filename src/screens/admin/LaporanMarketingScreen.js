import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SIZES } from '../../config/constants';
import ReportService from '../../services/ReportService';
import { useModernAlert } from '../../components/ModernAlert';

/**
 * Screen laporan marketing dengan statistik lengkap
 * Menampilkan tabel, charts, dan filter periode
 */
const LaporanMarketingScreen = ({ navigation }) => {
  const { showAlert, AlertComponent } = useModernAlert();

  // State untuk data laporan
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marketingData, setMarketingData] = useState({
    topMarketing: [],
    monthlyStats: {},
    periodStats: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // month, week, year

  useEffect(() => {
    loadMarketingData();
  }, [selectedPeriod]);

  /**
   * Load data laporan marketing
   */
  const loadMarketingData = async () => {
    try {
      setLoading(true);
      console.log('LaporanMarketingScreen: Loading marketing data');

      // Simulasi data untuk sementara
      // TODO: Implement actual API calls
      const mockData = {
        topMarketing: [
          { id: 1, name: 'Budi Santoso', bookings: 25, revenue: 12500000, conversion: 85 },
          { id: 2, name: 'Sari Dewi', bookings: 22, revenue: 11000000, conversion: 78 },
          { id: 3, name: 'Ahmad Rahman', bookings: 18, revenue: 9000000, conversion: 72 },
          { id: 4, name: 'Linda Wijaya', bookings: 15, revenue: 7500000, conversion: 68 },
          { id: 5, name: 'Rudi Hartono', bookings: 12, revenue: 6000000, conversion: 65 },
        ],
        monthlyStats: {
          totalBookings: 92,
          totalRevenue: 46000000,
          averageConversion: 73.6,
          activeMarketing: 5,
        },
        periodStats: [
          { period: 'Minggu 1', bookings: 28, revenue: 14000000 },
          { period: 'Minggu 2', bookings: 24, revenue: 12000000 },
          { period: 'Minggu 3', bookings: 22, revenue: 11000000 },
          { period: 'Minggu 4', bookings: 18, revenue: 9000000 },
        ],
      };

      setMarketingData(mockData);
    } catch (error) {
      console.error('LaporanMarketingScreen: Error loading data:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Gagal memuat data laporan marketing',
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
    await loadMarketingData();
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
   * Render period filter
   */
  const renderPeriodFilter = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterTitle}>Filter Periode:</Text>
      <View style={styles.filterButtons}>
        {[
          { key: 'week', label: 'Minggu' },
          { key: 'month', label: 'Bulan' },
          { key: 'year', label: 'Tahun' },
        ].map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.filterButton,
              selectedPeriod === period.key && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text
              style={[
                styles.filterButtonText,
                selectedPeriod === period.key && styles.filterButtonTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /**
   * Render stat card
   */
  const renderStatCard = (title, value, icon, color) => (
    <View style={styles.statCard}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  /**
   * Render marketing item
   */
  const renderMarketingItem = ({ item, index }) => (
    <View style={styles.marketingItem}>
      <View style={styles.rankContainer}>
        <Text style={styles.rankNumber}>{index + 1}</Text>
      </View>
      <View style={styles.marketingInfo}>
        <Text style={styles.marketingName}>{item.name}</Text>
        <View style={styles.marketingStats}>
          <View style={styles.marketingStatItem}>
            <Icon name="event" size={16} color={COLORS.primary} />
            <Text style={styles.marketingStatText}>{item.bookings} booking</Text>
          </View>
          <View style={styles.marketingStatItem}>
            <Icon name="attach-money" size={16} color={COLORS.success} />
            <Text style={styles.marketingStatText}>{formatCurrency(item.revenue)}</Text>
          </View>
          <View style={styles.marketingStatItem}>
            <Icon name="trending-up" size={16} color={COLORS.warning} />
            <Text style={styles.marketingStatText}>{item.conversion}% konversi</Text>
          </View>
        </View>
      </View>
    </View>
  );

  /**
   * Render period chart
   */
  const renderPeriodChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Performa per Periode</Text>
      <View style={styles.chartBars}>
        {marketingData.periodStats.map((item, index) => {
          const maxBookings = Math.max(...marketingData.periodStats.map(d => d.bookings));
          const height = (item.bookings / maxBookings) * 100;
          
          return (
            <View key={index} style={styles.chartBarContainer}>
              <View 
                style={[
                  styles.chartBar, 
                  { 
                    height: `${height}%`, 
                    backgroundColor: COLORS.primary 
                  }
                ]} 
              />
              <Text style={styles.chartLabel}>{item.period}</Text>
              <Text style={styles.chartValue}>{item.bookings}</Text>
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
        <Text style={styles.loadingText}>Memuat laporan marketing...</Text>
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
        <Text style={styles.headerTitle}>Laporan Marketing</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Filter */}
        {renderPeriodFilter()}

        {/* Monthly Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistik Periode</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Total Booking',
              marketingData.monthlyStats.totalBookings.toString(),
              'event',
              COLORS.primary
            )}
            {renderStatCard(
              'Total Revenue',
              formatCurrency(marketingData.monthlyStats.totalRevenue),
              'attach-money',
              COLORS.success
            )}
            {renderStatCard(
              'Rata-rata Konversi',
              `${marketingData.monthlyStats.averageConversion}%`,
              'trending-up',
              COLORS.warning
            )}
            {renderStatCard(
              'Marketing Aktif',
              marketingData.monthlyStats.activeMarketing.toString(),
              'people',
              COLORS.info
            )}
          </View>
        </View>

        {/* Period Chart */}
        <View style={styles.section}>
          {renderPeriodChart()}
        </View>

        {/* Top Marketing Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Marketing</Text>
          <FlatList
            data={marketingData.topMarketing}
            renderItem={renderMarketingItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
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
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  filterContainer: {
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
  filterTitle: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
    backgroundColor: COLORS.gray100,
    minWidth: 80,
    alignItems: 'center',
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
    color: COLORS.background,
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
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  statValue: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.xs,
  },
  statTitle: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  marketingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  rankNumber: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.background,
  },
  marketingInfo: {
    flex: 1,
  },
  marketingName: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  marketingStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  marketingStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  marketingStatText: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginLeft: SIZES.xs,
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
    marginBottom: SIZES.xs,
  },
  chartValue: {
    fontSize: SIZES.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
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

export default LaporanMarketingScreen;
