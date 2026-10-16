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
import { Calendar } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import type {
  DateRange,
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
import useAuthStore from '../hooks/useAuthStore';
import CustomDateRangeModal, { formatRangeLabel } from '../components/common/CustomDateRangeModal';

// ─── Default empty states ────────────────────────────────────────────────────
const EMPTY_SUMMARY: EarningsSummaryV3 = {
  totalEarnings: 0,
  percentage: 0,
  percentageStatus: 'neutral',
  payoutBalance: 0,
  breakdown: { baseEarning: 0, distanceEarning: 0, surgeEarning: 0, tips: 0 },
};

const EMPTY_CHART: EarningsChartV3 = { totalAmount: 0, chartData: [] };

const EMPTY_ORDERS: TodayOrdersSummaryV3 = {
  totalOrders: 0,
  prepaidOrders: 0,
  codOrders: 0,
  codQrOrders: 0,
  cashToSubmit: 0,
};

// ─── Component ───────────────────────────────────────────────────────────────
const EarningsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId ?? '';

  // ── Filter state
  const [period, setPeriod] = useState<EarningsPeriod>('today');
  // The period the numbers on screen belong to. It only changes when a response arrives, so the card
  // title and the badge never claim a period that the numbers below them are not for.
  const [dataPeriod, setDataPeriod] = useState<EarningsPeriod>('today');
  // Custom from/to range, used when the period is 'custom'
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);

  // ── Data states (3 independent APIs)
  const [summaryData, setSummaryData] = useState<EarningsSummaryV3>(EMPTY_SUMMARY);
  const [chartData, setChartData] = useState<EarningsChartV3>(EMPTY_CHART);
  const [ordersData, setOrdersData] = useState<TodayOrdersSummaryV3>(EMPTY_ORDERS);

  // ── Loading / error states
  const [initialLoading, setInitialLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // The latest summary request failed / the screen has shown real data at least once
  const [loadFailed, setLoadFailed] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Track first mount to avoid double fetch
  const mountedRef = useRef(false);
  // Only the newest summary request may update the screen, so a slow old response can never overwrite a newer one
  const summaryRequestRef = useRef(0);

  // ── Fetch summary + orders (re-called on filter change)
  const fetchSummary = useCallback(
    async (silent = false) => {
      if (!partnerId) return;
      const requestId = ++summaryRequestRef.current;
      const requestedPeriod = period;
      const requestedRange = customRange;
      if (!silent) { setSummaryLoading(true); }
      try {
        const [summaryResult, ordersResult] = await Promise.all([
          earningsService.getEarningsSummary(partnerId, requestedPeriod, requestedRange),
          earningsService.getTodayOrdersSummary(partnerId, requestedPeriod, requestedRange),
        ]);
        // A newer request has started: it owns the screen now, drop this response
        if (requestId !== summaryRequestRef.current) { return; }
        setSummaryData(summaryResult);
        setOrdersData(ordersResult);
        setDataPeriod(requestedPeriod);
        setLoadFailed(false);
        setHasLoadedOnce(true);
      } catch (err) {
        // The numbers (and their period title) already on screen stay as they were; the failure is shown below
        console.warn('[EarningsScreen] Summary/Orders fetch failed:', err);
        if (requestId === summaryRequestRef.current) { setLoadFailed(true); }
      } finally {
        if (requestId === summaryRequestRef.current) { setSummaryLoading(false); }
      }
    },
    [period, customRange, partnerId],
  );

  // ── Fetch chart (only called on mount / pull-to-refresh)
  const fetchStaticData = useCallback(async () => {
    if (!partnerId) return;
    try {
      const chart = await earningsService.getEarningsChart(partnerId);
      setChartData(chart);
    } catch (err) {
      console.warn('[EarningsScreen] Chart data fetch failed:', err);
    }
  }, [partnerId]);

  // ── Initial mount — fetch all 3 APIs in parallel
  useEffect(() => {
    if (mountedRef.current || !partnerId) { return; }
    mountedRef.current = true;

    const initialFetch = async () => {
      setInitialLoading(true);
      try {
        await Promise.all([
          fetchSummary(true),
          fetchStaticData(),
        ]);
      } finally {
        setInitialLoading(false);
      }
    };

    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  // ── Filter change — re-fetch only summary (API 1)
  useEffect(() => {
    if (!mountedRef.current) { return; }
    // Suppress on initial render (handled by mount effect)
    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customRange]);

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

  // ── Error screen: only when nothing has loaded yet, so there is no data to keep showing
  if (loadFailed && !hasLoadedOnce) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Could not load earnings</Text>
        <TouchableOpacity
          onPress={() => {
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
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={() => setRangeModalVisible(true)}>
          <Calendar size={22} color="#1D6BFC" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <CustomDateRangeModal
        visible={rangeModalVisible}
        initial={customRange}
        onApply={range => {
          setCustomRange(range);
          setPeriod('custom');
          setRangeModalVisible(false);
        }}
        onClose={() => setRangeModalVisible(false)}
      />

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

        {period === 'custom' && customRange && (
          <Text style={styles.customRangeText}>{formatRangeLabel(customRange)}</Text>
        )}

        {/* ── Later failures (tab change / refresh): keep the numbers on screen and offer a retry ── */}
        {loadFailed && hasLoadedOnce && !summaryLoading && (
          <View style={styles.retryRow}>
            <Text style={styles.retryRowText}>Could not load earnings</Text>
            <TouchableOpacity onPress={() => fetchSummary()} activeOpacity={0.7}>
              <Text style={styles.retryRowAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Summary: the previous numbers stay on screen (slightly dimmed) until the new ones arrive ── */}
        <View style={summaryLoading ? styles.summaryLoading : undefined}>
          <EarningsSummaryCard data={summaryData} period={dataPeriod} />
        </View>

        <View style={styles.spacer} />

        {/* ── Last 7 Days Line Chart ── */}
        <Last7DaysChart data={chartData} />

        <View style={styles.spacer} />

        {/* ── Orders & Payments Summary ── */}
        <OrdersPaymentSummary data={ordersData} period={dataPeriod} />

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
  customRangeText: {
    marginHorizontal: 20,
    marginTop: -6,
    marginBottom: 10,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#64748B',
  },
  summaryLoading: {
    opacity: 0.6,
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
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  retryRowText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#DC2626',
  },
  retryRowAction: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },
  spacer: {
    height: 14,
  },
});

export default EarningsScreen;
