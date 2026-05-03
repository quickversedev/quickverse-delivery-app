import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import type { DeliveryPartnerOrder } from '../services/delivery-partner.service';
import LogoutConfirmationModal from '../components/modals/LogoutConfirmationModal';
import { FONT_FAMILY } from '../theme/typography';
import {
  getBestEffortCurrentLocation,
  type Coordinate,
} from '../utils/location';
import {
  MapPin,
  Phone,
  Navigation,
  Calendar,
  Clock,
  ChevronRight,
  Copy,
  CircleDot,
  Circle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
  OrderWebView: { url: string; title?: string };
};

type ParsedCustomerAddress = {
  text: string;
  latitude: number | null;
  longitude: number | null;
};

const HomeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
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
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof partnerProfile?.isOnline === 'boolean') {
      setIsOnline(partnerProfile.isOnline);
    }
  }, [partnerProfile]);

  const partnerId = partnerProfile?.id || authData.partnerId || '';

  const parseDateValue = (value: string | null): Date | null => {
    if (!value) {
      return null;
    }

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
      if (!key) {
        return;
      }

      const existing = latestByOrderId.get(key);
      if (!existing || getOrderTimestamp(order) > getOrderTimestamp(existing)) {
        latestByOrderId.set(key, order);
      }
    });

    return Array.from(latestByOrderId.values())
      .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
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

    if (!options?.silent) {
      setIsOrdersLoading(true);
    }
    setOrdersError(null);
    try {
      const response =
        await deliveryPartnerService.getAssignedOrdersByPartnerId(partnerId);
      if (__DEV__) {
        console.log('[DEBUG ORDERS]', JSON.stringify(response, null, 2));
      }
      setOrders(getUniqueLatestOrders(response));
    } catch (error) {
      console.error('Fetch assigned orders failed', error);
      setOrdersError('Unable to load your assigned orders. Please try again.');
    } finally {
      if (!options?.silent) {
        setIsOrdersLoading(false);
      }
    }
  };

  const handleRefreshOrders = async () => {
    if (!partnerId) {
      return;
    }

    setIsOrdersRefreshing(true);
    try {
      await fetchAssignedOrders({ silent: true });
    } finally {
      setIsOrdersRefreshing(false);
    }
  };

  useEffect(() => {
    if (!partnerId) {
      return;
    }

    fetchCurrentLocation();

    if (activeTab === 'orders') {
      fetchAssignedOrders();
    }
  }, [activeTab, partnerId]);

  const handleToggleOnline = async () => {
    if (!partnerId) {
      Alert.alert('Partner ID missing', 'Unable to update online status.');
      return;
    }

    const nextStatus = !isOnline;
    setIsToggling(true);

    try {
      await deliveryPartnerService.toggleDeliveryPartnerOnlineStatus(
        partnerId,
        nextStatus,
      );
      setIsOnline(nextStatus);
    } catch (error) {
      console.error('Toggle online status failed', error);
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
    if (Number.isFinite(fromCreatedAt) && fromCreatedAt > 0) {
      return fromCreatedAt;
    }
    return getOrderTimestamp(order);
  };

  const LIVE_INNER_STATES = ['ACCEPTED', 'SHIPPED'];
  const isOrderLive = (o: DeliveryPartnerOrder) =>
    o.orderStatus?.toUpperCase() === 'PARTNER_ASSIGNED' &&
    LIVE_INNER_STATES.includes(o.orderDetails?.state?.toUpperCase() ?? '');
  const liveOrders = orders.filter(isOrderLive);
  const liveOrderIds = new Set(liveOrders.map(o => o.id || o.orderId));
  const pastOrders = orders.filter(o => !liveOrderIds.has(o.id || o.orderId));

  const getTimeRangeCutoff = (range: 'today' | 'week' | 'month'): number => {
    const now = new Date();
    if (range === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    }
    if (range === 'week') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
    }
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  };

  const timeFilteredOrders =
    timeRangeFilter === 'all'
      ? pastOrders
      : pastOrders.filter(o => getOrderEpochMs(o) >= getTimeRangeCutoff(timeRangeFilter));

  const availableStatuses = Array.from(
    new Set(timeFilteredOrders.map(o => o.orderStatus?.toUpperCase() ?? 'UNKNOWN')),
  ).sort();

  const filteredOrders =
    orderStatusFilter === 'all'
      ? timeFilteredOrders
      : timeFilteredOrders.filter(
          o => (o.orderStatus?.toUpperCase() ?? '') === orderStatusFilter,
        );

  const formatStatusLabel = (status: string) =>
    status
      .split('_')
      .map(w => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');

  const handleLogoutPress = () => {
    setIsLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  const formatOrderDateTime = (value: string | null) => {
    const parsedDate = parseDateValue(value);
    if (!parsedDate) {
      return { date: 'N/A', time: '' };
    }

    return {
      date: parsedDate.toLocaleDateString(),
      time: parsedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
  };

  const parseCustomerAddress = (
    rawAddress: string | null,
  ): ParsedCustomerAddress => {
    if (!rawAddress) {
      return { text: 'N/A', latitude: null, longitude: null };
    }

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
    if (!currentLocation || !destination) {
      return null;
    }

    const km = getDistanceKm(currentLocation, destination);
    if (km < 1) {
      return `${Math.round(km * 1000)} m away`;
    }

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
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleItemsExpanded = (orderId: string) => {
    setExpandedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const renderOrderCard = (order: DeliveryPartnerOrder) => {
    const cardId = order.id || order.orderId;
    const isExpanded = expandedOrderIds.has(cardId);
    const acceptedDateTime = formatOrderDateTime(order.orderDetails?.acceptedDate ?? null);
    const completedDateTime = formatOrderDateTime(order.orderDetails?.completedDate ?? null);
    const orderDateTime = formatOrderDateTime(
      order.orderDetails?.creationTime ?? order.createdAt,
    );
    const totalAmount = order.orderDetails?.totalAmount ?? 0;
    const shopName = order.shopDetails?.name || 'Shop';
    const customerName = order.orderDetails?.customerName || order.orderId || 'N/A';
    const status = formatStatusLabel(order.orderDetails?.state?.toUpperCase() ?? order.orderStatus?.toUpperCase() ?? 'UNKNOWN');

    const shopId = order.orderDetails?.shopId ?? order.shopId;
    const paymentMethod =
      order.orderDetails?.paymentMethod ?? order.paymentMethod ?? 'N/A';
    const customerMobile = order.orderDetails?.customerMobile ?? 'N/A';
    const customerAddress = parseCustomerAddress(
      order.orderDetails?.customerAddress ?? null,
    );
    const customerCoordinate =
      customerAddress.latitude != null && customerAddress.longitude != null
        ? { latitude: customerAddress.latitude, longitude: customerAddress.longitude }
        : null;
    const customerDistance = formatDistance(customerCoordinate);

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
        ? { latitude: order.shopDetails.address.latitude, longitude: order.shopDetails.address.longitude }
        : order.shopDetails?.coordinates?.latitude != null &&
          order.shopDetails?.coordinates?.longitude != null
        ? { latitude: order.shopDetails.coordinates.latitude, longitude: order.shopDetails.coordinates.longitude }
        : order.shopDetails?.latitude != null && order.shopDetails?.longitude != null
        ? { latitude: order.shopDetails.latitude, longitude: order.shopDetails.longitude }
        : null;
    const shopDistance = formatDistance(shopCoordinate);
    const shopImage = order.shopDetails?.banner || order.shopDetails?.logo || null;

    const orderDescription =
      order.orderDetails?.orderDescription ||
      (order.orderDetails?.orderItem?.length
        ? order.orderDetails.orderItem.map(item => item.name).join(', ')
        : 'N/A');
    const itemCount = order.orderDetails?.totalItemCount ?? 0;
    const deliveryFee = order.orderDetails?.deliveryFee ?? 0;
    const amountExcludingDeliveryFee =
      order.orderDetails?.amountExcludingDeliveryFee ?? 0;

    return (
      <TouchableOpacity
        key={cardId}
        style={styles.orderCard}
        onPress={() => toggleOrderExpanded(cardId)}
        activeOpacity={0.85}
      >
        {/* Collapsed header — always visible */}
        <View style={styles.orderCardTopRow}>
          <View style={styles.orderCardHeaderLeft}>
            <Text style={styles.orderIdText}>{customerName}</Text>
            <Text style={styles.orderCardOrderId}>#{order.orderId || order.id}</Text>
            <Text style={styles.orderCardSummary}>
              {shopName} · {formatCurrency(totalAmount)}
            </Text>
          </View>
          <View style={styles.orderCardHeaderRight}>
            {acceptedDateTime.date !== 'N/A' && (
              <Text style={styles.orderDateValue}>
                Accepted: {acceptedDateTime.time || acceptedDateTime.date}
              </Text>
            )}
            {completedDateTime.date !== 'N/A' && (
              <Text style={styles.orderDateValue}>
                Completed: {completedDateTime.time || completedDateTime.date}
              </Text>
            )}
            {acceptedDateTime.date === 'N/A' && completedDateTime.date === 'N/A' && (
              <Text style={styles.orderDateValue}>
                {orderDateTime.date}
                {orderDateTime.time ? `, ${orderDateTime.time}` : ''}
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

        {/* Expanded details */}
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
                  <Image source={{ uri: shopImage }} style={styles.shopHeroImage} />
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
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemCount}>x{item.itemCount}</Text>
                      </View>
                    ))}
                </>
              )}
              <View style={styles.orderMetaRow}>
                <Text style={styles.orderMetaLabel}>Payment</Text>
                <Text style={styles.orderMetaValue}>{paymentMethod}</Text>
              </View>
              <View style={styles.orderMetaRow}>
                <Text style={styles.orderMetaLabel}>Subtotal</Text>
                <Text style={styles.orderMetaValue}>
                  {formatCurrency(amountExcludingDeliveryFee)}
                </Text>
              </View>
              <View style={styles.orderMetaRow}>
                <Text style={styles.orderMetaLabel}>Delivery fee</Text>
                <Text style={styles.orderMetaValue}>
                  {formatCurrency(deliveryFee)}
                </Text>
              </View>
            </View>
            <View style={styles.orderFooterRow}>
              <Text style={styles.orderTotalLabel}>Total amount</Text>
              <Text style={styles.orderTotalValue}>
                {formatCurrency(totalAmount)}
              </Text>
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
                <Text style={styles.viewDetailsButtonText}>View Order Details</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>
    );
  };

  const TIMELINE_STEPS = [
    { key: 'PARTNER_ASSIGNED', label: 'Assigned' },
    { key: 'PARTNER_ACCEPTED', label: 'Accepted' },
    { key: 'PREPARATION', label: 'Preparing' },
    { key: 'ON_THE_WAY', label: 'Picked Up' },
    { key: 'DELIVERED', label: 'Delivered' },
  ];

  const getTimelineIndex = (status: string) => {
    const idx = TIMELINE_STEPS.findIndex(s => s.key === status.toUpperCase());
    return idx >= 0 ? idx : -1;
  };

  const renderLiveOrderCard = (order: DeliveryPartnerOrder) => {
    const liveCardId = order.id || order.orderId;
    const orderStatus = order.orderStatus?.toUpperCase() ?? '';
    const currentStepIdx = getTimelineIndex(orderStatus);
    const shopId = order.orderDetails?.shopId ?? order.shopId;
    const liveItemCount = order.orderDetails?.totalItemCount ?? 0;
    const paymentMethod =
      order.orderDetails?.paymentMethod ?? order.paymentMethod ?? 'N/A';
    const totalAmount = order.orderDetails?.totalAmount ?? 0;
    const customerAddress = parseCustomerAddress(
      order.orderDetails?.customerAddress ?? null,
    );
    const customerCoordinate =
      customerAddress.latitude != null && customerAddress.longitude != null
        ? { latitude: customerAddress.latitude, longitude: customerAddress.longitude }
        : null;
    const customerDistance = formatDistance(customerCoordinate);

    const shopAddressText = [
      order.shopDetails?.address?.address,
      order.shopDetails?.address?.city,
      order.shopDetails?.address?.state,
    ]
      .filter(Boolean)
      .join(', ');
    const shopCoordinate =
      order.shopDetails?.address?.latitude != null &&
      order.shopDetails?.address?.longitude != null
        ? { latitude: order.shopDetails.address.latitude, longitude: order.shopDetails.address.longitude }
        : order.shopDetails?.coordinates?.latitude != null &&
          order.shopDetails?.coordinates?.longitude != null
        ? { latitude: order.shopDetails.coordinates.latitude, longitude: order.shopDetails.coordinates.longitude }
        : order.shopDetails?.latitude != null && order.shopDetails?.longitude != null
        ? { latitude: order.shopDetails.latitude, longitude: order.shopDetails.longitude }
        : null;
    const shopDistance = formatDistance(shopCoordinate);
    const shopImage = order.shopDetails?.banner || order.shopDetails?.logo || null;

    const orderDateTime = formatOrderDateTime(
      order.orderDetails?.creationTime ?? order.createdAt,
    );

    return (
      <View key={order.id || order.orderId} style={[styles.liveCard, { marginBottom: 12 }]}>
        <View style={styles.livePulseRow}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>Live Order</Text>
          <Text style={styles.liveEarningsInline}>{formatCurrency(totalAmount)}</Text>
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
              {formatStatusLabel(order.orderDetails?.state?.toUpperCase() ?? 'UNKNOWN')}
            </Text>
          </View>
        </View>

        {/* Pickup */}
        <View style={styles.liveLocationRow}>
          {shopImage ? (
            <Image source={{ uri: shopImage }} style={styles.liveLocImage} />
          ) : (
            <View style={styles.liveLocIconWrap}>
              <MapPin size={16} color="#0E6DFD" />
            </View>
          )}
          <View style={styles.liveLocInfo}>
            <Text style={styles.liveLocName}>
              {order.shopDetails?.name || `Shop ${shopId ?? 'N/A'}`}
            </Text>
            <Text style={styles.liveLocAddress} numberOfLines={2}>{shopAddressText || 'Address unavailable'}</Text>
            {shopDistance ? <Text style={styles.liveLocDistance}>{shopDistance}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => openDirections({ coordinate: shopCoordinate, fallbackQuery: shopAddressText || order.shopDetails?.name || '' })}
            style={styles.liveNavButton}
            activeOpacity={0.8}
          >
            <Navigation size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.liveConnector} />

        {/* Drop */}
        <View style={styles.liveLocationRow}>
          <View style={[styles.liveLocIconWrap, { backgroundColor: '#FEF2F2' }]}>
            <MapPin size={16} color="#EF4444" />
          </View>
          <View style={styles.liveLocInfo}>
            <Text style={styles.liveLocName}>
              {order.orderDetails?.customerName || 'Customer'}
            </Text>
            <Text style={styles.liveLocAddress} numberOfLines={2}>{customerAddress.text}</Text>
            {customerDistance ? <Text style={styles.liveLocDistance}>{customerDistance}</Text> : null}
          </View>
          <TouchableOpacity
            onPress={() => openDirections({ coordinate: customerCoordinate, fallbackQuery: customerAddress.text })}
            style={[styles.liveNavButton, { backgroundColor: '#EF4444' }]}
            activeOpacity={0.8}
          >
            <Navigation size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {(order.orderDetails?.orderItem?.length ?? 0) > 0 && (
          <>
            <TouchableOpacity
              style={styles.itemsToggleRow}
              onPress={() => toggleItemsExpanded(liveCardId)}
              activeOpacity={0.7}
            >
              <Text style={styles.itemsToggleText}>
                {liveItemCount} item{liveItemCount > 1 ? 's' : ''}
              </Text>
              {expandedItemIds.has(liveCardId) ? (
                <ChevronUp size={14} color="#0E6DFD" />
              ) : (
                <ChevronDown size={14} color="#0E6DFD" />
              )}
            </TouchableOpacity>
            {expandedItemIds.has(liveCardId) &&
              order.orderDetails!.orderItem.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.itemCount}>x{item.itemCount}</Text>
                </View>
              ))}
          </>
        )}

        {!!order.orderDetails?.orderLink && (
          <TouchableOpacity
            style={styles.liveViewDetailsButton}
            onPress={() =>
              navigation.navigate('OrderWebView', {
                url: order.orderDetails!.orderLink!,
                title: `Order #${order.orderId || order.id}`,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.liveViewDetailsButtonText}>View Order Details</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const stats = [
    {
      label: 'Completed Orders',
      value: String(partnerProfile?.orderSuccess ?? 0),
      accent: '#16A34A',
    },
    {
      label: 'Failed Orders',
      value: String(partnerProfile?.orderFailed ?? 0),
      accent: '#DC2626',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
            <Text style={styles.headerTitle}>Home</Text>
            <Text style={styles.headerSubtitle}>Your dashboard</Text>
          </View>

          <View style={styles.headerActions}>
            {/* <TouchableOpacity
              style={styles.headerLogoutButton}
              onPress={handleLogoutPress}
              activeOpacity={0.8}
            >
              <LogoutIcon size={16} color="#0E6DFD" />
              <Text style={styles.headerLogoutText}>Logout</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
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
            <Text style={styles.eyebrow}>Transporter account</Text>
            <Text style={styles.title}>Welcome back {partnerName}</Text>
            <Text style={styles.subtitle}>
              Here is your delivery summary for today.
            </Text>

            <View style={styles.grid}>
              {stats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <View
                    style={[
                      styles.statAccent,
                      { backgroundColor: stat.accent },
                    ]}
                  />
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
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
                {liveOrders.map(order => renderLiveOrderCard(order))}
                {pastOrders.length > 0 && (
                  <Text style={styles.pastOrdersHeading}>Order History</Text>
                )}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterRow}
                  contentContainerStyle={styles.filterRowContent}
                >
                  {([
                    { key: 'all', label: 'All' },
                    { key: 'today', label: 'Today' },
                    { key: 'week', label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                  ] as const).map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.filterChip,
                        timeRangeFilter === item.key && styles.filterChipActive,
                      ]}
                      onPress={() => {
                        setTimeRangeFilter(item.key);
                        setOrderStatusFilter('all');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          timeRangeFilter === item.key && styles.filterChipTextActive,
                        ]}
                      >
                        {item.label}
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
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      orderStatusFilter === 'all' && styles.filterChipActive,
                    ]}
                    onPress={() => setOrderStatusFilter('all')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        orderStatusFilter === 'all' &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      All ({timeFilteredOrders.length})
                    </Text>
                  </TouchableOpacity>
                  {availableStatuses.map(status => {
                    const count = timeFilteredOrders.filter(
                      o => (o.orderStatus?.toUpperCase() ?? '') === status,
                    ).length;
                    return (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.filterChip,
                          orderStatusFilter === status &&
                            styles.filterChipActive,
                        ]}
                        onPress={() =>
                          setOrderStatusFilter(
                            orderStatusFilter === status ? 'all' : status,
                          )
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            orderStatusFilter === status &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          {formatStatusLabel(status)} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {filteredOrders.length === 0 ? (
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E6DFD',
  },
  headerAvatarLoading: {
    fontSize: 12,
    color: '#0E6DFD',
  },
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
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
  },
  statusOffline: {
    backgroundColor: '#F8FAFC',
  },
  statusOnlineText: {
    color: '#047857',
  },
  statusOfflineText: {
    color: '#475569',
  },
  statusSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  tabButtonActive: {
    backgroundColor: '#0E6DFD',
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterRowContent: {
    gap: 8,
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
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
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
  orderCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderCardHeaderLeft: {
    flex: 1,
  },
  orderCardHeaderRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  orderIdText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  orderCardOrderId: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 1,
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
  shopHeroInfo: {
    flex: 1,
    marginLeft: 12,
  },
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
  statAccent: {
    width: 38,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
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
  liveLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
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
  liveLocInfo: {
    flex: 1,
    marginLeft: 10,
  },
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
  liveTimelineH: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timelineStepH: {
    alignItems: 'center',
    gap: 3,
  },
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
});

export default HomeScreen;
