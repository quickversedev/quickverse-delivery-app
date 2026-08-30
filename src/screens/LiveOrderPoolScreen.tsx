import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ToastAndroid,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  Store,
  Zap,
  RefreshCw,
} from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import useAuthStore from '../hooks/useAuthStore';
import usePoolOrders from '../hooks/usePoolOrders';
import shiftService from '../services/shift.service';
import deliveryPartnerService from '../services/delivery-partner.service';
import type { ShiftResponse } from '../types/shift.types';
import type { PoolOrder } from '../types/pool.types';

const showToast = (msg: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
};

const timeLeft = (expiresAt: number): string => {
  const diff = Math.max(0, expiresAt - Date.now());
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const OrderCard: React.FC<{
  order: PoolOrder;
  isClaiming: boolean;
  onAccept: () => void;
}> = ({ order, isClaiming, onAccept }) => {
  const [timer, setTimer] = useState(() => timeLeft(order.expiresAt));

  useEffect(() => {
    const id = setInterval(() => setTimer(timeLeft(order.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [order.expiresAt]);

  const earning = order.estimatedEarning != null
    ? `₹${order.estimatedEarning}`
    : '—';
  const distance = order.estimatedDistanceKm != null
    ? `${order.estimatedDistanceKm} km`
    : '—';

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={styles.newBadge}>
          <Zap size={11} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.newBadgeText}>NEW</Text>
        </View>
        <Text style={styles.cardTimer}>{timer}</Text>
        <Text style={styles.cardDistance}>{distance}</Text>
      </View>

      {/* Order ID */}
      <Text style={styles.orderId}>Order ID: #{order.orderId?.slice(-8)?.toUpperCase()}</Text>

      {/* Vendor */}
      {order.vendorName && (
        <View style={styles.locationRow}>
          <Store size={14} color="#64748B" strokeWidth={2} />
          <Text style={styles.locationText} numberOfLines={1}>
            {order.vendorName}
          </Text>
        </View>
      )}

      {/* Drop */}
      {order.customerAddress && (
        <View style={styles.locationRow}>
          <MapPin size={14} color="#1A6BFF" strokeWidth={2} />
          <Text style={styles.locationText} numberOfLines={2}>
            {order.customerAddress}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Est. Earn</Text>
          <Text style={styles.metaValue}>{earning}</Text>
        </View>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Distance</Text>
          <Text style={styles.metaValue}>{distance}</Text>
        </View>
        <TouchableOpacity
          style={[styles.acceptBtn, isClaiming && styles.acceptBtnDisabled]}
          onPress={onAccept}
          disabled={isClaiming}
          activeOpacity={0.8}>
          {isClaiming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.acceptBtnText}>ACCEPT</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const LiveOrderPoolScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authData, partnerProfile } = useAuthStore();
  const partnerId = authData?.partnerId ?? '';

  const [isOnline, setIsOnline] = useState(
    partnerProfile?.isOnline ?? false,
  );
  const [activeShift, setActiveShift] = useState<ShiftResponse | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showDeactivatedWarning, setShowDeactivatedWarning] = useState(false);

  const { orders, loading, claiming, claimOrder, refresh } =
    usePoolOrders(isOnline);

  // Fetch active shift on mount
  useEffect(() => {
    const load = async () => {
      if (!partnerId) return;
      try {
        const shift = await shiftService.getActiveShift(partnerId);
        setActiveShift(shift);
      } catch {
        setActiveShift(null);
      } finally {
        setShiftLoading(false);
      }
    };
    load();
  }, [partnerId]);

  // Toggle online status
  const handleToggleOnline = useCallback(async () => {
    if (partnerProfile && partnerProfile.isActive === false) {
      setShowDeactivatedWarning(true);
      setTimeout(() => setShowDeactivatedWarning(false), 4000);
      return;
    }
    const next = !isOnline;
    setIsOnline(next);
    try {
      await deliveryPartnerService.toggleDeliveryPartnerOnlineStatus(
        partnerId,
        next,
      );
    } catch {
      setIsOnline(!next);
      showToast('Failed to update status');
    }
  }, [isOnline, partnerId]);

  const handleAccept = useCallback(
    async (order: PoolOrder) => {
      const result = await claimOrder(order.poolId, partnerId);
      if (result === 'success') {
        showToast('Order assigned! Check your active orders.');
      } else if (result === 'taken') {
        showToast('Already taken by another rider');
      } else if (result === 'expired') {
        showToast('This order has expired');
      } else {
        showToast('Something went wrong. Please try again.');
      }
    },
    [claimOrder, partnerId],
  );

  const renderEmpty = () => {
    if (loading || shiftLoading) return null;
    if (!isOnline) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Zap size={36} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>You're Offline</Text>
          <Text style={styles.emptySubtitle}>
            Go online to see available orders
          </Text>
        </View>
      );
    }
    if (!activeShift) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Zap size={36} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <Text style={styles.emptyTitle}>No Active Shift</Text>
          <Text style={styles.emptySubtitle}>
            You have no shift booked for this time slot
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Zap size={36} color="#CBD5E1" strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptySubtitle}>
          New orders will appear here in real-time
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.onlineToggle}
          onPress={handleToggleOnline}
          activeOpacity={0.8}>
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.statusText, partnerProfile?.isActive === false ? { color: '#EF4444' } : (isOnline ? styles.statusOnline : styles.statusOffline)]}>
            {partnerProfile?.isActive === false ? 'Deactivated' : (isOnline ? 'Online' : 'Offline')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={refresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <RefreshCw size={18} color="#64748B" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {showDeactivatedWarning && (
        <View style={{ backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1, padding: 8, borderRadius: 6, marginHorizontal: 16, marginTop: 8 }}>
          <Text style={{ color: '#EF4444', fontSize: 11, textAlign: 'center', fontFamily: 'Outfit-Medium' }}>
            You are deactivated by admin, can't go online, ask admin!
          </Text>
        </View>
      )}

      {/* Pool Header */}
      <View style={styles.poolHeader}>
        <Text style={styles.poolTitle}>Live Order Pool</Text>
        {activeShift && !shiftLoading && (
          <View style={styles.shiftBanner}>
            <Text style={styles.shiftBannerLabel}>Viewing orders for</Text>
            <Text style={styles.shiftBannerWindow}>{activeShift.shiftWindow}</Text>
          </View>
        )}
      </View>

      {/* Order List */}
      {loading || shiftLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A6BFF" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.poolId}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              isClaiming={claiming === item.poolId}
              onAccept={() => handleAccept(item)}
            />
          )}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refresh}
              tintColor="#1A6BFF"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotOnline: {
    backgroundColor: '#22C55E',
  },
  dotOffline: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  statusOnline: {
    color: '#16A34A',
  },
  statusOffline: {
    color: '#64748B',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poolHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  poolTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  shiftBanner: {
    marginTop: 4,
  },
  shiftBannerLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  shiftBannerWindow: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  newBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardTimer: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#EF4444',
    marginLeft: 4,
  },
  cardDistance: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginLeft: 'auto',
  },
  orderId: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#334155',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 12,
  },
  metaCol: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  acceptBtn: {
    marginLeft: 'auto',
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    opacity: 0.6,
  },
  acceptBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});

export default LiveOrderPoolScreen;
