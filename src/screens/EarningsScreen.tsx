import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT_FAMILY } from '../theme/typography';
import type { EarningsData, EarningsPeriod } from '../types/earnings';
import earningsService from '../services/earnings.service';
import useAuthStore from '../hooks/useAuthStore';
import PeriodFilterTabs from '../components/earnings/PeriodFilterTabs';
import EarningsSummaryCard from '../components/earnings/EarningsSummaryCard';
import WeeklyBarChart from '../components/earnings/WeeklyBarChart';
// import EarningsBreakdownCard from '../components/earnings/EarningsBreakdownCard';
// import TipsDashboardCard from '../components/earnings/TipsDashboardCard';
// import CashReconciliationCard from '../components/earnings/CashReconciliationCard';
import TransactionHistory from '../components/earnings/TransactionHistory';

const EarningsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId;
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!partnerId) {
        return;
      }
      console.log(
        `[EarningsScreen] fetchData called — period=${period}, partnerId=${partnerId}`,
      );
      if (!silent) {
        setLoading(true);
      }
      try {
        const result = await earningsService.getEarningsData(partnerId, period);
        console.log(
          '[EarningsScreen] Mapped result:',
          JSON.stringify(result, null, 2),
        );
        setData(result);
        setError(false);
      } catch (err) {
        console.warn('[EarningsScreen] Failed to fetch earnings data:', err);
        setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, partnerId],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  if (loading && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#0E6DFD" />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={{ fontSize: 15, fontFamily: FONT_FAMILY.outfitBold, color: '#64748B', marginBottom: 12 }}>
          Could not load earnings
        </Text>
        <TouchableOpacity
          onPress={() => { setError(false); fetchData(); }}
          style={{ backgroundColor: '#0E6DFD', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 }}
        >
          <Text style={{ color: '#FFF', fontFamily: FONT_FAMILY.outfitBold, fontSize: 14 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.header}>Earnings & Settlement</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0E6DFD']}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <PeriodFilterTabs selected={period} onSelect={setPeriod} />

        {loading && data ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color="#0E6DFD" />
          </View>
        ) : (
          <>
            <EarningsSummaryCard data={data.summary} period={period} />

            <View style={styles.spacer} />
            <WeeklyBarChart data={data.last7Days} title={
              period === 'thisWeek' ? 'WEEKLY EARNINGS' :
              period === 'thisMonth' ? 'MONTHLY EARNINGS' :
              period === 'lifetime' ? 'YEARLY EARNINGS' :
              'LAST 7 DAYS EARNINGS'
            } />

            {/* <View style={styles.spacer} />
            <View style={styles.sideBySide}>
              <View style={styles.halfCard}>
                <EarningsBreakdownCard data={data.breakdown} />
              </View>
              <View style={styles.halfCard}>
                <TipsDashboardCard data={data.tips} />
              </View>
            </View> */}

            {/* <View style={styles.spacer} />
            <CashReconciliationCard data={data.cashReconciliation} /> */}

            <View style={styles.spacer} />
            <TransactionHistory data={data.transactions} />
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  center: {
    flex: 1,
    backgroundColor: '#F2F5FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    textAlign: 'center',
    paddingVertical: 14,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  inlineLoader: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  spacer: {
    height: 14,
  },
  sideBySide: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  halfCard: {
    flex: 1,
  },
});

export default EarningsScreen;
