import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Route, Store } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import type { PoolOrder } from '../types/pool.types';

interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

/**
 * The /order-pool endpoint returns the flat PoolOrder fields, but in
 * practice also nests the full order/shop/finance payload (same shape
 * DeliveryPartnerOrder uses on the live-order side). All of this is
 * optional — the card falls back to the flat fields when it's absent.
 */
interface PoolOrderExtras {
  order?: {
    state?: string | null;
    totalItemCount?: number;
    orderDescription?: string | null;
    orderItem?: { id: number; name: string; itemCount: number }[];
  };
  shop?: {
    logo?: string | null;
  };
  finance?: {
    tip?: number | null;
    surgeFee?: number | null;
    commission?: number | null;
  };
}

type OrderPoolCardOrder = PoolOrder & PoolOrderExtras;

interface OrderPoolCardProps {
  order: OrderPoolCardOrder;
  index: number;
  totalOrders: number;
  isClaiming: boolean;
  currentLocation?: Coordinates | null;
  onAccept: () => void;
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const distanceInKm = (from: Coordinates | null, to: Coordinates | null) => {
  if (
    !from ||
    !to ||
    from.latitude == null ||
    from.longitude == null ||
    to.latitude == null ||
    to.longitude == null ||
    !Number.isFinite(from.latitude) ||
    !Number.isFinite(from.longitude) ||
    !Number.isFinite(to.latitude) ||
    !Number.isFinite(to.longitude)
  ) {
    return null;
  }
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatCurrencyLocal = (amount: number | null | undefined) =>
  amount == null || !Number.isFinite(amount)
    ? '₹0.00'
    : `₹${amount.toFixed(2)}`;

const getSecondsLeft = (expiresAt: number) => {
  if (!expiresAt || !Number.isFinite(expiresAt)) return 0;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
};

/** Pulls the customer's display name out of the stringified
 * "{name=..., addressLine1=..., ...}" customerAddress blob, and the
 * coordinates too, if present. */
const parseCustomerAddress = (raw: string | null | undefined) => {
  if (!raw)
    return { name: null as string | null, latitude: null, longitude: null };
  const cleaned = raw.replace(/^\{/, '').replace(/\}$/, '');
  const entries = [...cleaned.matchAll(/(\w+)=([^,]+(?:,(?!\s*\w+=)[^,]+)*)/g)];
  const map: Record<string, string> = {};
  entries.forEach(([, key, value]) => {
    map[key] = value.trim();
  });
  const latitude = map.latitude ? Number(map.latitude) : null;
  const longitude = map.longitude ? Number(map.longitude) : null;
  return {
    name: map.name || null,
    latitude: Number.isFinite(latitude as number) ? latitude : null,
    longitude: Number.isFinite(longitude as number) ? longitude : null,
  };
};

const formatStatusLabelLocal = (status: string) =>
  status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());

const OrderPoolCard: React.FC<OrderPoolCardProps> = ({
  order,
  index,
  totalOrders,
  isClaiming,
  currentLocation,
  onAccept,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    getSecondsLeft(order.expiresAt),
  );

  useEffect(() => {
    setSecondsLeft(getSecondsLeft(order.expiresAt));
    const interval = setInterval(
      () => setSecondsLeft(getSecondsLeft(order.expiresAt)),
      1000,
    );
    return () => clearInterval(interval);
  }, [order.expiresAt]);

  const expired = secondsLeft <= 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerText = `${mins}:${String(secs).padStart(2, '0')}`;

  const vendorLocation: Coordinates = {
    latitude: order.vendorLatitude,
    longitude: order.vendorLongitude,
  };
  const pickupDistance = distanceInKm(currentLocation ?? null, vendorLocation);
  const pickupDistanceLabel =
    order.estimatedDistanceKm != null
      ? `${order.estimatedDistanceKm.toFixed(1)} km`
      : pickupDistance != null
      ? `${pickupDistance.toFixed(1)} km`
      : 'N/A';

  const customer = parseCustomerAddress(order.customerAddress);
  const dropLocation: Coordinates = {
    latitude: customer.latitude,
    longitude: customer.longitude,
  };
  const deliveryDistance = distanceInKm(vendorLocation, dropLocation);
  const deliveryDistanceLabel =
    deliveryDistance != null ? `${deliveryDistance.toFixed(1)} km` : 'N/A';

  const itemCount = order.order?.totalItemCount ?? 0;
  const orderDescription =
    order.order?.orderDescription ||
    (order.order?.orderItem?.length
      ? order.order.orderItem.map(item => item.name).join(', ')
      : null);

  const tipAmount = order.finance?.tip;
  const surgeFee = order.finance?.surgeFee;
  const shopLogo = order.shop?.logo;

  // Same "pending vendor" concept as the assigned-order card on the Home
  // screen: the underlying order can still be waiting on the vendor to
  // accept it even while it's sitting in the pool.
  const rawState = order.order?.state;
  const isPending = rawState?.toUpperCase() === 'PENDING';
  const formattedState = rawState ? formatStatusLabelLocal(rawState) : null;

  return (
    <View style={[styles.newOrderCard, expired && styles.newOrderCardExpired]}>
      <View style={styles.orderMetaRow}>
        <Text style={styles.liveOrderCount}>
          {index + 1} of {totalOrders}
        </Text>
        <View style={styles.orderTagsContainer}>
          <Text style={styles.orderTag}>Pool Order</Text>
          {formattedState && (
            <View
              style={[
                styles.orderStateBadge,
                isPending && styles.orderStateBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.orderStateBadgeText,
                  isPending && styles.orderStateBadgeTextPending,
                ]}
              >
                {formattedState}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[styles.liveTimeText, expired && styles.liveTimeTextExpired]}
        >
          {expired ? 'Expired' : `Expires ${timerText}`}
        </Text>
      </View>

      <View style={styles.assignedOrderHeader}>
        {shopLogo ? (
          <Image source={{ uri: shopLogo }} style={styles.assignedShopLogo} />
        ) : (
          <View style={styles.assignedShopLogoFallback}>
            <Store size={17} color="#F97316" />
          </View>
        )}
        <View style={styles.assignedOrderMain}>
          <Text style={styles.assignedShopName} numberOfLines={1}>
            {order.vendorName || 'N/A'}
          </Text>
          <Text style={styles.assignedOrderId} numberOfLines={1}>
            Order ID: #{order.orderId || 'N/A'}
          </Text>
        </View>
        <View style={styles.assignedEarningsWrap}>
          <Text style={styles.assignedEarnings}>
            {formatCurrencyLocal(order.estimatedEarning)}
          </Text>
          <Text style={styles.assignedEarningsLabel}>Est. Earning</Text>
        </View>
      </View>

      {/* PENDING VENDOR WARNING BANNER — mirrors the Home screen card */}
      {isPending && (
        <View style={styles.pendingVendorWarning}>
          <Text style={styles.pendingVendorWarningText}>
            Waiting for vendor to accept this order
          </Text>
        </View>
      )}

      <View style={styles.assignedCustomerRow}>
        <Text style={styles.assignedCustomerName} numberOfLines={1}>
          {customer.name || 'N/A'}
        </Text>
        <Text style={styles.assignedItemCount}>
          {itemCount > 0 ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : ''}
        </Text>
      </View>

      {!!orderDescription && (
        <Text style={styles.assignedDescription} numberOfLines={1}>
          {orderDescription}
        </Text>
      )}

      <View style={styles.assignedMetricsRow}>
        <View style={styles.assignedMetric}>
          <MapPin size={12} color="#0E6DFD" />
          <Text style={styles.assignedMetricValue}>{pickupDistanceLabel}</Text>
          <Text style={styles.assignedMetricLabel}>Pick up</Text>
        </View>
        <View style={styles.assignedMetricDivider} />
        <View style={styles.assignedMetric}>
          <Route size={12} color="#F97316" />
          <Text style={styles.assignedMetricValue}>
            {deliveryDistanceLabel}
          </Text>
          <Text style={styles.assignedMetricLabel}>Delivery</Text>
        </View>
        <View style={styles.assignedMetricDivider} />
        <View style={styles.assignedMetric}>
          <Text style={styles.assignedMetricCurrency}>₹</Text>
          <Text style={styles.assignedMetricValue}>
            {order.finance?.commission != null
              ? order.finance.commission.toFixed(2)
              : '-'}
          </Text>
          <Text style={styles.assignedMetricLabel}>Per km</Text>
        </View>
      </View>

      <View style={styles.liveFeesRow}>
        <Text style={styles.liveFeeText}>
          Tip: {formatCurrencyLocal(tipAmount)}
        </Text>
        <Text style={styles.liveFeeText}>
          Surge Fee: {formatCurrencyLocal(surgeFee)}
        </Text>
      </View>

      <View style={styles.newOrderActionsRow}>
        <TouchableOpacity
          style={[
            styles.newOrderButton,
            styles.newOrderAcceptButton,
            (isClaiming || expired) && { opacity: 0.6 },
          ]}
          activeOpacity={0.85}
          disabled={isClaiming || expired}
          onPress={onAccept}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.newOrderAcceptButtonText}>
              {expired ? 'Expired' : 'Accept Order ›'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  newOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D9E1EC',
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 9,
  },
  newOrderCardExpired: {
    opacity: 0.55,
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  liveOrderCount: {
    fontSize: 12,
    marginRight: 6,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  orderTagsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  orderTag: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
    textTransform: 'uppercase',
  },
  orderStateBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  orderStateBadgePending: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  orderStateBadgeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#047857',
    textTransform: 'uppercase',
  },
  orderStateBadgeTextPending: {
    color: '#C2410C',
  },
  pendingVendorWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 6,
    paddingHorizontal: 9,
    backgroundColor: '#FFF7ED',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  pendingVendorWarningText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#C2410C',
    flex: 1,
  },
  liveTimeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  liveTimeTextExpired: {
    color: '#94A3B8',
  },
  assignedOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  assignedShopLogo: {
    width: 30,
    height: 30,
    borderRadius: 7,
    marginRight: 8,
    backgroundColor: '#FFF7ED',
  },
  assignedShopLogoFallback: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFF7ED',
  },
  assignedOrderMain: {
    flex: 1,
    minWidth: 0,
  },
  assignedShopName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  assignedOrderId: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  assignedEarningsWrap: {
    alignItems: 'flex-end',
    marginLeft: 6,
  },
  assignedEarnings: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  assignedEarningsLabel: {
    fontSize: 10,
    marginTop: 1,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  assignedCustomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  assignedCustomerName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#334155',
  },
  assignedItemCount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  assignedDescription: {
    fontSize: 11,
    marginBottom: 6,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  assignedMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 7,
    backgroundColor: '#F8FAFC',
    borderRadius: 7,
  },
  assignedMetric: {
    flex: 1,
    alignItems: 'center',
  },
  assignedMetricValue: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#334155',
  },
  assignedMetricCurrency: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  assignedMetricLabel: {
    fontSize: 10,
    marginTop: 1,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  assignedMetricDivider: {
    width: 1,
    height: 25,
    backgroundColor: '#E2E8F0',
  },
  liveFeesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  liveFeeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  newOrderActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  newOrderButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newOrderAcceptButton: {
    backgroundColor: '#16A34A',
  },
  newOrderAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
});

export default OrderPoolCard;
