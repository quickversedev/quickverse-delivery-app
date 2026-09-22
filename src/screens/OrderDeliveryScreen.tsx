import Geolocation from '@react-native-community/geolocation';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Store,
  User,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MapView, { Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  DeliveryPartnerOrder,
  ReportedAddress,
} from '../services/delivery-partner.service';
import deliveryPartnerService from '../services/delivery-partner.service';
import usePricingStore from '../store/pricingStore';
import { FONT_FAMILY } from '../theme/typography';
import type { ServiceType } from '../types/pricing';
import {
  getBestEffortCurrentLocation,
  reverseGeocode,
} from '../utils/location';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.38;
const REPORT_MAP_HEIGHT = 210;
const MODAL_IMAGE_WIDTH = SCREEN_WIDTH * 0.9;
const MODAL_IMAGE_MAX_HEIGHT = SCREEN_HEIGHT * 0.75;

// ─── TIME CALCULATION CONSTANTS ───
const SPEED_KMH = 20; // 20 km per hour
const SPEED_BUFFER_SECONDS = 30; // Additional 30 seconds buffer
const PREPARATION_TIME_MINUTES = 20; // Static 20 minutes

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
    | 'acceptOrder'
    | 'arriveStore'
    | 'pickup'
    | 'arriveDestination'
    | 'completeDelivery'
    | null;
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

// ─── TIME CALCULATION UTILITIES ───
const calculateEstimatedTimeMinutes = (
  distanceKm: number | null,
): number | null => {
  if (distanceKm === null || distanceKm < 0) return null;
  // Formula: (distance / speed) * 60 + buffer = minutes
  const timeInSeconds = (distanceKm / SPEED_KMH) * 3600 + SPEED_BUFFER_SECONDS;
  return Math.ceil(timeInSeconds / 60); // Convert to minutes and round up
};

const formatTimeLabel = (minutes: number | null): string => {
  if (minutes === null) return 'Calculating...';
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '1 min';
  return `${minutes} min${minutes !== 1 ? 's' : ''}`;
};

const formatEstimateCountdown = (
  estimatedMinutes: number | null,
  elapsedMs: number,
): string => {
  if (estimatedMinutes === null) return 'Calculating...';
  const remainingSeconds = Math.max(
    0,
    Math.ceil(estimatedMinutes * 60 - elapsedMs / 1000),
  );
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
        2,
        '0',
      )}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const STAGE_CONFIG: Record<string, StageConfig> = {
  ACCEPTED: {
    stageIndex: 0,
    buttonLabel: 'Mark Arrived at Store',
    buttonColor: '#0E6DFD',
    apiAction: 'arriveStore',
  },
  PARTNER_ASSIGNED: {
    stageIndex: 0,
    buttonLabel: 'Accept Order',
    buttonColor: '#0E6DFD',
    apiAction: 'acceptOrder',
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
  { label: 'Search Destination', emoji: '🗺️' },
  { label: 'Deliver', emoji: '✅' },
];

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
  const trimmedAddress = rawAddress.trim();
  if (trimmedAddress.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmedAddress) as Record<string, unknown>;
      const latitude = Number(parsed.latitude);
      const longitude = Number(parsed.longitude);
      const formattedAddress = [
        parsed.addressLine1,
        parsed.addressLine2,
        parsed.addressLine3,
        parsed.landmark,
        parsed.city,
        parsed.state,
        parsed.pincode,
      ]
        .filter(Boolean)
        .join(', ');
      return {
        text: formattedAddress || trimmedAddress,
        latitude: Number.isFinite(latitude) ? latitude : null,
        longitude: Number.isFinite(longitude) ? longitude : null,
        addressLine1: String(parsed.addressLine1 ?? '') || null,
        addressLine2: String(parsed.addressLine2 ?? '') || null,
        landmark: String(parsed.landmark ?? parsed.addressLine3 ?? '') || null,
        city: String(parsed.city ?? '') || null,
        state: String(parsed.state ?? '') || null,
        pincode: String(parsed.pincode ?? '') || null,
      };
    } catch {
      // Continue with the legacy key=value parser below.
    }
  }
  const cleaned = trimmedAddress.replace(/^\{/, '').replace(/\}$/, '');
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

const toFiniteNumber = (value: unknown): number | null => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const parseTimestampValue = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 0) {
    return numericValue > 10_000_000_000
      ? numericValue
      : numericValue > 1_000_000_000
      ? numericValue * 1000
      : null;
  }
  const normalized = String(value).replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
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

const TimeEstimateChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  time: string;
  subLabel?: string;
}> = ({ icon, label, time, subLabel }) => (
  <View style={s.timeEstimateChip}>
    <View style={s.timeEstimateIcon}>{icon}</View>
    <View style={s.timeEstimateContent}>
      <Text style={s.timeEstimateLabel}>{label}</Text>
      <Text style={s.timeEstimateValue}>{time}</Text>
      {subLabel && <Text style={s.timeEstimateSub}>{subLabel}</Text>}
    </View>
  </View>
);

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

const OrderDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<DeliveryPartnerOrder>(initialOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [customerRating, setCustomerRating] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'ONLINE' | 'CASH' | null>(
    'CASH',
  );
  const [evidenceImage, setEvidenceImage] = useState<string | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  // ── Report Address Modal States ──
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportAddressLine1, setReportAddressLine1] = useState('');
  const [reportAddressLine2, setReportAddressLine2] = useState('');
  const [reportLandmark, setReportLandmark] = useState('');
  const [reportCity, setReportCity] = useState('');
  const [reportState, setReportState] = useState('');
  const [reportPincode, setReportPincode] = useState('');
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

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [isPaymentDone, setIsPaymentDone] = useState(false);
  const [paymentCheckLoading, setPaymentCheckLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrImageRenderFailed, setQrImageRenderFailed] = useState(false);
  const [qrImageLoading, setQrImageLoading] = useState(false);
  const [qrImageRetryKey, setQrImageRetryKey] = useState(0);
  const pollingIntervalRef = useRef<any>(null);
  const componentMountedRef = useRef(true);
  const reachStoreTimerStartedAtRef = useRef(Date.now());

  const { getPricingValues } = usePricingStore();

  useEffect(() => {
    Geolocation.requestAuthorization();

    const refreshPartnerLocation = () => {
      getBestEffortCurrentLocation()
        .then(location => {
          if (componentMountedRef.current) {
            setPartnerCoord({
              lat: location.latitude,
              lng: location.longitude,
            });
          }
        })
        .catch(error => console.warn('Current location unavailable:', error));
    };

    refreshPartnerLocation();
    const locationRetryId = setInterval(refreshPartnerLocation, 10000);

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
      clearInterval(locationRetryId);
    };
  }, []);

  useEffect(() => {
    const timerId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    return () => {
      componentMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const rawState = order?.orderDetails?.state;
  const isPending = rawState?.toUpperCase() === 'PENDING';

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

  const shopLatitude =
    order.shopDetails?.coordinates?.latitude ??
    order.shopDetails?.latitude ??
    order.shopDetails?.address?.latitude;
  const shopLongitude =
    order.shopDetails?.coordinates?.longitude ??
    order.shopDetails?.longitude ??
    order.shopDetails?.address?.longitude;
  const normalizedShopLatitude = toFiniteNumber(shopLatitude);
  const normalizedShopLongitude = toFiniteNumber(shopLongitude);
  const shopCoord: CoordinateData | null =
    normalizedShopLatitude != null && normalizedShopLongitude != null
      ? { lat: normalizedShopLatitude, lng: normalizedShopLongitude }
      : null;

  const normalizedCustomerLatitude = toFiniteNumber(customerAddress.latitude);
  const normalizedCustomerLongitude = toFiniteNumber(customerAddress.longitude);
  const parsedCustomerCoord: CoordinateData | null =
    normalizedCustomerLatitude != null && normalizedCustomerLongitude != null
      ? { lat: normalizedCustomerLatitude, lng: normalizedCustomerLongitude }
      : null;
  const reportedCustomerCoord =
    order.reportedAddresses?.find(
      address =>
        address.latitude != null &&
        address.longitude != null &&
        toFiniteNumber(address.latitude) != null &&
        toFiniteNumber(address.longitude) != null,
    ) ?? null;
  const customerCoord: CoordinateData | null =
    parsedCustomerCoord ??
    (reportedCustomerCoord
      ? {
          lat: Number(reportedCustomerCoord.latitude),
          lng: Number(reportedCustomerCoord.longitude),
        }
      : null);

  const distanceInKm = (
    from: CoordinateData | null,
    to: CoordinateData | null,
  ): number | null => {
    if (!from || !to) return null;
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const latitudeDelta = toRadians(to.lat - from.lat);
    const longitudeDelta = toRadians(to.lng - from.lng);
    const a =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(toRadians(from.lat)) *
        Math.cos(toRadians(to.lat)) *
        Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const pickupDistance = distanceInKm(partnerCoord, shopCoord);
  const dropDistance = distanceInKm(shopCoord, customerCoord);
  const totalDistance =
    pickupDistance != null && dropDistance != null
      ? pickupDistance + dropDistance
      : dropDistance ?? pickupDistance;

  // ─── TIME ESTIMATIONS ───
  const pickupEstimatedMinutes = calculateEstimatedTimeMinutes(pickupDistance);
  const dropEstimatedMinutes = calculateEstimatedTimeMinutes(dropDistance);
  const totalEstimatedMinutes =
    pickupEstimatedMinutes != null && dropEstimatedMinutes != null
      ? PREPARATION_TIME_MINUTES + pickupEstimatedMinutes + dropEstimatedMinutes
      : null;
  const reachStoreTotalEstimatedMinutes =
    pickupEstimatedMinutes != null
      ? PREPARATION_TIME_MINUTES + pickupEstimatedMinutes
      : null;
  const reachStoreElapsedMs = Math.max(
    0,
    now - reachStoreTimerStartedAtRef.current,
  );
  const reachStoreTotalCountdownLabel = formatEstimateCountdown(
    reachStoreTotalEstimatedMinutes,
    reachStoreElapsedMs,
  );

  const displayDistance = (distance: number | null) =>
    distance == null ? 'N/A' : `${distance.toFixed(1)} km`;
  const pickupDistanceLabel =
    pickupDistance == null && partnerCoord == null
      ? 'Locating...'
      : displayDistance(pickupDistance);
  const totalDistanceLabel =
    totalDistance == null && partnerCoord == null
      ? 'Locating...'
      : displayDistance(totalDistance);

  const totalBillAmount =
    order.finance?.payableAmount ??
    order.orderDetails?.totalAmount ??
    order.orderDetails?.invoiceAmount ??
    null;
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
  const isHotOrder = Boolean(
    (order as DeliveryPartnerOrder & { isHotOrder?: boolean }).isHotOrder,
  );
  const rawOrderCreatedAt =
    order.assignedAt ?? order.orderDetails?.creationTime ?? order.createdAt;
  const numericOrderCreatedAt = Number(rawOrderCreatedAt);
  const parsedOrderCreatedAt =
    rawOrderCreatedAt &&
    Number.isFinite(numericOrderCreatedAt) &&
    numericOrderCreatedAt > 0
      ? new Date(numericOrderCreatedAt)
      : rawOrderCreatedAt
      ? new Date(rawOrderCreatedAt.replace(' ', 'T'))
      : null;
  const orderCreatedAt =
    parsedOrderCreatedAt && !Number.isNaN(parsedOrderCreatedAt.getTime())
      ? parsedOrderCreatedAt.getTime()
      : null;
  const assignmentAge = orderCreatedAt
    ? Math.max(0, Math.floor((Date.now() - orderCreatedAt) / 60000))
    : null;
  const assignmentAgeLabel =
    assignmentAge == null
      ? 'N/A'
      : assignmentAge < 1
      ? 'Just now'
      : `${assignmentAge} min${assignmentAge === 1 ? '' : 's'}`;
  const assignmentElapsedMs = orderCreatedAt ? now - orderCreatedAt : null;
  const expiryRemainingSeconds =
    assignmentElapsedMs != null
      ? Math.max(0, Math.ceil((150000 - assignmentElapsedMs) / 1000))
      : null;
  const orderSummaryTimeLabel =
    orderStatus === 'PARTNER_ASSIGNED' && expiryRemainingSeconds != null
      ? expiryRemainingSeconds > 0
        ? `Expires in ${expiryRemainingSeconds}s`
        : 'Assignment window expired'
      : assignmentAgeLabel;

  const stageStartedAt =
    orderStatus === 'PARTNER_ASSIGNED'
      ? orderCreatedAt
      : orderStatus === 'ACCEPTED'
      ? parseTimestampValue(order.assignedAt)
      : orderStatus === 'ARRIVED_AT_STORE'
      ? parseTimestampValue(order.arrivedAtStoreAt)
      : orderStatus === 'ORDER_PICKED_UP'
      ? parseTimestampValue(order.pickedUpAt)
      : parseTimestampValue(order.reachedLocationAt);
  const pickupDeadlineSeconds = stageStartedAt
    ? Math.max(0, Math.ceil((30 * 60000 - (now - stageStartedAt)) / 1000))
    : null;
  const deliveryDeadlineSeconds = stageStartedAt
    ? Math.max(0, Math.ceil((45 * 60000 - (now - stageStartedAt)) / 1000))
    : null;
  const formatCountdown = (seconds: number | null): string => {
    if (seconds == null) return '--:--';
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(
      2,
      '0',
    )}`;
  };
  const estimatedEarnings =
    toFiniteNumber(order.finance?.actualDeliveryFee) ??
    toFiniteNumber(order.finance?.deliveryFee) ??
    toFiniteNumber(order.finance?.payableAmount) ??
    0;

  const serviceType: ServiceType = order.shopDetails?.category
    ?.toLowerCase()
    .includes('grocery')
    ? 'GROCERY'
    : 'FOOD';
  const pricing = getPricingValues(serviceType);
  const subtotal = order.orderDetails?.amountExcludingDeliveryFee ?? 0;
  const taxableAmount = pricing.deliveryFee + pricing.platformFee;
  const taxes = Math.round(pricing.gstRate * taxableAmount);
  const computedTotal =
    subtotal +
    pricing.deliveryFee +
    pricing.platformFee +
    pricing.packagingCharges +
    taxes;

  const isPrepaid = order?.finance?.paymentMethod === 'PREPAID' || false;

  const finalPaymentMethod = isPrepaid
    ? 'PREPAID'
    : paymentMode === 'ONLINE'
    ? 'QR CODE'
    : 'CASH';

  const customerMobileDisplay = order.orderDetails?.customerMobile
    ? String(order.orderDetails.customerMobile).slice(-10)
    : null;

  const getCustomerAddressId = (): string | null => {
    return order?.customerAddressId ?? null;
  };

  const reportedAddresses: ReportedAddress[] = order?.reportedAddresses ?? [];

  const openOrderWebView = () => {
    const url = order.orderDetails?.orderLink;
    if (!url) return;
    navigation.navigate('OrderWebView', {
      url,
      title: `Order #${order.orderId || order.id}`,
    });
  };

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
        setQrModalVisible(true);

        Image.getSize(
          resolvedImageUrl,
          (w, h) => {
            if (componentMountedRef.current && w > 0 && h > 0) {
              setQrImageAspectRatio(w / h);
            }
          },
          () => {},
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
  const checkPaymentStatus = useCallback(async () => {
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
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setOrder(prev => ({ ...prev, orderStatus: 'DELIVERED' }));
        setQrModalVisible(false);

        Alert.alert('Success', 'Payment received! Order marked as delivered.');
      }
    } catch (error: any) {
      console.error('Error checking payment status:', error);
    } finally {
      if (componentMountedRef.current) {
        setPaymentCheckLoading(false);
      }
    }
  }, [order?.orderId]);

  // ── Start polling for payment status ──
  const startPaymentPolling = useCallback(
    (orderId: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }

      pollingIntervalRef.current = setInterval(() => {
        checkPaymentStatus();
      }, 3000);
    },
    [checkPaymentStatus],
  );

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

  // ── Reset the reported-address form (EMPTY) ──
  const resetReportForm = useCallback(() => {
    setReportAddressLine1('');
    setReportAddressLine2('');
    setReportLandmark('');
    setReportCity('');
    setReportState('');
    setReportPincode('');
    setReportReason('');
    setReportPinCoord(null);
  }, []);

  const handleReportPinChange = async (lat: number, lng: number) => {
    setReportPinCoord({ lat, lng });
    const address = await reverseGeocode(lat, lng);
    if (address) {
      setReportAddressLine1(address.addressLine1);
      setReportCity(address.city);
      setReportState(address.state);
      setReportPincode(address.pincode);
      if (address.landmark) {
        setReportLandmark(address.landmark);
      }
    }
  };

  const openReportModal = useCallback(() => {
    const addressId = getCustomerAddressId();
    if (!addressId) {
      Alert.alert(
        'Address Not Found',
        'Unable to report location: Customer address ID is missing from this order.',
      );
      return;
    }

    const startCoord = partnerCoord ?? customerCoord ?? null;
    resetReportForm();
    if (startCoord) {
      handleReportPinChange(startCoord.lat, startCoord.lng);
    } else {
      setReportPinCoord(null);
    }
    setReportModalVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerCoord, customerCoord, resetReportForm]);

  const useMyCurrentLocation = useCallback(async () => {
    try {
      if (partnerCoord) {
        handleReportPinChange(partnerCoord.lat, partnerCoord.lng);
      } else {
        const coord = await getBestEffortCurrentLocation();
        handleReportPinChange(coord.latitude, coord.longitude);
      }
    } catch (error) {
      Alert.alert(
        'Location unavailable',
        'Could not fetch your current location. Please try again in a moment.',
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerCoord]);

  // ── Validation helpers ──
  const validateReportForm = (): boolean => {
    const addressLine1 = reportAddressLine1.trim();

    if (!addressLine1) {
      Alert.alert(
        'Address Required',
        'Enter at least Address Line 1 before saving.',
      );
      return false;
    }

    if (addressLine1.length < 3) {
      Alert.alert(
        'Invalid Address',
        'Address Line 1 must be at least 3 characters long.',
      );
      return false;
    }

    if (!reportPinCoord) {
      Alert.alert(
        'Location Required',
        'Drag the pin on the map to the correct spot, or tap "Use my location".',
      );
      return false;
    }

    const city = reportCity.trim();
    if (!city) {
      Alert.alert('City Required', 'Please enter the city name.');
      return false;
    }

    if (city.length < 2) {
      Alert.alert('Invalid City', 'City name must be at least 2 characters.');
      return false;
    }

    const state = reportState.trim();
    if (!state) {
      Alert.alert('State Required', 'Please enter the state name.');
      return false;
    }

    if (state.length < 2) {
      Alert.alert('Invalid State', 'State name must be at least 2 characters.');
      return false;
    }

    const pincode = reportPincode.trim();
    if (!pincode) {
      Alert.alert('Pincode Required', 'Please enter the pincode.');
      return false;
    }

    if (!/^\d{6}$/.test(pincode)) {
      Alert.alert('Invalid Pincode', 'Pincode must be exactly 6 digits.');
      return false;
    }

    return true;
  };

  // ── Submit Reported Location ──
  const handleSubmitReportedLocation = useCallback(async () => {
    const addressId = getCustomerAddressId();

    if (!addressId) {
      Alert.alert(
        'Address ID Required',
        'Customer address ID is missing. Please contact support.',
      );
      return;
    }

    if (!validateReportForm()) {
      return;
    }

    const customerId = order.orderDetails?.customerId ?? order.customerId;
    const partnerId = order.deliveryPartnerId || order.orderDetails?.customerId;

    try {
      setReportSubmitting(true);

      console.log('Submitting reported address with:', {
        addressId,
        customerId,
        partnerId,
        latitude: reportPinCoord!.lat,
        longitude: reportPinCoord!.lng,
        addressLine1: reportAddressLine1.trim(),
      });

      await deliveryPartnerService.createReportedAddress({
        addressId,
        customerId: String(customerId ?? ''),
        reportedByPartnerId: String(partnerId ?? ''),
        latitude: reportPinCoord!.lat,
        longitude: reportPinCoord!.lng,
        addressLine1: reportAddressLine1.trim(),
        addressLine2: reportAddressLine2.trim() || null,
        landmark: reportLandmark.trim() || null,
        city: reportCity.trim(),
        state: reportState.trim(),
        pincode: reportPincode.trim(),
        reason:
          reportReason.trim() || 'Customer requested a new delivery location',
      });

      setReportModalVisible(false);
      resetReportForm();
      Alert.alert(
        'Success',
        'Reported location saved successfully for this address.',
      );
    } catch (error: any) {
      console.error('Error submitting reported location:', error);
      Alert.alert(
        'Unable to Save Report',
        error?.message || 'Please try again shortly.',
      );
    } finally {
      setReportSubmitting(false);
    }
  }, [
    order.customerId,
    order.deliveryPartnerId,
    order.orderDetails?.customerId,
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
      if (config.apiAction === 'acceptOrder') {
        await deliveryPartnerService.acceptOrder(orderId);
        if (componentMountedRef.current) {
          setOrder(prev => ({ ...prev, orderStatus: 'ACCEPTED' }));
        }
      } else if (config.apiAction === 'arriveStore') {
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

  const renderStep3 = () => {
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
            <Text style={s.sectionLabel}>SELECT PAYMENT METHOD</Text>

            <View style={s.paymentMethodsList}>
              {/* CASH OPTION */}
              <TouchableOpacity
                style={[
                  s.paymentMethodItem,
                  paymentMode === 'CASH' && s.paymentMethodItemActive,
                ]}
                onPress={() => handlePaymentModeChange('CASH')}
                activeOpacity={0.7}
              >
                <View style={s.paymentMethodRadio}>
                  {paymentMode === 'CASH' && (
                    <View style={s.paymentMethodRadioInner} />
                  )}
                </View>
                <View style={s.paymentMethodContent}>
                  <Text style={s.paymentMethodTitle}>Cash</Text>
                  <Text style={s.paymentMethodDesc}>
                    Collect ₹
                    {totalBillAmount != null ? totalBillAmount.toFixed(0) : '0'}{' '}
                    from customer
                  </Text>
                </View>
              </TouchableOpacity>

              {/* ONLINE / UPI OPTION */}
              <TouchableOpacity
                style={[
                  s.paymentMethodItem,
                  paymentMode === 'ONLINE' && s.paymentMethodItemActive,
                ]}
                onPress={() => handlePaymentModeChange('ONLINE')}
                activeOpacity={0.7}
              >
                <View style={s.paymentMethodRadio}>
                  {paymentMode === 'ONLINE' && (
                    <View style={s.paymentMethodRadioInner} />
                  )}
                </View>
                <View style={s.paymentMethodContent}>
                  <Text style={s.paymentMethodTitle}>UPI</Text>
                  <Text style={s.paymentMethodDesc}>
                    Share QR code with customer
                  </Text>
                </View>
              </TouchableOpacity>

              {/* CASH + UPI COMING SOON */}
              <View style={[s.paymentMethodItem, s.paymentMethodItemDisabled]}>
                <View style={s.paymentMethodRadio}></View>
                <View style={s.paymentMethodContent}>
                  <Text style={s.paymentMethodTitle}>Cash + UPI</Text>
                  <Text style={s.paymentMethodDesc}>Split payment</Text>
                </View>
                <View style={s.comingSoonBadge}>
                  <Text style={s.comingSoonText}>Coming Soon</Text>
                </View>
              </View>
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

  const renderOperationalStatus = () => {
    if (orderStatus === 'PARTNER_ASSIGNED') {
      return (
        <View style={[s.operationCard, s.operationCardBlue]}>
          <View style={s.operationIcon}>
            <Clock size={17} color="#0E6DFD" />
          </View>
          <View style={s.operationContent}>
            <Text style={s.operationTitle}>Live order request</Text>
            <Text style={s.operationSub}>
              Accept before the assignment window expires
            </Text>
          </View>
          <Text style={s.operationTimer}>
            {formatCountdown(expiryRemainingSeconds)}
          </Text>
        </View>
      );
    }

    if (orderStatus === 'ARRIVED_AT_STORE') {
      return (
        <View style={[s.operationCard, s.operationCardAmber]}>
          <View style={s.operationIcon}>
            <Clock size={17} color="#B45309" />
          </View>
          <View style={s.operationContent}>
            <Text style={s.operationTitle}>Pickup timer</Text>
            <Text style={s.operationSub}>Target pickup within 30 minutes</Text>
          </View>
          <Text style={[s.operationTimer, { color: '#B45309' }]}>
            {formatCountdown(pickupDeadlineSeconds)}
          </Text>
          <TouchableOpacity
            style={s.operationAction}
            onPress={() =>
              Alert.alert(
                'Order not ready',
                'Ask the store to finish preparing the order, then mark it picked up when it is ready.',
              )
            }
            activeOpacity={0.85}
          >
            <AlertTriangle size={12} color="#B45309" />
            <Text style={s.operationActionText}>Not ready</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (orderStatus === 'ORDER_PICKED_UP') {
      return (
        <View style={[s.operationCard, s.operationCardRed]}>
          <View style={s.operationIcon}>
            <Clock size={17} color="#DC2626" />
          </View>
          <View style={s.operationContent}>
            <Text style={s.operationTitle}>Delivery deadline</Text>
            <Text style={s.operationSub}>
              Keep the customer updated on your way
            </Text>
          </View>
          <Text style={[s.operationTimer, { color: '#DC2626' }]}>
            {formatCountdown(deliveryDeadlineSeconds)}
          </Text>
        </View>
      );
    }

    return null;
  };

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

      {/* ── TIME ESTIMATES - STEP 0 ── */}
      <View style={s.timeEstimatesRow}>
        <TimeEstimateChip
          icon={<Clock size={14} color="#64748B" />}
          label="Prep Time"
          time={`${PREPARATION_TIME_MINUTES} min`}
          subLabel="Estimated"
        />
        <TimeEstimateChip
          icon={<Clock size={14} color="#64748B" />}
          label="Pickup ETA"
          time="3 min"
          subLabel="Estimated"
        />
        <TimeEstimateChip
          icon={<Clock size={14} color="#64748B" />}
          label="Total Time"
          time={reachStoreTotalCountdownLabel}
          subLabel="Time remaining"
        />
      </View>

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
      <View style={s.infoCard}>
        <View style={s.infoCardHeader}>
          <View style={s.infoCardHeaderLeft}>
            <Text style={s.infoCardTitle}>
              {order.shopDetails?.name || 'Store'}
            </Text>
            <Text style={s.infoCardSub}>Pickup location</Text>
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

        {/* ── PREPARATION TIME DISPLAY ── */}
        <View style={s.preparationTimeBox}>
          <Clock size={16} color="#7C3AED" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.preparationTimeLabel}>Preparation Time</Text>
            <Text style={s.preparationTimeValue}>
              {PREPARATION_TIME_MINUTES} minutes estimated
            </Text>
          </View>
          <Text style={s.preparationTimeEmoji}>⏱️</Text>
        </View>

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
        </View>
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

      {/* ── TIME ESTIMATES - STEP 2 ── */}
      <View style={s.timeEstimatesRow}>
        <TimeEstimateChip
          icon={<Clock size={14} color="#64748B" />}
          label="Drop ETA"
          time={formatTimeLabel(dropEstimatedMinutes)}
          subLabel="@ 20 km/h"
        />
      </View>

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

        {orderStatus === 'ORDER_PICKED_UP' && (
          <TouchableOpacity
            style={s.reportLocationInlineButton}
            onPress={openReportModal}
            disabled={reportSubmitting}
            activeOpacity={0.85}
          >
            <AlertTriangle size={15} color="#B45309" />
            <Text style={s.reportLocationInlineText}>
              Is the customer location incorrect? Report another location
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── REPORTED ADDRESSES SECTION ── */}
      {reportedAddresses.length > 0 && (
        <View style={s.infoCard}>
          <Text style={s.sectionLabel}>CUSTOMER REPORTED LOCATIONS</Text>
          <Text style={s.reportedAddressesHint}>
            Customer has reported {reportedAddresses.length} previous
            location(s)
          </Text>
          {reportedAddresses.map((addr, idx) => (
            <View key={addr.id} style={s.reportedAddressCard}>
              <View style={s.reportedAddressHeader}>
                <View style={s.reportedAddressIndex}>
                  <Text style={s.reportedAddressIndexText}>{idx + 1}</Text>
                </View>
                <View style={s.reportedAddressInfo}>
                  <Text style={s.reportedAddressLine1} numberOfLines={1}>
                    {addr.addressLine1}
                  </Text>
                  <Text style={s.reportedAddressCity} numberOfLines={1}>
                    {addr.city}, {addr.state} {addr.pincode}
                  </Text>
                </View>
                <TouchableOpacity
                  style={s.reportedAddressUseBtn}
                  onPress={() => {
                    openMaps(
                      addr.latitude,
                      addr.longitude,
                      addr.addressLine1 as any,
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Navigation size={14} color="#0E6DFD" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
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
        return (
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
              <Text style={s.successRowValue}>
                {finalPaymentMethod ?? 'N/A'}
              </Text>
            </View>
            <View style={[s.successRow, s.successRowLast]}>
              <Text style={s.successRowLabel}>Order Value</Text>
              <Text style={[s.successRowValue, s.successRowValueBold]}>
                {formatCurrency(order?.finance?.payableAmount || computedTotal)}
              </Text>
            </View>

            <View style={s.ratingBlock}>
              <Text style={s.ratingTitle}>Rate Customer</Text>
              <Text style={s.ratingSub}>How was your delivery experience?</Text>
              <View style={s.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setCustomerRating(star)}
                    activeOpacity={0.8}
                    accessibilityLabel={`${star} star rating`}
                  >
                    <Text
                      style={[
                        s.ratingStar,
                        star <= customerRating && s.ratingStarActive,
                      ]}
                    >
                      ★
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const formatStepTime = (
    timeValue: string | null | undefined,
  ): string | null => {
    if (!timeValue) return null;
    const num = Number(timeValue);
    const date =
      Number.isFinite(num) && num > 0
        ? new Date(num)
        : new Date(
            timeValue.includes(' ') ? timeValue.replace(' ', 'T') : timeValue,
          );
    if (isNaN(date.getTime())) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderStepper = () => {
    // Map step timestamps dynamically based on DeliveryPartnerOrder fields
    const stepTimestamps = [
      formatStepTime(order.arrivedAtStoreAt), // Step 1: Reach Store
      formatStepTime(order.pickedUpAt), // Step 2: Pickup
      formatStepTime(order.reachedLocationAt), // Step 3: Search Destination
      formatStepTime(order.deliveredAt ?? order.orderDetails?.completedDate), // Step 4: Deliver
    ];

    return (
      <View style={s.stepper}>
        {STEPS.map((step, i) => {
          const done = i < config.stageIndex;
          const active = i === Math.min(config.stageIndex, STEPS.length - 1);
          const timestamp = stepTimestamps[i];

          return (
            <React.Fragment key={step.label}>
              <View style={s.stepperItem}>
                {/* 1. Icon / Dot */}
                <View
                  style={[
                    s.stepperDot,
                    done && s.stepperDotDone,
                    active && s.stepperDotActive,
                  ]}
                >
                  <Text style={s.stepperDotText}>
                    {done ? '✓' : step.emoji}
                  </Text>
                </View>

                {/* 2. Step Name */}
                <Text
                  style={[
                    s.stepperLabel,
                    (done || active) && s.stepperLabelActive,
                  ]}
                  numberOfLines={1}
                >
                  {step.label}
                </Text>

                {/* 3. Timestamp */}
                <Text
                  style={[
                    s.stepperTime,
                    (done || active) && s.stepperTimeActive,
                  ]}
                  numberOfLines={1}
                >
                  {timestamp || '--:--'}
                </Text>
              </View>

              {/* Connecting Line */}
              {i < STEPS.length - 1 && (
                <View style={[s.stepperLine, done && s.stepperLineDone]} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const isCompleteDeliveryDisabled =
    config.apiAction === 'completeDelivery' &&
    paymentMode === 'ONLINE' &&
    !isPaymentDone;

  // Region for the mini-map inside the "Report Another Location" modal.
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
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.pageScrollContent}
        showsVerticalScrollIndicator={false}
      >
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

        {isPending && (
          <View style={s.pendingVendorWarning}>
            <Text style={s.pendingVendorWarningText}>
              Waiting for vendor to accept this order
            </Text>
          </View>
        )}

        <View style={s.orderSummaryCard}>
          <View style={s.orderSummaryMetrics}>
            <View style={s.metric}>
              <Text style={s.metricValue}>
                {formatCurrency(totalBillAmount ?? computedTotal)}
              </Text>
              <Text style={s.metricLabel}>Total Bill</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metric}>
              <Text style={s.metricValue}>{pickupDistanceLabel}</Text>
              <Text style={s.metricLabel}>Pickup</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metric}>
              <Text style={s.metricValue}>{displayDistance(dropDistance)}</Text>
              <Text style={s.metricLabel}>Drop</Text>
            </View>
            <View style={s.metricDivider} />
            <View style={s.metric}>
              <Text style={s.metricValue}>{totalDistanceLabel}</Text>
              <Text style={s.metricLabel}>Total Dist</Text>
            </View>
          </View>

          <View style={s.orderSummaryStatusRow}>
            <Text style={s.liveOrderLabel}>Live Order</Text>
            <Text style={s.statusBadge}>{finalPaymentMethod || 'N/A'}</Text>
            <Text style={s.statusTime}>{assignmentAgeLabel}</Text>
            <Text style={s.statusTime}>{orderSummaryTimeLabel}</Text>
          </View>
        </View>

        <View style={s.earningsStrip}>
          <View style={s.earningsMetric}>
            <Text style={s.earningsLabel}>EST. EARNINGS</Text>
            <Text style={s.earningsValue}>
              {formatCurrency(estimatedEarnings)}
            </Text>
          </View>
          <View style={s.earningsDivider} />
          <View style={s.earningsMetric}>
            <Text style={s.earningsLabel}>PENALTY</Text>
            <Text style={[s.earningsValue, { color: '#DC2626' }]}>₹0</Text>
          </View>
          <Text style={s.singleOrderBadge}>Single Order</Text>
        </View>

        {renderOperationalStatus()}

        {renderStepper()}

        <View style={s.scrollContent}>
          {renderContent()}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={s.footer}>
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
                      handleReportPinChange(latitude, longitude);
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
                        handleReportPinChange(latitude, longitude);
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

              <Text style={s.reportFieldLabel}>Address Line 1 *</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportAddressLine1}
                  onChangeText={setReportAddressLine1}
                  placeholder="House / Flat no., Building name"
                  style={s.reportInputText}
                  placeholderTextColor="#CBD5E1"
                />
              </View>

              <Text style={s.reportFieldLabel}>Address Line 2</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportAddressLine2}
                  onChangeText={setReportAddressLine2}
                  placeholder="Street, Area"
                  style={s.reportInputText}
                  placeholderTextColor="#CBD5E1"
                />
              </View>

              <Text style={s.reportFieldLabel}>Landmark</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportLandmark}
                  onChangeText={setReportLandmark}
                  placeholder="Near metro pillar 120, opposite XYZ store"
                  style={s.reportInputText}
                  placeholderTextColor="#CBD5E1"
                />
              </View>

              <View style={s.reportInputRow}>
                <View style={s.reportInputHalf}>
                  <Text style={s.reportFieldLabel}>City *</Text>
                  <View style={s.reportInputWrap}>
                    <TextInput
                      value={reportCity}
                      onChangeText={setReportCity}
                      placeholder="City"
                      style={s.reportInputText}
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>
                </View>
                <View style={s.reportInputHalf}>
                  <Text style={s.reportFieldLabel}>State *</Text>
                  <View style={s.reportInputWrap}>
                    <TextInput
                      value={reportState}
                      onChangeText={setReportState}
                      placeholder="State"
                      style={s.reportInputText}
                      placeholderTextColor="#CBD5E1"
                    />
                  </View>
                </View>
              </View>

              <Text style={s.reportFieldLabel}>Pincode *</Text>
              <View style={s.reportInputWrap}>
                <TextInput
                  value={reportPincode}
                  onChangeText={setReportPincode}
                  placeholder="452001"
                  style={s.reportInputText}
                  placeholderTextColor="#CBD5E1"
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
                  placeholderTextColor="#CBD5E1"
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

// ─── Screen Styles ──────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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

  orderSummaryCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  orderSummaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
  },
  orderSummaryStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveOrderLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#EFF6FF',
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  statusTime: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  earningsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  earningsMetric: { flex: 1 },
  earningsLabel: {
    fontSize: 8,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  earningsValue: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
    marginTop: 2,
  },
  earningsDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  singleOrderBadge: {
    fontSize: 8,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
  },
  operationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 9,
  },
  operationCardBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  operationCardAmber: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  operationCardRed: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  operationIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operationContent: { flex: 1 },
  operationTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  operationSub: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  operationTimer: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
  },
  operationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  operationActionText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#B45309',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  stepperItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
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
  stepperDotActive: {
    backgroundColor: '#EEF4FF',
    borderColor: '#0E6DFD',
  },
  stepperDotDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#16A34A',
  },
  stepperDotText: {
    fontSize: 13,
  },
  stepperLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  stepperLabelActive: {
    color: '#0F172A',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  stepperTime: {
    fontSize: 8,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  stepperTimeActive: {
    color: '#64748B',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  stepperLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 16, // Center-align line with the 34px circle
  },
  stepperLineDone: {
    backgroundColor: '#16A34A',
  },

  scroll: { flex: 1 },
  pageScrollContent: { paddingBottom: 24 },
  scrollContent: { gap: 10, paddingHorizontal: 14, paddingVertical: 12 },

  mapPlaceholder: {
    height: MAP_HEIGHT,
    backgroundColor: '#E8EFFF',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 6,
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

  // ─── TIME ESTIMATE STYLES ───
  timeEstimatesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  timeEstimateChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0A1730',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  timeEstimateIcon: {
    marginRight: 8,
  },
  timeEstimateContent: {
    flex: 1,
  },
  timeEstimateLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeEstimateValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
    marginTop: 2,
  },
  timeEstimateSub: {
    fontSize: 8,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 1,
  },

  // ─── PREPARATION TIME BOX ───
  preparationTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  preparationTimeLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#6D28D9',
  },
  preparationTimeValue: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#7C3AED',
    marginTop: 2,
  },
  preparationTimeEmoji: {
    fontSize: 18,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#0A1730',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoCardHeaderLeft: { flex: 1 },
  infoCardTitle: {
    fontSize: 15,
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

  reportLocationInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  reportLocationInlineText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#92400E',
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
    color: '#0E6DFD',
  },

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

  paymentMethodsList: {
    marginBottom: 14,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  paymentMethodItemActive: {
    borderColor: '#0E6DFD',
    backgroundColor: '#EFF6FF',
  },
  paymentMethodItemDisabled: {
    opacity: 0.6,
  },
  paymentMethodRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  paymentMethodRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0E6DFD',
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  paymentMethodDesc: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },

  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
  },
  comingSoonText: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#92400E',
  },

  evidenceSection: { marginTop: 14 },
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
  ratingBlock: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  ratingTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  ratingSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 3,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  ratingStar: {
    fontSize: 28,
    color: '#CBD5E1',
  },
  ratingStarActive: { color: '#F59E0B' },

  reportedAddressesHint: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginBottom: 12,
  },
  reportedAddressCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reportedAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reportedAddressIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  reportedAddressIndexText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
  },
  reportedAddressInfo: {
    flex: 1,
  },
  reportedAddressLine1: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  reportedAddressCity: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  reportedAddressUseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
  pendingVendorWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    margin: 12,
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
});
