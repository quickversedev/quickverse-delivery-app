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

type OrderHistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderHistory'>;

type FilterPeriod = 'today' | 'last7' | 'last14';

const OrderHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<OrderHistoryScreenNavigationProp>();
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId;

  const [period, setPeriod] = useState<FilterPeriod>('today');
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
      const today = new Date();
      let fromDateStr = '';
      let toDateStr = today.toISOString().split('T')[0];

      if (currentPeriod === 'today') {
        fromDateStr = today.toISOString().split('T')[0];
      } else if (currentPeriod === 'last7') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        fromDateStr = d.toISOString().split('T')[0];
      } else if (currentPeriod === 'last14') {
        const d = new Date();
        d.setDate(d.getDate() - 14);
        fromDateStr = d.toISOString().split('T')[0];
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
  }, [partnerId, page, period]);

  useEffect(() => {
    setLoading(true);
    fetchHistory(true, period);
  }, [period, partnerId]); // Refetch when period changes

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
          </ScrollView>
          <TouchableOpacity style={styles.calendarBtn} activeOpacity={1}>
            <Calendar size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const shopName = item?.orderDetails?.shopDetails?.name || 'Unknown Store';
    // Use deliveryFee if riderEarnings is not yet added, fallback to 0
    const riderEarnings = item?.orderDetails?.riderEarnings || item?.orderDetails?.deliveryFee || 0;
    const orderId = item?.orderId || 'N/A';

    // Formatting Date
    const createdAt = item?.createdAt || item?.orderDetails?.creationTime;
    let timeStr = '';
    if (createdAt) {
      const d = new Date(createdAt);
      timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const customerName = item?.orderDetails?.customerName || 'Customer';
    const customerMobile = item?.orderDetails?.customerMobile || '';
    const status = item?.orderStatus || 'Unknown';
    const isDelivered = status.toUpperCase() === 'DELIVERED';

    // Stats (placeholders if not available)
    const distance = item?.orderDetails?.distance || '0.0 mi';
    const duration = item?.orderDetails?.duration || '0 mins';
    const tip = item?.orderDetails?.tip || 0;

    return (
      <View style={styles.orderCard}>
        {/* Top Section */}
        <View style={styles.cardHeader}>
          <View style={styles.storeIconWrap}>
            <Store size={20} color="#1D6BFC" />
          </View>
          <View style={styles.storeInfoWrap}>
            <Text style={styles.storeName} numberOfLines={1}>{shopName}</Text>
            <Text style={styles.dateTimeText}>
              {timeStr} • Order #{String(orderId).substring(String(orderId).length - 4)}
            </Text>
            {/* Customer Details Row */}
            <View style={styles.customerRow}>
              <UserIcon size={12} color="#64748B" />
              <Text style={styles.customerText} numberOfLines={1}>
                {customerName}
              </Text>
              {customerMobile ? (
                <>
                  <Text style={styles.dotSeparator}>•</Text>
                  <Phone size={12} color="#64748B" />
                  <Text style={styles.customerText}>{customerMobile}</Text>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.rightInfoWrap}>
            <Text style={styles.earningsText}>₹{Number(riderEarnings).toFixed(2)}</Text>
            <View style={[styles.statusPill, isDelivered ? styles.statusPillSuccess : {}]}>
              <View style={[styles.statusDot, isDelivered ? styles.statusDotSuccess : {}]} />
              <Text style={[styles.statusText, isDelivered ? styles.statusTextSuccess : {}]}>
                {status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Stats Section */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <View style={styles.statTitleRow}>
              <Map size={14} color="#64748B" />
              <Text style={styles.statLabel}>Distance</Text>
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
    justifyContent: 'center',
  },
  earningsText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#1D6BFC',
    marginBottom: 6,
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
