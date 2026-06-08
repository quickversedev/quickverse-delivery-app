import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import {
  ArrowLeft,
  Phone,
  Navigation,
  CheckCircle2,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FONT_FAMILY } from '../theme/typography';
import deliveryPartnerService from '../services/delivery-partner.service';
import type { DeliveryPartnerOrder } from '../services/delivery-partner.service';
import usePricingStore from '../store/pricingStore';
import type { ServiceType } from '../types/pricing';
import { SafeAreaView } from 'react-native-safe-area-context';

type RootStackParamList = {
  OrderDelivery: { order: DeliveryPartnerOrder };
  OrderWebView: { url: string; title?: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDelivery'>;

// ─── Stage Config ─────────────────────────────────────────────────────────────

interface StageConfig {
  title: string;
  subtitle: string;
  buttonLabel: string;
  buttonColor: string;
  apiAction:
    | 'arriveStore'
    | 'pickup'
    | 'arriveDestination'
    | 'completeDelivery'
    | null;
  stageIndex: number;
}

const STAGE_CONFIG: Record<string, StageConfig> = {
  ACCEPTED: {
    title: 'Head to Store',
    subtitle: 'Navigate to the pickup location',
    buttonLabel: 'Arrived at Store',
    buttonColor: '#0E6DFD',
    apiAction: 'arriveStore',
    stageIndex: 0,
  },
  PARTNER_ASSIGNED: {
    title: 'Head to Store',
    subtitle: 'Navigate to the pickup location',
    buttonLabel: 'Arrived at Store',
    buttonColor: '#0E6DFD',
    apiAction: 'arriveStore',
    stageIndex: 0,
  },
  ARRIVED_AT_STORE: {
    title: 'Pick Up Order',
    subtitle: 'Collect the order from the store',
    buttonLabel: 'Order Picked Up',
    buttonColor: '#7C3AED',
    apiAction: 'pickup',
    stageIndex: 1,
  },
  ORDER_PICKED_UP: {
    title: 'Head to Customer',
    subtitle: 'Navigate to the delivery address',
    buttonLabel: 'Arrived at Destination',
    buttonColor: '#0891B2',
    apiAction: 'arriveDestination',
    stageIndex: 2,
  },
  REACHED_LOCATION: {
    title: 'Complete Delivery',
    subtitle: 'Hand over order to the customer',
    buttonLabel: 'Complete Delivery',
    buttonColor: '#16A34A',
    apiAction: 'completeDelivery',
    stageIndex: 3,
  },
  DELIVERED: {
    title: 'Delivered!',
    subtitle: 'Order delivered successfully',
    buttonLabel: 'Back to Home',
    buttonColor: '#16A34A',
    apiAction: null,
    stageIndex: 4,
  },
};

const TIMELINE = [
  { label: 'At Store', icon: '🏪' },
  { label: 'Picked Up', icon: '📦' },
  { label: 'En Route', icon: '🛵' },
  { label: 'Delivered', icon: '✅' },
];

const PARTNER_DELIVERY_EARNING = 30; 

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

const InfoRow: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={[s.infoValue, accent && s.infoValueAccent]}>{value}</Text>
  </View>
);

const SectionCard: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={s.sectionCard}>
    <Text style={s.sectionCardTitle}>{title}</Text>
    {children}
  </View>
);

const OrderDeliveryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState<DeliveryPartnerOrder>(initialOrder);
  const [isLoading, setIsLoading] = useState(false);

  const { getPricingValues } = usePricingStore();

  // Resolve current stage
  const orderStatus = (
    order.orderStatus ??
    order.orderDetails?.state ??
    'ACCEPTED'
  ).toUpperCase();
  const config = STAGE_CONFIG[orderStatus] ?? STAGE_CONFIG['ACCEPTED'];

  // Parsed addresses
  const customerAddress = parseCustomerAddress(
    order.orderDetails?.customerAddress ?? null,
  );
  const customerCoord =
    customerAddress.latitude && customerAddress.longitude
      ? { lat: customerAddress.latitude, lng: customerAddress.longitude }
      : null;

  const shopAddressText = [
    order.shopDetails?.address?.address,
    order.shopDetails?.address?.city,
    order.shopDetails?.address?.state,
    order.shopDetails?.address?.postalCode,
  ]
    .filter(Boolean)
    .join(', ');

  const shopCoord = order.shopDetails?.coordinates
    ? {
        lat: order.shopDetails.coordinates.latitude,
        lng: order.shopDetails.coordinates.longitude,
      }
    : null;

  // Pricing
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

  // Partner's actual delivery earning (delivery fee they receive)
  const partnerEarning = pricing.deliveryFee || PARTNER_DELIVERY_EARNING;

  // Action handler
  const handleAction = useCallback(async () => {
    if (config.apiAction === null) {
      navigation.goBack();
      return;
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
        await deliveryPartnerService.completeDelivery(orderId);
        setOrder(prev => ({ ...prev, orderStatus: 'DELIVERED' }));
      }
    } catch (err: any) {
      Alert.alert('Action failed', err?.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [config, order, navigation]);

  const openOrderWebView = () => {
    const url = order.orderDetails?.orderLink;
    if (!url) return;
    navigation.navigate('OrderWebView', {
      url,
      title: `Order #${order.orderId || order.id}`,
    });
  };

  // ─── Stage-specific content ────────────────────────────────────────────────

  const renderStageContent = () => {
    switch (config.stageIndex) {
      // ── Stage 0: Head to Store ──────────────────────────────────────────────
      case 0:
        return (
          <>
            <SectionCard title="Pickup Location">
              {order.shopDetails?.banner || order.shopDetails?.logo ? (
                <Image
                  source={{
                    uri: (order.shopDetails.banner ||
                      order.shopDetails.logo) as string,
                  }}
                  style={s.shopImage}
                />
              ) : null}
              <InfoRow label="Store" value={order.shopDetails?.name || 'N/A'} />
              <InfoRow
                label="Category"
                value={order.shopDetails?.category || 'N/A'}
              />
              <InfoRow label="Address" value={shopAddressText || 'N/A'} />
              {order.shopDetails?.phone && (
                <TouchableOpacity
                  style={s.callButton}
                  onPress={() =>
                    Linking.openURL(`tel:${order.shopDetails!.phone}`)
                  }
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#16A34A" />
                  <Text style={s.callButtonText}>
                    Call Store: {order.shopDetails.phone}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.navButton}
                onPress={() =>
                  openMaps(
                    shopCoord?.lat ?? null,
                    shopCoord?.lng ?? null,
                    shopAddressText,
                  )
                }
                activeOpacity={0.85}
              >
                <Navigation size={14} color="#fff" />
                <Text style={s.navButtonText}>Navigate to Store</Text>
              </TouchableOpacity>
            </SectionCard>

            <SectionCard title="Order Summary">
              <InfoRow
                label="Order ID"
                value={`#${order.orderId || order.id}`}
              />
              <InfoRow
                label="Items"
                value={`${order.orderDetails?.totalItemCount ?? 0} item(s)`}
              />
              <InfoRow
                label="Customer"
                value={order.orderDetails?.customerName || 'N/A'}
              />
              <InfoRow
                label="Order Total"
                value={formatCurrency(computedTotal)}
              />
              <InfoRow
                label="Your Earning"
                value={formatCurrency(partnerEarning)}
                accent
              />
            </SectionCard>
          </>
        );

      // ── Stage 1: Pick Up Order (at store, collect items) ───────────────────
      case 1:
        return (
          <>
            {/* Store / Vendor details */}
            <SectionCard title="Store Details">
              {order.shopDetails?.banner || order.shopDetails?.logo ? (
                <Image
                  source={{
                    uri: (order.shopDetails.banner ||
                      order.shopDetails.logo) as string,
                  }}
                  style={s.shopImage}
                />
              ) : null}
              <InfoRow label="Store" value={order.shopDetails?.name || 'N/A'} />
              <InfoRow
                label="Owner"
                value={order.shopDetails?.owner || 'N/A'}
              />
              <InfoRow label="Address" value={shopAddressText || 'N/A'} />
              {order.shopDetails?.phone && (
                <TouchableOpacity
                  style={s.callButton}
                  onPress={() =>
                    Linking.openURL(`tel:${order.shopDetails!.phone}`)
                  }
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#16A34A" />
                  <Text style={s.callButtonText}>
                    Call Store: {order.shopDetails.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </SectionCard>

            {/* Order items to collect */}
            <SectionCard title="Items to Collect">
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
            </SectionCard>

            {/* View Order Details button → WebView */}
            {order.orderDetails?.orderLink && (
              <TouchableOpacity
                style={s.webviewButton}
                onPress={openOrderWebView}
                activeOpacity={0.85}
              >
                <Text style={s.webviewButtonText}>View Full Order Details</Text>
              </TouchableOpacity>
            )}
          </>
        );

      // ── Stage 2: Head to Customer ──────────────────────────────────────────
      case 2:
        return (
          <>
            <SectionCard title="Drop Location">
              <InfoRow
                label="Customer"
                value={order.orderDetails?.customerName || 'N/A'}
              />
              <InfoRow label="Address" value={customerAddress.text} />
              {order.orderDetails?.customerMobile && (
                <TouchableOpacity
                  style={s.callButton}
                  onPress={() =>
                    Linking.openURL(
                      `tel:${String(order.orderDetails!.customerMobile).slice(
                        -10,
                      )}`,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#16A34A" />
                  <Text style={s.callButtonText}>
                    Call: {String(order.orderDetails.customerMobile).slice(-10)}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={s.navButton}
                onPress={() =>
                  openMaps(
                    customerCoord?.lat ?? null,
                    customerCoord?.lng ?? null,
                    customerAddress.text,
                  )
                }
                activeOpacity={0.85}
              >
                <Navigation size={14} color="#fff" />
                <Text style={s.navButtonText}>Navigate to Customer</Text>
              </TouchableOpacity>
            </SectionCard>

            <SectionCard title="Order">
              <InfoRow
                label="Order ID"
                value={`#${order.orderId || order.id}`}
              />
              <InfoRow
                label="Order Total"
                value={formatCurrency(computedTotal)}
              />
              <InfoRow
                label="Payment"
                value={
                  order.orderDetails?.paymentMethod ??
                  order.paymentMethod ??
                  'N/A'
                }
              />
              <InfoRow
                label="Your Earning"
                value={formatCurrency(partnerEarning)}
                accent
              />
            </SectionCard>
          </>
        );

      // ── Stage 3: Complete Delivery ─────────────────────────────────────────
      case 3:
        return (
          <>
            <SectionCard title="Customer Details">
              <InfoRow
                label="Name"
                value={order.orderDetails?.customerName || 'N/A'}
              />
              <InfoRow
                label="Phone"
                value={String(order.orderDetails?.customerMobile || 'N/A')}
              />
              <InfoRow label="Address" value={customerAddress.text} />
              {order.orderDetails?.customerMobile && (
                <TouchableOpacity
                  style={s.callButton}
                  onPress={() =>
                    Linking.openURL(
                      `tel:${String(order.orderDetails!.customerMobile).slice(
                        -10,
                      )}`,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Phone size={14} color="#16A34A" />
                  <Text style={s.callButtonText}>Call Customer</Text>
                </TouchableOpacity>
              )}
            </SectionCard>

            {/* COD collection — only when payment is COD */}
            {(order.orderDetails?.paymentMethod ?? order.paymentMethod) ===
              'COD' && (
              <View style={s.codBanner}>
                <Text style={s.codBannerEmoji}>💵</Text>
                <View>
                  <Text style={s.codBannerTitle}>Collect Cash on Delivery</Text>
                  <Text style={s.codBannerAmount}>
                    {formatCurrency(computedTotal)}
                  </Text>
                </View>
              </View>
            )}

            <SectionCard title="Order">
              <InfoRow
                label="Order ID"
                value={`#${order.orderId || order.id}`}
              />
              <InfoRow
                label="Payment"
                value={
                  order.orderDetails?.paymentMethod ??
                  order.paymentMethod ??
                  'N/A'
                }
              />
              <InfoRow
                label="Order Total"
                value={formatCurrency(computedTotal)}
              />
              <InfoRow
                label="Your Earning"
                value={formatCurrency(partnerEarning)}
                accent
              />
            </SectionCard>

            {order.orderDetails?.orderLink && (
              <TouchableOpacity
                style={s.webviewButton}
                onPress={openOrderWebView}
                activeOpacity={0.85}
              >
                <Text style={s.webviewButtonText}>View Order Details →</Text>
              </TouchableOpacity>
            )}
          </>
        );

      // ── Stage 4: Delivered ─────────────────────────────────────────────────
      case 4:
        return (
          <View style={s.successCard}>
            <CheckCircle2 size={64} color="#16A34A" />
            <Text style={s.successTitle}>Order Delivered!</Text>
            <Text style={s.successSub}>
              #{order.orderId || order.id} · {order.orderDetails?.customerName}
            </Text>

            {/* Earnings — partner's delivery fee, NOT the order total */}
            <View style={s.successEarningRow}>
              <View style={s.successEarningLeft}>
                <Text style={s.successEarningLabel}>Your Earnings</Text>
                <Text style={s.successEarningHint}>
                  Delivery fee for this order
                </Text>
              </View>
              <Text style={s.successEarningAmount}>
                {formatCurrency(partnerEarning)}
              </Text>
            </View>

            {/* Order total — shown separately for reference */}
            <View style={s.successOrderTotalRow}>
              <Text style={s.successOrderTotalLabel}>Order Value</Text>
              <Text style={s.successOrderTotalValue}>
                {formatCurrency(computedTotal)}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // ─── Timeline ──────────────────────────────────────────────────────────────
  const renderTimeline = () => (
    <View style={s.timeline}>
      {TIMELINE.map((step, i) => {
        const done = i < config.stageIndex;
        const active = i === Math.min(config.stageIndex, TIMELINE.length - 1);
        return (
          <React.Fragment key={step.label}>
            <View style={s.timelineStep}>
              <View
                style={[
                  s.timelineDot,
                  done && s.timelineDotDone,
                  active && s.timelineDotActive,
                ]}
              >
                <Text style={s.timelineDotIcon}>{done ? '✓' : step.icon}</Text>
              </View>
              <Text
                style={[
                  s.timelineLabel,
                  (done || active) && s.timelineLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {i < TIMELINE.length - 1 && (
              <View style={[s.timelineLine, done && s.timelineLineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backButton}
          activeOpacity={0.8}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{config.title}</Text>
          <Text style={s.headerSub}>#{order.orderId || order.id}</Text>
        </View>
        <View style={s.headerRight}>
          <Text style={s.headerEarningHint}>Earning</Text>
          <Text style={s.headerAmount}>{formatCurrency(partnerEarning)}</Text>
        </View>
      </View>

      {/* Timeline */}
      {renderTimeline()}

      {/* Stage subtitle */}
      <View style={s.stageBanner}>
        <Text style={s.stageBannerText}>{config.subtitle}</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStageContent()}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA Button */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[
            s.actionButton,
            { backgroundColor: config.buttonColor },
            isLoading && s.actionButtonDisabled,
          ]}
          onPress={handleAction}
          disabled={isLoading}
          activeOpacity={0.85}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.actionButtonText}>{config.buttonLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default OrderDeliveryScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F5FA' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 1,
  },
  headerRight: { alignItems: 'flex-end' },
  headerEarningHint: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  headerAmount: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },

  // Timeline
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  timelineStep: { alignItems: 'center', gap: 4 },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  timelineDotActive: {
    backgroundColor: '#EEF4FF',
    borderColor: '#0E6DFD',
  },
  timelineDotDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#16A34A',
  },
  timelineDotIcon: { fontSize: 14 },
  timelineLabel: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  timelineLabelActive: { color: '#0F172A', fontFamily: FONT_FAMILY.outfitBold },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  timelineLineDone: { backgroundColor: '#16A34A' },

  // Stage banner
  stageBanner: {
    backgroundColor: '#EEF4FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  stageBannerText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0E6DFD',
    textAlign: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  // Section card
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 4,
  },
  sectionCardTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoValueAccent: {
    color: '#16A34A',
    fontSize: 14,
  },

  // Shop image
  shopImage: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginBottom: 12,
    resizeMode: 'cover',
  },

  // Items list
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
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
  },
  itemQty: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 4,
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

  // Buttons
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
    gap: 8,
  },
  callButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E6DFD',
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 10,
    gap: 8,
  },
  navButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#FFFFFF',
  },
  webviewButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#F5F3FF',
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 4,
  },
  webviewButtonText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#7C3AED',
  },

  // COD banner
  codBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    marginBottom: 4,
  },
  codBannerEmoji: { fontSize: 28 },
  codBannerTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#92400E',
  },
  codBannerAmount: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#92400E',
    marginTop: 2,
  },

  // Success screen
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginTop: 16,
  },
  successSub: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 6,
    marginBottom: 20,
  },
  // Partner's earning — prominent green box
  successEarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    marginBottom: 10,
  },
  successEarningLeft: { flex: 1 },
  successEarningLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  successEarningHint: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#4ADE80',
    marginTop: 2,
  },
  successEarningAmount: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  // Order total — muted reference
  successOrderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  successOrderTotalLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  successOrderTotalValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
  },

  // Footer CTA
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
  actionButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  actionButtonDisabled: { opacity: 0.7 },
  actionButtonText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
  },
});
