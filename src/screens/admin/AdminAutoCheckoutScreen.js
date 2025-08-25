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
import { COLORS, SIZES } from '../../config/constants';
import AutoCheckoutService from '../../services/AutoCheckoutService';

/**
 * Screen untuk monitoring dan kontrol sistem auto-checkout
 * Fitur: Manual trigger auto-checkout, lihat upcoming expired, statistik
 */
const AdminAutoCheckoutScreen = () => {
  // State untuk data
  const [upcomingExpired, setUpcomingExpired] = useState([]);
  const [statistics, setStatistics] = useState({
    dailyStatistics: [],
    totalAutoCheckouts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Load data saat komponen dimount
  useEffect(() => {
    loadData();
  }, []);

  // Auto refresh setiap 1 menit
  useEffect(() => {
    const interval = setInterval(() => {
      loadUpcomingExpired();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load semua data yang diperlukan
   */
  const loadData = async () => {
    try {
      await Promise.all([
        loadUpcomingExpired(),
        loadStatistics(),
      ]);
    } catch (error) {
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load checkin yang akan expired
   */
  const loadUpcomingExpired = async () => {
    try {
      const result = await AutoCheckoutService.getUpcomingExpiredCheckins(60); // 1 jam ke depan
      if (result.success) {
        setUpcomingExpired(result.data);
      }
    } catch (error) {
      console.error('Load upcoming expired error:', error);
    }
  };

  /**
   * Load statistik auto-checkout
   */
  const loadStatistics = async () => {
    try {
      // Get statistik 7 hari terakhir
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await AutoCheckoutService.getAutoCheckoutStatistics({
        startDate,
        endDate,
      });
      
      if (result.success) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('Load statistics error:', error);
    }
  };

  /**
   * Refresh data dengan pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Manual trigger auto-checkout
   */
  const handleManualAutoCheckout = async () => {
    Alert.alert(
      'Konfirmasi Auto-Checkout',
      'Apakah Anda yakin ingin menjalankan auto-checkout manual? Semua checkin yang sudah habis waktu akan di-checkout otomatis.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Jalankan',
          onPress: async () => {
            setProcessing(true);
            try {
              const result = await AutoCheckoutService.processAutoCheckout();
              
              if (result.success) {
                Alert.alert(
                  'Auto-Checkout Selesai',
                  `${result.processedCount} unit berhasil di-auto-checkout`,
                  [{ text: 'OK', onPress: () => loadData() }]
                );
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('Manual auto-checkout error:', error);
              Alert.alert('Error', 'Gagal menjalankan auto-checkout');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Simulasi auto-checkout untuk checkin tertentu
   * @param {Object} checkin - Data checkin
   */
  const handleSimulateCheckout = (checkin) => {
    Alert.alert(
      'Simulasi Auto-Checkout',
      `Apakah Anda yakin ingin melakukan simulasi auto-checkout untuk unit ${checkin.unit_number}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Simulasi',
          onPress: async () => {
            try {
              const result = await AutoCheckoutService.simulateAutoCheckout(checkin.id);
              
              if (result.success) {
                Alert.alert('Sukses', result.message);
                await loadData();
              } else {
                Alert.alert('Error', result.message);
              }
            } catch (error) {
              console.error('Simulate checkout error:', error);
              Alert.alert('Error', 'Gagal melakukan simulasi auto-checkout');
            }
          },
        },
      ]
    );
  };

  /**
   * Format waktu remaining
   * @param {number} minutes - Menit tersisa
   * @returns {string} - Format waktu
   */
  const formatRemainingTime = (minutes) => {
    if (minutes <= 0) return 'Sudah expired';
    if (minutes < 60) return `${minutes} menit lagi`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} jam ${remainingMinutes} menit lagi`;
  };

  /**
   * Get color berdasarkan waktu remaining
   * @param {number} minutes - Menit tersisa
   * @returns {string} - Warna
   */
  const getRemainingTimeColor = (minutes) => {
    if (minutes <= 0) return COLORS.error;
    if (minutes <= 15) return COLORS.error;
    if (minutes <= 30) return COLORS.warning;
    return COLORS.success;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Auto-Checkout System</Text>
        <TouchableOpacity
          style={[styles.manualButton, processing && styles.manualButtonDisabled]}
          onPress={handleManualAutoCheckout}
          disabled={processing}
        >
          <Icon name="play-arrow" size={20} color={COLORS.background} />
          <Text style={styles.manualButtonText}>
            {processing ? 'Processing...' : 'Manual Run'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.statCard}>
          <Icon name="history" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{statistics.totalAutoCheckouts}</Text>
          <Text style={styles.statLabel}>Total Auto-Checkout</Text>
        </View>
        
        <View style={styles.statCard}>
          <Icon name="schedule" size={32} color={COLORS.warning} />
          <Text style={styles.statNumber}>{upcomingExpired.length}</Text>
          <Text style={styles.statLabel}>Akan Expired</Text>
        </View>
      </View>

      {/* Upcoming Expired Checkins */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Checkin yang Akan Expired</Text>
        {upcomingExpired.length > 0 ? (
          <FlatList
            data={upcomingExpired}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.checkinCard}>
                <View style={styles.checkinHeader}>
                  <View style={styles.checkinInfo}>
                    <Text style={styles.unitNumber}>{item.unit_number}</Text>
                    <Text style={styles.apartmentName}>{item.apartment_name}</Text>
                    <Text style={styles.teamName}>Tim: {item.team_name}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.simulateButton}
                    onPress={() => handleSimulateCheckout(item)}
                  >
                    <Icon name="play-circle-outline" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.timeInfo}>
                  <Icon 
                    name="schedule" 
                    size={16} 
                    color={getRemainingTimeColor(item.minutesRemaining)} 
                  />
                  <Text style={[
                    styles.remainingTime,
                    { color: getRemainingTimeColor(item.minutesRemaining) }
                  ]}>
                    {formatRemainingTime(item.minutesRemaining)}
                  </Text>
                </View>
                
                <Text style={styles.checkoutTime}>
                  Checkout: {new Date(item.checkout_time).toLocaleString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="check-circle" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Tidak ada checkin yang akan expired</Text>
            <Text style={styles.emptySubtext}>
              Checkin yang akan expired dalam 1 jam akan muncul di sini
            </Text>
          </View>
        )}
      </View>

      {/* Daily Statistics */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Statistik Harian (7 Hari Terakhir)</Text>
        {statistics.dailyStatistics.length > 0 ? (
          <FlatList
            data={statistics.dailyStatistics}
            keyExtractor={(item) => item.date}
            renderItem={({ item }) => (
              <View style={styles.dailyStatCard}>
                <Text style={styles.dailyStatDate}>
                  {new Date(item.date).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </Text>
                <Text style={styles.dailyStatCount}>
                  {item.total_auto_checkouts} auto-checkout
                </Text>
              </View>
            )}
            scrollEnabled={false}
          />
        ) : (
          <View style={styles.emptyState}>
            <Icon name="bar-chart" size={48} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Belum ada data statistik</Text>
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
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radius,
  },
  manualButtonDisabled: {
    backgroundColor: COLORS.gray400,
  },
  manualButtonText: {
    fontSize: SIZES.body,
    color: COLORS.background,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: SIZES.lg,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    alignItems: 'center',
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.sm,
  },
  statLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
  sectionContainer: {
    backgroundColor: COLORS.background,
    margin: SIZES.lg,
    marginTop: 0,
    borderRadius: SIZES.radius,
    padding: SIZES.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.h6,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  checkinCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    paddingVertical: SIZES.md,
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
  teamName: {
    fontSize: SIZES.caption,
    color: COLORS.primary,
    fontWeight: '500',
  },
  simulateButton: {
    padding: SIZES.sm,
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  remainingTime: {
    fontSize: SIZES.body,
    fontWeight: '600',
    marginLeft: SIZES.xs,
  },
  checkoutTime: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
  },
  dailyStatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  dailyStatDate: {
    fontSize: SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dailyStatCount: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    textAlign: 'center',
  },
});

export default AdminAutoCheckoutScreen;
