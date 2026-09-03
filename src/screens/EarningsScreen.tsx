import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { TrendingUp } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import type {
  EarningsPeriod,
  EarningsSummaryV3,
  EarningsChartV3,
  TodayOrdersSummaryV3,
} from '../types/earnings';
import earningsService from '../services/earnings.service';
import PeriodFilterTabs from '../components/earnings/PeriodFilterTabs';
import EarningsSummaryCard from '../components/earnings/EarningsSummaryCard';
import Last7DaysChart from '../components/earnings/Last7DaysChart';
import OrdersPaymentSummary from '../components/earnings/OrdersPaymentSummary';
import SettlementSection from '../components/earnings/SettlementSection';

// ─── Default empty states ────────────────────────────────────────────────────
const EMPTY_SUMMARY: EarningsSummaryV3 = {
  totalEarnings: 0,
  percentage: 0,
  percentageStatus: 'positive',
  payoutBalance: 0,
  breakdown: { baseEarning: 0, distanceEarning: 0, surgeEarning: 0, tips: 0 },
};

const EMPTY_CHART: EarningsChartV3 = { totalAmount: 0, chartData: [] };

const EMPTY_ORDERS: TodayOrdersSummaryV3 = {
  totalOrders: 0,
  prepaidOrders: 0,
  codOrders: 0,
  cashToSubmit: 0,
};

// ─── Component ───────────────────────────────────────────────────────────────
const EarningsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  // ── Filter state
  const [period, setPeriod] = useState<EarningsPeriod>('today');

  // ── Data states (3 independent APIs)
  const [summaryData, setSummaryData] = useState<EarningsSummaryV3>(EMPTY_SUMMARY);
  const [chartData, setChartData] = useState<EarningsChartV3>(EMPTY_CHART);
  const [ordersData, setOrdersData] = useState<TodayOrdersSummaryV3>(EMPTY_ORDERS);

  // ── Loading / error states
  const [initialLoading, setInitialLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track first mount to avoid double fetch
  const mountedRef = useRef(false);

  // ── Fetch summary (re-called on filter change)
  const fetchSummary = useCallback(
    async (silent = false) => {
      if (!silent) { setSummaryLoading(true); }
      try {
        const result = await earningsService.getEarningsSummary(period);
        setSummaryData(result);
      } catch (err) {
        console.warn('[EarningsScreen] Summary fetch failed:', err);
      } finally {
        setSummaryLoading(false);
      }
    },
    [period],
  );

  // ── Fetch chart + orders (only called on mount / pull-to-refresh)
  const fetchStaticData = useCallback(async () => {
    try {
      const [chart, orders] = await Promise.all([
        earningsService.getEarningsChart(),
        earningsService.getTodayOrdersSummary(),
      ]);
      setChartData(chart);
      setOrdersData(orders);
    } catch (err) {
      console.warn('[EarningsScreen] Static data fetch failed:', err);
    }
  }, []);

  // ── Initial mount — fetch all 3 APIs in parallel
  useEffect(() => {
    if (mountedRef.current) { return; }
    mountedRef.current = true;

    const initialFetch = async () => {
      setInitialLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchSummary(true),
          fetchStaticData(),
        ]);
      } catch {
        setError('Could not load earnings data');
      } finally {
        setInitialLoading(false);
      }
    };

    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter change — re-fetch only summary (API 1)
  useEffect(() => {
    if (!mountedRef.current) { return; }
    // Suppress on initial render (handled by mount effect)
    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // ── Pull-to-refresh — re-fetch all 3
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchSummary(true), fetchStaticData()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSummary, fetchStaticData]);

  // ── Loading screen on first load
  if (initialLoading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#1D6BFC" />
      </View>
    );
  }

  // ── Error screen (only shown if first fetch fails and no data at all)
  if (error && !summaryData.totalEarnings) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Could not load earnings</Text>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            setInitialLoading(true);
            Promise.all([fetchSummary(true), fetchStaticData()]).finally(() =>
              setInitialLoading(false),
            );
          }}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Earnings & Settlement</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
          <TrendingUp size={22} color="#1D6BFC" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1D6BFC']}
            tintColor="#1D6BFC"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Filter Tabs ── */}
        <PeriodFilterTabs selected={period} onSelect={setPeriod} />

        {/* ── Summary loading overlay ── */}
        {summaryLoading ? (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" color="#1D6BFC" />
          </View>
        ) : (
          <EarningsSummaryCard data={summaryData} period={period} />
        )}

        <View style={styles.spacer} />

        {/* ── Last 7 Days Line Chart ── */}
        <Last7DaysChart data={chartData} />

        <View style={styles.spacer} />

        {/* ── Orders & Payments Summary ── */}
        <OrdersPaymentSummary data={ordersData} />

        <View style={styles.spacer} />

        {/* ── Settlement & Cash Submission ── */}
        <SettlementSection />

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F8',
  },
  center: {
    flex: 1,
    backgroundColor: '#EEF2F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#EEF2F8',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  inlineLoader: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    height: 14,
  },
  errorText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#1D6BFC',
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 22,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.outfitBold,
    fontSize: 14,
  },
});

export default EarningsScreen;
