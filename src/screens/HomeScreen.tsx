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
import { ChevronDown, ChevronUp } from 'lucide-react-native';
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
};

const LiveOrderCard: React.FC<LiveOrderCardProps> = ({ order }) => {
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
  const liveCommission =
    livePricing.commissionRate * liveAmountExcludingDeliveryFee;
  const liveTaxableAmount =
    liveCommission + livePricing.deliveryFee + livePricing.platformFee;
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

  return (
    <TouchableOpacity
      style={styles.liveCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('OrderDelivery', { order })}
    >
      <View style={styles.livePulseRow}>
        <View style={styles.liveDot} />
        <Text style={styles.liveLabel}>Live Order</Text>
        <View style={styles.liveTimeBadge}>
          <Text style={styles.liveTimeText}>
            {orderDateTime.time || orderDateTime.date}
          </Text>
        </View>
      </View>

      <View style={styles.liveSubRow}>
        <Text style={styles.liveOrderId}>#{order.orderId || order.id}</Text>
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
        <Text style={styles.liveEarningsInline}>
          {formatCurrencyLocal(
            order?.finance?.payableAmount || liveComputedTotal,
          )}
        </Text>
      </View>

      <Text style={[styles.liveLocAddress, { marginTop: 2 }]}>
        {order.shopDetails?.name || 'Shop'}
      </Text>

      <View
        style={[
          liveTimerStyles.timerRow,
          expired
            ? liveTimerStyles.timerRowExpired
            : liveTimerStyles.timerRowActive,
        ]}
      >
        <Text
          style={[
            liveTimerStyles.timerIcon,
            { color: expired ? '#DC2626' : '#B45309' },
          ]}
        >
          {expired ? '⏰' : '⏱'}
        </Text>
        <View style={{ flex: 1 }}>
          {!expired ? (
            <>
              <Text style={liveTimerStyles.timerActiveLabel}>
                Contact admin to unassign within{' '}
                <Text style={liveTimerStyles.timerCountdown}>{timerText}</Text>
              </Text>
              <Text style={liveTimerStyles.timerSubLabel}>
                Reach out to admin during this window if you need order
                unassignment
              </Text>
            </>
          ) : (
            <Text style={liveTimerStyles.timerExpiredLabel}>
              Unassign window has expired
            </Text>
          )}
        </View>
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
 * Payment-type classification used both for filtering the order history list
 * and for rendering the payment label on each order card. Kept as a single
 * source of truth so the filter chips and the card UI can never disagree.
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

// ── New Order Request card ────────────────────────────────────────────────
// Rendered above LiveOrderCard for orders sitting at orderStatus ===
// 'PARTNER_ASSIGNED' — i.e. assigned to this partner but not yet accepted or
// rejected. Shows the essentials (shop, customer, amount) plus Accept /
// Reject actions. `isLoading` is true only while THIS card's action is
// in-flight, so the spinner never shows on the wrong card.
type NewOrderRequestCardProps = {
  order: DeliveryPartnerOrder;
  isLoading: boolean;
  onAccept: (order: DeliveryPartnerOrder) => void;
  onReject: (order: DeliveryPartnerOrder) => void;
};

const NewOrderRequestCard: React.FC<NewOrderRequestCardProps> = ({
  order,
  isLoading,
  onAccept,
  onReject,
}) => {
  const { getPricingValues } = usePricingStore();

  const amountExcludingDeliveryFee =
    order.orderDetails?.amountExcludingDeliveryFee ?? 0;
  const serviceType: ServiceType = order.shopDetails?.category
    ?.toLowerCase()
    .includes('grocery')
    ? 'GROCERY'
    : 'FOOD';
  const pricing = getPricingValues(serviceType);
  const commission = pricing.commissionRate * amountExcludingDeliveryFee;
  const taxableAmount = commission + pricing.deliveryFee + pricing.platformFee;
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

  return (
    <View style={styles.newOrderCard}>
      <View style={styles.livePulseRow}>
        <View style={[styles.liveDot, { backgroundColor: '#F59E0B' }]} />
        <Text style={[styles.liveLabel, { color: '#B45309' }]}>
          New Order Request
        </Text>
        <Text style={styles.liveOrderId}>#{order.orderId || order.id}</Text>
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
        <Text style={styles.liveEarningsInline}>
          {formatCurrencyLocal(order?.finance?.payableAmount || computedTotal)}
        </Text>
      </View>

      <Text style={[styles.liveLocAddress, { marginTop: 2 }]}>
        {order.shopDetails?.name || 'Shop'}
        {itemCount > 0 ? ` · ${itemCount} item${itemCount > 1 ? 's' : ''}` : ''}
      </Text>

      {!!orderDescription && (
        <Text
          style={[styles.liveLocAddress, { marginTop: 2 }]}
          numberOfLines={1}
        >
          {orderDescription}
        </Text>
      )}

      <View style={styles.newOrderActionsRow}>
        <TouchableOpacity
          style={[
            styles.newOrderButton,
            styles.newOrderRejectButton,
            isLoading && { opacity: 0.6 },
          ]}
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={() => onReject(order)}
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
          onPress={() => onAccept(order)}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.newOrderAcceptButtonText}>Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { partnerProfile, isPartnerLoading, logout, authData } = useAuthStore();

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
  const [statsFilter, setStatsFilter] = useState<
    'daily' | 'weekly' | 'monthly' | 'allTime'
  >('daily');
  // NOTE: 'custom' added here — this filter (and only this filter) is
  // exclusive to the Orders tab. The Dashboard tab's `statsFilter` above is
  // untouched and intentionally has no custom option.
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
  const [stageLoadingOrderId, setStageLoadingOrderId] = useState<string | null>(
    null,
  );
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpModalConfig, setOtpModalConfig] = useState<{
    orderId: string;
    title: string;
    message: string;
    apiAction: 'pickup' | 'completeDelivery';
  } | null>(null);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // ---- New order request (accept / reject) state ---------------------------
  // Orders arrive with top-level orderStatus === 'PARTNER_ASSIGNED' before the
  // partner has acted on them. `orderActionLoadingId` tracks which single
  // order card is currently mid accept/reject call so we can show a spinner
  // on just that card's button. Reject requires a reason, collected via
  // `rejectModalVisible` + friends below.
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
          // The polled "all" list backs Today/Week/Month/Live client-side —
          // it deliberately never sends 'custom' here, that has its own
          // fetch path below (fetchCustomOrders) so it never disturbs this
          // polling loop.
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

  const handleRefreshOrders = async () => {
    if (!partnerId) return;
    setIsOrdersRefreshing(true);
    try {
      await fetchAssignedOrders({ silent: true });
      if (timeRangeFilter === 'custom' && customStart && customEnd) {
        await fetchCustomOrders(customStart, customEnd);
      }
    } finally {
      setIsOrdersRefreshing(false);
    }
  };

  const fetchPartnerStats = async () => {
    if (!partnerId) return;
    setIsStatsLoading(true);
    try {
      const data = await deliveryPartnerService.getDeliveryPartnerStats(
        partnerId,
      );
      setPartnerStats(data);
    } catch (error) {
      console.error('Fetch partner stats failed', error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // ---- Custom date-range order fetch --------------------------------------
  // Kept entirely separate from `orders` / fetchAssignedOrders on purpose:
  // Today/Week/Month/Live orders rely on the polled "all" list and filter it
  // client-side. A custom range can span further back than that list covers,
  // so it hits the backend's fromDate/toDate params directly and stores its
  // results independently — this way a slow/failed custom fetch can never
  // affect the existing polling loop or the other filters.
  const [customOrders, setCustomOrders] = useState<DeliveryPartnerOrder[]>([]);
  const [isCustomOrdersLoading, setIsCustomOrdersLoading] = useState(false);
  const [customOrdersError, setCustomOrdersError] = useState<string | null>(
    null,
  );

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
      fetchPartnerStats();
    }
  }, [activeTab, partnerId]);

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
    if (!partnerId) {
      Alert.alert('Partner ID missing', 'Unable to update online status.');
      return;
    }
    const nextStatus = !isOnline;

    if (nextStatus) {
      if (Platform.OS === 'android') {
        try {
          promptForEnableLocationIfNeeded();
          // const enableResult = await RNLocationEnabler.promptForEnableLocationIfNeeded({
          //   interval: 10000,
          //   fastInterval: 5000,
          // });
          // if (enableResult !== 'enabled' && enableResult !== 'already-enabled') {
          //   return;
          // }
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
    // Sync online status into the store so other screens (Pool tab) read the correct value
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

  // A "new order request" is one the partner hasn't accepted or rejected yet.
  // Per the service layer (see acceptOrder/rejectOrder jsdoc), these sit at
  // top-level orderStatus === 'PARTNER_ASSIGNED'. Once accepted, the backend
  // moves orderStatus to ACCEPTED and the order becomes eligible for the
  // normal live-order / "Manage Delivery" flow above.
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

  // ---- Orders tab pipeline -------------------------------------------------
  // clearOrders: everything except UNASSIGNED.
  // newOrderRequests: awaiting accept/reject (orderStatus PARTNER_ASSIGNED).
  //   Rendered first, above everything else, with Accept/Reject actions.
  //   Excluded from every other bucket below so an unactioned order never
  //   also shows up as "live" or in history.
  // liveOrders: currently in-flight deliveries. These are ALWAYS shown in
  //   full and are intentionally NOT affected by timeRangeFilter or
  //   paymentTypeFilter — an active delivery is "current work", not
  //   "history", so filtering it out by date/payment would be wrong (and
  //   could hide an order you're actively supposed to be delivering).
  // pastOrders -> timeFilteredOrders -> filteredOrders: history list.
  //   Today/Week/Month filter the polled "all" list client-side (unchanged
  //   behavior). Custom instead sources from `customOrders`, which comes
  //   from its own backend fromDate/toDate fetch (fetchCustomOrders) since a
  //   custom range can exceed what the polled "all" list already contains.
  //   Either way, the payment type filter is then applied on top, same as
  //   before.
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

  // ---- New order request handlers ------------------------------------------
  const handleAcceptOrder = async (order: DeliveryPartnerOrder) => {
    const orderMasterId = order.id || order.orderId;
    if (!orderMasterId) return;
    setOrderActionLoadingId(orderMasterId);
    try {
      await deliveryPartnerService.acceptOrder(orderMasterId);
      // Refresh so the order flips from PARTNER_ASSIGNED -> ACCEPTED and
      // reappears above under the live-order / Manage Delivery flow.
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

  const parseTimestamp = (
    value: string | number | null | undefined,
  ): number | null => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    // Already a number
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return null;
      }

      // Milliseconds timestamp
      if (value > 10_000_000_000) {
        return value;
      }

      // Seconds timestamp
      if (value > 1_000_000_000) {
        return value * 1000;
      }

      return null;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    // Numeric string timestamp
    if (/^\d+$/.test(trimmedValue)) {
      const numericValue = Number(trimmedValue);

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      // Milliseconds
      if (numericValue > 10_000_000_000) {
        return numericValue;
      }

      // Seconds
      if (numericValue > 1_000_000_000) {
        return numericValue * 1000;
      }

      return null;
    }

    // ISO format / standard date format
    let dateValue = trimmedValue;

    // Convert SQL datetime:
    // "2026-07-03 13:39:35"
    // to:
    // "2026-07-03T13:39:35"
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateValue)) {
      dateValue = dateValue.replace(' ', 'T');
    }

    const parsedDate = new Date(dateValue);

    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate.getTime();
    }

    return null;
  };

  const calculateTimeDifference = (
    startTime: string | number | null | undefined,
    endTime: string | number | null | undefined,
  ): string => {
    console.log('calculateTimeDifference called with:', startTime, endTime);

    const startMs = parseTimestamp(startTime);
    const endMs = parseTimestamp(endTime);

    if (startMs === null || endMs === null) {
      return '-';
    }

    const diffMs = endMs - startMs;

    // If end time is before start time
    if (diffMs < 0) {
      return '-';
    }

    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return '< 1m';
    }

    if (diffMins < 60) {
      return `${diffMins}m`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // ── Extract time from timestamp ──
  const getTimeFromTimestamp = (
    timestamp: string | number | null | undefined,
  ): string => {
    if (!timestamp) return 'N/A';

    const num = typeof timestamp === 'string' ? Number(timestamp) : timestamp;

    if (Number.isFinite(num) && num > 0) {
      const date = new Date(num > 10000000000 ? num : num * 1000);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }

    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }

    return 'N/A';
  };

  const formatCurrency = (amount: number) =>
    `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;

  const parseCustomerAddress = (
    rawAddress: string | null,
  ): ParsedCustomerAddress => {
    if (!rawAddress) return { text: 'N/A', latitude: null, longitude: null };
    const cleaned = rawAddress.replace(/^\{/, '').replace(/\}$/, '');
    const entries = [
      ...cleaned.matchAll(/(\w+)=([^,]+(?:,(?!\s*\w+=)[^,]+)*)/g),
    ];
    const map: Record<string, string> = {};
    entries.forEach(([, key, value]) => {
      map[key] = value.trim();
    });
    const latitude = map.latitude ? Number(map.latitude) : null;
    const longitude = map.longitude ? Number(map.longitude) : null;
    const formattedAddress = [
      map.addressLine1,
      map.addressLine2,
      map.addressLine3,
      map.city,
      map.state,
      map.pincode,
    ]
      .filter(Boolean)
      .join(', ');
    return {
      text: formattedAddress || cleaned,
      latitude: Number.isFinite(latitude) ? latitude : null,
      longitude: Number.isFinite(longitude) ? longitude : null,
    };
  };

  const getDistanceKm = (from: Coordinate, to: Coordinate) => {
    const toRad = (degree: number) => (degree * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const deltaLat = toRad(to.latitude - from.latitude);
    const deltaLon = toRad(to.longitude - from.longitude);
    const haversine =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(toRad(from.latitude)) *
        Math.cos(toRad(to.latitude)) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);
    return (
      earthRadiusKm *
      (2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)))
    );
  };

  const formatDistance = (destination: Coordinate | null) => {
    if (!currentLocation || !destination) return null;
    const km = getDistanceKm(currentLocation, destination);
    if (km < 1) return `${Math.round(km * 1000)} m away`;
    return `${km.toFixed(1)} km away`;
  };

  const openDirections = async (destination: {
    coordinate: Coordinate | null;
    fallbackQuery: string;
  }) => {
    const lat = destination.coordinate?.latitude;
    const lng = destination.coordinate?.longitude;
    const label = destination.fallbackQuery;
    let url = '';
    if (Platform.OS === 'ios') {
      url =
        lat && lng
          ? `http://maps.apple.com/?daddr=${lat},${lng}`
          : `http://maps.apple.com/?daddr=${encodeURIComponent(label)}`;
    } else {
      url =
        lat && lng
          ? `google.navigation:q=${lat},${lng}`
          : `geo:0,0?q=${encodeURIComponent(label)}`;
    }
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Unable to open maps');
    }
  };

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

  /** Format a Date as "DD MMM YYYY" for display */
  const formatDateLabel = (date: Date) =>
    date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const [isCustomModalVisible, setIsCustomModalVisible] = React.useState(false);
  // Drafts shown inside the modal before confirming
  const [draftStart, setDraftStart] = React.useState<Date>(new Date());
  const [draftEnd, setDraftEnd] = React.useState<Date>(new Date());
  // Confirmed custom range sent to the API
  const [customStart, setCustomStart] = React.useState<Date | null>(null);
  const [customEnd, setCustomEnd] = React.useState<Date | null>(null);
  // Which picker is currently shown on Android (one at a time)
  const [androidPicker, setAndroidPicker] = React.useState<
    'start' | 'end' | null
  >(null);

  const openCustomModal = () => {
    // Pre-fill drafts with last confirmed range or today
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
      // Clear custom range so stale dates don't persist if user switches back
      setCustomStart(null);
      setCustomEnd(null);
      setCustomOrdersError(null);
    }
  };

  // Android: show pickers sequentially (start → end)
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
      setAndroidPicker('end'); // immediately open end picker
    } else if (androidPicker === 'end') {
      setDraftEnd(selected ?? draftEnd);
      setAndroidPicker(null);
    }
  };

  // ── Custom date range modal ──
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
            {/* Header */}
            <View style={styles.customModalHeader}>
              {/* <MaterialCommunityIcons
                name="calendar-range"
                size={20}
                color="#0f62fe"
              /> */}
              <Text style={styles.customModalTitle}>Select Date Range</Text>
              <TouchableOpacity
                onPress={() => setIsCustomModalVisible(false)}
                hitSlop={8}
              >
                {/* <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color="#64748b"
                /> */}
              </TouchableOpacity>
            </View>

            {/* Date rows */}
            {Platform.OS === 'ios' ? (
              // iOS: show both pickers inline
              <>
                <View style={styles.datePickerRow}>
                  <View style={styles.datePickerLabelCol}>
                    {/* <MaterialCommunityIcons
                      name="calendar-start"
                      size={16}
                      color="#0f62fe"
                    /> */}
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
                    {/* <MaterialCommunityIcons
                      name="calendar-end"
                      size={16}
                      color="#0f62fe"
                    /> */}
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
              // Android: tappable date buttons that open the native picker
              <>
                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setAndroidPicker('start')}
                >
                  <View style={styles.datePickerLabelCol}>
                    {/* <MaterialCommunityIcons
                      name="calendar-start"
                      size={16}
                      color="#0f62fe"
                    /> */}
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                  </View>
                  <View style={styles.androidDateChip}>
                    <Text style={styles.androidDateChipText}>
                      {formatDateLabel(draftStart)}
                    </Text>
                    {/* <MaterialCommunityIcons
                      name="chevron-down"
                      size={16}
                      color="#0f62fe"
                    /> */}
                  </View>
                </TouchableOpacity>

                <View style={styles.datePickerDivider} />

                <TouchableOpacity
                  style={styles.datePickerRow}
                  onPress={() => setAndroidPicker('end')}
                >
                  <View style={styles.datePickerLabelCol}>
                    {/* <MaterialCommunityIcons
                      name="calendar-end"
                      size={16}
                      color="#0f62fe"
                    /> */}
                    <Text style={styles.datePickerLabel}>End Date</Text>
                  </View>
                  <View style={styles.androidDateChip}>
                    <Text style={styles.androidDateChipText}>
                      {formatDateLabel(draftEnd)}
                    </Text>
                    {/* <MaterialCommunityIcons
                      name="chevron-down"
                      size={16}
                      color="#0f62fe"
                    /> */}
                  </View>
                </TouchableOpacity>

                {/* Native Android picker rendered outside the modal UI */}
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

            {/* Validation hint */}
            {!isValidRange && (
              <Text style={styles.dateValidationError}>
                Start date must be on or before end date.
              </Text>
            )}

            {/* Preview chip */}
            {isValidRange && (
              <View style={styles.datePreviewChip}>
                {/* <MaterialCommunityIcons
                  name="calendar-check"
                  size={14}
                  color="#0f62fe"
                /> */}
                <Text style={styles.datePreviewText}>
                  {formatDateLabel(draftStart)} → {formatDateLabel(draftEnd)}
                </Text>
              </View>
            )}

            {/* Actions */}
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

  // ── Reject-with-reason modal ──
  // Shown when the partner taps "Reject" on a New Order Request card. A
  // reason is required by the API (see rejectOrder in the service), so the
  // Confirm button stays disabled/error-guarded until one is entered.
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

    // ── Order stage timestamps ──
    const assignedAtDateTime = formatOrderDateTime(
      order?.assignedAt ? String(order.assignedAt) : null,
    );
    const arrivedAtStoreDateTime = formatOrderDateTime(
      order?.arrivedAtStoreAt ? String(order.arrivedAtStoreAt) : null,
    );
    const pickedUpDateTime = formatOrderDateTime(
      order?.pickedUpAt ? String(order.pickedUpAt) : null,
    );
    const reachedLocationDateTime = formatOrderDateTime(
      order?.reachedLocationAt ? String(order.reachedLocationAt) : null,
    );
    const deliveredAtDateTime = formatOrderDateTime(
      order?.deliveredAt ? String(order.deliveredAt) : null,
    );

    const customerName =
      order.orderDetails?.customerName || order.orderId || 'N/A';
    const status = formatStatusLabel(
      isPartnerRejectedOrder(order)
        ? 'PARTNER_REJECTED'
        : order.orderDetails?.state?.toUpperCase() ??
            order.orderStatus?.toUpperCase() ??
            'UNKNOWN',
    );
    const shopId = order.orderDetails?.shopId ?? order.shopId;

    const customerMobile = order.orderDetails?.customerMobile ?? 'N/A';
    const customerAddress = parseCustomerAddress(
      order.orderDetails?.customerAddress ?? null,
    );

    const finalPaymentMethod = PAYMENT_TYPE_LABELS[getOrderPaymentType(order)];

    const customerCoordinate =
      customerAddress.latitude != null && customerAddress.longitude != null
        ? {
            latitude: customerAddress.latitude,
            longitude: customerAddress.longitude,
          }
        : null;
    const shopAddressText = [
      order.shopDetails?.address?.address,
      order.shopDetails?.address?.city,
      order.shopDetails?.address?.state,
      order.shopDetails?.address?.postalCode,
    ]
      .filter(Boolean)
      .join(', ');
    const shopCoordinate =
      order.shopDetails?.address?.latitude != null &&
      order.shopDetails?.address?.longitude != null
        ? {
            latitude: order.shopDetails.address.latitude,
            longitude: order.shopDetails.address.longitude,
          }
        : order.shopDetails?.coordinates?.latitude != null &&
          order.shopDetails?.coordinates?.longitude != null
        ? {
            latitude: order.shopDetails.coordinates.latitude,
            longitude: order.shopDetails.coordinates.longitude,
          }
        : order.shopDetails?.latitude != null &&
          order.shopDetails?.longitude != null
        ? {
            latitude: order.shopDetails.latitude,
            longitude: order.shopDetails.longitude,
          }
        : null;
    const shopImage =
      order.shopDetails?.banner || order.shopDetails?.logo || null;
    const orderDescription =
      order.orderDetails?.orderDescription ||
      (order.orderDetails?.orderItem?.length
        ? order.orderDetails.orderItem.map(item => item.name).join(', ')
        : 'N/A');
    const itemCount = order.orderDetails?.totalItemCount ?? 0;
    const amountExcludingDeliveryFee =
      order.orderDetails?.amountExcludingDeliveryFee ?? 0;
    const serviceType: ServiceType = order.shopDetails?.category
      ?.toLowerCase()
      .includes('grocery')
      ? 'GROCERY'
      : 'FOOD';
    const pricing = getPricingValues(serviceType);
    const pricingCommission =
      pricing.commissionRate * amountExcludingDeliveryFee;
    const pricingTaxableAmount =
      pricingCommission + pricing.deliveryFee + pricing.platformFee;
    const pricingTaxes = Math.round(pricing.gstRate * pricingTaxableAmount);
    const computedTotal =
      amountExcludingDeliveryFee +
      pricing.deliveryFee +
      pricing.platformFee +
      pricing.packagingCharges +
      pricingTaxes;

    return (
      <TouchableOpacity
        key={cardId}
        style={styles.orderCard}
        onPress={() => toggleOrderExpanded(cardId)}
        activeOpacity={0.85}
      >
        <View style={styles.orderCardTopRow}>
          <View style={styles.orderCardHeaderLeft}>
            <Text style={styles.orderIdText}>{customerName}</Text>
            <Text style={styles.orderCardOrderId}>
              #{order.orderId || order.id}
            </Text>
            <Text style={styles.orderCardSummary}>
              {shopName} ·{' '}
              {formatCurrency(order?.finance?.payableAmount || computedTotal)}
            </Text>
          </View>
          <View style={styles.orderCardHeaderRight}>
            <Text style={styles.orderDateValue}>
              {orderDateTime.date !== 'N/A' ? orderDateTime.date : ''}
            </Text>
            {acceptedDateTime.date !== 'N/A' && (
              <Text style={styles.orderTimeValue}>
                Accepted: {acceptedDateTime.time || acceptedDateTime.date}
              </Text>
            )}
            {completedDateTime.date !== 'N/A' && (
              <Text style={styles.orderTimeValue}>
                Completed: {completedDateTime.time || completedDateTime.date}
              </Text>
            )}
            <View style={styles.orderStatusPill}>
              <Text style={styles.orderStatusPillText}>{status}</Text>
            </View>
          </View>
          {isExpanded ? (
            <ChevronUp size={18} color="#94A3B8" style={{ marginLeft: 4 }} />
          ) : (
            <ChevronDown size={18} color="#94A3B8" style={{ marginLeft: 4 }} />
          )}
        </View>

        {isExpanded && (
          <>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitleInline}>Customer details</Text>
              <Text style={styles.sectionSubText}>Phone: {customerMobile}</Text>
              <Text style={styles.sectionSubText}>{customerAddress.text}</Text>
              <TouchableOpacity
                style={styles.directionButtonSecondary}
                onPress={() =>
                  openDirections({
                    coordinate: customerCoordinate,
                    fallbackQuery: customerAddress.text,
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.directionButtonSecondaryText}>
                  Get Directions
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitleInline}>Shop details</Text>
              <View style={styles.shopHeroRow}>
                {shopImage ? (
                  <Image
                    source={{ uri: shopImage }}
                    style={styles.shopHeroImage}
                  />
                ) : (
                  <View style={styles.shopHeroFallback}>
                    <Text style={styles.shopHeroFallbackText}>SHOP</Text>
                  </View>
                )}
                <View style={styles.shopHeroInfo}>
                  <Text style={styles.sectionMainText}>
                    {order.shopDetails?.name || `Shop ${shopId ?? 'N/A'}`}
                  </Text>
                  {!!order.shopDetails?.category && (
                    <Text style={styles.sectionSubText}>
                      {order.shopDetails?.category}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.sectionSubText}>
                {shopAddressText || 'Address unavailable'}
              </Text>
              <TouchableOpacity
                style={styles.directionButton}
                onPress={() =>
                  openDirections({
                    coordinate: shopCoordinate,
                    fallbackQuery:
                      shopAddressText ||
                      order.shopDetails?.name ||
                      `Shop ${shopId ?? ''}`,
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.directionButtonText}>Get Directions</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitleInline}>Order details</Text>
              <Text style={styles.sectionSubText}>{orderDescription}</Text>
              {(order.orderDetails?.orderItem?.length ?? 0) > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.itemsToggleRow}
                    onPress={() => toggleItemsExpanded(cardId)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.itemsToggleText}>
                      {itemCount} item{itemCount > 1 ? 's' : ''}
                    </Text>
                    {expandedItemIds.has(cardId) ? (
                      <ChevronUp size={14} color="#0E6DFD" />
                    ) : (
                      <ChevronDown size={14} color="#0E6DFD" />
                    )}
                  </TouchableOpacity>
                  {expandedItemIds.has(cardId) &&
                    order.orderDetails!.orderItem.map(item => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.itemCount}>x{item.itemCount}</Text>
                      </View>
                    ))}
                </>
              )}
              <View style={styles.orderMetaRow}>
                <Text style={styles.orderMetaLabel}>Payment</Text>
                <Text style={styles.orderMetaValue}>{finalPaymentMethod}</Text>
              </View>
            </View>
            <BillSummaryCard
              totalAmount={computedTotal}
              subtotal={amountExcludingDeliveryFee}
              deliveryFee={pricing.deliveryFee}
              deliveryFeeOriginal={pricing.deliveryFeeOriginal}
              platformFee={pricing.platformFee}
              platformFeeOriginal={pricing.platformFeeOriginal}
              packagingCharges={pricing.packagingCharges}
              packagingChargesOriginal={pricing.packagingChargesOriginal}
              taxes={pricingTaxes}
              commission={pricingCommission}
              taxableAmount={pricingTaxableAmount}
              commissionRate={pricing.commissionRate}
              gstRate={pricing.gstRate}
              finance={order?.finance}
            />
            {/* ── COMPACT DELIVERY TIMELINE ── */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitleInline}>Delivery Timeline</Text>

              {/* Compact timeline container */}
              <View style={styles.compactTimelineContainer}>
                {/* Order Placed - Always shown */}
                <View style={styles.compactTimelineStage}>
                  <View
                    style={[styles.compactDot, { backgroundColor: '#0E6DFD' }]}
                  />
                  <View style={styles.compactStageInfo}>
                    <Text style={styles.compactStageLabel}>Order Placed</Text>
                    <Text style={styles.compactStageTime}>
                      {orderDateTime.time !== 'N/A'
                        ? orderDateTime.time
                        : 'N/A'}
                    </Text>
                  </View>
                </View>
                {/* Interval & Assigned At */}
                {assignedAtDateTime.date !== 'N/A' && (
                  <View style={styles.compactTimelineStage}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: '#0E6DFD' },
                      ]}
                    />

                    <View style={styles.compactStageInfo}>
                      <Text
                        style={[styles.compactStageLabel, { color: '#0E6DFD' }]}
                      >
                        Assigned At
                      </Text>

                      <Text
                        style={[styles.compactStageTime, { color: '#0E6DFD' }]}
                      >
                        {assignedAtDateTime.time || assignedAtDateTime.date}
                      </Text>
                    </View>

                    <View style={styles.compactIntervalBadge}>
                      <Text style={styles.compactIntervalBadgeText}>
                        {calculateTimeDifference(
                          order?.orderDetails?.creationTime ?? order?.createdAt,
                          order?.assignedAt,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
                {/* Interval & Arrived at Store */}
                {arrivedAtStoreDateTime.date !== 'N/A' && (
                  <View style={styles.compactTimelineStage}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: '#0E6DFD' },
                      ]}
                    />

                    <View style={styles.compactStageInfo}>
                      <Text
                        style={[styles.compactStageLabel, { color: '#0E6DFD' }]}
                      >
                        Arrived at Store
                      </Text>

                      <Text
                        style={[styles.compactStageTime, { color: '#0E6DFD' }]}
                      >
                        {arrivedAtStoreDateTime.time ||
                          arrivedAtStoreDateTime.date}
                      </Text>
                    </View>

                    <View style={styles.compactIntervalBadge}>
                      <Text style={styles.compactIntervalBadgeText}>
                        {calculateTimeDifference(
                          order?.assignedAt,
                          order?.arrivedAtStoreAt,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
                {/* Interval & Picked Up */}
                {pickedUpDateTime.date !== 'N/A' && (
                  <View style={styles.compactTimelineStage}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: '#0E6DFD' },
                      ]}
                    />

                    <View style={styles.compactStageInfo}>
                      <Text
                        style={[styles.compactStageLabel, { color: '#0E6DFD' }]}
                      >
                        Picked Up
                      </Text>

                      <Text
                        style={[styles.compactStageTime, { color: '#0E6DFD' }]}
                      >
                        {pickedUpDateTime.time || pickedUpDateTime.date}
                      </Text>
                    </View>

                    <View style={styles.compactIntervalBadge}>
                      <Text style={styles.compactIntervalBadgeText}>
                        {calculateTimeDifference(
                          order?.arrivedAtStoreAt,
                          order?.pickedUpAt,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
                {/* Interval & Reached Destination */}
                {reachedLocationDateTime.date !== 'N/A' && (
                  <View style={styles.compactTimelineStage}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: '#0E6DFD' },
                      ]}
                    />

                    <View style={styles.compactStageInfo}>
                      <Text
                        style={[styles.compactStageLabel, { color: '#0E6DFD' }]}
                      >
                        Reached Destination
                      </Text>

                      <Text
                        style={[styles.compactStageTime, { color: '#0E6DFD' }]}
                      >
                        {reachedLocationDateTime.time ||
                          reachedLocationDateTime.date}
                      </Text>
                    </View>

                    <View style={styles.compactIntervalBadge}>
                      <Text style={styles.compactIntervalBadgeText}>
                        {calculateTimeDifference(
                          order?.pickedUpAt,
                          order?.reachedLocationAt,
                        )}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Interval & Delivered */}
                {deliveredAtDateTime.date !== 'N/A' && (
                  <View style={styles.compactTimelineStage}>
                    <View
                      style={[
                        styles.compactDot,
                        { backgroundColor: '#16A34A' },
                      ]}
                    />

                    <View style={styles.compactStageInfo}>
                      <Text
                        style={[styles.compactStageLabel, { color: '#16A34A' }]}
                      >
                        Delivered
                      </Text>

                      <Text
                        style={[styles.compactStageTime, { color: '#16A34A' }]}
                      >
                        {deliveredAtDateTime.time || deliveredAtDateTime.date}
                      </Text>
                    </View>

                    <View style={styles.compactIntervalBadge}>
                      <Text style={styles.compactIntervalBadgeText}>
                        {calculateTimeDifference(
                          order?.reachedLocationAt,
                          order?.deliveredAt,
                        )}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Total Delivery Time Summary */}
              {orderDateTime.date !== 'N/A' &&
                deliveredAtDateTime.date !== 'N/A' && (
                  <View style={styles.compactTotalTimeRow}>
                    <Text style={styles.compactTotalTimeLabel}>
                      Total Delivery Time
                    </Text>
                    <Text style={styles.compactTotalTimeValue}>
                      {calculateTimeDifference(
                        order?.orderDetails?.creationTime ?? order?.createdAt,
                        order?.deliveredAt,
                      )}
                    </Text>
                  </View>
                )}
            </View>
            {!!order.orderDetails?.orderLink && (
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() =>
                  navigation.navigate('OrderWebView', {
                    url: order.orderDetails!.orderLink!,
                    title: `Order #${order.orderId || order.id}`,
                  })
                }
                activeOpacity={0.85}
              >
                <Text style={styles.viewDetailsButtonText}>
                  View Order Details
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const DELIVERY_STAGES = [
    {
      stateMatch: ['ACCEPTED', 'PARTNER_ASSIGNED'],
      buttonLabel: 'Arrived at Store',
      requiresOtp: false,
      apiAction: 'arriveStore' as const,
    },
    {
      stateMatch: ['ARRIVED_AT_STORE'],
      buttonLabel: 'Pickup Order',
      requiresOtp: true,
      otpTitle: 'Pickup Verification',
      otpMessage: 'Enter the 4-digit OTP from the restaurant',
      apiAction: 'pickup' as const,
    },
    {
      stateMatch: ['ORDER_PICKED_UP'],
      buttonLabel: 'Arrived at Destination',
      requiresOtp: false,
      apiAction: 'arriveDestination' as const,
    },
    {
      stateMatch: ['REACHED_LOCATION'],
      buttonLabel: 'Complete Delivery',
      requiresOtp: true,
      otpTitle: 'Delivery Verification',
      otpMessage: 'Enter the 4-digit OTP from the customer',
      apiAction: 'completeDelivery' as const,
    },
  ];

  const handleOtpSubmit = async (otp: string) => {
    if (!otpModalConfig) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      if (otpModalConfig.apiAction === 'pickup') {
        await deliveryPartnerService.pickupOrder(otpModalConfig.orderId);
      } else {
        await deliveryPartnerService.completeDelivery(otpModalConfig.orderId);
      }
      setOtpModalVisible(false);
      setOtpModalConfig(null);
      await fetchAssignedOrders({ silent: true });
    } catch (error: any) {
      const fallback =
        otpModalConfig.apiAction === 'pickup'
          ? 'Invalid OTP. Please check with the restaurant.'
          : 'Invalid OTP. Please check with the customer.';
      setOtpError(error?.message || fallback);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpCancel = () => {
    setOtpModalVisible(false);
    setOtpModalConfig(null);
    setOtpError('');
    setOtpLoading(false);
  };

  const statsFilterOptions: {
    key: 'daily' | 'weekly' | 'monthly' | 'allTime' | 'custom';
    label: string;
  }[] = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'This Week' },
    { key: 'monthly', label: 'This Month' },
    { key: 'allTime', label: 'All Time' },
  ];

  const paymentTypeFilterOptions: {
    key: 'all' | PaymentTypeKey;
    label: string;
  }[] = [
    { key: 'all', label: 'All' },
    { key: 'prepaid', label: 'Prepaid' },
    { key: 'codCash', label: 'Cash' },
    { key: 'codQrCode', label: 'QR Code' },
  ];

  const activeStatsData =
    statsFilter === 'allTime'
      ? {
          count: partnerStats?.totalOrders ?? 0,
          earnings: partnerStats?.totalEarnings ?? 0,
        }
      : partnerStats?.[statsFilter] ?? { count: 0, earnings: 0 };

  const DAILY_TARGET = 15;
  const XP_PER_ORDER = 5;
  const BONUS_PER_TARGET = 60;
  const dailyCompleted = partnerStats?.daily.count ?? 0;
  const dailyRemaining = Math.max(0, DAILY_TARGET - dailyCompleted);
  const totalXp = (partnerStats?.totalOrders ?? 0) * XP_PER_ORDER;

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
          activeTab === 'orders' ? (
            <RefreshControl
              refreshing={isOrdersRefreshing}
              onRefresh={handleRefreshOrders}
              colors={['#0E6DFD']}
              tintColor="#0E6DFD"
            />
          ) : undefined
        }
      >
        <View style={styles.customHeader}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{partnerName}</Text>
            <View style={styles.headerSubtitleRow}>
              <Text style={styles.headerSubtitle}>Transporter account</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => (navigation.navigate as any)('ProfileTab')}
              style={styles.headerAvatarWrap}
              activeOpacity={0.8}
            >
              {isPartnerLoading ? (
                <Text style={styles.headerAvatarLoading}>...</Text>
              ) : partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.headerAvatarImage}
                />
              ) : (
                <Text style={styles.headerAvatarFallback}>
                  {partnerName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(part => part[0]?.toUpperCase())
                    .join('') || 'DP'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusBadge,
              isOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOnline ? styles.statusOnlineText : styles.statusOfflineText,
              ]}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <View style={styles.statusSwitchWrap}>
            <Text style={styles.switchLabel}>
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isToggling}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor={isOnline ? '#10B981' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'dashboard' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'dashboard' && styles.tabButtonTextActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'orders' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'orders' && styles.tabButtonTextActive,
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'dashboard' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterRowContent}
            >
              {statsFilterOptions.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.filterChip,
                    statsFilter === item.key && styles.filterChipActive,
                  ]}
                  onPress={() => setStatsFilter(item.key as any)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      statsFilter === item.key && styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {isStatsLoading ? (
              <View style={styles.ordersStateWrap}>
                <ActivityIndicator size="small" color="#0E6DFD" />
                <Text style={styles.sectionText}>Loading stats...</Text>
              </View>
            ) : !partnerStats ? (
              <Text style={styles.sectionText}>No stats available.</Text>
            ) : (
              <>
                <View style={styles.grid}>
                  <View style={styles.statCard}>
                    <View
                      style={[
                        styles.statAccent,
                        { backgroundColor: '#0E6DFD' },
                      ]}
                    />
                    <Text style={styles.statLabel}>Orders</Text>
                    <Text style={styles.statValue}>
                      {activeStatsData.count}
                    </Text>
                  </View>
                  <View style={styles.statCard}>
                    <View
                      style={[
                        styles.statAccent,
                        { backgroundColor: '#16A34A' },
                      ]}
                    />
                    <Text style={styles.statLabel}>Earnings</Text>
                    <Text style={styles.statValue}>
                      Rs {activeStatsData.earnings.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <View style={styles.grid}>
                  <View style={styles.gamifyCard}>
                    <Text style={styles.gamifyTitle}>Today's Target</Text>
                    <Text style={styles.gamifyTargetLabel}>
                      {DAILY_TARGET} Orders
                    </Text>
                    <View style={styles.progressRingWrap}>
                      <Svg width={80} height={80}>
                        <SvgCircle
                          cx={40}
                          cy={40}
                          r={32}
                          stroke="#E2E8F0"
                          strokeWidth={7}
                          fill="none"
                        />
                        <SvgCircle
                          cx={40}
                          cy={40}
                          r={32}
                          stroke={
                            dailyCompleted >= DAILY_TARGET
                              ? '#16A34A'
                              : '#7C3AED'
                          }
                          strokeWidth={7}
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${
                            2 *
                            Math.PI *
                            32 *
                            (1 - Math.min(dailyCompleted / DAILY_TARGET, 1))
                          }`}
                          strokeLinecap="round"
                          rotation="-90"
                          origin="40,40"
                        />
                      </Svg>
                      <Text style={styles.progressRingText}>
                        {dailyCompleted}/{DAILY_TARGET}
                      </Text>
                    </View>
                    <Text style={styles.gamifyHint}>
                      {dailyRemaining > 0
                        ? `${dailyRemaining} more to earn Rs ${BONUS_PER_TARGET} bonus`
                        : 'Target achieved!'}
                    </Text>
                  </View>

                  <View style={styles.gamifyCard}>
                    <Text style={styles.gamifyTitle}>Captain Level</Text>
                    <Text
                      style={[
                        styles.gamifyLevelName,
                        { color: currentLevel.color },
                      ]}
                    >
                      {currentLevel.name}
                    </Text>
                    <View style={styles.starsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Text key={i} style={{ fontSize: 18 }}>
                          {i < currentLevel.stars ? '⭐' : '☆'}
                        </Text>
                      ))}
                    </View>
                    <Text style={styles.xpText}>
                      {totalXp} / {levelMaxXp} XP
                    </Text>
                    <View style={styles.xpBarBg}>
                      <View
                        style={[
                          styles.xpBarFill,
                          {
                            width: `${Math.min(
                              (totalXp / (levelMaxXp || 1)) * 100,
                              100,
                            )}%`,
                            backgroundColor: currentLevel.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.gamifyHint}>
                      {nextLevel
                        ? `Deliver more orders to reach ${nextLevel.name}`
                        : 'Max level reached!'}
                    </Text>
                  </View>
                </View>

                {partnerStats.topPerformingRiders?.length > 0 && (
                  <View style={styles.leaderboardCard}>
                    <Text style={styles.leaderboardTitle}>Top Performers</Text>
                    {partnerStats.topPerformingRiders.map((rider, index) => {
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
                            {index === 0
                              ? '🥇'
                              : index === 1
                              ? '🥈'
                              : index === 2
                              ? '🥉'
                              : `#${index + 1}`}
                          </Text>
                          <Image
                            source={{ uri: rider.profilePicture || undefined }}
                            style={styles.leaderboardAvatar}
                          />
                          <View style={styles.leaderboardInfo}>
                            <Text
                              style={[
                                styles.leaderboardName,
                                isCurrentUser &&
                                  styles.leaderboardNameHighlight,
                              ]}
                              numberOfLines={1}
                            >
                              {rider.name}
                              {isCurrentUser ? ' (You)' : ''}
                            </Text>
                            <Text style={styles.leaderboardSub}>
                              {rider.deliveries} orders · Rs{' '}
                              {rider.earnings.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <View>
            {isOrdersLoading ? (
              <View style={styles.ordersStateWrap}>
                <ActivityIndicator size="small" color="#0E6DFD" />
                <Text style={styles.sectionText}>
                  Loading assigned orders...
                </Text>
              </View>
            ) : ordersError ? (
              <View style={styles.ordersStateWrap}>
                <Text style={styles.errorText}>{ordersError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => fetchAssignedOrders()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : orders.length === 0 ? (
              <Text style={styles.sectionText}>
                No orders are assigned to you right now.
              </Text>
            ) : (
              <>
                {newOrderRequests.map(order => (
                  <NewOrderRequestCard
                    key={order.id || order.orderId}
                    order={order}
                    isLoading={
                      orderActionLoadingId === (order.id || order.orderId)
                    }
                    onAccept={handleAcceptOrder}
                    onReject={openRejectModal}
                  />
                ))}

                {liveOrders.map(order => (
                  <LiveOrderCard
                    key={order.id || order.orderId}
                    order={order}
                  />
                ))}

                {pastOrders.length > 0 && (
                  <Text style={styles.pastOrdersHeading}>Order History</Text>
                )}

                {pastOrders.length > 0 && (
                  <>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterRow}
                      contentContainerStyle={styles.filterRowContent}
                    >
                      {(
                        [
                          { key: 'all', label: 'All' },
                          { key: 'today', label: 'Today' },
                          { key: 'week', label: 'This Week' },
                          { key: 'month', label: 'This Month' },
                          { key: 'custom', label: 'Custom' },
                        ] as const
                      ).map(item => (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.filterChip,
                            timeRangeFilter === item.key &&
                              styles.filterChipActive,
                          ]}
                          onPress={() => handleFilterPress(item.key)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              timeRangeFilter === item.key &&
                                styles.filterChipTextActive,
                            ]}
                          >
                            {item.key === 'custom' && customStart && customEnd
                              ? `${formatDateLabel(
                                  customStart,
                                )} - ${formatDateLabel(customEnd)}`
                              : item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.filterRow}
                      contentContainerStyle={styles.filterRowContent}
                    >
                      {paymentTypeFilterOptions.map(item => (
                        <TouchableOpacity
                          key={item.key}
                          style={[
                            styles.filterChip,
                            paymentTypeFilter === item.key &&
                              styles.filterChipActive,
                          ]}
                          onPress={() => setPaymentTypeFilter(item.key)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              paymentTypeFilter === item.key &&
                                styles.filterChipTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {timeRangeFilter === 'custom' && isCustomOrdersLoading ? (
                  <View style={styles.ordersStateWrap}>
                    <ActivityIndicator size="small" color="#0E6DFD" />
                    <Text style={styles.sectionText}>
                      Loading orders for selected range...
                    </Text>
                  </View>
                ) : timeRangeFilter === 'custom' && customOrdersError ? (
                  <View style={styles.ordersStateWrap}>
                    <Text style={styles.errorText}>{customOrdersError}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={() =>
                        customStart &&
                        customEnd &&
                        fetchCustomOrders(customStart, customEnd)
                      }
                      activeOpacity={0.8}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : filteredOrders.length === 0 ? (
                  <Text style={styles.sectionText}>
                    No orders match this filter.
                  </Text>
                ) : (
                  filteredOrders.map(renderOrderCard)
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

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
        onSubmit={handleOtpSubmit}
        onCancel={handleOtpCancel}
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
    backgroundColor: 'rgba(14, 109, 253, 0.14)',
  },
  backgroundGlowTwo: {
    position: 'absolute',
    bottom: 50,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(17, 24, 39, 0.05)',
  },
  content: { flex: 1, paddingHorizontal: 24 },
  contentContainer: { paddingBottom: 32 },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitleWrap: { flex: 1, paddingRight: 16 },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
  },
  wsDot: { width: 7, height: 7, borderRadius: 4 },
  wsDotOn: { backgroundColor: '#22C55E' },
  wsDotOff: { backgroundColor: '#EF4444' },
  wsLabel: { fontSize: 12, fontFamily: FONT_FAMILY.outfitRegular },
  wsLabelOn: { color: '#22C55E' },
  wsLabelOff: { color: '#EF4444' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#EAF1FF',
  },
  headerLogoutText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
  },
  headerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: { width: '100%', height: '100%' },
  headerAvatarFallback: { fontSize: 12, fontWeight: '700', color: '#0E6DFD' },
  headerAvatarLoading: { fontSize: 12, color: '#0E6DFD' },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statusBadge: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999 },
  statusBadgeText: { fontSize: 12, fontFamily: FONT_FAMILY.outfitBold },
  statusOnline: { backgroundColor: '#ECFDF5' },
  statusOffline: { backgroundColor: '#F8FAFC' },
  statusOnlineText: { color: '#047857' },
  statusOfflineText: { color: '#475569' },
  statusSwitchWrap: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
    marginRight: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 6,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  tabButtonActive: { backgroundColor: '#0E6DFD' },
  tabButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  filterRow: { marginBottom: 12, marginTop: 12 },
  filterRowContent: { gap: 8 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#0E6DFD', borderColor: '#0E6DFD' },
  filterChipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  filterChipTextActive: { color: '#FFFFFF' },
  ordersTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ordersStateWrap: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#B91C1C',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: '#0E6DFD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.outfitExtraBold,
    fontSize: 13,
  },
  orderCard: {
    marginTop: 14,
    borderRadius: 22,
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0A1730',
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  orderCardTopRow: { flexDirection: 'row', alignItems: 'center' },
  orderCardHeaderLeft: { flex: 1 },
  orderCardHeaderRight: { alignItems: 'flex-end', marginLeft: 8 },
  orderIdText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  orderCardOrderId: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  orderCardSummary: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  orderDateValue: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  orderTimeValue: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
  },
  orderStatusPill: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  orderStatusPillText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  sectionBlock: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    backgroundColor: '#F8FBFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleInline: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#1E293B',
  },
  distanceBadge: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0369A1',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  sectionMainText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0F172A',
  },
  sectionSubText: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
    lineHeight: 18,
  },
  shopHeroRow: {
    marginTop: 2,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  shopHeroImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  shopHeroFallback: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopHeroFallbackText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#64748B',
  },
  shopHeroInfo: { flex: 1, marginLeft: 12 },
  quickMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  quickMetaText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#334155',
  },
  directionButton: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#0E6DFD',
    paddingVertical: 10,
    alignItems: 'center',
  },
  directionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  directionButtonSecondary: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0E6DFD',
    backgroundColor: '#EEF4FF',
    paddingVertical: 10,
    alignItems: 'center',
  },
  directionButtonSecondaryText: {
    color: '#0E6DFD',
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  itemsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#F0F6FF',
    borderRadius: 8,
  },
  itemsToggleText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#334155',
    marginRight: 8,
  },
  itemCount: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  orderMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  orderMetaLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  orderMetaValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
    maxWidth: '64%',
    textAlign: 'right',
  },
  viewDetailsButton: {
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0E6DFD',
    backgroundColor: '#EEF4FF',
    paddingVertical: 10,
    alignItems: 'center',
  },
  viewDetailsButtonText: {
    color: '#0E6DFD',
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  orderTotalLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#334155',
  },
  orderTotalValue: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageMedium,
    color: '#0E6DFD',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    lineHeight: 24,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statAccent: { width: 38, height: 4, borderRadius: 999, marginBottom: 12 },
  statLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#5C6980',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  gamifyCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    alignItems: 'center',
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  gamifyTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 4,
  },
  gamifyTargetLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#5C6980',
    marginBottom: 10,
  },
  progressRingWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressRingText: {
    position: 'absolute',
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  gamifyLevelName: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    marginBottom: 6,
  },
  starsRow: { flexDirection: 'row', gap: 2, marginBottom: 8 },
  xpText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#5C6980',
    marginBottom: 6,
  },
  xpBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  xpBarFill: { height: 6, borderRadius: 3 },
  gamifyHint: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    textAlign: 'center',
  },
  leaderboardCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 14,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  leaderboardRowHighlight: { backgroundColor: '#EFF6FF' },
  leaderboardRank: { width: 28, fontSize: 16, textAlign: 'center' },
  leaderboardAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 10,
  },
  leaderboardInfo: { flex: 1 },
  leaderboardName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#121A2B',
  },
  leaderboardNameHighlight: { color: '#0E6DFD' },
  leaderboardSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    marginTop: 2,
  },
  sectionCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    lineHeight: 20,
  },
  pastOrdersHeading: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginTop: 24,
    marginBottom: 12,
  },
  liveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: '#0E6DFD',
    shadowColor: '#0E6DFD',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 16,
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
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
    flex: 1,
  },
  liveEarningsInline: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginRight: 8,
  },
  liveTimeBadge: {
    backgroundColor: '#F0F6FF',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveTimeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  liveSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  liveOrderId: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  liveStatePill: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  liveStatePillText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#047857',
  },
  liveLocationRow: { flexDirection: 'row', alignItems: 'center' },
  liveLocImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  liveLocIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveLocInfo: { flex: 1, marginLeft: 10 },
  liveLocName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  liveLocAddress: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 1,
  },
  liveLocDistance: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0369A1',
    marginTop: 1,
  },
  liveNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0E6DFD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  stageActionButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  stageActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  liveViewDetailsButton: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#0E6DFD',
    paddingVertical: 10,
    alignItems: 'center',
  },
  liveViewDetailsButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  liveConnector: {
    width: 2,
    height: 14,
    backgroundColor: '#E2E8F0',
    marginLeft: 17,
    marginVertical: 1,
  },
  liveCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  liveCallIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  liveCallText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    flex: 1,
  },
  liveCallAction: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  liveTimelineH: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timelineStepH: { alignItems: 'center', gap: 3 },
  timelineLabelH: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  timelineLineH: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
    marginBottom: 14,
  },
  // ── Compact Timeline Styles (NEW) ──
  compactTimelineContainer: {
    marginTop: 12,
    paddingVertical: 10,
  },
  compactTimelineStage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },

  compactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
    flexShrink: 0,
  },

  compactStageInfo: {
    flex: 1,
  },

  compactStageLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1E293B',
  },

  compactStageTime: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    marginTop: 2,
  },

  compactIntervalBadge: {
    minWidth: 42,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },

  compactIntervalBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  compactIntervalText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  compactTotalTimeRow: {
    marginTop: 14,
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTotalTimeLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  compactTotalTimeValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
  },
  // ── New order request card (accept / reject) ───────────────────────────────
  newOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    marginBottom: 16,
  },
  newOrderActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  newOrderButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  newOrderAcceptButton: { backgroundColor: '#16A34A' },
  newOrderAcceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  newOrderRejectButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  newOrderRejectButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  // ── Custom date modal ──────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  customModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 20,
  },
  customModalTitle: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  datePickerLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#334155',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  datePickerIOS: {
    // compact spinner; width is auto on iOS
  },
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  androidDateChipText: {
    fontSize: 13,
    color: '#0f62fe',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  dateValidationError: {
    marginTop: 10,
    fontSize: 12,
    color: '#dc2626',
    fontFamily: FONT_FAMILY.bricolageRegular,
    textAlign: 'center',
  },
  datePreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  datePreviewText: {
    fontSize: 13,
    color: '#0f62fe',
    fontFamily: FONT_FAMILY.bricolageMedium,
  },
  customModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  customModalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  customModalCancelText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  customModalApplyBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0f62fe',
    minHeight: 44,
  },
  customModalApplyBtnDisabled: {
    backgroundColor: '#93c5fd',
  },
  customModalApplyText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  rejectConfirmBtn: {
    backgroundColor: '#DC2626',
  },
  rejectReasonInput: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: FONT_FAMILY.outfitRegular,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // ── Timeline Event Styles ──
  timelineEventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 12,
    paddingLeft: 8,
  },
  timelineEventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0E6DFD',
    marginTop: 2,
    marginRight: 12,
    flexShrink: 0,
  },
  timelineEventContent: {
    flex: 1,
  },
  timelineEventLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  timelineEventTime: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0E6DFD',
    marginTop: 2,
  },
  timelineEventTimeNA: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  // ── Enhanced Timeline Styles ──
  intervalBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0E6DFD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 45,
  },
  intervalBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  totalTimeContainer: {
    marginTop: 12,
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalTimeCircle: {
    backgroundColor: '#F0F9FF',
    borderRadius: 50,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0E6DFD',
  },
  totalTimeLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginBottom: 4,
  },
  totalTimeValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
  },
});

export default HomeScreen;
