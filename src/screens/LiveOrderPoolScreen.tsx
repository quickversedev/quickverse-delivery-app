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
import { Zap, RefreshCw } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import useAuthStore from '../hooks/useAuthStore';
import usePoolOrders from '../hooks/usePoolOrders';
import shiftService from '../services/shift.service';
import deliveryPartnerService from '../services/delivery-partner.service';
import OrderPoolCard from '../components/OrderPoolCard';
import type { ShiftResponse } from '../types/shift.types';
import {
  getBestEffortCurrentLocation,
  type Coordinate,
} from '../utils/location';

const showToast = (msg: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(msg, ToastAndroid.SHORT);
  } else {
    Alert.alert('', msg);
  }
};

const LiveOrderPoolScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authData, partnerProfile } = useAuthStore();
  const partnerId = authData?.partnerId ?? '';

  const [isOnline, setIsOnline] = useState(partnerProfile?.isOnline ?? false);
  const [activeShift, setActiveShift] = useState<ShiftResponse | null>(null);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [showDeactivatedWarning, setShowDeactivatedWarning] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );

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

  // Keep current location fresh so pickup-distance metrics on each card
  // (same "Pick up" metric the Home screen shows) stay accurate.
  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    const fetchLocation = async () => {
      try {
        const location = await getBestEffortCurrentLocation();
        if (!cancelled) setCurrentLocation(location);
      } catch (error) {
        console.error('Unable to fetch current location', error);
      }
    };
    fetchLocation();
    const intervalId = setInterval(fetchLocation, 15000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isOnline]);

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
    async (order: (typeof orders)[number]) => {
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
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.statusDot,
              isOnline ? styles.dotOnline : styles.dotOffline,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              partnerProfile?.isActive === false
                ? { color: '#EF4444' }
                : isOnline
                ? styles.statusOnline
                : styles.statusOffline,
            ]}
          >
            {partnerProfile?.isActive === false
              ? 'Deactivated'
              : isOnline
              ? 'Online'
              : 'Offline'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={refresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <RefreshCw size={18} color="#64748B" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {showDeactivatedWarning && (
        <View style={styles.deactivatedWarning}>
          <Text style={styles.deactivatedWarningText}>
            You are deactivated by admin, can't go online, ask admin!
          </Text>
        </View>
      )}

      {/* Order List */}
      {loading || shiftLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0E6DFD" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.poolId}
          renderItem={({ item, index }) => (
            <OrderPoolCard
              order={item}
              index={index}
              totalOrders={orders.length}
              isClaiming={claiming === item.poolId}
              currentLocation={currentLocation}
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
              colors={['#0E6DFD']}
              tintColor="#0E6DFD"
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
    backgroundColor: '#F2F5FA',
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
  deactivatedWarning: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  deactivatedWarningText: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    textAlign: 'center',
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
