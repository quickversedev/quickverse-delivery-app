import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Phone,
  Navigation,
  CheckCircle2,
  MapPin,
  User,
  ExternalLink,
  Camera,
  Upload,
  CreditCard,
  Banknote,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FONT_FAMILY } from '../theme/typography';
import deliveryPartnerService from '../services/delivery-partner.service';
import type { DeliveryPartnerOrder } from '../services/delivery-partner.service';
import usePricingStore from '../store/pricingStore';
import type { ServiceType } from '../types/pricing';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import images from '../assets/images';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.38;

type RootStackParamList = {
  OrderDelivery: { order: DeliveryPartnerOrder };
  OrderWebView: { url: string; title?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDelivery'>;

interface StageConfig {
  stageIndex: number;
  buttonLabel: string;
  buttonColor: string;
  apiAction:
    | 'arriveStore'
    | 'pickup'
    | 'arriveDestination'
    | 'completeDelivery'
    | null;
}

const STAGE_CONFIG: Record<string, StageConfig> = {
  ACCEPTED: {
    stageIndex: 0,
    buttonLabel: 'Mark Arrived at Store',
    buttonColor: '#0E6DFD',
    apiAction: 'arriveStore',
  },
  PARTNER_ASSIGNED: {
    stageIndex: 0,
    buttonLabel: 'Mark Arrived at Store',
    buttonColor: '#0E6DFD',
    apiAction: 'arriveStore',
  },
  ARRIVED_AT_STORE: {
    stageIndex: 1,
    buttonLabel: 'Pickup Order',
    buttonColor: '#7C3AED',
    apiAction: 'pickup',
  },
  ORDER_PICKED_UP: {
    stageIndex: 2,
    buttonLabel: 'Mark Arrived at Destination',
    buttonColor: '#0891B2',
    apiAction: 'arriveDestination',
  },
  REACHED_LOCATION: {
    stageIndex: 3,
    buttonLabel: 'Mark as Delivered',
    buttonColor: '#16A34A',
    apiAction: 'completeDelivery',
  },
  DELIVERED: {
    stageIndex: 4,
    buttonLabel: 'Back to Home',
    buttonColor: '#16A34A',
    apiAction: null,
  },
};

const STEPS = [
  { label: 'Reach Store', emoji: '🏪' },
  { label: 'Pickup', emoji: '📦' },
  { label: 'Reach Destination', emoji: '🛵' },
  { label: 'Deliver', emoji: '✅' },
];

// ─── Custom Marker Components ────────────────────────────────────────────────

const DeliveryPartnerMarker: React.FC = () => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.7,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ).start();
  }, []);

  return (
    <View style={mk.partnerOuter}>
      <Animated.View
        style={[
          mk.partnerPulse,
          { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
        ]}
      />
      <View style={mk.partnerCore}>
        <Text style={mk.partnerEmoji}>🛵</Text>
      </View>
      <View style={mk.labelTag}>
        <View style={[mk.labelDot, { backgroundColor: '#0E6DFD' }]} />
        <Text style={mk.labelText}>You</Text>
      </View>
    </View>
  );
};

const StoreMarker: React.FC<{ name?: string }> = ({ name }) => (
  <View style={mk.pinOuter}>
    <View
      style={[
        mk.pinBubble,
        { backgroundColor: '#FF4D00', borderColor: '#FF7043' },
      ]}
    >
      <Text style={mk.pinEmoji}>🏪</Text>
    </View>
    <View style={[mk.pinTail, { borderTopColor: '#FF4D00' }]} />
    {!!name && (
      <View style={mk.labelTag}>
        <View style={[mk.labelDot, { backgroundColor: '#FF4D00' }]} />
        <Text style={mk.labelText} numberOfLines={1}>
          {name}
        </Text>
      </View>
    )}
  </View>
);

const CustomerMarker: React.FC<{ name?: string }> = ({ name }) => (
  <View style={mk.pinOuter}>
    <View
      style={[
        mk.pinBubble,
        { backgroundColor: '#0B9E6E', borderColor: '#14B88A' },
      ]}
    >
      <Text style={mk.pinEmoji}>🏠</Text>
    </View>
    <View style={[mk.pinTail, { borderTopColor: '#0B9E6E' }]} />
    {!!name && (
      <View style={mk.labelTag}>
        <View style={[mk.labelDot, { backgroundColor: '#0B9E6E' }]} />
        <Text style={mk.labelText} numberOfLines={1}>
          {name}
        </Text>
      </View>
    )}
  </View>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const parseCustomerAddress = (rawAddress: string | null) => {
  if (!rawAddress) return { text: 'N/A', latitude: null, longitude: null };
  const cleaned = rawAddress.replace(/^\{/, '').replace(/\}$/, '');
  const entries = [...cleaned.matchAll(/(\w+)=([^,]+(?:,(?!\s*\w+=)[^,]+)*)/g)];
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

const openMaps = async (
  lat: number | null,
  lng: number | null,
  query: string,
) => {
  let url = '';
  if (Platform.OS === 'ios') {
    url =
      lat && lng
        ? `http://maps.apple.com/?daddr=${lat},${lng}`
        : `http://maps.apple.com/?daddr=${encodeURIComponent(query)}`;
  } else {
    url =
      lat && lng
        ? `google.navigation:q=${lat},${lng}`
        : `geo:0,0?q=${encodeURIComponent(query)}`;
  }
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Unable to open maps');
  }
};

const formatCurrency = (amount: number) =>
  `₹${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;

const fitRegion = (
  coords: Array<{ lat: number; lng: number }>,
): Region | null => {
  const valid = coords.filter(
    c => Number.isFinite(c.lat) && Number.isFinite(c.lng),
  );
  if (valid.length === 0) return null;
  if (valid.length === 1) {
    return {
      latitude: valid[0].lat,
      longitude: valid[0].lng,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    };
  }
  const lats = valid.map(c => c.lat);
  const lngs = valid.map(c => c.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const padding = 1.6;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * padding, 0.01),
    longitudeDelta: Math.max((maxLng - minLng) * padding, 0.01),
  };
};

// ─── InfoChip ─────────────────────────────────────────────────────────────────

const InfoChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <View style={s.infoChip}>
    <View style={s.infoChipIcon}>{icon}</View>
    <View style={s.infoChipText}>
      <Text style={s.infoChipLabel}>{label}</Text>
      <Text style={s.infoChipValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  </View>
);

// ─── MapView with Custom Markers ──────────────────────────────────────────────

interface MapWithMarkersProps {
  showStore?: boolean;
  showCustomer?: boolean;
  storeLat?: number | null;
  storeLng?: number | null;
  storeName?: string;
  customerLat?: number | null;
  customerLng?: number | null;
  customerName?: string;
  partnerLat?: number | null;
  partnerLng?: number | null;
  fallbackLabel?: string;
}

const MapWithMarkers: React.FC<MapWithMarkersProps> = ({
  showStore,
  showCustomer,
  storeLat,
  storeLng,
  storeName,
  customerLat,
  customerLng,
  customerName,
  partnerLat,
  partnerLng,
  fallbackLabel,
}) => {
  const coordSets: Array<{ lat: number; lng: number }> = [];
  if (showStore && storeLat && storeLng)
    coordSets.push({ lat: storeLat, lng: storeLng });
  if (showCustomer && customerLat && customerLng)
    coordSets.push({ lat: customerLat, lng: customerLng });
  if (partnerLat && partnerLng)
    coordSets.push({ lat: partnerLat, lng: partnerLng });

  const region = fitRegion(coordSets);

  if (!region) {
    return (
      <View style={[s.mapPlaceholder, s.mapFallback]}>
        <View style={s.mapPinOuter}>
          <MapPin size={28} color="#0E6DFD" />
        </View>
        <Text style={s.mapPlaceholderLabel}>
          {fallbackLabel ?? 'Location unavailable'}
        </Text>
      </View>
    );
  }

  return (
    <View style={s.mapPlaceholder}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        showsMyLocationButton={false}
        mapType="standard"
        loadingEnabled
        loadingIndicatorColor="#0E6DFD"
      >
        {showStore && storeLat && storeLng && (
          <Marker
            coordinate={{ latitude: storeLat, longitude: storeLng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <StoreMarker name={storeName} />
          </Marker>
        )}

        {showCustomer && customerLat && customerLng && (
          <Marker
            coordinate={{ latitude: customerLat, longitude: customerLng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <CustomerMarker name={customerName} />
          </Marker>
        )}

        {partnerLat && partnerLng && (
          <Marker
            coordinate={{ latitude: partnerLat, longitude: partnerLng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <DeliveryPartnerMarker />
          </Marker>
        )}
      </MapView>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

const OrderDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<DeliveryPartnerOrder>(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH' | null>(
    'CASH',
  );
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  // Track if the CTA was tapped without meeting requirements, to show inline errors
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [partnerCoord, setPartnerCoord] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const { getPricingValues } = usePricingStore();

  useEffect(() => {
    Geolocation.requestAuthorization();

    const watchId = Geolocation.watchPosition(
      position => {
        console.log('Position update:', position?.coords);
        setPartnerCoord({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      error => {
        console.warn('Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 3000,
      },
    );

    return () => {
      Geolocation.clearWatch(watchId);
    };
  }, []);

  const orderStatus = (
    order.orderStatus ??
    order.orderDetails?.state ??
    'ACCEPTED'
  ).toUpperCase();
  const config = STAGE_CONFIG[orderStatus] ?? STAGE_CONFIG['ACCEPTED'];

  const customerAddress = parseCustomerAddress(
    order.orderDetails?.customerAddress ?? null,
  );

  const shopAddressText = [
    order.shopDetails?.address?.address,
    order.shopDetails?.address?.city,
    order.shopDetails?.address?.state,
    order.shopDetails?.address?.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  const shopCoord =
    order.shopDetails?.coordinates &&
    Number.isFinite(order.shopDetails.coordinates.latitude) &&
    Number.isFinite(order.shopDetails.coordinates.longitude)
      ? {
          lat: order.shopDetails.coordinates.latitude,
          lng: order.shopDetails.coordinates.longitude,
        }
      : null;

  const customerCoord =
    customerAddress.latitude != null &&
    customerAddress.longitude != null &&
    Number.isFinite(customerAddress.latitude) &&
    Number.isFinite(customerAddress.longitude)
      ? { lat: customerAddress.latitude, lng: customerAddress.longitude }
      : null;

  console.log('Customer Coords : ', customerCoord);

  const serviceType: ServiceType = order.shopDetails?.category
    ?.toLowerCase()
    .includes('grocery')
    ? 'GROCERY'
    : 'FOOD';
  const pricing = getPricingValues(serviceType);
  const subtotal = order.orderDetails?.amountExcludingDeliveryFee ?? 0;
  const commission = pricing.commissionRate * subtotal;
  const taxableAmount = commission + pricing.deliveryFee + pricing.platformFee;
  const taxes = Math.round(pricing.gstRate * taxableAmount);
  const computedTotal =
    subtotal +
    pricing.deliveryFee +
    pricing.platformFee +
    pricing.packagingCharges +
    taxes;

  const isPrepaid = order?.finance?.paymentMethod === 'PREPAID' || null;

  const paymentMethod =
    order.orderDetails?.paymentMethod ?? order.paymentMethod ?? 'N/A';

  const finalPaymentMethod = isPrepaid
    ? 'PREPAID'
    : paymentMode === 'ONLINE'
    ? 'QR CODE'
    : 'CASH';

  const openOrderWebView = () => {
    const url = order.orderDetails?.orderLink;
    if (!url) return;
    navigation.navigate('OrderWebView', {
      url,
      title: `Order #${order.orderId || order.id}`,
    });
  };

  const pickImage = async () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
      response => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets?.[0]?.uri;
        if (uri) setEvidenceImage(uri);
      },
    );
  };

  const takePhoto = async () => {
    launchCamera(
      { mediaType: 'photo', quality: 0.8, saveToPhotos: false },
      response => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets?.[0]?.uri;
        if (uri) setEvidenceImage(uri);
      },
    );
  };

  // Reset evidence image when payment mode switches away from ONLINE
  const handlePaymentModeChange = (mode: 'ONLINE' | 'CASH') => {
    setPaymentMode(mode);
    setSubmitAttempted(false);
    if (mode === 'CASH') {
      setEvidenceImage(null);
    }
  };

  const handleAction = useCallback(async () => {
    if (config.apiAction === null) {
      navigation.goBack();
      return;
    }

    if (config.apiAction === 'completeDelivery') {
      // Mark that the user attempted submission so inline errors appear
      setSubmitAttempted(true);

      if (isPrepaid) {
        if (!paymentMode) {
          Alert.alert(
            'Select Payment Mode',
            'Please select Online or Cash before marking as delivered.',
          );
          return;
        }
        // For ONLINE, screenshot is required
        if (paymentMode === 'ONLINE' && !evidenceImage) {
          Alert.alert(
            'Upload Required',
            'Please upload the payment screenshot to confirm online payment.',
          );
          return;
        }
      }
    }

    const orderId = order.id;
    setIsLoading(true);
    try {
      if (config.apiAction === 'arriveStore') {
        await deliveryPartnerService.arriveAtStore(orderId);
        setOrder(prev => ({ ...prev, orderStatus: 'ARRIVED_AT_STORE' }));
      } else if (config.apiAction === 'pickup') {
        await deliveryPartnerService.pickupOrder(orderId);
        setOrder(prev => ({ ...prev, orderStatus: 'ORDER_PICKED_UP' }));
      } else if (config.apiAction === 'arriveDestination') {
        await deliveryPartnerService.arriveAtDestination(orderId);
        setOrder(prev => ({ ...prev, orderStatus: 'REACHED_LOCATION' }));
      } else if (config.apiAction === 'completeDelivery') {
        // Pass paymentMode so service conditionally sends body or not
        console.log('Evidence Image URI:', evidenceImage, orderId);
        await deliveryPartnerService.completeDelivery(
          orderId,
          paymentMode === 'ONLINE' ? evidenceImage : null,
        );
        setOrder(prev => ({ ...prev, orderStatus: 'DELIVERED' }));
      }
    } catch (err: any) {
      console.log('Error in handleAction:', err);
      Alert.alert('Action failed', err?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [config, order, navigation, paymentMode, evidenceImage]);

  // ── Step renderers ────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <>
      <MapWithMarkers
        showStore
        storeLat={shopCoord?.lat}
        storeLng={shopCoord?.lng}
        storeName={order.shopDetails?.name ?? 'Store'}
        partnerLat={partnerCoord?.lat}
        partnerLng={partnerCoord?.lng}
        fallbackLabel={order.shopDetails?.name ?? 'Store'}
      />

      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <View style={s.infoCardHeaderLeft}>
            <Text style={s.infoCardTitle}>
              {order.shopDetails?.name || 'Store'}
            </Text>
            {order.shopDetails?.owner ? (
              <Text style={s.infoCardSub}>{order.shopDetails.owner}</Text>
            ) : null}
          </View>
          <View style={s.infoCardBadge}>
            <Text style={s.infoCardBadgeText}>Pickup</Text>
          </View>
        </View>

        <View style={s.divider} />

        <InfoChip
          icon={<MapPin size={14} color="#64748B" />}
          label="Address"
          value={shopAddressText || 'N/A'}
        />

        <View style={s.actionRow}>
          {order.shopDetails?.phone && (
            <TouchableOpacity
              style={s.iconActionBtn}
              onPress={() => Linking.openURL(`tel:${order.shopDetails!.phone}`)}
              activeOpacity={0.8}
            >
              <Phone size={16} color="#16A34A" />
              <Text style={[s.iconActionText, { color: '#16A34A' }]}>
                Call Store
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.iconActionBtn, s.iconActionBtnBlue]}
            onPress={() =>
              openMaps(
                shopCoord?.lat ?? null,
                shopCoord?.lng ?? null,
                shopAddressText,
              )
            }
            activeOpacity={0.85}
          >
            <Navigation size={16} color="#0E6DFD" />
            <Text style={[s.iconActionText, { color: '#0E6DFD' }]}>
              Navigate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderStep1 = () => (
    <>
      <View style={s.vendorChip}>
        <View style={s.vendorChipLeft}>
          <Text style={s.vendorChipName}>
            {order.shopDetails?.name || 'Store'}
          </Text>
          <Text style={s.vendorChipAddr} numberOfLines={1}>
            {shopAddressText || 'N/A'}
          </Text>
        </View>
        {order.shopDetails?.phone && (
          <TouchableOpacity
            style={s.vendorChipCall}
            onPress={() => Linking.openURL(`tel:${order.shopDetails!.phone}`)}
          >
            <Phone size={14} color="#16A34A" />
          </TouchableOpacity>
        )}
      </View>

      <View style={s.infoCard}>
        <Text style={s.sectionLabel}>ITEMS TO COLLECT</Text>
        {(order.orderDetails?.orderItem ?? []).length > 0 ? (
          (order.orderDetails!.orderItem as any[]).map((item: any) => (
            <View key={item.id} style={s.itemRow}>
              <View style={s.itemBullet} />
              <Text style={s.itemName}>{item.name}</Text>
              <Text style={s.itemQty}>×{item.itemCount}</Text>
            </View>
          ))
        ) : (
          <Text style={s.emptyText}>
            {order.orderDetails?.orderDescription || 'No items listed'}
          </Text>
        )}
        <View style={s.itemTotalRow}>
          <Text style={s.itemTotalLabel}>Total Items</Text>
          <Text style={s.itemTotalValue}>
            {order.orderDetails?.totalItemCount ?? 0}
          </Text>
        </View>
      </View>

      <View style={s.infoCard}>
        <Text style={s.sectionLabel}>ORDER</Text>
        <View style={s.rowBetween}>
          <Text style={s.rowLabel}>Order ID</Text>
          <Text style={s.rowValue}>#{order.orderId || order.id}</Text>
        </View>
        <View style={s.rowBetween}>
          <Text style={s.rowLabel}>Customer</Text>
          <Text style={s.rowValue}>
            {order.orderDetails?.customerName || 'N/A'}
          </Text>
        </View>
        <View style={s.rowBetween}>
          <Text style={s.rowLabel}>Payment</Text>
          <Text style={s.rowValue}>{finalPaymentMethod ?? 'N/A'}</Text>
        </View>
      </View>

      {order.orderDetails?.orderLink && (
        <TouchableOpacity
          style={s.webviewBtn}
          onPress={openOrderWebView}
          activeOpacity={0.85}
        >
          <ExternalLink size={15} color="#7C3AED" />
          <Text style={s.webviewBtnText}>View Full Order Details</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const renderStep2 = () => (
    <>
      <MapWithMarkers
        showStore
        showCustomer
        storeLat={shopCoord?.lat}
        storeLng={shopCoord?.lng}
        storeName={order.shopDetails?.name ?? 'Store'}
        customerLat={customerCoord?.lat}
        customerLng={customerCoord?.lng}
        customerName={order.orderDetails?.customerName ?? 'Customer'}
        partnerLat={partnerCoord?.lat}
        partnerLng={partnerCoord?.lng}
        fallbackLabel={order.orderDetails?.customerName ?? 'Customer'}
      />

      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <View style={s.infoCardHeaderLeft}>
            <Text style={s.infoCardTitle}>
              {order.orderDetails?.customerName || 'Customer'}
            </Text>
            <Text style={s.infoCardSub}>Delivery destination</Text>
          </View>
          <View style={[s.infoCardBadge, { backgroundColor: '#F0F9FF' }]}>
            <Text style={[s.infoCardBadgeText, { color: '#0891B2' }]}>
              Drop
            </Text>
          </View>
        </View>

        <View style={s.divider} />

        <InfoChip
          icon={<MapPin size={14} color="#64748B" />}
          label="Address"
          value={customerAddress.text}
        />

        <View style={s.actionRow}>
          {order.orderDetails?.customerMobile && (
            <TouchableOpacity
              style={s.iconActionBtn}
              onPress={() =>
                Linking.openURL(
                  `tel:${String(order.orderDetails!.customerMobile).slice(
                    -10,
                  )}`,
                )
              }
              activeOpacity={0.8}
            >
              <Phone size={16} color="#16A34A" />
              <Text style={[s.iconActionText, { color: '#16A34A' }]}>
                Call Customer
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.iconActionBtn, s.iconActionBtnBlue]}
            onPress={() =>
              openMaps(
                customerCoord?.lat ?? null,
                customerCoord?.lng ?? null,
                customerAddress.text,
              )
            }
            activeOpacity={0.85}
          >
            <Navigation size={16} color="#0E6DFD" />
            <Text style={[s.iconActionText, { color: '#0E6DFD' }]}>
              Navigate
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderStep3 = () => {
    // Whether the evidence upload field should show an error state
    const showEvidenceError =
      submitAttempted && paymentMode === 'ONLINE' && !evidenceImage;

    return (
      <>
        {/* ── Customer Row Card ── */}
        <View style={s.infoCard}>
          <Text style={s.sectionLabel}>CUSTOMER</Text>
          <View style={s.customerRow}>
            <View style={s.customerAvatar}>
              <User size={18} color="#0E6DFD" />
            </View>
            <View style={s.customerMeta}>
              <Text style={s.customerName} numberOfLines={1}>
                {order.orderDetails?.customerName || 'N/A'}
              </Text>
              <Text style={s.customerAddr} numberOfLines={2}>
                {customerAddress.text}
              </Text>
            </View>
            {order.orderDetails?.customerMobile && (
              <TouchableOpacity
                style={s.customerCallBtn}
                onPress={() =>
                  Linking.openURL(
                    `tel:${String(order.orderDetails!.customerMobile).slice(
                      -10,
                    )}`,
                  )
                }
                activeOpacity={0.8}
              >
                <Phone size={15} color="#16A34A" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Amount + Order Row ── */}
        <View style={s.infoCard}>
          <View style={s.amountCompactRow}>
            <View style={s.amountCompactLeft}>
              <Text style={s.amountCompactLabel}>
                Order #{order.orderId || order.id}
              </Text>
              <Text style={s.amountCompactSub}>
                {order.orderDetails?.totalItemCount ?? 0} item(s)
              </Text>
            </View>
            <View style={s.amountCompactRight}>
              <Text style={s.amountCompactCaption}>Collect</Text>
              <Text style={s.amountCompactValue}>
                {formatCurrency(order?.finance?.payableAmount || computedTotal)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment Mode ── */}
        {isPrepaid ? (
          <View style={s.infoCard}>
            <Text style={s.sectionLabel}>PAYMENT MODE</Text>
            <View style={s.prepaidNote}>
              <Text style={s.prepaidNoteEmoji}>💳</Text>
              <Text style={s.prepaidNoteText}>Prepaid</Text>
            </View>
          </View>
        ) : (
          <View style={s.infoCard}>
            <Text style={s.sectionLabel}>PAYMENT MODE</Text>

            {/* Mode selector buttons */}
            <View style={s.paymentModeRow}>
              <TouchableOpacity
                style={[
                  s.paymentModeBtn,
                  paymentMode === 'ONLINE' && s.paymentModeBtnActive,
                ]}
                onPress={() => handlePaymentModeChange('ONLINE')}
                activeOpacity={0.85}
              >
                <CreditCard
                  size={18}
                  color={paymentMode === 'ONLINE' ? '#0E6DFD' : '#94A3B8'}
                />
                <Text
                  style={[
                    s.paymentModeBtnText,
                    paymentMode === 'ONLINE' && s.paymentModeBtnTextActive,
                  ]}
                >
                  Online
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  s.paymentModeBtn,
                  paymentMode === 'CASH' && s.paymentModeBtnActive,
                ]}
                onPress={() => handlePaymentModeChange('CASH')}
                activeOpacity={0.85}
              >
                <Banknote
                  size={18}
                  color={paymentMode === 'CASH' ? '#0E6DFD' : '#94A3B8'}
                />
                <Text
                  style={[
                    s.paymentModeBtnText,
                    paymentMode === 'CASH' && s.paymentModeBtnTextActive,
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
            </View>

            {/* ONLINE — QR + evidence upload */}
            {paymentMode === 'ONLINE' && (
              <View style={s.evidenceSection}>
                {/* Show QR button */}
                <TouchableOpacity
                  style={s.showQrBtn}
                  onPress={() => setQrModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text style={s.showQrBtnEmoji}>📲</Text>
                  <Text style={s.showQrBtnText}>Show UPI QR Code</Text>
                </TouchableOpacity>

                {/* Upload proof — required for ONLINE */}
                <View style={s.evidenceLabelRow}>
                  <Text style={s.evidenceSectionLabel}>
                    Upload Payment Screenshot
                  </Text>
                  <View style={s.evidenceRequiredBadge}>
                    <Text style={s.evidenceRequiredBadgeText}>Required</Text>
                  </View>
                </View>

                {evidenceImage ? (
                  /* Preview of uploaded image */
                  <View style={s.evidencePreview}>
                    <Image
                      source={{ uri: evidenceImage }}
                      style={s.evidenceImage}
                    />
                    <TouchableOpacity
                      style={s.evidenceRemove}
                      onPress={() => setEvidenceImage(null)}
                    >
                      <Text style={s.evidenceRemoveText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={s.evidenceUploadRow}>
                      <TouchableOpacity
                        style={[
                          s.evidenceBtn,
                          showEvidenceError && s.evidenceBtnError,
                        ]}
                        onPress={takePhoto}
                        activeOpacity={0.85}
                      >
                        <Camera size={18} color="#0E6DFD" />
                        <Text style={s.evidenceBtnText}>Take Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          s.evidenceBtn,
                          showEvidenceError && s.evidenceBtnError,
                        ]}
                        onPress={pickImage}
                        activeOpacity={0.85}
                      >
                        <Upload size={18} color="#7C3AED" />
                        <Text style={[s.evidenceBtnText, { color: '#7C3AED' }]}>
                          Upload
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {/* Inline error message shown after a failed submit attempt */}
                    {showEvidenceError && (
                      <Text style={s.evidenceErrorText}>
                        ⚠ Screenshot is required for online payment
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}

            {/* CASH — confirmation note */}
            {paymentMode === 'CASH' && (
              <View style={s.cashNote}>
                <Text style={s.cashNoteEmoji}>💵</Text>
                <Text style={s.cashNoteText}>
                  Collect cash from the customer before marking as delivered.
                </Text>
              </View>
            )}
          </View>
        )}

        {order.orderDetails?.orderLink && (
          <TouchableOpacity
            style={s.webviewBtn}
            onPress={openOrderWebView}
            activeOpacity={0.85}
          >
            <ExternalLink size={15} color="#7C3AED" />
            <Text style={s.webviewBtnText}>View Order Details</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderStep4 = () => (
    <View style={s.successCard}>
      <View style={s.successIconWrap}>
        <CheckCircle2 size={56} color="#16A34A" />
      </View>
      <Text style={s.successTitle}>Delivered!</Text>
      <Text style={s.successSub}>
        #{order.orderId || order.id} · {order.orderDetails?.customerName}
      </Text>

      <View style={s.successRow}>
        <Text style={s.successRowLabel}>Customer</Text>
        <Text style={s.successRowValue}>
          {order.orderDetails?.customerName || 'N/A'}
        </Text>
      </View>
      <View style={s.successRow}>
        <Text style={s.successRowLabel}>Address</Text>
        <Text style={s.successRowValue} numberOfLines={2}>
          {customerAddress.text}
        </Text>
      </View>
      <View style={s.successRow}>
        <Text style={s.successRowLabel}>Payment</Text>
        <Text style={s.successRowValue}>{finalPaymentMethod ?? 'N/A'}</Text>
      </View>
      <View style={[s.successRow, s.successRowLast]}>
        <Text style={s.successRowLabel}>Order Value</Text>
        <Text style={[s.successRowValue, s.successRowValueBold]}>
          {formatCurrency(order?.finance?.payableAmount || computedTotal)}
        </Text>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (config.stageIndex) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const STEP_BANNERS = [
    'Head to the store and pick up the order',
    'Collect all items from the store',
    "Head to the customer's location",
    'Hand over the order to the customer',
    'Order delivered successfully',
  ];

  const renderStepper = () => (
    <View style={s.stepper}>
      {STEPS.map((step, i) => {
        const done = i < config.stageIndex;
        const active = i === Math.min(config.stageIndex, STEPS.length - 1);
        return (
          <React.Fragment key={step.label}>
            <View style={s.stepperItem}>
              <View
                style={[
                  s.stepperDot,
                  done && s.stepperDotDone,
                  active && s.stepperDotActive,
                ]}
              >
                <Text style={s.stepperDotText}>{done ? '✓' : step.emoji}</Text>
              </View>
              <Text
                style={[
                  s.stepperLabel,
                  (done || active) && s.stepperLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {i < STEPS.length - 1 && (
              <View style={[s.stepperLine, done && s.stepperLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top', 'left', 'right']}>
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Order #{order.orderId || order.id}</Text>
        <View style={{ width: 36 }} />
      </View>

      {renderStepper()}

      <View style={s.banner}>
        <Text style={s.bannerText}>{STEP_BANNERS[config.stageIndex]}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[
            s.cta,
            { backgroundColor: config.buttonColor },
            isLoading && s.ctaDisabled,
          ]}
          onPress={handleAction}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.ctaText}>{config.buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── UPI QR Modal ── */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <TouchableOpacity
          style={s.qrModalOverlay}
          activeOpacity={1}
          onPress={() => setQrModalVisible(false)}
        >
          <View style={s.qrModalCard}>
            <View style={s.qrModalHeader}>
              <Text style={s.qrModalTitle}>Scan & Pay</Text>
              <TouchableOpacity onPress={() => setQrModalVisible(false)}>
                <Text style={s.qrModalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.qrModalSub}>Ask customer to scan this QR</Text>
            <View style={s.qrImageWrap}>
              <Image
                source={images.qrQv}
                style={s.qrImage}
                resizeMode="contain"
              />
            </View>
            <Text style={s.qrModalHint}>
              After payment, upload the screenshot below
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export default OrderDeliveryScreen;

// ─── Marker Styles ────────────────────────────────────────────────────────────

const mk = StyleSheet.create({
  partnerOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  partnerPulse: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0E6DFD',
  },
  partnerCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0E6DFD',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0E6DFD',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  partnerEmoji: { fontSize: 18 },

  pinOuter: {
    alignItems: 'center',
  },
  pinBubble: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  pinEmoji: { fontSize: 18 },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  labelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    maxWidth: 100,
  },
  labelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F172A',
  },
});

// ─── Screen Styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F5FA' },
  prepaidNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  prepaidNoteEmoji: { fontSize: 16 },
  prepaidNoteText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  stepperItem: { alignItems: 'center', gap: 3 },
  stepperDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  stepperDotActive: { backgroundColor: '#EEF4FF', borderColor: '#0E6DFD' },
  stepperDotDone: { backgroundColor: '#ECFDF5', borderColor: '#16A34A' },
  stepperDotText: { fontSize: 13 },
  stepperLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  stepperLabelActive: { color: '#0F172A', fontFamily: FONT_FAMILY.outfitBold },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 18,
  },
  stepperLineDone: { backgroundColor: '#16A34A' },

  banner: {
    backgroundColor: '#EEF4FF',
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  bannerText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
    textAlign: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { gap: 10, paddingBottom: 16 },

  mapPlaceholder: {
    height: MAP_HEIGHT,
    backgroundColor: '#E8EFFF',
    overflow: 'hidden',
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapPinOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapPlaceholderLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoCardHeaderLeft: { flex: 1 },
  infoCardTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  infoCardSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  infoCardBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  infoCardBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },

  infoChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 7,
    gap: 10,
  },
  infoChipIcon: { marginTop: 1 },
  infoChipText: { flex: 1 },
  infoChipLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginBottom: 2,
  },
  infoChipValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  iconActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  iconActionBtnBlue: { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  iconActionText: { fontSize: 12, fontFamily: FONT_FAMILY.outfitBold },

  sectionLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#94A3B8',
    letterSpacing: 0.9,
    marginBottom: 10,
    textTransform: 'uppercase',
  },

  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  rowLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  rowValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    maxWidth: '55%',
    textAlign: 'right',
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemBullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
    marginRight: 10,
  },
  itemName: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  itemTotalLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
  },
  itemTotalValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    paddingVertical: 8,
  },

  vendorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0A1730',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  vendorChipLeft: { flex: 1 },
  vendorChipName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  vendorChipAddr: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  vendorChipCall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  amountHighlight: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountHighlightLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#92400E',
  },
  amountHighlightValue: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#92400E',
  },

  paymentModeRow: { flexDirection: 'row', gap: 10 },
  paymentModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  paymentModeBtnActive: { borderColor: '#0E6DFD', backgroundColor: '#EFF6FF' },
  paymentModeBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },
  paymentModeBtnTextActive: { color: '#0E6DFD' },

  evidenceSection: { marginTop: 14 },

  // Label row with "Required" badge inline
  evidenceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  evidenceSectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  evidenceRequiredBadge: {
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  evidenceRequiredBadgeText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  evidenceUploadRow: { flexDirection: 'row', gap: 10 },
  evidenceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderStyle: 'dashed',
  },
  // Error state for the upload buttons — red dashed border
  evidenceBtnError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FFF1F2',
  },
  evidenceBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  // Inline error message below upload buttons
  evidenceErrorText: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#EF4444',
  },

  evidencePreview: { alignItems: 'center', gap: 8 },
  evidenceImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  evidenceRemove: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  evidenceRemoveText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#EF4444',
  },

  // Cash confirmation note
  cashNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  cashNoteEmoji: { fontSize: 16, lineHeight: 20 },
  cashNoteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#92400E',
    lineHeight: 18,
  },

  webviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    paddingVertical: 13,
  },
  webviewBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#7C3AED',
  },

  successCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  successSub: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 20,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  successRowLast: { borderBottomWidth: 0 },
  successRowLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  successRowValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    maxWidth: '55%',
    textAlign: 'right',
  },
  successRowValueBold: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },

  footer: { position: 'absolute', left: 14, right: 14, bottom: 24 },
  cta: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  customerMeta: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  customerAddr: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  customerCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  amountCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountCompactLeft: {
    flex: 1,
  },
  amountCompactLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  amountCompactSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  amountCompactRight: {
    alignItems: 'flex-end',
  },
  amountCompactCaption: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountCompactValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#92400E',
  },

  showQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 14,
  },
  showQrBtnEmoji: { fontSize: 18 },
  showQrBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#166534',
  },

  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  qrModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 4,
  },
  qrModalTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  qrModalClose: {
    fontSize: 16,
    color: '#64748B',
    padding: 4,
  },
  qrModalSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginBottom: 16,
  },
  qrImageWrap: {
    width: 340,
    height: 340,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrModalHint: {
    marginTop: 16,
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
