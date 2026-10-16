import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  Store,
  Map,
  Clock,
  CircleDollarSign,
  User as UserIcon,
  Phone,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FONT_FAMILY } from '../theme/typography';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import CustomDateRangeModal, { formatRangeLabel } from '../components/common/CustomDateRangeModal';
import type { DateRange } from '../types/earnings';

type OrderHistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderHistory'>;

type FilterPeriod = 'today' | 'yesterday' | 'last7' | 'last14' | 'custom';

// The backend filters on India dates, and toISOString() is UTC (it gives "yesterday" between 12:00 and 5:30 AM IST).
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toIstDateString = (date: Date) =>
  new Date(date.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];

// India date string for "daysAgo" days before today (0 = today). IST has no DST, so plain 24h steps are exact.
const istDateDaysAgo = (daysAgo: number) => toIstDateString(new Date(Date.now() - daysAgo * DAY_MS));

// The backend sends epoch milliseconds as a string ("1760...") and new Date(string) does not read those.
const parseTimestamp = (value: any): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const d = /^\d+$/.test(String(value)) ? new Date(Number(value)) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Always shown in India time (the same time the date filters use), whatever the phone's timezone is set to.
const formatIstTime = (d: Date) => {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const hours = ist.getUTCHours();
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;
};

const formatIstDate = (d: Date) => {
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCDate()} ${MONTHS[ist.getUTCMonth()]} ${ist.getUTCFullYear()}`;
};

const OrderHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OrderHistoryScreenNavigationProp>();
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId;

  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [rangeModalVisible, setRangeModalVisible] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchHistory = useCallback(async (isRefresh = false, currentPeriod = period) => {
    if (!partnerId) return;

    try {
      if (isRefresh) {
        setPage(0);
      }

      const currentPage = isRefresh ? 0 : page;

      // Calculate dates based on period
      // "Last N days" is a rolling window that includes today: today and the N-1 days before it.
      let fromDateStr = istDateDaysAgo(0);
      let toDateStr = istDateDaysAgo(0);

      if (currentPeriod === 'custom' && customRange) {
        fromDateStr = customRange.from;
        toDateStr = customRange.to;
      } else if (currentPeriod === 'yesterday') {
        fromDateStr = istDateDaysAgo(1);
        toDateStr = istDateDaysAgo(1);
      } else if (currentPeriod === 'last7') {
        fromDateStr = istDateDaysAgo(6);
      } else if (currentPeriod === 'last14') {
        fromDateStr = istDateDaysAgo(13);
      }

      const res = await deliveryPartnerService.getDeliveryPartnerHistory(partnerId, currentPage, 10, fromDateStr, toDateStr);

      if (res && res.content) {
        if (isRefresh) {
          setOrders(res.content);
        } else {
          setOrders(prev => [...prev, ...res.content]);
        }
        setHasMore(res.content.length === 10); // Assuming size=10
        if (!isRefresh && res.content.length > 0) {
          setPage(prev => prev + 1);
        } else if (isRefresh && res.content.length === 10) {
          setPage(1);
        }
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partnerId, page, period, customRange]);

  useEffect(() => {
    setLoading(true);
    fetchHistory(true, period);
  }, [period, partnerId, customRange]); // Refetch when period or custom range changes

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHistory(true, period);
  }, [fetchHistory, period]);

  const loadMore = () => {
    if (!loading && !refreshing && hasMore) {
      fetchHistory();
    }
  };

  const renderFilter = () => {
    return (
      <View style={styles.filterWrapper}>
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabs}
          >
            <TouchableOpacity
              style={[styles.chip, period === 'today' && styles.chipActive]}
              onPress={() => setPeriod('today')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, period === 'today' && styles.chipTextActive]}>
                Today
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, period === 'yesterday' && styles.chipActive]}
              onPress={() => setPeriod('yesterday')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, period === 'yesterday' && styles.chipTextActive]}>
                Yesterday
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, period === 'last7' && styles.chipActive]}
              onPress={() => setPeriod('last7')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, period === 'last7' && styles.chipTextActive]}>
                Last 7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, period === 'last14' && styles.chipActive]}
              onPress={() => setPeriod('last14')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, period === 'last14' && styles.chipTextActive]}>
                Last 14 Days
              </Text>
            </TouchableOpacity>
            {period === 'custom' && customRange && (
              <TouchableOpacity style={[styles.chip, styles.chipActive]} activeOpacity={0.8} onPress={() => setRangeModalVisible(true)}>
                <Text style={[styles.chipText, styles.chipTextActive]}>
                  {formatRangeLabel(customRange)}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.calendarBtn} activeOpacity={0.7} onPress={() => setRangeModalVisible(true)}>
            <Calendar size={20} color={period === 'custom' ? '#1D6BFC' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const shopName = item?.orderDetails?.shopDetails?.name || 'Unknown Store';
    const orderId = item?.orderId || 'N/A';

    const customerName = item?.orderDetails?.customerName || 'Customer';
    const customerMobile = item?.orderDetails?.customerMobile || '';
    const status = item?.orderStatus || 'Unknown';
    const isDelivered = status.toUpperCase() === 'DELIVERED';

    // Delivered orders show when they were delivered; every other order shows when it was created.
    // Old delivered orders without a delivered time fall back to their last update time.
    const createdAt = item?.createdAt || item?.orderDetails?.creationTime;
    const deliveredAt = item?.deliveredAt || item?.updatedAt;
    const stampDate = parseTimestamp(isDelivered ? deliveredAt : createdAt);
    const timeStr = stampDate ? formatIstTime(stampDate) : '';
    const dateStr = stampDate ? formatIstDate(stampDate) : '';
    const dateLabel = isDelivered ? 'Delivered at' : 'Created at';
    // "PARTNER_ASSIGNED" -> "Partner Assigned" (shorter, so the pill leaves room for the shop name)
    const statusLabel = status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Stats (placeholders if not available)
    // Total distance (pickup + drop) from the backend, the same distance the earnings were paid on.
    // Orders from before pickup distance was recorded have no total, so they show their drop distance as before.
    const totalKm = Number(item?.orderDetails?.totalDistance ?? item?.totalDistance);
    const fallbackKm = Number(item?.orderDetails?.dropDistance ?? item?.orderDetails?.distance);
    const hasTotal = Number.isFinite(totalKm) && totalKm > 0;
    const distanceKm = hasTotal ? totalKm : fallbackKm;
    const distance = Number.isFinite(distanceKm) && distanceKm > 0 ? `${distanceKm.toFixed(1)} km` : '--';
    // Say which distance this is, so a drop-only value is never read as the total.
    const distanceLabel = hasTotal ? 'Total Distance' : 'Drop Distance';
    const duration = item?.orderDetails?.duration || '0 mins';
    const tip = item?.orderDetails?.tip || 0;

    // Rider's earnings for this order as calculated by the backend; shown for delivered orders that have an amount.
    const backendEarnings = Number(item?.orderDetails?.riderEarnings ?? item?.riderEarnings);
    const showEarningsStrip = isDelivered && Number.isFinite(backendEarnings) && backendEarnings > 0;

    return (
      <View style={styles.orderCard}>
        {/* Time (left) and delivered/created date (right) */}
        {stampDate && (
          <View style={styles.stampRow}>
            <View style={styles.stampTimeWrap}>
              <Clock size={12} color="#64748B" />
              <Text style={styles.stampTimeText}>{timeStr}</Text>
            </View>
            <Text style={styles.stampDateText} numberOfLines={1}>
              {dateLabel} {dateStr}
            </Text>
          </View>
        )}

        {/* Top Section */}
        <View style={styles.cardHeader}>
          <View style={styles.storeIconWrap}>
            <Store size={20} color="#1D6BFC" />
          </View>
          <View style={styles.storeInfoWrap}>
            <Text style={styles.storeName} numberOfLines={2}>{shopName}</Text>
            <Text style={styles.dateTimeText}>
              Order #{orderId}
            </Text>
          </View>

          <View style={styles.rightInfoWrap}>
            <View style={[styles.statusPill, isDelivered ? styles.statusPillSuccess : {}]}>
              <View style={[styles.statusDot, isDelivered ? styles.statusDotSuccess : {}]} />
              <Text style={[styles.statusText, isDelivered ? styles.statusTextSuccess : {}]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer details: full card width, so the name and phone number are never cut */}
        <View style={styles.customerRowFull}>
          <UserIcon size={12} color="#64748B" />
          <Text style={styles.customerText} numberOfLines={1}>
            {customerName}
          </Text>
          {customerMobile ? (
            <>
              <Text style={styles.dotSeparator}>•</Text>
              <Phone size={12} color="#64748B" />
              <Text style={styles.customerPhoneText}>{customerMobile}</Text>
            </>
          ) : null}
        </View>

        {showEarningsStrip && (
          <View style={styles.earningsStrip}>
            <Text style={styles.earningsStripLabel}>Your Earnings</Text>
            <Text style={styles.earningsStripValue} numberOfLines={1} adjustsFontSizeToFit>
              ₹{backendEarnings.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <View style={styles.statTitleRow}>
              <Map size={14} color="#64748B" />
              <Text style={styles.statLabel}>{distanceLabel}</Text>
            </View>
            <Text style={styles.statValue}>{distance}</Text>
          </View>

          <View style={styles.statColCenter}>
            <View style={styles.statTitleRow}>
              <Clock size={14} color="#64748B" />
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <Text style={styles.statValue}>{duration}</Text>
          </View>

          <View style={styles.statColRight}>
            <View style={styles.statTitleRow}>
              <Text style={styles.statLabel}>Tip </Text>
              <CircleDollarSign size={14} color="#64748B" />
            </View>
            <Text style={styles.statValue}>₹{Number(tip).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <View style={{ width: 32 }} />
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

      {renderFilter()}

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>RECENT DELIVERIES</Text>

        {loading && page === 0 ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#1D6BFC" />
          </View>
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item, index) => item.id || `order-${index}`}
            renderItem={renderOrderCard}
            contentContainerStyle={styles.flatListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#1D6BFC']}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No deliveries found for this period.</Text>
              </View>
            }
            ListFooterComponent={
              hasMore && !loading && orders.length > 0 ? (
                <ActivityIndicator size="small" color="#1D6BFC" style={{ marginVertical: 16 }} />
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  filterWrapper: {
    backgroundColor: '#F8FAFC',
    paddingBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#1D6BFC',
    borderRadius: 12,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  calendarBtn: {
    padding: 8,
    marginRight: 8,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 1,
  },
  flatListContent: {
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stampTimeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stampTimeText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#475569',
  },
  stampDateText: {
    flexShrink: 1,
    marginLeft: 12,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#475569',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeInfoWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 2,
  },
  dateTimeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginBottom: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerRowFull: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  customerPhoneText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#475569',
    marginLeft: 4,
  },
  customerText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#475569',
    marginLeft: 4,
    flexShrink: 1, // Ensures long names shrink and don't break layout
  },
  dotSeparator: {
    fontSize: 12,
    color: '#94A3B8',
    marginHorizontal: 6,
  },
  rightInfoWrap: {
    alignItems: 'flex-end',
    // The status pill now sits at the top right (the amount moved to the "Your Earnings" strip below).
    alignSelf: 'flex-start',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    marginRight: 4,
  },
  statusDotSuccess: {
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  statusTextSuccess: {
    color: '#16A34A',
  },
  // Light green strip under the card header (same look as the Home order history card)
  earningsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  earningsStripLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  earningsStripValue: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statColCenter: {
    flex: 1,
    alignItems: 'center',
  },
  statColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  statTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#0F172A',
  },
});

export default OrderHistoryScreen;
