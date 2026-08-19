import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  TextInput,
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
  Store,
  ExternalLink,
  Camera,
  Upload,
  CreditCard,
  Banknote,
  RefreshCw,
  AlertTriangle,
  X,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.38;
const REPORT_MAP_HEIGHT = 210;

const MODAL_IMAGE_WIDTH = SCREEN_WIDTH * 0.9;
const MODAL_IMAGE_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

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

// ─── Type Definitions ─────────────────────────────────────────────────────

interface PaymentQRResponse {
  id: string;
  image_url: string;
  status: 'active' | 'closed';
  close_by?: number;
  created_at?: string | null;
}

interface PaymentStatusResponse {
  isPaymentDone: boolean;
  paymentStatus?: string;
  paymentDetails?: {
    amount?: number;
    method?: string;
    timestamp?: string;
  };
}

interface CoordinateData {
  lat: number;
  lng: number;
}

interface ParsedAddress {
  text: string;
  latitude: number | null;
  longitude: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
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
  ARRIVED_AT_LOCATION: {
    stageIndex: 3,
    buttonLabel: 'Mark as Delivered',
    buttonColor: '#16A34A',
    apiAction: 'completeDelivery',
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

const parseCustomerAddress = (rawAddress: string | null): ParsedAddress => {
  if (!rawAddress)
    return {
      text: 'N/A',
      latitude: null,
      longitude: null,
      addressLine1: null,
      addressLine2: null,
      landmark: null,
      city: null,
      state: null,
      pincode: null,
    };
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
    latitude: Number.isFinite(latitude ?? NaN) ? latitude : null,
    longitude: Number.isFinite(longitude ?? NaN) ? longitude : null,
    addressLine1: map.addressLine1 || null,
    addressLine2: map.addressLine2 || null,
    // Some payloads use addressLine3 for a landmark-style third line;
    // fall back to an explicit `landmark` key if the backend ever sends one.
    landmark: map.addressLine3 || map.landmark || null,
    city: map.city || null,
    state: map.state || null,
    pincode: map.pincode || null,
  };
};

const openMaps = async (
  lat: number | null,
  lng: number | null,
  query: string,
): Promise<void> => {
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
  } catch (error) {
    console.error('Error opening maps:', error);
    Alert.alert('Unable to open maps', 'Please check your navigation apps');
  }
};

const formatCurrency = (amount: number): string => {
  if (!Number.isFinite(amount)) return '₹0.00';
  return `₹${amount.toFixed(2)}`;
};

const fitRegion = (coords: CoordinateData[]): Region | null => {
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
  const coordSets: CoordinateData[] = [];
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

// ─── Main Screen Component ────────────────────────────────────────────────────

const OrderDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<DeliveryPartnerOrder>(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH' | null>(
    'CASH',
  );
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // ── Reported-address modal state ──
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportAddressId, setReportAddressId] = useState('');
  const [reportAddressLine1, setReportAddressLine1] = useState('');
  const [reportAddressLine2, setReportAddressLine2] = useState('');
  const [reportLandmark, setReportLandmark] = useState('');
  const [reportCity, setReportCity] = useState('');
  const [reportState, setReportState] = useState('');
  const [reportPincode, setReportPincode] = useState('');
  // The pin the delivery partner can drag / tap on the mini-map. This is
  // what actually gets submitted as latitude/longitude — it starts at the
  // partner's live GPS position (falling back to the customer's last known
  // coordinates) and can be repositioned freely from there.
  const [reportPinCoord, setReportPinCoord] = useState<CoordinateData | null>(
    null,
  );
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [storeContactView, setStoreContactView] = useState<
    'vendor' | 'customer'
  >('vendor');
  const [pickupContactView, setPickupContactView] = useState<
    'vendor' | 'customer'
  >('vendor');

  const [qrImageAspectRatio, setQrImageAspectRatio] = useState<number>(1);

  const [partnerCoord, setPartnerCoord] = useState<CoordinateData | null>(null);

  // ── Payment QR states ──
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isPaymentDone, setIsPaymentDone] = useState(false);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  // NEW: tracks whether the <Image> actually failed to render the QR bytes
  // (separate from qrError, which tracks API/network failures).
  const [qrImageRenderFailed, setQrImageRenderFailed] = useState(false);
  const [qrImageLoading, setQrImageLoading] = useState(false);
  // Bump this to force <Image> to remount and retry a fresh fetch.
  const [qrImageRetryKey, setQrImageRetryKey] = useState(0);
  const pollingIntervalRef = useRef<any>(null);
  const componentMountedRef = useRef(true);

  const { getPricingValues } = usePricingStore();

  // ── Geolocation Effect ──
  useEffect(() => {
    Geolocation.requestAuthorization();

    const watchId = Geolocation.watchPosition(
      position => {
        if (componentMountedRef.current) {
          console.log('Position update:', position?.coords);
          setPartnerCoord({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
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

  // ── Cleanup Effect ──
  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const orderStatus = (
    order.orderStatus ??
    order.orderDetails?.state ??
    'ACCEPTED'
  ).toUpperCase();
  const config = STAGE_CONFIG[orderStatus] ?? STAGE_CONFIG['ACCEPTED'];
  console.log('Normalized Order Status : ', orderStatus);

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

  const shopCoord: CoordinateData | null =
    order.shopDetails?.coordinates &&
    Number.isFinite(order.shopDetails.coordinates.latitude ?? NaN) &&
    Number.isFinite(order.shopDetails.coordinates.longitude ?? NaN)
      ? {
          lat: order.shopDetails.coordinates.latitude!,
          lng: order.shopDetails.coordinates.longitude!,
        }
      : null;

  const customerCoord: CoordinateData | null =
    customerAddress.latitude != null &&
    customerAddress.longitude != null &&
    Number.isFinite(customerAddress.latitude) &&
    Number.isFinite(customerAddress.longitude)
      ? { lat: customerAddress.latitude, lng: customerAddress.longitude }
      : null;

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

  const isPrepaid = order?.finance?.paymentMethod === 'PREPAID' || false;

  const paymentMethod =
    order.orderDetails?.paymentMethod ?? order.paymentMethod ?? 'N/A';

  const finalPaymentMethod = isPrepaid
    ? 'PREPAID'
    : paymentMode === 'ONLINE'
    ? 'QR CODE'
    : 'CASH';

  const customerMobileDisplay = order.orderDetails?.customerMobile
    ? String(order.orderDetails.customerMobile).slice(-10)
    : null;

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

  // Pull the QR image url out of whatever shape the API returns.
  // Some backends wrap the entity in { data: {...} } or { qrCode: {...} },
  // and Razorpay's own field naming has varied across integrations
  // (image_url vs imageUrl vs short_url). We check all known shapes so a
  // wrapper change on the backend doesn't silently break the UI again.
  const extractQrImageUrl = (raw: any): string | null => {
    if (!raw) return null;
    const candidate =
      raw.image_url ??
      raw.imageUrl ??
      raw.data?.image_url ??
      raw.data?.imageUrl ??
      raw.qrCode?.image_url ??
      raw.qr?.image_url ??
      raw.short_url ??
      null;
    return typeof candidate === 'string' && candidate.trim().length > 0
      ? candidate.trim()
      : null;
  };

  // ── Generate Payment QR (PROPERLY TYPED) ──
  const generateAndDisplayQR = useCallback(async () => {
    const orderId = order.id || order.orderId;
    if (!orderId) {
      Alert.alert('Error', 'Order ID not found');
      return;
    }

    setIsQrLoading(true);
    setQrError(null);
    setQrImageRenderFailed(false);
    try {
      const qrData: any = await deliveryPartnerService.generatePaymentQr(
        order?.orderId,
      );
      console.log('QR Data:', JSON.stringify(qrData));

      if (!componentMountedRef.current) return;

      const resolvedImageUrl = extractQrImageUrl(qrData);

      if (resolvedImageUrl) {
        setQrImageUrl(resolvedImageUrl);
        setQrImageLoading(true);
        setQrModalVisible(true); // Auto-open modal after generation

        Image.getSize(
          resolvedImageUrl,
          (w, h) => {
            if (componentMountedRef.current && w > 0 && h > 0) {
              setQrImageAspectRatio(w / h);
            }
          },
          () => {
            // getSize failing isn't fatal — <Image onError> below still catches render failures
          },
        );

        startPaymentPolling(orderId);
      } else {
        const errorMsg =
          'QR code was created but no image was returned. Please retry.';
        setQrError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } catch (error: any) {
      console.error('Error generating QR:', error);
      if (componentMountedRef.current) {
        const errorMsg = error?.message || 'Failed to generate payment QR';
        setQrError(errorMsg);
        Alert.alert('Error', errorMsg);
      }
    } finally {
      if (componentMountedRef.current) {
        setIsQrLoading(false);
      }
    }
  }, [order]);

  // ── Check Payment Status (PROPERLY TYPED) ──
  // NOTE: For ONLINE payments, the backend automatically marks the order as
  // DELIVERED as soon as payment is received — the delivery partner doesn't
  // have to tap "Mark as Delivered" separately. So the moment polling detects
  // isPaymentDone === true, we flip local order state to DELIVERED and close
  // the QR modal so the UI reflects the real backend state immediately,
  // instead of sitting on step 3 waiting for a manual tap.
  const checkPaymentStatus = useCallback(
    async (orderId: string) => {
      if (!componentMountedRef.current) return;

      setPaymentCheckLoading(true);
      try {
        const statusData: any = await deliveryPartnerService.getPaymentQrStatus(
          order?.orderId,
        );
        console.log('Payment status:', statusData);

        if (!componentMountedRef.current) return;

        if (statusData?.isPaymentDone === true) {
          setIsPaymentDone(true);
          // Stop polling once payment is done
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Backend auto-marks the order as DELIVERED on successful online
          // payment — mirror that here so the stepper/footer/CTA all move
          // to the DELIVERED stage without requiring another tap.
          setOrder(prev => ({ ...prev, orderStatus: 'DELIVERED' }));

          // Close the QR modal if it's still open so the DELIVERED screen
          // is visible right away.
          setQrModalVisible(false);

          Alert.alert(
            'Success',
            'Payment received! Order marked as delivered.',
          );
        }
      } catch (error: any) {
        console.error('Error checking payment status:', error);
        // Don't alert on polling errors - just log them
      } finally {
        if (componentMountedRef.current) {
          setPaymentCheckLoading(false);
        }
      }
    },
    [order?.orderId],
  );

  // ── Start polling for payment status ──
  const startPaymentPolling = useCallback(
    (orderId: string) => {
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      // Poll every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        checkPaymentStatus(orderId);
      }, 3000);
    },
    [checkPaymentStatus],
  );

  // Retry rendering the QR image (e.g. after a transient network hiccup)
  // without hitting the API again.
  const retryQrImage = useCallback(() => {
    setQrImageRenderFailed(false);
    setQrImageLoading(true);
    setQrImageRetryKey(k => k + 1);
  }, []);

  const openQrInBrowser = useCallback(async () => {
    if (!qrImageUrl) return;
    try {
      await Linking.openURL(qrImageUrl);
    } catch (error) {
      console.error('Error opening QR link:', error);
      Alert.alert(
        'Unable to open link',
        'Please ask the customer to pay in cash instead.',
      );
    }
  }, [qrImageUrl]);

  // ── Handle Payment Mode Change ──
  const handlePaymentModeChange = (mode: 'ONLINE' | 'CASH') => {
    setPaymentMode(mode);
    setSubmitAttempted(false);
    setIsPaymentDone(false);
    setQrImageUrl(null);
    setQrError(null);
    setQrImageRenderFailed(false);

    if (mode === 'CASH') {
      setEvidenceImage(null);
      // Stop polling if switching to cash
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  };

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

  const formatOrderDateTime = (
    value: string | null,
  ): { date: string; time: string } => {
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

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return null;
      }
      if (value > 10_000_000_000) {
        return value;
      }
      if (value > 1_000_000_000) {
        return value * 1000;
      }
      return null;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return null;
    }

    if (/^\d+$/.test(trimmedValue)) {
      const numericValue = Number(trimmedValue);

      if (!Number.isFinite(numericValue)) {
        return null;
      }

      if (numericValue > 10_000_000_000) {
        return numericValue;
      }

      if (numericValue > 1_000_000_000) {
        return numericValue * 1000;
      }

      return null;
    }

    let dateValue = trimmedValue;

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
    const startMs = parseTimestamp(startTime);
    const endMs = parseTimestamp(endTime);

    if (startMs === null || endMs === null) {
      return '-';
    }

    const diffMs = endMs - startMs;

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

  useEffect(() => {
    if (!reportAddressId && order.orderId) {
      setReportAddressId(`ADDR_${order.orderId}`);
    }
  }, [order.orderId, reportAddressId]);

  // ── Reset + prefill the reported-address form each time it's opened ──
  // Starts the pin at the delivery partner's live GPS location (falling back
  // to the customer's last known coordinates), and prefills whatever address
  // fields we can parse from the existing order so the partner only has to
  // correct what's actually wrong.
  const resetReportForm = useCallback(() => {
    setReportAddressLine1('');
    setReportAddressLine2('');
    setReportLandmark('');
    setReportCity('');
    setReportState('');
    setReportPincode('');
    setReportReason('');
    setReportPinCoord(null);
    if (order.orderId) {
      setReportAddressId(`ADDR_${order.orderId}`);
    }
  }, [order.orderId]);

  const openReportModal = useCallback(() => {
    const startCoord = partnerCoord ?? customerCoord ?? null;
    setReportPinCoord(startCoord);
    setReportAddressLine1(customerAddress.addressLine1 ?? '');
    setReportAddressLine2(customerAddress.addressLine2 ?? '');
    setReportLandmark(customerAddress.landmark ?? '');
    setReportCity(
      customerAddress.city ?? order.shopDetails?.address?.city ?? '',
    );
    setReportState(
      customerAddress.state ?? order.shopDetails?.address?.state ?? '',
    );
    setReportPincode(
      customerAddress.pincode ?? order.shopDetails?.address?.postalCode ?? '',
    );
    setReportReason('');
    setReportModalVisible(true);
  }, [
    partnerCoord,
    customerCoord,
    customerAddress.addressLine1,
    customerAddress.addressLine2,
    customerAddress.landmark,
    customerAddress.city,
    customerAddress.state,
    customerAddress.pincode,
    order.shopDetails?.address?.city,
    order.shopDetails?.address?.state,
    order.shopDetails?.address?.postalCode,
  ]);

  // Snap the pin back to the partner's current GPS fix.
  const useMyCurrentLocation = useCallback(() => {
    if (partnerCoord) {
      setReportPinCoord(partnerCoord);
    } else {
      Alert.alert(
        'Location unavailable',
        'Still waiting for a GPS fix. Please try again in a moment.',
      );
    }
  }, [partnerCoord]);

  const handleSubmitReportedLocation = useCallback(async () => {
    const addressId = reportAddressId.trim();
    const addressLine1 = reportAddressLine1.trim();

    if (!addressId) {
      Alert.alert(
        'Address ID required',
        'Enter the address or location ID before saving.',
      );
      return;
    }

    if (!addressLine1) {
      Alert.alert(
        'Address required',
        'Enter at least Address Line 1 before saving.',
      );
      return;
    }

    if (!reportPinCoord) {
      Alert.alert(
        'Location required',
        'Drag the pin on the map to the correct spot, or tap "Use my location".',
      );
      return;
    }

    const customerId = order.orderDetails?.customerId ?? order.customerId;
    const partnerId = order.deliveryPartnerId || order.orderDetails?.customerId;

    try {
      setReportSubmitting(true);
      await deliveryPartnerService.createReportedAddress({
        addressId,
        customerId: String(customerId ?? ''),
        reportedByPartnerId: String(partnerId ?? ''),
        latitude: reportPinCoord.lat,
        longitude: reportPinCoord.lng,
        addressLine1,
        addressLine2: reportAddressLine2.trim() || null,
        landmark: reportLandmark.trim() || null,
        city: reportCity.trim() || null,
        state: reportState.trim() || null,
        pincode: reportPincode.trim() || null,
        reason:
          reportReason.trim() || 'Customer requested a new delivery location',
      });

      setReportModalVisible(false);
      resetReportForm();
      Alert.alert('Success', 'Reported location saved');
    } catch (error: any) {
      console.error('Error submitting reported location:', error);
      Alert.alert(
        'Unable to save report',
        error?.message || 'Please try again shortly.',
      );
    } finally {
      setReportSubmitting(false);
    }
  }, [
    order.customerId,
    order.deliveryPartnerId,
    order.orderDetails?.customerId,
    reportAddressId,
    reportAddressLine1,
    reportAddressLine2,
    reportCity,
    reportLandmark,
    reportPinCoord,
    reportPincode,
    reportReason,
    reportState,
    resetReportForm,
  ]);

  const handleAction = useCallback(async () => {
    if (config.apiAction === null) {
      navigation.goBack();
      return;
    }

    if (config.apiAction === 'completeDelivery') {
      setSubmitAttempted(true);

      if (isPrepaid) {
        if (!paymentMode) {
          Alert.alert(
            'Select Payment Mode',
            'Please select Online or Cash before marking as delivered.',
          );
          return;
        }

        // For ONLINE, check if payment is done
        if (paymentMode === 'ONLINE' && !isPaymentDone) {
          Alert.alert(
            'Payment Pending',
            'Please wait for customer payment to be completed.',
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
        if (componentMountedRef.current) {
          setOrder(prev => ({ ...prev, orderStatus: 'ARRIVED_AT_STORE' }));
        }
      } else if (config.apiAction === 'pickup') {
        await deliveryPartnerService.pickupOrder(orderId);
        if (componentMountedRef.current) {
          setOrder(prev => ({ ...prev, orderStatus: 'ORDER_PICKED_UP' }));
        }
      } else if (config.apiAction === 'arriveDestination') {
        await deliveryPartnerService.arriveAtDestination(orderId);
        if (componentMountedRef.current) {
          setOrder(prev => ({ ...prev, orderStatus: 'ARRIVED_AT_LOCATION' }));
        }
      } else if (config.apiAction === 'completeDelivery') {
        console.log('Evidence Image URI:', evidenceImage, orderId);
        await deliveryPartnerService.completeDelivery(
          orderId,
          paymentMode === 'ONLINE' ? evidenceImage : null,
        );
        if (componentMountedRef.current) {
          setOrder(prev => ({ ...prev, orderStatus: 'DELIVERED' }));
        }
      }
    } catch (err: any) {
      console.log('Error in handleAction:', err);
      if (componentMountedRef.current) {
        Alert.alert('Action failed', err?.message || 'Please try again.');
      }
    } finally {
      if (componentMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    config,
    order,
    navigation,
    paymentMode,
    isPaymentDone,
    evidenceImage,
    isPrepaid,
  ]);

  // ── Step renderers (abbreviated - using existing styles) ────────────────────

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

      {/* ── Vendor / Customer toggle ── */}
      <View style={s.contactToggleRow}>
        <TouchableOpacity
          style={[
            s.contactToggleBtn,
            storeContactView === 'vendor' && s.contactToggleBtnActive,
          ]}
          onPress={() => setStoreContactView('vendor')}
          activeOpacity={0.85}
        >
          <Store
            size={15}
            color={storeContactView === 'vendor' ? '#FF4D00' : '#94A3B8'}
          />
          <Text
            style={[
              s.contactToggleText,
              storeContactView === 'vendor' && s.contactToggleTextVendorActive,
            ]}
          >
            Vendor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.contactToggleBtn,
            storeContactView === 'customer' && s.contactToggleBtnActive,
          ]}
          onPress={() => setStoreContactView('customer')}
          activeOpacity={0.85}
        >
          <User
            size={15}
            color={storeContactView === 'customer' ? '#0B9E6E' : '#94A3B8'}
          />
          <Text
            style={[
              s.contactToggleText,
              storeContactView === 'customer' &&
                s.contactToggleTextCustomerActive,
            ]}
          >
            Customer
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Vendor detail card ── */}
      {storeContactView === 'vendor' ? (
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
                onPress={() =>
                  Linking.openURL(`tel:${order.shopDetails!.phone}`)
                }
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
      ) : (
        /* ── Customer detail card ── */
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
      )}
    </>
  );

  const renderStep1 = () => (
    <>
      {/* ── Vendor / Customer toggle ── */}
      <View style={s.contactToggleRow}>
        <TouchableOpacity
          style={[
            s.contactToggleBtn,
            pickupContactView === 'vendor' && s.contactToggleBtnActive,
          ]}
          onPress={() => setPickupContactView('vendor')}
          activeOpacity={0.85}
        >
          <Store
            size={15}
            color={pickupContactView === 'vendor' ? '#FF4D00' : '#94A3B8'}
          />
          <Text
            style={[
              s.contactToggleText,
              pickupContactView === 'vendor' && s.contactToggleTextVendorActive,
            ]}
          >
            Vendor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.contactToggleBtn,
            pickupContactView === 'customer' && s.contactToggleBtnActive,
          ]}
          onPress={() => setPickupContactView('customer')}
          activeOpacity={0.85}
        >
          <User
            size={15}
            color={pickupContactView === 'customer' ? '#0B9E6E' : '#94A3B8'}
          />
          <Text
            style={[
              s.contactToggleText,
              pickupContactView === 'customer' &&
                s.contactToggleTextCustomerActive,
            ]}
          >
            Customer
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Vendor preview ── */}
      {pickupContactView === 'vendor' ? (
        <View style={s.vendorChip}>
          <View style={s.vendorChipLeft}>
            <Text style={s.vendorChipName} numberOfLines={1}>
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
      ) : (
        /* ── Customer preview ── */
        <View style={s.vendorChip}>
          <View style={s.vendorChipLeft}>
            <Text style={s.vendorChipName} numberOfLines={1}>
              {order.orderDetails?.customerName || 'Customer'}
            </Text>
            <Text style={s.vendorChipAddr} numberOfLines={1}>
              {customerAddress.text}
            </Text>
            {!!customerMobileDisplay && (
              <View style={s.vendorChipMobileRow}>
                <Phone size={11} color="#64748B" />
                <Text style={s.vendorChipMobile}>{customerMobileDisplay}</Text>
              </View>
            )}
          </View>
          {customerMobileDisplay && (
            <TouchableOpacity
              style={[s.vendorChipCall, { backgroundColor: '#ECFDF5' }]}
              onPress={() => Linking.openURL(`tel:${customerMobileDisplay}`)}
            >
              <Phone size={14} color="#16A34A" />
            </TouchableOpacity>
          )}
        </View>
      )}

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
    const showEvidenceError =
      submitAttempted && paymentMode === 'ONLINE' && !isPaymentDone;

    return (
      <>
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

            {/* ── ONLINE PAYMENT SECTION ── */}
            {paymentMode === 'ONLINE' && (
              <View style={s.evidenceSection}>
                {qrError && (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>{qrError}</Text>
                  </View>
                )}

                {!qrImageUrl ? (
                  <TouchableOpacity
                    style={s.showQrBtn}
                    onPress={generateAndDisplayQR}
                    disabled={isQrLoading}
                    activeOpacity={0.85}
                  >
                    {isQrLoading ? (
                      <ActivityIndicator size="small" color="#166534" />
                    ) : (
                      <>
                        <Text style={s.showQrBtnEmoji}>📲</Text>
                        <Text style={s.showQrBtnText}>Generate & Show QR</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={s.showQrBtn}
                    onPress={() => setQrModalVisible(true)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.showQrBtnEmoji}>📲</Text>
                    <Text style={s.showQrBtnText}>Show QR Code</Text>
                  </TouchableOpacity>
                )}

                {/* Payment Status Indicator */}
                {qrImageUrl && (
                  <View
                    style={[
                      s.paymentStatusBox,
                      isPaymentDone
                        ? s.paymentStatusDone
                        : s.paymentStatusPending,
                    ]}
                  >
                    {isPaymentDone ? (
                      <>
                        <Text style={s.paymentStatusEmoji}>✅</Text>
                        <View style={s.paymentStatusText}>
                          <Text style={s.paymentStatusLabel}>
                            Payment Received
                          </Text>
                          <Text style={s.paymentStatusSub}>
                            Order marked as delivered
                          </Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <ActivityIndicator
                          size="small"
                          color="#F59E0B"
                          style={{ marginRight: 10 }}
                        />
                        <View style={s.paymentStatusText}>
                          <Text style={s.paymentStatusLabel}>
                            Waiting for Payment
                          </Text>
                          <Text style={s.paymentStatusSub}>
                            Ask customer to scan QR
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ── CASH PAYMENT SECTION ── */}
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
      </>
    );
  };

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

      {/* ── COMPACT DELIVERY TIMELINE ── */}
      <View style={{ width: '100%' }}>
        <Text style={s.sectionTitleInline}>Delivery Timeline</Text>

        {/* Compact timeline container */}
        <View style={s.compactTimelineContainer}>
          {/* Order Placed - Always shown */}
          <View style={s.compactTimelineStage}>
            <View style={[s.compactDot, { backgroundColor: '#0E6DFD' }]} />
            <View style={s.compactStageInfo}>
              <Text style={s.compactStageLabel}>Order Placed</Text>
              <Text style={s.compactStageTime}>
                {orderDateTime.time !== 'N/A' ? orderDateTime.time : 'N/A'}
              </Text>
            </View>
          </View>
          {/* Interval & Assigned At */}
          {assignedAtDateTime.date !== 'N/A' && (
            <View style={s.compactTimelineStage}>
              <View style={[s.compactDot, { backgroundColor: '#0E6DFD' }]} />

              <View style={s.compactStageInfo}>
                <Text style={[s.compactStageLabel, { color: '#0E6DFD' }]}>
                  Assigned At
                </Text>

                <Text style={[s.compactStageTime, { color: '#0E6DFD' }]}>
                  {assignedAtDateTime.time || assignedAtDateTime.date}
                </Text>
              </View>

              <View style={s.compactIntervalBadge}>
                <Text style={s.compactIntervalBadgeText}>
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
            <View style={s.compactTimelineStage}>
              <View style={[s.compactDot, { backgroundColor: '#0E6DFD' }]} />

              <View style={s.compactStageInfo}>
                <Text style={[s.compactStageLabel, { color: '#0E6DFD' }]}>
                  Arrived at Store
                </Text>

                <Text style={[s.compactStageTime, { color: '#0E6DFD' }]}>
                  {arrivedAtStoreDateTime.time || arrivedAtStoreDateTime.date}
                </Text>
              </View>

              <View style={s.compactIntervalBadge}>
                <Text style={s.compactIntervalBadgeText}>
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
            <View style={s.compactTimelineStage}>
              <View style={[s.compactDot, { backgroundColor: '#0E6DFD' }]} />

              <View style={s.compactStageInfo}>
                <Text style={[s.compactStageLabel, { color: '#0E6DFD' }]}>
                  Picked Up
                </Text>

                <Text style={[s.compactStageTime, { color: '#0E6DFD' }]}>
                  {pickedUpDateTime.time || pickedUpDateTime.date}
                </Text>
              </View>

              <View style={s.compactIntervalBadge}>
                <Text style={s.compactIntervalBadgeText}>
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
            <View style={s.compactTimelineStage}>
              <View style={[s.compactDot, { backgroundColor: '#0E6DFD' }]} />

              <View style={s.compactStageInfo}>
                <Text style={[s.compactStageLabel, { color: '#0E6DFD' }]}>
                  Reached Destination
                </Text>

                <Text style={[s.compactStageTime, { color: '#0E6DFD' }]}>
                  {reachedLocationDateTime.time || reachedLocationDateTime.date}
                </Text>
              </View>

              <View style={s.compactIntervalBadge}>
                <Text style={s.compactIntervalBadgeText}>
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
            <View style={s.compactTimelineStage}>
              <View style={[s.compactDot, { backgroundColor: '#16A34A' }]} />

              <View style={s.compactStageInfo}>
                <Text style={[s.compactStageLabel, { color: '#16A34A' }]}>
                  Delivered
                </Text>

                <Text style={[s.compactStageTime, { color: '#16A34A' }]}>
                  {deliveredAtDateTime.time || deliveredAtDateTime.date}
                </Text>
              </View>

              <View style={s.compactIntervalBadge}>
                <Text style={s.compactIntervalBadgeText}>
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
        {orderDateTime.date !== 'N/A' && deliveredAtDateTime.date !== 'N/A' && (
          <View style={s.compactTotalTimeRow}>
            <Text style={s.compactTotalTimeLabel}>Total Delivery Time</Text>
            <Text style={s.compactTotalTimeValue}>
              {calculateTimeDifference(
                order?.orderDetails?.creationTime ?? order?.createdAt,
                order?.deliveredAt,
              )}
            </Text>
          </View>
        )}
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

  const isCompleteDeliveryDisabled =
    config.apiAction === 'completeDelivery' &&
    paymentMode === 'ONLINE' &&
    !isPaymentDone;

  // Region for the mini-map inside the "Report Another Location" modal.
  // Recomputed on every render from reportPinCoord so dragging/tapping the
  // marker keeps the region (and therefore the visible pin) in sync.
  const reportMapRegion: Region | null = reportPinCoord
    ? {
        latitude: reportPinCoord.lat,
        longitude: reportPinCoord.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : null;

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

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.banner}>
          <Text style={s.bannerText}>{STEP_BANNERS[config.stageIndex]}</Text>
        </View>

        {renderContent()}
        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={s.footer}>
        {orderStatus === 'ORDER_PICKED_UP' && (
          <TouchableOpacity
            style={[s.secondaryAction, { marginBottom: 12 }]}
            onPress={openReportModal}
            disabled={reportSubmitting}
            activeOpacity={0.85}
          >
            <Text style={s.secondaryActionText}>Report Another Location</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            s.cta,
            { backgroundColor: config.buttonColor },
            (isLoading || isCompleteDeliveryDisabled) && s.ctaDisabled,
          ]}
          onPress={handleAction}
          disabled={isLoading || isCompleteDeliveryDisabled}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.ctaText}>{config.buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Report Another Location Modal ── */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={s.reportModalOverlay}>
          <View style={s.reportModalCard}>
            <View style={s.reportModalHeader}>
              <Text style={s.reportModalTitle}>Report Another Location</Text>
              <TouchableOpacity
                style={s.reportModalClose}
                onPress={() => setReportModalVisible(false)}
                activeOpacity={0.85}
              >
                <X size={16} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              <Text style={s.reportFieldLabel}>Pin the exact location</Text>
              <View style={s.reportMapWrap}>
                {reportMapRegion ? (
                  <MapView
                    style={StyleSheet.absoluteFillObject}
                    region={reportMapRegion}
                    onPress={e => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setReportPinCoord({ lat: latitude, lng: longitude });
                    }}
                  >
                    {/* Draggable pin — this is the coordinate that gets submitted */}
                    <Marker
                      coordinate={{
                        latitude: reportPinCoord!.lat,
                        longitude: reportPinCoord!.lng,
                      }}
                      draggable
                      onDragEnd={e => {
                        const { latitude, longitude } =
                          e.nativeEvent.coordinate;
                        setReportPinCoord({ lat: latitude, lng: longitude });
                      }}
                      anchor={{ x: 0.5, y: 1 }}
                    >
                      <CustomerMarker name="Drag to adjust" />
                    </Marker>

                    {/* Partner's live GPS fix, shown for reference only */}
                    {partnerCoord && (
                      <Marker
                        coordinate={{
                          latitude: partnerCoord.lat,
                          longitude: partnerCoord.lng,
                        }}
                        anchor={{ x: 0.5, y: 0.5 }}
                      >
                        <DeliveryPartnerMarker />
                      </Marker>
                    )}
                  </MapView>
                ) : (
                  <View style={[s.mapFallback, StyleSheet.absoluteFillObject]}>
                    <MapPin size={24} color="#0E6DFD" />
                    <Text style={s.mapPlaceholderLabel}>
                      Waiting for location…
                    </Text>
                  </View>
                )}
              </View>

              <View style={s.reportMapHintRow}>
                <Text style={s.reportMapHintText}>
                  Tap anywhere on the map, or drag the pin to the correct spot
                </Text>
                <TouchableOpacity
                  style={s.reportUseGpsBtn}
                  onPress={useMyCurrentLocation}
                  activeOpacity={0.85}
                >
                  <Navigation size={13} color="#0E6DFD" />
                  <Text style={s.reportUseGpsBtnText}>Use my location</Text>
                </TouchableOpacity>
              </View>

              {/* <Text style={s.reportFieldLabel}>Address ID</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportAddressId}
                  onChangeText={setReportAddressId}
                  placeholder="ADDR_12345"
                  style={s.reportInputText}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View> */}

              <Text style={s.reportFieldLabel}>Address Line 1 *</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportAddressLine1}
                  onChangeText={setReportAddressLine1}
                  placeholder="House / Flat no., Building name"
                  style={s.reportInputText}
                />
              </View>

              <Text style={s.reportFieldLabel}>Address Line 2</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportAddressLine2}
                  onChangeText={setReportAddressLine2}
                  placeholder="Street, Area"
                  style={s.reportInputText}
                />
              </View>

              <Text style={s.reportFieldLabel}>Landmark</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportLandmark}
                  onChangeText={setReportLandmark}
                  placeholder="Near metro pillar 120, opposite XYZ store"
                  style={s.reportInputText}
                />
              </View>

              <View style={s.reportInputRow}>
                <View style={s.reportInputHalf}>
                  <Text style={s.reportFieldLabel}>City</Text>
                  <View style={s.reportInputWrap}>
                    <TextInput
                      value={reportCity}
                      onChangeText={setReportCity}
                      placeholder="City"
                      style={s.reportInputText}
                    />
                  </View>
                </View>
                <View style={s.reportInputHalf}>
                  <Text style={s.reportFieldLabel}>State</Text>
                  <View style={s.reportInputWrap}>
                    <TextInput
                      value={reportState}
                      onChangeText={setReportState}
                      placeholder="State"
                      style={s.reportInputText}
                    />
                  </View>
                </View>
              </View>

              <Text style={s.reportFieldLabel}>Pincode</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportPincode}
                  onChangeText={setReportPincode}
                  placeholder="452001"
                  style={s.reportInputText}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>

              <Text style={s.reportFieldLabel}>Reason</Text>
              <View style={s.reportInputWrapTextarea}>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder="Customer asked to come to another location"
                  multiline
                  style={s.reportInputArea}
                />
              </View>

              <View style={s.reportMetaRow}>
                <Text style={s.reportMetaLabel}>Pin coordinates</Text>
                <Text style={s.reportMetaValue}>
                  {reportPinCoord
                    ? `${reportPinCoord.lat.toFixed(
                        5,
                      )}, ${reportPinCoord.lng.toFixed(5)}`
                    : 'Waiting for location'}
                </Text>
              </View>

              <TouchableOpacity
                style={[s.reportSubmitBtn, reportSubmitting && s.ctaDisabled]}
                onPress={handleSubmitReportedLocation}
                disabled={reportSubmitting}
                activeOpacity={0.85}
              >
                {reportSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={s.reportSubmitText}>Save Reported Location</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── QR Code Modal (image-only, no card chrome) ── */}
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
          {!qrImageUrl ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : qrImageRenderFailed ? (
            // Keep a readable card here since this is an error state, not the QR itself
            <TouchableOpacity activeOpacity={1} style={s.qrFallbackCard}>
              <AlertTriangle size={30} color="#F59E0B" />
              <Text style={s.qrFallbackTitle}>QR preview unavailable</Text>
              <Text style={s.qrFallbackSub}>
                We couldn't render the QR image here, but the payment link still
                works.
              </Text>
              <TouchableOpacity
                style={s.qrFallbackBtn}
                onPress={openQrInBrowser}
                activeOpacity={0.85}
              >
                <ExternalLink size={15} color="#FFFFFF" />
                <Text style={s.qrFallbackBtnText}>Open Payment Page</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.qrRetryBtn}
                onPress={retryQrImage}
                activeOpacity={0.85}
              >
                <RefreshCw size={13} color="#0E6DFD" />
                <Text style={s.qrRetryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.qrFallbackCloseBtn}
                onPress={() => setQrModalVisible(false)}
                activeOpacity={0.85}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={1}
              style={[
                s.qrImageOnlyWrap,
                {
                  width: MODAL_IMAGE_WIDTH,
                  height: Math.min(
                    MODAL_IMAGE_WIDTH / qrImageAspectRatio,
                    MODAL_IMAGE_MAX_HEIGHT,
                  ),
                },
              ]}
            >
              <Image
                key={qrImageRetryKey}
                source={{ uri: qrImageUrl }}
                style={s.qrImageOnly}
                resizeMode="contain"
                onLoadStart={() => setQrImageLoading(true)}
                onError={err => {
                  console.error(
                    'QR Image load error:',
                    err?.nativeEvent?.error,
                  );
                  setQrImageLoading(false);
                  setQrImageRenderFailed(true);
                }}
                onLoad={() => {
                  setQrImageLoading(false);
                  setQrImageRenderFailed(false);
                }}
              />

              {qrImageLoading && (
                <View style={s.qrImageLoadingOverlay}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}

              <TouchableOpacity
                style={s.qrCloseFab}
                onPress={() => setQrModalVisible(false)}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color="#0F172A" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
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

// ─── Screen Styles (Selected Key Styles) ──────────────────────────────────────

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
  // ── Vendor / Customer toggle (Reach Store & Pickup stages) ──
  contactToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 14,
  },
  contactToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  contactToggleBtnActive: {
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  contactToggleText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },
  contactToggleTextVendorActive: { color: '#FF4D00' },
  contactToggleTextCustomerActive: { color: '#0B9E6E' },

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
  vendorChipMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  vendorChipMobile: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
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
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#EF4444',
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
  paymentStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    gap: 10,
  },
  paymentStatusPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  paymentStatusDone: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paymentStatusEmoji: { fontSize: 20 },
  paymentStatusText: { flex: 1 },
  paymentStatusLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1E293B',
  },
  paymentStatusSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
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
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrImageOnlyWrap: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  qrImageOnly: {
    width: '100%',
    height: '100%',
  },
  qrImageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  qrCloseFab: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  qrFallbackCard: {
    width: MODAL_IMAGE_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  qrFallbackCloseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
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
    width: 300,
    height: 300,
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
  qrImagePlaceholder: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },
  qrFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  qrFallbackTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginTop: 4,
  },
  qrFallbackSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 4,
  },
  qrFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E6DFD',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  qrFallbackBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
  qrRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qrRetryBtnText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  qrOpenLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  qrOpenLinkText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  footer: { position: 'absolute', left: 14, right: 14, bottom: 24 },
  secondaryAction: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
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
  reportModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  reportModalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reportModalTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  reportModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Mini map inside the report modal ──
  reportMapWrap: {
    height: REPORT_MAP_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E8EFFF',
    marginBottom: 10,
  },
  reportMapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  reportMapHintText: {
    flex: 1,
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  reportUseGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reportUseGpsBtnText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  reportInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  reportInputHalf: {
    flex: 1,
  },
  reportFieldLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#475569',
    marginBottom: 8,
  },
  reportInputWrap: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  reportInputText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
  },
  reportInputWrapTextarea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 82,
  },
  reportInputArea: {
    minHeight: 62,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  reportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  reportMetaLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D4ED8',
  },
  reportMetaValue: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1E293B',
    flexShrink: 1,
    textAlign: 'right',
  },
  reportSubmitBtn: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#0E6DFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
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
  qrModalHint: {
    marginTop: 16,
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sectionTitleInline: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#1E293B',
  },
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
});
