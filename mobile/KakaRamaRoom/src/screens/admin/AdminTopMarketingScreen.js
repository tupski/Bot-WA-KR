import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SIZES } from '../../config/constants';
import ReportService from '../../services/ReportService';

const AdminTopMarketingScreen = () => {
  const [marketingData, setMarketingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month'); // week, month, year, all

  useEffect(() => {
    loadTopMarketingData();
  }, [period]);

  const loadTopMarketingData = async () => {
    try {
      setLoading(true);
      const result = await ReportService.getTopMarketingReport(period);

      if (result.success) {
        setMarketingData(result.data);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Error loading top marketing data:', error);
      Alert.alert('Error', 'Gagal memuat data top marketing');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTopMarketingData();
    setRefreshing(false);
  };

  const getPeriodLabel = (periodType) => {
    switch (periodType) {
      case 'week':
        return 'Minggu Ini';
      case 'month':
        return 'Bulan Ini';
      case 'year':
        return 'Tahun Ini';
      case 'all':
        return 'Semua Waktu';
      default:
        return 'Bulan Ini';
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return COLORS.primary;
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `${rank}`;
    }
  };

  const renderMarketingItem = ({ item, index }) => {
    const rank = index + 1;

    return (
      <View style={[styles.marketingItem, rank <= 3 && styles.topThreeItem]}>
        <View style={styles.rankContainer}>
          <Text style={[styles.rankText, { color: getRankColor(rank) }]}>
            {getRankIcon(rank)}
          </Text>
        </View>

        <View style={styles.marketingInfo}>
          <Text style={styles.marketingName}>{item.marketing_name}</Text>
          <Text style={styles.checkinCount}>
            {item.total_checkins} checkin{item.total_checkins > 1 ? 's' : ''}
          </Text>
          <Text style={styles.totalRevenue}>
            Total: Rp {item.total_revenue?.toLocaleString('id-ID') || '0'}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg/Checkin</Text>
            <Text style={styles.statValue}>
              Rp {item.avg_revenue?.toLocaleString('id-ID') || '0'}
            </Text>
          </View>

          {item.last_checkin && (
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Terakhir</Text>
              <Text style={styles.statValue}>
                {new Date(item.last_checkin).toLocaleDateString('id-ID')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderPeriodButton = (periodType, label) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        period === periodType && styles.periodButtonActive,
      ]}
      onPress={() => setPeriod(periodType)}
    >
      <Text
        style={[
          styles.periodButtonText,
          period === periodType && styles.periodButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Memuat data top marketing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Top Marketing</Text>
        <Text style={styles.subtitle}>
          Ranking marketing berdasarkan jumlah checkin - {getPeriodLabel(period)}
        </Text>
      </View>

      <View style={styles.periodContainer}>
        {renderPeriodButton('week', 'Minggu')}
        {renderPeriodButton('month', 'Bulan')}
        {renderPeriodButton('year', 'Tahun')}
        {renderPeriodButton('all', 'Semua')}
      </View>

      <FlatList
        data={marketingData}
        renderItem={renderMarketingItem}
        keyExtractor={(item, index) => `${item.marketing_name}-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada data marketing</Text>
            <Text style={styles.emptySubtext}>
              Data akan muncul setelah ada checkin dengan nama marketing
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
  },
  header: {
    padding: SIZES.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: SIZES.h3,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  periodContainer: {
    flexDirection: 'row',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  periodButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginRight: SIZES.sm,
    borderRadius: SIZES.sm,
    backgroundColor: COLORS.lightGray,
  },
  periodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  periodButtonText: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: COLORS.white,
  },
  listContainer: {
    padding: SIZES.md,
  },
  marketingItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.md,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  topThreeItem: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  rankText: {
    fontSize: SIZES.h2,
    fontWeight: 'bold',
  },
  marketingInfo: {
    flex: 1,
    marginRight: SIZES.md,
  },
  marketingName: {
    fontSize: SIZES.h4,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  checkinCount: {
    fontSize: SIZES.body,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SIZES.xs,
  },
  totalRevenue: {
    fontSize: SIZES.body,
    color: COLORS.success,
    fontWeight: '500',
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statItem: {
    marginBottom: SIZES.xs,
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: SIZES.caption,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: SIZES.body,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyText: {
    fontSize: SIZES.h4,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  emptySubtext: {
    fontSize: SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.lg,
  },
});

export default AdminTopMarketingScreen;
