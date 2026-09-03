import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
  AppState,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import type {
  DeliveryPartnerOrder,
  DeliveryPartnerStats,
  StatsPeriod,
} from '../services/delivery-partner.service';
import websocketService, {
  type OrderActionEvent,
} from '../services/websocket.service';
import LogoutConfirmationModal from '../components/modals/LogoutConfirmationModal';
import OtpVerificationModal from '../components/modals/OtpVerificationModal';
import BillSummaryCard from '../components/BillSummaryCard';
import usePricingStore from '../store/pricingStore';
import type { ServiceType } from '../types/pricing';
import { FONT_FAMILY } from '../theme/typography';
import {
  getBestEffortCurrentLocation,
  requestLocationAccess,
  type Coordinate,
} from '../utils/location';
import { isLocationEnabled } from 'react-native-device-info';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import {
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Route,
  Store,
  Trophy,
  UserRound,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type RootStackParamList = {
  MainTabs: undefined;
  OrderWebView: { url: string; title?: string };
  OrderDelivery: { order: DeliveryPartnerOrder };
};

type ParsedCustomerAddress = {
  text: string;
  latitude: number | null;
  longitude: number | null;
};

const UNASSIGN_WINDOW_MS = 150_000;

type LiveOrderCardProps = {
  order: DeliveryPartnerOrder;
  index: number;
  totalLiveOrders: number;
  currentLocation: Coordinate | null;
};

// ──── LIVE ORDER CARD ─────────────────────────────────────────────────────
const LiveOrderCard: React.FC<LiveOrderCardProps> = ({
  order,
  index,
  totalLiveOrders,
  currentLocation,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getPricingValues } = usePricingStore();

  const getSecondsLeft = () => {
    const raw = order.createdAt ?? order.orderDetails?.creationTime;
    const created = Number(raw);
    if (!raw || !Number.isFinite(created) || created <= 0) return 0;
    return Math.max(
      0,
      Math.ceil((created + UNASSIGN_WINDOW_MS - Date.now()) / 1000),
    );
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);

  useEffect(() => {
    setSecondsLeft(getSecondsLeft());
    const interval = setInterval(() => setSecondsLeft(getSecondsLeft()), 1000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setSecondsLeft(getSecondsLeft());
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [order.createdAt]);

  const expired = secondsLeft <= 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerText = `${mins}:${String(secs).padStart(2, '0')}`;

  const liveAmountExcludingDeliveryFee =
    order.orderDetails?.amountExcludingDeliveryFee ?? 0;
  const orderStatus = order.orderStatus?.toUpperCase() ?? '';
  const liveServiceType: ServiceType = order.shopDetails?.category
    ?.toLowerCase()
    .includes('grocery')
    ? 'GROCERY'
    : 'FOOD';
  const livePricing = getPricingValues(liveServiceType);
  const liveTaxableAmount = livePricing.deliveryFee + livePricing.platformFee;
  const liveTaxes = Math.round(livePricing.gstRate * liveTaxableAmount);
  const liveComputedTotal =
    liveAmountExcludingDeliveryFee +
    livePricing.deliveryFee +
    livePricing.platformFee +
    livePricing.packagingCharges +
    liveTaxes;

  const formatCurrencyLocal = (amount: number) =>
    `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;

  const formatStatusLabelLocal = (status: string) =>
    status
      .split('_')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

  const parseDateValueLocal = (value: string | null): Date | null => {
    if (!value) return null;
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) return new Date(num);
    const d = new Date(value.includes(' ') ? value.replace(' ', 'T') : value);
    return isNaN(d.getTime()) ? null : d;
  };

  const orderDateTime = (() => {
    const d = parseDateValueLocal(
      order.orderDetails?.creationTime ?? order.createdAt ?? null,
    );
    if (!d) return { date: 'N/A', time: '' };
    return {
      date: `${String(d.getDate()).padStart(2, '0')}/${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  })();

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const distanceInKm = (
    from: { latitude: number | null; longitude: number | null } | null,
    to: { latitude: number | null; longitude: number | null } | null,
  ) => {
    if (
      !from ||
      !to ||
      to.latitude == null ||
      to.longitude == null ||
      !Number.isFinite(to.latitude) ||
      !Number.isFinite(to.longitude) ||
      from.latitude == null ||
      from.longitude == null ||
      !Number.isFinite(from.latitude) ||
      !Number.isFinite(from.longitude)
    ) {
      return null;
    }
    const earthRadiusKm = 6371;
    const latitudeDelta = toRadians(to.latitude - from.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(from.latitude)) *
        Math.cos(toRadians(to.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const pickupDistance = distanceInKm(currentLocation, order.shopDetails);
  const customerLocation =
    order.reportedAddresses?.find(
      address =>
        address.latitude != null &&
        address.longitude != null &&
        Number.isFinite(address.latitude) &&
        Number.isFinite(address.longitude),
    ) ?? null;
  const deliveryDistance = distanceInKm(order.shopDetails, customerLocation);
  const assignmentDate = parseDateValueLocal(order.assignedAt);
  const assignmentLabel = assignmentDate
    ? (() => {
        const elapsedMinutes = Math.max(
          0,
          Math.floor((Date.now() - assignmentDate.getTime()) / 60000),
        );
        return elapsedMinutes < 1
          ? 'Just now'
          : elapsedMinutes < 60
          ? `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`
          : `${Math.floor(elapsedMinutes / 60)} hr${
              Math.floor(elapsedMinutes / 60) === 1 ? '' : 's'
            } ago`;
      })()
    : 'N/A';
  const totalBillAmount = order.finance?.payableAmount ?? null;
  const tipAmount = (
    order.finance as
      | (typeof order.finance & {
          tip?: number | null;
        })
      | null
  )?.tip;
  const surgeFee = (
    order.finance as
      | (typeof order.finance & {
          surgeFee?: number | null;
        })
      | null
  )?.surgeFee;
  const pickupDistanceLabel =
    pickupDistance == null ? 'N/A' : `${Number(pickupDistance).toFixed(1)} km`;
  const deliveryDistanceLabel =
    deliveryDistance == null
      ? 'N/A'
      : `${Number(deliveryDistance).toFixed(1)} km`;
  const tipLabel =
    tipAmount == null ? '₹0.00' : formatCurrencyLocal(Number(tipAmount));
  const surgeLabel =
    surgeFee == null ? '₹0.00' : formatCurrencyLocal(Number(surgeFee));

  return (
    <NewOrderRequestCard
      order={order}
      isLoading={false}
      index={index}
      totalOrders={totalLiveOrders}
      currentLocation={currentLocation}
      variant="live"
    />
  );

  return (
    <TouchableOpacity
      style={styles.liveCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('OrderDelivery', { order })}
    >
      <View style={styles.orderMetaRow}>
        <Text style={styles.liveOrderCount}>
          {index + 1} of {totalLiveOrders}
        </Text>
        <Text style={styles.liveTimeText}>{assignmentLabel}</Text>
      </View>
      <View style={styles.livePulseRow}>
        <View style={styles.liveDot} />
        <Text style={styles.liveLabel}>Live Order</Text>
      </View>

      <View style={styles.liveSubRow}>
        <Text style={styles.liveOrderId}>
          #{order.orderId || order.id || 'N/A'}
        </Text>
        <View style={styles.liveStatePill}>
          <Text style={styles.liveStatePillText}>
            {formatStatusLabelLocal(
              order.orderDetails?.state?.toUpperCase() ?? 'UNKNOWN',
            )}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 6,
        }}
      >
        <Text style={styles.liveLocName}>
          {order.orderDetails?.customerName || 'Customer'}
        </Text>
        <Text style={styles.liveTotalBillLabel}>
          Total Bill Amount{' '}
          <Text style={styles.liveEarningsInline}>
            {totalBillAmount != null
              ? formatCurrencyLocal(Number(totalBillAmount))
              : liveComputedTotal > 0
              ? formatCurrencyLocal(liveComputedTotal)
              : 'N/A'}
          </Text>
        </Text>
      </View>

      <Text style={[styles.liveLocAddress, { marginTop: 2 }]}>
        {order.shopDetails?.name || 'Shop'}
      </Text>

      <View style={styles.liveDistanceRow}>
        <Text style={styles.liveDistanceText}>
          Pickup: {pickupDistanceLabel}
        </Text>
        <Text style={styles.liveDistanceText}>
          Delivery: {deliveryDistanceLabel}
        </Text>
      </View>

      <View style={styles.liveFeesRow}>
        <Text style={styles.liveFeeText}>Tip: {tipLabel}</Text>
        <Text style={styles.liveFeeText}>Surge Fee: {surgeLabel}</Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 10,
          marginBottom: 4,
        }}
      >
        {['At Store', 'Picked Up', 'Reach Destination', 'Delivered'].map(
          (label, i) => {
            const stageMap: Record<string, number> = {
              ACCEPTED: 0,
              PARTNER_ASSIGNED: 0,
              ARRIVED_AT_STORE: 1,
              ORDER_PICKED_UP: 2,
              REACHED_LOCATION: 3,
              DELIVERED: 4,
            };
            const currentIdx = stageMap[orderStatus] ?? 0;
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={label}>
                <View style={{ alignItems: 'center' }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: done
                        ? '#16A34A'
                        : active
                        ? '#0E6DFD'
                        : '#E2E8F0',
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 8,
                      color: active ? '#0E6DFD' : '#94A3B8',
                      marginTop: 2,
                      fontFamily: FONT_FAMILY.bricolageMedium,
                    }}
                  >
                    {label}
                  </Text>
                </View>
                {i < 3 && (
                  <View
                    style={{
                      flex: 1,
                      height: 2,
                      backgroundColor: done ? '#16A34A' : '#E2E8F0',
                      marginBottom: 10,
                    }}
                  />
                )}
              </React.Fragment>
            );
          },
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.stageActionButton,
          { marginTop: 12, backgroundColor: '#0E6DFD' },
        ]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('OrderDelivery', { order })}
      >
        <Text style={styles.stageActionButtonText}>Manage Delivery</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const liveTimerStyles = StyleSheet.create({
  timerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerRowActive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  timerRowExpired: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  timerIcon: {
    fontSize: 14,
    marginTop: 1,
  },
  timerActiveLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#92400E',
    lineHeight: 17,
  },
  timerCountdown: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#B45309',
  },
  timerSubLabel: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#A16207',
    lineHeight: 14,
  },
  timerExpiredLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },
});

/**
 * Payment-type classification
 */
type PaymentTypeKey = 'prepaid' | 'codCash' | 'codQrCode';

const PAYMENT_TYPE_LABELS: Record<PaymentTypeKey, string> = {
  prepaid: 'PREPAID',
  codQrCode: 'QR CODE',
  codCash: 'CASH',
};

const getOrderPaymentType = (order: DeliveryPartnerOrder): PaymentTypeKey => {
  const isPaymentProofProvided = !!order?.orderDetails?.paymentProofURLImageUrl;
  const isPrepaidOrder =
    order?.finance?.paymentMethod?.toLowerCase() === 'prepaid';

  if (isPrepaidOrder) return 'prepaid';
  if (isPaymentProofProvided) return 'codQrCode';

  const paymentMethod =
    order?.orderDetails?.paymentMethod ?? order?.paymentMethod ?? '';

  return paymentMethod === 'QR_CODE' ? 'codQrCode' : 'codCash';
};

// ──── NEW ORDER REQUEST CARD ──────────────────────────────────────────────
type NewOrderRequestCardProps = {
  order: DeliveryPartnerOrder;
  isLoading: boolean;
  index: number;
  totalOrders: number;
  currentLocation: Coordinate | null;
  variant: 'new' | 'live';
  onAccept?: (order: DeliveryPartnerOrder) => void;
  onReject?: (order: DeliveryPartnerOrder) => void;
};

const NewOrderRequestCard: React.FC<NewOrderRequestCardProps> = ({
  order,
  isLoading,
  index,
  totalOrders,
  currentLocation,
  variant,
  onAccept,
  onReject,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { getPricingValues } = usePricingStore();

  const amountExcludingDeliveryFee =
    order.orderDetails?.amountExcludingDeliveryFee ?? 0;
  const serviceType: ServiceType = order.shopDetails?.category
    ?.toLowerCase()
    .includes('grocery')
    ? 'GROCERY'
    : 'FOOD';
  const pricing = getPricingValues(serviceType);
  const taxableAmount = pricing.deliveryFee + pricing.platformFee;
  const taxes = Math.round(pricing.gstRate * taxableAmount);
  const computedTotal =
    amountExcludingDeliveryFee +
    pricing.deliveryFee +
    pricing.platformFee +
    pricing.packagingCharges +
    taxes;

  const formatCurrencyLocal = (amount: number) =>
    `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;

  const itemCount = order.orderDetails?.totalItemCount ?? 0;
  const orderDescription =
    order.orderDetails?.orderDescription ||
    (order.orderDetails?.orderItem?.length
      ? order.orderDetails.orderItem.map(item => item.name).join(', ')
      : null);

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const distanceInKm = (
    from: { latitude: number | null; longitude: number | null } | null,
    to: { latitude: number | null; longitude: number | null } | null,
  ) => {
    if (
      !from ||
      !to ||
      from.latitude == null ||
      from.longitude == null ||
      to.latitude == null ||
      to.longitude == null
    ) {
      return null;
    }
    const latitudeDelta = toRadians(to.latitude - from.latitude);
    const longitudeDelta = toRadians(to.longitude - from.longitude);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(from.latitude)) *
        Math.cos(toRadians(to.latitude)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const pickupDistance = distanceInKm(currentLocation, order.shopDetails);
  const customerLocation =
    order.reportedAddresses?.find(
      address => address.latitude != null && address.longitude != null,
    ) ?? null;
  const deliveryDistance = distanceInKm(order.shopDetails, customerLocation);
  const assignmentDate = order.assignedAt
    ? (() => {
        const numericValue = Number(order.assignedAt);
        if (Number.isFinite(numericValue) && numericValue > 0) {
          const numericDate = new Date(numericValue);
          return Number.isNaN(numericDate.getTime()) ? null : numericDate;
        }
        const normalizedValue = order.assignedAt.includes(' ')
          ? order.assignedAt.replace(' ', 'T')
          : order.assignedAt;
        const stringDate = new Date(normalizedValue);
        return Number.isNaN(stringDate.getTime()) ? null : stringDate;
      })()
    : null;
  const elapsedMinutes = assignmentDate
    ? Math.max(0, Math.floor((Date.now() - assignmentDate.getTime()) / 60000))
    : null;
  const assignmentLabel =
    elapsedMinutes == null
      ? 'N/A'
      : elapsedMinutes < 1
      ? 'Just now'
      : `${elapsedMinutes} min${elapsedMinutes === 1 ? '' : 's'} ago`;
  const tipAmount = (
    order.finance as
      | (typeof order.finance & {
          tip?: number | null;
        })
      | null
  )?.tip;
  const surgeFee = (
    order.finance as
      | (typeof order.finance & {
          surgeFee?: number | null;
        })
      | null
  )?.surgeFee;

  return (
    <View style={styles.newOrderCard}>
      <View style={styles.orderMetaRow}>
        <Text style={styles.liveOrderCount}>
          {index + 1} of {totalOrders}
        </Text>
        <Text style={styles.orderTag}>
          {variant === 'live' ? 'Live Order' : 'New Order'}
        </Text>
        <Text style={styles.liveTimeText}>{assignmentLabel}</Text>
      </View>
      <View style={styles.assignedOrderHeader}>
        {order.shopDetails?.logo ? (
          <Image
            source={{ uri: order.shopDetails.logo }}
            style={styles.assignedShopLogo}
          />
        ) : (
          <View style={styles.assignedShopLogoFallback}>
            <Store size={17} color="#F97316" />
          </View>
        )}
        <View style={styles.assignedOrderMain}>
          <Text style={styles.assignedShopName} numberOfLines={1}>
            {order.shopDetails?.name || 'N/A'}
          </Text>
          <Text style={styles.assignedOrderId} numberOfLines={1}>
            Order ID: #{order.orderId || order.id || 'N/A'}
          </Text>
        </View>
        <View style={styles.assignedEarningsWrap}>
          <Text style={styles.assignedEarnings}>
            {order?.finance?.payableAmount != null
              ? formatCurrencyLocal(order.finance.payableAmount)
              : 'N/A'}
          </Text>
          <Text style={styles.assignedEarningsLabel}>Total Bill Amount</Text>
        </View>
      </View>

      <View style={styles.assignedCustomerRow}>
        <Text style={styles.assignedCustomerName} numberOfLines={1}>
          {order.orderDetails?.customerName || 'N/A'}
        </Text>
        <Text style={styles.assignedItemCount}>
          {itemCount > 0
            ? `${itemCount} item${itemCount > 1 ? 's' : ''}`
            : 'N/A'}
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
          <Text style={styles.assignedMetricValue}>
            {pickupDistance != null ? `${pickupDistance.toFixed(1)} km` : 'N/A'}
          </Text>
          <Text style={styles.assignedMetricLabel}>Pick up</Text>
        </View>
        <View style={styles.assignedMetricDivider} />
        <View style={styles.assignedMetric}>
          <Route size={12} color="#F97316" />
          <Text style={styles.assignedMetricValue}>
            {deliveryDistance != null
              ? `${deliveryDistance.toFixed(1)} km`
              : 'N/A'}
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
          Tip: {tipAmount != null ? formatCurrencyLocal(tipAmount) : '₹0.00'}
        </Text>
        <Text style={styles.liveFeeText}>
          Surge Fee:{' '}
          {surgeFee != null ? formatCurrencyLocal(surgeFee) : '₹0.00'}
        </Text>
      </View>

      {variant === 'live' ? (
        <TouchableOpacity
          style={styles.orderManageButton}
          onPress={() => navigation.navigate('OrderDelivery', { order })}
          activeOpacity={0.85}
        >
          <Text style={styles.orderManageButtonText}>Manage Delivery ›</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.newOrderActionsRow}>
          <TouchableOpacity
            style={[
              styles.newOrderButton,
              styles.newOrderRejectButton,
              isLoading && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={() => onReject?.(order)}
          >
            <Text style={styles.newOrderRejectButtonText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.newOrderButton,
              styles.newOrderAcceptButton,
              isLoading && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={() => onAccept?.(order)}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.newOrderAcceptButtonText}>
                Accept Order ›
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ──── MAIN HOME SCREEN ────────────────────────────────────────────────────
const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    partnerProfile,
    isPartnerLoading,
    logout,
    authData,
    refreshPartnerProfile,
  } = useAuthStore();

  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [orders, setOrders] = useState<DeliveryPartnerOrder[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isOrdersRefreshing, setIsOrdersRefreshing] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders'>('orders');
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [partnerStats, setPartnerStats] = useState<DeliveryPartnerStats | null>(
    null,
  );
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const statsFilter: StatsPeriod = 'today';
  const [timeRangeFilter, setTimeRangeFilter] = useState<
    'all' | 'today' | 'week' | 'month' | 'custom'
  >('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<
    'all' | PaymentTypeKey
  >('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(
    new Set(),
  );
  const [wsConnected, setWsConnected] = useState(false);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpModalConfig, setOtpModalConfig] = useState<{
    orderId: string;
    title: string;
    message: string;
    apiAction: 'pickup' | 'completeDelivery';
  } | null>(null);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [showDeactivatedWarning, setShowDeactivatedWarning] = useState(false);
  const [orderActionLoadingId, setOrderActionLoadingId] = useState<
    string | null
  >(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingOrder, setRejectingOrder] =
    useState<DeliveryPartnerOrder | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const hasLoadedOnce = useRef(false);
  const { fetchPricing, getPricingValues } = usePricingStore();

  // ──── Date range state ────
  const [customOrders, setCustomOrders] = useState<DeliveryPartnerOrder[]>([]);
  const [isCustomOrdersLoading, setIsCustomOrdersLoading] = useState(false);
  const [customOrdersError, setCustomOrdersError] = useState<string | null>(
    null,
  );
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [draftStart, setDraftStart] = useState<Date>(new Date());
  const [draftEnd, setDraftEnd] = useState<Date>(new Date());
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [androidPicker, setAndroidPicker] = useState<'start' | 'end' | null>(
    null,
  );

  useEffect(() => {
    fetchPricing('FOOD');
    fetchPricing('GROCERY');
  }, []);

  useEffect(() => {
    if (typeof partnerProfile?.isOnline === 'boolean') {
      setIsOnline(partnerProfile.isOnline);
    }
  }, [partnerProfile]);

  const partnerId = partnerProfile?.id || authData.partnerId || '';

  const parseDateValue = (value: string | null): Date | null => {
    if (!value) return null;
    const numericTimestamp = Number(value);
    if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
      const fromEpoch = new Date(numericTimestamp);
      return Number.isNaN(fromEpoch.getTime()) ? null : fromEpoch;
    }
    const normalized = value.includes(' ') ? value.replace(' ', 'T') : value;
    const fromString = new Date(normalized);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  };

  const getOrderTimestamp = (order: DeliveryPartnerOrder) => {
    const date =
      parseDateValue(order.orderDetails?.creationTime ?? null) ??
      parseDateValue(order.createdAt);
    return date ? date.getTime() : 0;
  };

  const getUniqueLatestOrders = (allOrders: DeliveryPartnerOrder[]) => {
    const latestByOrderId = new Map<string, DeliveryPartnerOrder>();
    allOrders.forEach(order => {
      const key = order.orderId || order.id;
      if (!key) return;
      const existing = latestByOrderId.get(key);
      if (!existing || getOrderTimestamp(order) > getOrderTimestamp(existing)) {
        latestByOrderId.set(key, order);
      }
    });
    return Array.from(latestByOrderId.values()).sort(
      (a, b) => getOrderTimestamp(b) - getOrderTimestamp(a),
    );
  };

  const fetchCurrentLocation = async () => {
    try {
      const location = await getBestEffortCurrentLocation();
      setCurrentLocation(location);
    } catch (error) {
      console.error('Unable to fetch current location', error);
    }
  };

  const fetchAssignedOrders = async (options?: { silent?: boolean }) => {
    if (!partnerId) {
      setOrders([]);
      return;
    }
    if (!options?.silent) setIsOrdersLoading(true);
    setOrdersError(null);
    try {
      const response =
        await deliveryPartnerService.getAssignedOrdersByPartnerId(
          partnerId,
          'all',
        );
      setOrders(getUniqueLatestOrders(response));
    } catch (error) {
      console.error('Fetch assigned orders failed', error);
      setOrdersError('Unable to load your assigned orders. Please try again.');
    } finally {
      if (!options?.silent) setIsOrdersLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!partnerId) return;
    setIsOrdersRefreshing(true);
    try {
      await refreshPartnerProfile();
      if (activeTab === 'orders') {
        await fetchAssignedOrders({ silent: true });
        if (timeRangeFilter === 'custom' && customStart && customEnd) {
          await fetchCustomOrders(customStart, customEnd);
        }
      } else if (activeTab === 'dashboard') {
        await fetchPartnerStats(statsFilter);
      }
    } catch (error) {
      console.error('Refresh failed', error);
    } finally {
      setIsOrdersRefreshing(false);
    }
  };

  const fetchPartnerStats = async (period: StatsPeriod = statsFilter) => {
    if (!partnerId) return;
    setIsStatsLoading(true);
    try {
      const data = await deliveryPartnerService.getDeliveryPartnerStats(
        partnerId,
        period,
      );
      setPartnerStats(data);
    } catch (error) {
      console.error('Fetch partner stats failed', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  const toApiDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const fetchCustomOrders = async (start: Date, end: Date) => {
    if (!partnerId) return;
    setIsCustomOrdersLoading(true);
    setCustomOrdersError(null);
    try {
      const response =
        await deliveryPartnerService.getAssignedOrdersByPartnerId(
          partnerId,
          'custom',
          { fromDate: toApiDateString(start), toDate: toApiDateString(end) },
        );
      setCustomOrders(getUniqueLatestOrders(response));
    } catch (error) {
      console.error('Fetch custom range orders failed', error);
      setCustomOrdersError('Unable to load orders for this date range.');
    } finally {
      setIsCustomOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!partnerId) return;
    fetchCurrentLocation();
    if (activeTab === 'orders') {
      if (!hasLoadedOnce.current) {
        fetchAssignedOrders();
        hasLoadedOnce.current = true;
      } else {
        fetchAssignedOrders({ silent: true });
      }
      const intervalId = setInterval(() => {
        fetchAssignedOrders({ silent: true });
      }, 5000);
      return () => clearInterval(intervalId);
    } else if (activeTab === 'dashboard') {
      fetchPartnerStats(statsFilter);
    }
  }, [activeTab, partnerId, statsFilter]);

  const handleWebSocketEvent = useCallback(
    (event: OrderActionEvent) => {
      if (event.status?.toUpperCase().includes('CANCEL')) {
        Alert.alert(
          'Order Cancelled',
          `Order #${event.orderId} from ${
            event.customerName || 'customer'
          } has been cancelled.`,
        );
      }
      fetchAssignedOrders({ silent: true });
    },
    [partnerId],
  );

  useEffect(() => {
    if (!partnerId) return;
    websocketService.connect(partnerId, handleWebSocketEvent);
    const unsubscribe = websocketService.onStatusChange(setWsConnected);
    return () => {
      unsubscribe();
      websocketService.disconnect();
    };
  }, [partnerId, handleWebSocketEvent]);

  const handleToggleOnline = async () => {
    if (partnerProfile && partnerProfile.isActive === false) {
      setShowDeactivatedWarning(true);
      setTimeout(() => setShowDeactivatedWarning(false), 4000);
      return;
    }
    if (!partnerId) {
      Alert.alert('Partner ID missing', 'Unable to update online status.');
      return;
    }
    const nextStatus = !isOnline;

    if (nextStatus) {
      if (Platform.OS === 'android') {
        try {
          promptForEnableLocationIfNeeded();
        } catch (error) {
          console.log('Location enabler error:', error);
          return;
        }
      } else {
        const locationEnabled = await isLocationEnabled();
        if (!locationEnabled) {
          Alert.alert(
            'Location Disabled',
            'Please enable location services on your device to go online.',
          );
          return;
        }
      }

      const hasPermission = await requestLocationAccess();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to go online. Please enable it in app settings.',
        );
        return;
      }
    }
    setIsOnline(nextStatus);
    useAuthStore.setState(state => ({
      partnerProfile: state.partnerProfile
        ? { ...state.partnerProfile, isOnline: nextStatus }
        : null,
    }));
    setIsToggling(true);
    try {
      await deliveryPartnerService.toggleDeliveryPartnerOnlineStatus(
        partnerId,
        nextStatus,
      );
    } catch (error) {
      setIsOnline(!nextStatus);
      useAuthStore.setState(state => ({
        partnerProfile: state.partnerProfile
          ? { ...state.partnerProfile, isOnline: !nextStatus }
          : null,
      }));
      console.log('Toggle online status failed', error);
      Alert.alert(
        'Status update failed',
        'Unable to switch your online status. Please try again.',
      );
    } finally {
      setIsToggling(false);
    }
  };

  const partnerName = partnerProfile?.name || 'Delivery Partner';

  const getOrderEpochMs = (order: DeliveryPartnerOrder): number => {
    const fromCreatedAt = Number(order.createdAt);
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0)
      return fromCreatedAt;
    return getOrderTimestamp(order);
  };

  const isPartnerRejectedOrder = (o: DeliveryPartnerOrder) =>
    (o.orderStatus?.toUpperCase() ?? '') === 'PARTNER_REJECTED';

  const LIVE_INNER_STATES = [
    'ACCEPTED',
    'SHIPPED',
    'PENDING',
    'READY_FOR_PICKUP',
    'IN_TRANSIT',
  ];

  const isOrderLive = (o: DeliveryPartnerOrder) =>
    LIVE_INNER_STATES.includes(o.orderDetails?.state?.toUpperCase() ?? '');

  const isNewOrderRequest = (o: DeliveryPartnerOrder) =>
    (o.orderStatus?.toUpperCase() ?? '') === 'PARTNER_ASSIGNED';

  const getTimeRangeCutoff = (range: 'today' | 'week' | 'month'): number => {
    const now = new Date();
    if (range === 'today') {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
    }
    if (range === 'week') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - diff,
      ).getTime();
    }
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  };

  const clearOrders = orders.filter(o => o.orderStatus !== 'UNASSIGNED');
  const newOrderRequests = clearOrders.filter(isNewOrderRequest);
  const newOrderRequestIds = new Set(
    newOrderRequests.map(o => o.id || o.orderId),
  );

  const liveOrders = clearOrders.filter(
    o =>
      !newOrderRequestIds.has(o.id || o.orderId) &&
      !isPartnerRejectedOrder(o) &&
      isOrderLive(o),
  );
  const liveOrderIds = new Set(liveOrders.map(o => o.id || o.orderId));

  const pastOrders = clearOrders.filter(
    o =>
      !liveOrderIds.has(o.id || o.orderId) &&
      !newOrderRequestIds.has(o.id || o.orderId),
  );

  const customPastOrders = customOrders.filter(
    o =>
      o.orderStatus !== 'UNASSIGNED' &&
      (!isOrderLive(o) || isPartnerRejectedOrder(o)) &&
      !isNewOrderRequest(o) &&
      !liveOrderIds.has(o.id || o.orderId) &&
      !newOrderRequestIds.has(o.id || o.orderId),
  );

  const timeFilteredOrders =
    timeRangeFilter === 'all'
      ? pastOrders
      : timeRangeFilter === 'custom'
      ? customPastOrders
      : pastOrders.filter(
          o => getOrderEpochMs(o) >= getTimeRangeCutoff(timeRangeFilter),
        );

  const filteredOrders =
    paymentTypeFilter === 'all'
      ? timeFilteredOrders
      : timeFilteredOrders.filter(
          o => getOrderPaymentType(o) === paymentTypeFilter,
        );

  const formatStatusLabel = (status: string) =>
    status
      .split('_')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  const handleAcceptOrder = async (order: DeliveryPartnerOrder) => {
    const orderMasterId = order.id || order.orderId;
    if (!orderMasterId) return;
    setOrderActionLoadingId(orderMasterId);
    try {
      await deliveryPartnerService.acceptOrder(orderMasterId);
      await fetchAssignedOrders({ silent: true });
    } catch (error) {
      console.error('Accept order failed', error);
      Alert.alert(
        'Unable to accept order',
        'Please check your connection and try again.',
      );
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const openRejectModal = (order: DeliveryPartnerOrder) => {
    setRejectingOrder(order);
    setRejectReason('');
    setRejectError('');
    setRejectModalVisible(true);
  };

  const closeRejectModal = () => {
    if (orderActionLoadingId) return;
    setRejectModalVisible(false);
    setRejectingOrder(null);
    setRejectReason('');
    setRejectError('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectError('Please provide a reason for rejecting this order.');
      return;
    }
    const orderMasterId = rejectingOrder.id || rejectingOrder.orderId;
    if (!orderMasterId) return;
    setOrderActionLoadingId(orderMasterId);
    try {
      await deliveryPartnerService.rejectOrder(orderMasterId, trimmedReason);
      setRejectModalVisible(false);
      setRejectingOrder(null);
      setRejectReason('');
      setRejectError('');
      await fetchAssignedOrders({ silent: true });
    } catch (error) {
      console.error('Reject order failed', error);
      setRejectError('Unable to reject order. Please try again.');
    } finally {
      setOrderActionLoadingId(null);
    }
  };

  const formatOrderDateTime = (value: string | null) => {
    const parsedDate = parseDateValue(value);
    if (!parsedDate) return { date: 'N/A', time: '' };
    return {
      date: `${String(parsedDate.getDate()).padStart(2, '0')}/${String(
        parsedDate.getMonth() + 1,
      ).padStart(2, '0')}/${String(parsedDate.getFullYear()).slice(-2)}`,
      time: parsedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const formatCurrency = (amount: number) =>
    `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleItemsExpanded = (orderId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const openCustomModal = () => {
    setDraftStart(customStart ?? new Date());
    setDraftEnd(customEnd ?? new Date());
    setIsCustomModalVisible(true);
  };

  const confirmCustomRange = () => {
    setCustomStart(draftStart);
    setCustomEnd(draftEnd);
    setTimeRangeFilter('custom');
    setIsCustomModalVisible(false);
    fetchCustomOrders(draftStart, draftEnd);
  };

  const handleFilterPress = (id: any) => {
    if (id === 'custom') {
      openCustomModal();
    } else {
      setTimeRangeFilter(id);
      setCustomStart(null);
      setCustomEnd(null);
      setCustomOrdersError(null);
    }
  };

  const handleAndroidDateChange = (
    event: DateTimePickerEvent,
    selected?: Date,
  ) => {
    if (event.type === 'dismissed') {
      setAndroidPicker(null);
      return;
    }
    if (androidPicker === 'start') {
      setDraftStart(selected ?? draftStart);
      setAndroidPicker('end');
    } else if (androidPicker === 'end') {
      setDraftEnd(selected ?? draftEnd);
      setAndroidPicker(null);
    }
  };

  const renderCustomDateModal = () => {
    const isValidRange = draftStart <= draftEnd;

    return (
      <Modal
        visible={isCustomModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setIsCustomModalVisible(false)}
        >
          <Pressable style={styles.customModalCard} onPress={() => null}>
            <View style={styles.customModalHeader}>
              <Text style={styles.customModalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setIsCustomModalVisible(false)}
                hitSlop={8}
              >
                <Text style={{ fontSize: 18, color: '#64748B' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS === 'ios' ? (
              <>
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerLabelCol}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                  </View>
                  <DateTimePicker
                    value={draftStart}
                    mode="date"
                    display="compact"
                    maximumDate={draftEnd}
                    onChange={(_e, date) => date && setDraftStart(date)}
                    style={styles.datePickerIOS}
                  />
                </View>

                <View style={styles.datePickerDivider} />

                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerLabelCol}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                  </View>
                  <DateTimePicker
                    value={draftEnd}
                    mode="date"
                    display="compact"
                    minimumDate={draftStart}
                    maximumDate={new Date()}
                    onChange={(_e, date) => date && setDraftEnd(date)}
                    style={styles.datePickerIOS}
                  />
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setAndroidPicker('start')}
                >
                  <View style={styles.datePickerLabelCol}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                  </View>
                  <View style={styles.androidDateChip}>
                    <Text style={styles.androidDateChipText}>
                      {formatDateLabel(draftStart)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.datePickerDivider} />

                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setAndroidPicker('end')}
                >
                  <View style={styles.datePickerLabelCol}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                  </View>
                  <View style={styles.androidDateChip}>
                    <Text style={styles.androidDateChipText}>
                      {formatDateLabel(draftEnd)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {androidPicker !== null && (
                  <DateTimePicker
                    value={androidPicker === 'start' ? draftStart : draftEnd}
                    mode="date"
                    display="default"
                    maximumDate={
                      androidPicker === 'start' ? draftEnd : new Date()
                    }
                    minimumDate={
                      androidPicker === 'end' ? draftStart : undefined
                    }
                    onChange={handleAndroidDateChange}
                  />
                )}
              </>
            )}

            {!isValidRange && (
              <Text style={styles.dateValidationError}>
                Start date must be on or before end date.
              </Text>
            )}

            {isValidRange && (
              <View style={styles.datePreviewChip}>
                <Text style={styles.datePreviewText}>
                  {formatDateLabel(draftStart)} → {formatDateLabel(draftEnd)}
                </Text>
              </View>
            )}

            <View style={styles.customModalActions}>
              <TouchableOpacity
                style={styles.customModalCancelBtn}
                onPress={() => setIsCustomModalVisible(false)}
              >
                <Text style={styles.customModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.customModalApplyBtn,
                  !isValidRange && styles.customModalApplyBtnDisabled,
                ]}
                disabled={!isValidRange}
                onPress={confirmCustomRange}
              >
                <Text style={styles.customModalApplyText}>Apply Range</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderRejectReasonModal = () => (
    <Modal
      visible={rejectModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeRejectModal}
    >
      <Pressable style={styles.modalBackdrop} onPress={closeRejectModal}>
        <Pressable style={styles.customModalCard} onPress={() => null}>
          <View style={styles.customModalHeader}>
            <Text style={styles.customModalTitle}>Reject Order</Text>
          </View>

          <Text style={styles.sectionSubText}>
            Let us know why you're rejecting order #
            {rejectingOrder?.orderId || rejectingOrder?.id}
          </Text>

          <TextInput
            style={styles.rejectReasonInput}
            placeholder="Enter reason for rejection..."
            placeholderTextColor="#94A3B8"
            value={rejectReason}
            onChangeText={text => {
              setRejectReason(text);
              if (rejectError) setRejectError('');
            }}
            multiline
            numberOfLines={3}
            editable={orderActionLoadingId === null}
          />

          {!!rejectError && (
            <Text style={styles.dateValidationError}>{rejectError}</Text>
          )}

          <View style={styles.customModalActions}>
            <TouchableOpacity
              style={styles.customModalCancelBtn}
              onPress={closeRejectModal}
              disabled={orderActionLoadingId !== null}
            >
              <Text style={styles.customModalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.customModalApplyBtn,
                styles.rejectConfirmBtn,
                orderActionLoadingId !== null &&
                  styles.customModalApplyBtnDisabled,
              ]}
              disabled={orderActionLoadingId !== null}
              onPress={handleConfirmReject}
            >
              {orderActionLoadingId !== null ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.customModalApplyText}>Confirm Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  // ────── DASHBOARD STATS CARDS ──────────────────────────────────────────
  const StatCard = ({
    label,
    value,
    unit,
    icon,
    accentColor,
    trend,
  }: {
    label: string;
    value: string | number;
    unit?: string;
    icon: React.ReactNode;
    accentColor: string;
    trend?: string;
  }) => (
    <View style={[styles.statCard, { borderLeftColor: accentColor }]}>
      <View style={styles.statCardHeader}>
        <View style={styles.statCardIcon}>{icon}</View>
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      {unit && <Text style={styles.statCardUnit}>{unit}</Text>}
      {trend && <Text style={styles.statCardTrend}>{trend}</Text>}
    </View>
  );

  const renderOrderCard = (order: DeliveryPartnerOrder) => {
    const cardId = order.id || order.orderId;
    const isExpanded = expandedOrderIds.has(cardId);
    const acceptedDateTime = formatOrderDateTime(
      order.orderDetails?.acceptedDate ?? null,
    );
    const completedDateTime = formatOrderDateTime(
      order.orderDetails?.completedDate ?? null,
    );
    const orderDateTime = formatOrderDateTime(
      order.orderDetails?.creationTime ?? order.createdAt,
    );
    const shopName = order.shopDetails?.name || 'Shop';
    const customerName =
      order.orderDetails?.customerName || order.orderId || 'N/A';
    const status = formatStatusLabel(
      isPartnerRejectedOrder(order)
        ? 'PARTNER_REJECTED'
        : order.orderDetails?.state?.toUpperCase() ??
            order.orderStatus?.toUpperCase() ??
            'UNKNOWN',
    );
    const itemCount = order.orderDetails?.totalItemCount ?? 0;
    const amountExcludingDeliveryFee =
      order.orderDetails?.amountExcludingDeliveryFee ?? 0;
    const serviceType: ServiceType = order.shopDetails?.category
      ?.toLowerCase()
      .includes('grocery')
      ? 'GROCERY'
      : 'FOOD';
    const pricing = getPricingValues(serviceType);
    const pricingTaxableAmount = pricing.deliveryFee + pricing.platformFee;
    const pricingTaxes = Math.round(pricing.gstRate * pricingTaxableAmount);
    const computedTotal =
      amountExcludingDeliveryFee +
      pricing.deliveryFee +
      pricing.platformFee +
      pricing.packagingCharges +
      pricingTaxes;

    return (
      <View key={cardId} style={styles.orderCard}>
        <TouchableOpacity
          style={styles.orderCardCompactHeader}
          onPress={() => toggleOrderExpanded(cardId)}
          activeOpacity={0.8}
        >
          {order.shopDetails?.logo ? (
            <Image
              source={{ uri: order.shopDetails.logo }}
              style={styles.assignedShopLogo}
            />
          ) : (
            <View style={styles.assignedShopLogoFallback}>
              <Store size={17} color="#F97316" />
            </View>
          )}
          <View style={styles.assignedOrderMain}>
            <Text style={styles.assignedShopName} numberOfLines={1}>
              {shopName}
            </Text>
            <Text style={styles.assignedOrderId} numberOfLines={1}>
              Order ID: #{order.orderId || order.id || 'N/A'}
            </Text>
          </View>
          <View style={styles.assignedEarningsWrap}>
            <Text style={styles.assignedEarnings}>
              {order.finance?.payableAmount != null
                ? formatCurrency(order.finance.payableAmount)
                : 'N/A'}
            </Text>
            <Text style={styles.assignedEarningsLabel}>Your Earnings</Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={15} color="#94A3B8" style={{ marginLeft: 5 }} />
          ) : (
            <ChevronDown size={15} color="#94A3B8" style={{ marginLeft: 5 }} />
          )}
        </TouchableOpacity>

        <View style={styles.assignedCustomerRow}>
          <Text style={styles.assignedCustomerName} numberOfLines={1}>
            {customerName}
          </Text>
          <Text style={styles.assignedItemCount}>
            {itemCount > 0
              ? `${itemCount} item${itemCount > 1 ? 's' : ''}`
              : 'N/A'}
          </Text>
        </View>

        <View style={styles.assignedMetricsRow}>
          <View style={styles.assignedMetric}>
            <MapPin size={12} color="#0E6DFD" />
            <Text style={styles.assignedMetricValue}>N/A km</Text>
            <Text style={styles.assignedMetricLabel}>Pick up</Text>
          </View>
          <View style={styles.assignedMetricDivider} />
          <View style={styles.assignedMetric}>
            <Route size={12} color="#F97316" />
            <Text style={styles.assignedMetricValue}>N/A km</Text>
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

        {isExpanded && (
          <View style={styles.orderCompactDetails}>
            <Text style={styles.orderCompactStatus}>{status}</Text>
            <Text style={styles.orderCompactDate}>
              {orderDateTime.date !== 'N/A' ? orderDateTime.date : '-'}
              {acceptedDateTime.date !== 'N/A'
                ? ` · Accepted ${
                    acceptedDateTime.time || acceptedDateTime.date
                  }`
                : ''}
              {completedDateTime.date !== 'N/A'
                ? ` · Completed ${
                    completedDateTime.time || completedDateTime.date
                  }`
                : ''}
            </Text>
            <Text style={styles.orderCompactDate}>
              Payment: {PAYMENT_TYPE_LABELS[getOrderPaymentType(order)]}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.orderViewButton}
          onPress={() => navigation.navigate('OrderDelivery', { order })}
          activeOpacity={0.85}
        >
          <Text style={styles.orderViewButtonText}>View Order ›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const hasStats = partnerStats !== null;
  const activeOrders = partnerStats?.orders;
  const activeTotalAssigned = partnerStats?.totalAssigned;

  const DAILY_TARGET = 15;
  const XP_PER_ORDER = 5;
  const BONUS_PER_TARGET = 60;
  const dailyCompleted = partnerStats?.orders ?? 0;
  const dailyRemaining = Math.max(0, DAILY_TARGET - dailyCompleted);
  const totalXp = (partnerStats?.orders ?? 0) * XP_PER_ORDER;

  const LEVELS = [
    { name: 'Bronze', minXp: 0, stars: 1, color: '#CD7F32' },
    { name: 'Silver', minXp: 250, stars: 2, color: '#94A3B8' },
    { name: 'Gold', minXp: 1000, stars: 3, color: '#F59E0B' },
    { name: 'Platinum', minXp: 2500, stars: 4, color: '#8B5CF6' },
    { name: 'Diamond', minXp: 5000, stars: 5, color: '#06B6D4' },
  ];
  const currentLevel =
    [...LEVELS].reverse().find(l => totalXp >= l.minXp) ?? LEVELS[0];
  const nextLevel = LEVELS[LEVELS.indexOf(currentLevel) + 1] ?? null;
  const levelMaxXp = nextLevel?.minXp ?? currentLevel.minXp;

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isOrdersRefreshing}
            onRefresh={handleRefresh}
            colors={['#0E6DFD']}
            tintColor="#0E6DFD"
          />
        }
      >
        {/* ────── COMMON HEADER ──────────────────────────────────────────────── */}
        <View style={styles.commonHeader}>
          {/* Profile & Name Section */}
          <View style={styles.headerProfileSection}>
            <TouchableOpacity
              onPress={() => (navigation.navigate as any)('ProfileTab')}
              activeOpacity={0.8}
            >
              {isPartnerLoading ? (
                <View style={styles.headerAvatarWrap}>
                  <Text style={styles.headerAvatarLoading}>...</Text>
                </View>
              ) : partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.headerAvatarImage}
                />
              ) : (
                <View style={styles.headerAvatarWrap}>
                  <Text style={styles.headerAvatarFallback}>
                    {partnerName
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map(part => part[0]?.toUpperCase())
                      .join('') || 'DP'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.headerNameSection}>
              <Text style={styles.headerName}>{partnerName}</Text>
              <View style={styles.headerStatusRow}>
                <View
                  style={[
                    styles.statusIndicator,
                    isOnline
                      ? styles.statusIndicatorOnline
                      : styles.statusIndicatorOffline,
                  ]}
                />
                <Text
                  style={[
                    styles.headerStatus,
                    isOnline
                      ? styles.headerStatusOnline
                      : styles.headerStatusOffline,
                  ]}
                >
                  {partnerProfile?.isActive === false
                    ? 'Deactivated'
                    : isOnline
                    ? 'Online'
                    : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {/* Toggle Section */}
          <TouchableOpacity
            style={[
              styles.onlineToggleBtn,
              isOnline && styles.onlineToggleBtnActive,
            ]}
            onPress={handleToggleOnline}
            activeOpacity={0.8}
            disabled={isToggling}
          >
            <Text style={styles.onlineToggleBtnText}>
              {isOnline ? '🟢' : '⚫'}
            </Text>
            <Text style={styles.onlineToggleBtnLabel}>
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Deactivation Warning */}
        {showDeactivatedWarning && (
          <View style={styles.deactivatedWarning}>
            <Text style={styles.deactivatedWarningText}>
              ⚠️ You are deactivated. Contact admin to go online.
            </Text>
          </View>
        )}

        {/* ────── TAB NAVIGATION ──────────────────────────────────────────────── */}
        <View style={styles.tabNavigation}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'dashboard' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'dashboard' && styles.tabButtonTextActive,
              ]}
            >
              📊 Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'orders' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'orders' && styles.tabButtonTextActive,
              ]}
            >
              📦 Orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* ────── CONTENT ─────────────────────────────────────────────────────── */}
        {activeTab === 'dashboard' ? (
          <View>
            {isStatsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0E6DFD" />
                <Text style={styles.loadingText}>Loading stats...</Text>
              </View>
            ) : (
              <View>
                {/* Main Stats Grid */}
                <View style={styles.statsGrid}>
                  <StatCard
                    label="Orders Completed"
                    value={hasStats ? activeOrders ?? '-' : 'N/A'}
                    icon={<CheckCircle2 size={18} color="#0E6DFD" />}
                    accentColor="#0E6DFD"
                    trend={
                      hasStats
                        ? `${activeTotalAssigned ?? '-'} assigned`
                        : 'Today'
                    }
                  />
                  <StatCard
                    label="On-time Rate"
                    value="N/A"
                    unit="Today"
                    icon={<CheckCircle2 size={18} color="#16A34A" />}
                    accentColor="#16A34A"
                    trend="-"
                  />
                  <StatCard
                    label="Hours Live"
                    value="N/A"
                    unit="Hours"
                    icon={<Clock3 size={18} color="#B45309" />}
                    accentColor="#F59E0B"
                    trend="Today"
                  />
                  <StatCard
                    label="Distance Travelled"
                    value="N/A"
                    unit="km"
                    icon={<Bike size={18} color="#EA580C" />}
                    accentColor="#EA580C"
                  />
                </View>

                {/* Gamification Cards */}
                <View style={styles.levelCard}>
                  <View style={styles.levelIconWrap}>
                    <Trophy size={22} color="#FBBF24" />
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelEyebrow}>CAPTAIN LEVEL</Text>
                    <Text style={styles.levelTitle}>
                      {hasStats ? currentLevel.name : 'N/A'}
                    </Text>
                    <Text style={styles.levelHint}>
                      {hasStats
                        ? dailyRemaining > 0
                          ? `${dailyRemaining} more orders to reach level ${
                              nextLevel?.name ?? currentLevel.name
                            }`
                          : `Target achieved. ₹${BONUS_PER_TARGET} bonus unlocked`
                        : 'Complete more orders to unlock rewards'}
                    </Text>
                    <View style={styles.levelProgressTrack}>
                      <View
                        style={[
                          styles.levelProgressFill,
                          {
                            width: `${
                              hasStats
                                ? Math.min(
                                    (totalXp / (levelMaxXp || 1)) * 100,
                                    100,
                                  )
                                : 0
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.levelXpText}>
                    {hasStats ? `${totalXp} / ${levelMaxXp} XP` : '- / - XP'}
                  </Text>
                </View>

                {/* Leaderboard */}
                <View style={styles.leaderboardCard}>
                  <View style={styles.leaderboardHeader}>
                    <View style={styles.leaderboardTitleRow}>
                      <Trophy size={16} color="#0E6DFD" />
                      <Text style={styles.leaderboardTitle}>
                        Top Performers
                      </Text>
                    </View>
                    <View style={styles.leaderboardPeriodPill}>
                      <Text style={styles.leaderboardPeriodActive}>Today</Text>
                      <Text style={styles.leaderboardPeriod}>7 Days</Text>
                    </View>
                  </View>
                  {partnerStats?.topPerformingRiders?.length ? (
                    partnerStats.topPerformingRiders
                      .slice(0, 5)
                      .map((rider, index) => {
                        const isCurrentUser = rider.riderId === partnerId;
                        return (
                          <View
                            key={rider.riderId}
                            style={[
                              styles.leaderboardRow,
                              isCurrentUser && styles.leaderboardRowHighlight,
                            ]}
                          >
                            <Text style={styles.leaderboardRank}>
                              {index + 1}
                            </Text>
                            {rider.profilePicture ? (
                              <Image
                                source={{ uri: rider.profilePicture }}
                                style={styles.leaderboardAvatar}
                              />
                            ) : (
                              <View style={styles.leaderboardAvatarFallback}>
                                <UserRound size={15} color="#94A3B8" />
                              </View>
                            )}
                            <View style={styles.leaderboardInfo}>
                              <Text
                                style={[
                                  styles.leaderboardName,
                                  isCurrentUser &&
                                    styles.leaderboardNameHighlight,
                                ]}
                              >
                                {rider.name}
                                {isCurrentUser ? ' (You)' : ''}
                              </Text>
                              <Text style={styles.leaderboardStats}>
                                {rider.deliveries ?? '-'} Orders
                              </Text>
                            </View>
                            <Text style={styles.leaderboardEarnings}>
                              ₹ {rider.earnings?.toFixed(0) ?? '-'}
                            </Text>
                          </View>
                        );
                      })
                  ) : (
                    <View style={styles.leaderboardEmpty}>
                      <Text style={styles.leaderboardEmptyText}>N/A</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View>
            {isOrdersLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0E6DFD" />
                <Text style={styles.loadingText}>Loading orders...</Text>
              </View>
            ) : ordersError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>⚠️ {ordersError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => fetchAssignedOrders()}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : newOrderRequests.length === 0 && liveOrders.length === 0 ? (
              <Text style={styles.emptyText}>
                No orders assigned to you right now. 🎉
              </Text>
            ) : (
              <>
                {newOrderRequests.map((order, index) => (
                  <NewOrderRequestCard
                    key={order.id || order.orderId}
                    order={order}
                    index={index}
                    totalOrders={newOrderRequests.length}
                    currentLocation={currentLocation}
                    variant="new"
                    isLoading={
                      orderActionLoadingId === (order.id || order.orderId)
                    }
                    onAccept={handleAcceptOrder}
                    onReject={openRejectModal}
                  />
                ))}

                {/* Live Orders */}
                {liveOrders.map((order, index) => (
                  <LiveOrderCard
                    key={order.id || order.orderId}
                    order={order}
                    index={index}
                    totalLiveOrders={liveOrders.length}
                    currentLocation={currentLocation}
                  />
                ))}
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={handleConfirmLogout}
      />
      <OtpVerificationModal
        visible={otpModalVisible}
        title={otpModalConfig?.title ?? ''}
        message={otpModalConfig?.message ?? ''}
        isLoading={otpLoading}
        errorText={otpError}
        onSubmit={() => {}}
        onCancel={() => setOtpModalVisible(false)}
      />
      {renderCustomDateModal()}
      {renderRejectReasonModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F5FA' },
  backgroundGlowOne: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(14, 109, 253, 0.08)',
  },
  backgroundGlowTwo: {
    position: 'absolute',
    bottom: 50,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(17, 24, 39, 0.03)',
  },
  content: { flex: 1, paddingHorizontal: 16 },
  contentContainer: { paddingBottom: 32 },

  // ────── COMMON HEADER ──────────────────────────────────────────────────
  commonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  headerProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  headerAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerAvatarFallback: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0E6DFD',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  headerAvatarLoading: {
    fontSize: 16,
    color: '#0E6DFD',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  headerNameSection: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusIndicatorOnline: {
    backgroundColor: '#16A34A',
  },
  statusIndicatorOffline: {
    backgroundColor: '#94A3B8',
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  headerStatusOnline: {
    color: '#16A34A',
  },
  headerStatusOffline: {
    color: '#475569',
  },
  onlineToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  onlineToggleBtnActive: {
    backgroundColor: '#ECFDF5',
  },
  onlineToggleBtnText: {
    fontSize: 14,
  },
  onlineToggleBtnLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },

  // ────── DEACTIVATION WARNING ───────────────────────────────────────────
  deactivatedWarning: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  deactivatedWarningText: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    textAlign: 'center',
  },

  // ────── TAB NAVIGATION ─────────────────────────────────────────────────
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 6,
    gap: 6,
    marginBottom: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  tabButtonActive: {
    backgroundColor: '#0E6DFD',
  },
  tabButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  // ────── FILTERS ────────────────────────────────────────────────────────
  filterRow: {
    marginBottom: 12,
    marginTop: 12,
  },
  filterRowContent: {
    gap: 8,
    paddingHorizontal: 0,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0E6DFD',
    borderColor: '#0E6DFD',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  // ────── LOADING & ERRORS ───────────────────────────────────────────────
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#991B1B',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#0E6DFD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    marginVertical: 32,
  },

  // ────── STATS CARDS ────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statCardIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  statCardLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  statCardValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  statCardUnit: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  statCardTrend: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 4,
  },

  // ────── GAMIFICATION ───────────────────────────────────────────────────
  gamificationGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gamificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#062B67',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
    minHeight: 94,
    shadowColor: '#062B67',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  levelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  levelCopy: {
    flex: 1,
  },
  levelEyebrow: {
    fontSize: 9,
    letterSpacing: 0.3,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#CBD5E1',
  },
  levelTitle: {
    fontSize: 17,
    marginTop: 2,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
  },
  levelHint: {
    fontSize: 8,
    marginTop: 8,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#E2E8F0',
  },
  levelProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#315487',
    overflow: 'hidden',
    marginTop: 5,
  },
  levelProgressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FBBF24',
  },
  levelXpText: {
    alignSelf: 'flex-end',
    marginLeft: 8,
    fontSize: 8,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#CBD5E1',
  },
  gamificationCardTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginBottom: 6,
  },
  gamificationCardValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 8,
  },
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    textAlign: 'center',
  },
  gamificationHint: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 8,
  },
  star: {
    fontSize: 14,
  },
  xpContainer: {
    marginTop: 8,
  },
  xpBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  xpFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    textAlign: 'center',
  },

  // ────── LEADERBOARD ────────────────────────────────────────────────────
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  leaderboardTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 12,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  leaderboardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  leaderboardPeriodPill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    padding: 2,
  },
  leaderboardPeriodActive: {
    backgroundColor: '#0E6DFD',
    color: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  leaderboardPeriod: {
    color: '#475569',
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  leaderboardRowHighlight: {
    backgroundColor: '#EFF6FF',
  },
  leaderboardRank: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
    width: 30,
    textAlign: 'center',
    marginRight: 8,
  },
  leaderboardAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 9,
    backgroundColor: '#E2E8F0',
  },
  leaderboardAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  leaderboardNameHighlight: {
    color: '#0E6DFD',
  },
  leaderboardStats: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  leaderboardEarnings: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  leaderboardEmpty: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  leaderboardEmptyText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },

  // ────── ORDER CARDS ────────────────────────────────────────────────────
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  orderCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCardCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  orderCompactDetails: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  orderCompactStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#EFF6FF',
    color: '#0E6DFD',
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  orderCompactDate: {
    marginTop: 4,
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  orderViewButton: {
    alignSelf: 'flex-end',
    marginTop: 9,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#0E6DFD',
  },
  orderViewButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  orderCardHeaderLeft: {
    flex: 1,
  },
  orderCardHeaderRight: {
    alignItems: 'flex-end',
    marginHorizontal: 8,
  },
  orderIdText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  orderCardOrderId: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginTop: 2,
  },
  orderCardSummary: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  orderDateValue: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  orderTimeValue: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  orderStatusPill: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  orderStatusPillText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  orderDetailLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  orderDetailValue: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
  },

  // ────── NEW ORDER CARD ─────────────────────────────────────────────────
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
  assignedOrdersHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assignedOrdersTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  assignedOrdersLimit: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  assignedOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  orderMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  orderTag: {
    flex: 1,
    marginLeft: 8,
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
    textTransform: 'uppercase',
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
  assignedOrderTime: {
    marginLeft: 6,
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
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
  livePulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  liveLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
    flex: 1,
  },
  liveOrderId: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  liveOrderCount: {
    fontSize: 12,
    marginRight: 6,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  liveTimeBadge: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  liveTimeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  liveSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  liveStatePill: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  liveStatePillText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#047857',
  },
  liveLocName: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  liveTotalBillLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    textAlign: 'right',
  },
  liveEarningsInline: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  liveLocAddress: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  liveDistanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 7,
    backgroundColor: '#F8FAFC',
  },
  liveDistanceText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
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
  orderManageButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 7,
    backgroundColor: '#0E6DFD',
  },
  orderManageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitExtraBold,
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
  newOrderRejectButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  newOrderRejectButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },

  // ────── LIVE ORDER CARD ────────────────────────────────────────────────
  liveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#0E6DFD',
    shadowColor: '#0E6DFD',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginBottom: 12,
  },
  stageActionButton: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageActionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },

  // ────── SECTION HEADING ────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionSubText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
    lineHeight: 16,
    marginVertical: 10,
  },

  // ────── MODALS ─────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  customModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  customModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  customModalTitle: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  datePickerLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerLabel: {
    fontSize: 13,
    color: '#334155',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  datePickerIOS: {},
  datePickerDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  androidDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  androidDateChipText: {
    fontSize: 12,
    color: '#0f62fe',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  dateValidationError: {
    marginTop: 10,
    fontSize: 11,
    color: '#dc2626',
    fontFamily: FONT_FAMILY.bricolageRegular,
    textAlign: 'center',
  },
  datePreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 12,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  datePreviewText: {
    fontSize: 12,
    color: '#0f62fe',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  customModalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  customModalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  customModalCancelText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  customModalApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f62fe',
  },
  customModalApplyBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  customModalApplyText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  rejectConfirmBtn: {
    backgroundColor: '#DC2626',
  },
  rejectReasonInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: '#0F172A',
    fontFamily: FONT_FAMILY.outfitRegular,
    minHeight: 70,
    textAlignVertical: 'top',
  },
});

export default HomeScreen;
