import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';

export type DeliveryPartnerProfile = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  totalOrders: number;
  orderSuccess: number;
  orderFailed: number;
  earnings: number | null;
  isOnline?: boolean;
};

type OrderFinance = {
  itemTotalAmount?: number;
  couponId?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  isFreeDelivery?: boolean;
  amountAfterCoupon?: number;
  packagingCharges?: number;
  actualDeliveryFee?: number;
  deliveryFee?: number;
  platformFee?: number;
  razorpayCharges?: number;
  serviceGstRate?: number;
  commissionGst?: number;
  deliveryGst?: number;
  packagingGst?: number;
  codGst?: number;
  platformGst?: number;
  totalGst?: number;
  taxableAmount?: number;
  payableAmount?: number;
  commissionRate?: number;
  commission?: number;
  paymentMethod?: string | null;
  codCharges?: number;
  createdAt?: string | number;
  updatedAt?: string | number | null;
};

export type DeliveryPartnerOrder = {
  id: string;
  orderId: string;
  customerId: number | null;
  shopId: number | null;
  deliveryPartnerId: string;
  regionId: string | null;
  financeId: string | null;
  orderStatus: string;
  onTime: boolean | null;
  orderRating: number;
  paymentStatus: string | null;
  paymentMethod: string | null;
  paymentReferenceId: string | null;
  assignedAt: string | null;
  arrivedAtStoreAt: string | null;
  reachedLocationAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
  orderDetails: DeliveryPartnerOrderDetails | null;
  finance: OrderFinance | null;
  shopDetails: DeliveryPartnerShopDetails | null;
};

export type DeliveryPartnerOrderItem = {
  id: number;
  name: string;
  itemCount: number;
};

export type DeliveryPartnerOrderDetails = {
  orderId: string;
  campusId: string | null;
  shopId: number | null;
  customerId: number | null;
  customerName: string | null;
  customerMobile: string | null;
  customerAddress: string | null;
  state: string | null;
  acceptedDate: string | null;
  completedDate: string | null;
  rejectedDate: string | null;
  orderItem: DeliveryPartnerOrderItem[];
  totalAmount: number;
  totalItemCount: number;
  productCount: number;
  invoiceAmount: number;
  fulfillmentOption: string | null;
  creationTime: string | null;
  amountExcludingDeliveryFee: number;
  deliveryFee: number;
  productImageURLs: string | null;
  stateLabel: string | null;
  orderDescription: string | null;
  orderLink: string | null;
  paymentMethod: string | null;
  paymentProofURLImageUrl: string | null;
};

export type DeliveryPartnerShopAddress = {
  id: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type DeliveryPartnerShopCoordinates = {
  latitude: number | null;
  longitude: number | null;
};

export type DeliveryPartnerShopDetails = {
  shopId: string | null;
  name: string | null;
  logo: string | null;
  banner: string | null;
  owner: string | null;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  preparationTime: string | null;
  description: string | null;
  category: string | null;
  storeActive: boolean;
  storeEnabled: boolean;
  featured: boolean;
  latitude: number | null;
  longitude: number | null;
  coordinates: DeliveryPartnerShopCoordinates | null;
  address: DeliveryPartnerShopAddress | null;
};

type DeliveryPartnerApiResponse = {
  data?: {
    id?: string;
    deliveryPartnerId?: string;
    name?: string;
    fullName?: string;
    partnerName?: string;
    profileImageUrl?: string;
    profileImage?: string;
    profilePicture?: string;
    imageUrl?: string;
    avatarUrl?: string;
    totalOrders?: number;
    orderSuccess?: number;
    orderFailed?: number;
    earnings?: number;
    totalEarnings?: number;
    isOnline?: boolean;
  };
  id?: string;
  deliveryPartnerId?: string;
  isOnline?: boolean;
  name?: string;
  fullName?: string;
  partnerName?: string;
  profileImageUrl?: string;
  profileImage?: string;
  profilePicture?: string;
  imageUrl?: string;
  avatarUrl?: string;
  totalOrders?: number;
  orderSuccess?: number;
  orderFailed?: number;
  earnings?: number;
  totalEarnings?: number;
};

const normalizePartnerProfile = (
  response: DeliveryPartnerApiResponse,
  partnerId: string,
): DeliveryPartnerProfile => {
  const payload = response?.data ?? response;

  return {
    id: payload?.id ?? payload?.deliveryPartnerId ?? partnerId,
    name:
      payload?.name ??
      payload?.fullName ??
      payload?.partnerName ??
      'Delivery Partner',
    profileImageUrl:
      payload?.profileImageUrl ??
      payload?.profileImage ??
      payload?.profilePicture ??
      payload?.imageUrl ??
      payload?.avatarUrl ??
      null,
    totalOrders: Number(payload?.totalOrders ?? 0),
    orderSuccess: Number(payload?.orderSuccess ?? 0),
    orderFailed: Number(payload?.orderFailed ?? 0),
    earnings:
      typeof payload?.earnings === 'number'
        ? payload.earnings
        : typeof payload?.totalEarnings === 'number'
        ? payload.totalEarnings
        : null,
    isOnline: Boolean(payload?.isOnline ?? false),
  };
};

const getDeliveryPartnerById = async (
  partnerId: string,
): Promise<DeliveryPartnerProfile> => {
  const sessionKey = await TokenStorage.getToken();

  const data = await apiCall<DeliveryPartnerApiResponse>(
    axiosInstance.get(`/v1/delivery-partner/${partnerId}`, {
      validateStatus: status => status >= 200 && status < 400,
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'TRANSPORTER',
      },
    }),
  );

  console.log('Raw API response for delivery partner profile:', data);

  return normalizePartnerProfile(data, partnerId);
};

const toggleDeliveryPartnerOnlineStatus = async (
  partnerId: string,
  isOnline: boolean,
): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  await apiCall(
    axiosInstance.patch(`/v1/delivery-partner/${partnerId}/online`, null, {
      params: { isOnline },
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'TRANSPORTER',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
};

const normalizePartnerOrder = (order: any): DeliveryPartnerOrder => ({
  id: String(order?.id ?? ''),
  assignedAt: order?.assignedAt ? String(order.assignedAt) : null,
  arrivedAtStoreAt: order?.arrivedAtStoreAt ? String(order.arrivedAtStoreAt) : null,
  reachedLocationAt: order?.reachedLocationAt ? String(order.reachedLocationAt) : null,
  pickedUpAt: order?.pickedUpAt ? String(order.pickedUpAt) : null,
  deliveredAt: order?.deliveredAt ? String(order.deliveredAt) : null,
  orderId: String(order?.orderId ?? ''),
  customerId:
    typeof order?.customerId === 'number'
      ? order.customerId
      : order?.customerId
      ? Number(order.customerId)
      : null,
  shopId:
    typeof order?.shopId === 'number'
      ? order.shopId
      : order?.shopId
      ? Number(order.shopId)
      : null,
  deliveryPartnerId: String(order?.deliveryPartnerId ?? ''),
  regionId: order?.regionId ? String(order.regionId) : null,
  financeId: order?.financeId ? String(order.financeId) : null,
  orderStatus: String(order?.orderStatus ?? 'UNKNOWN'),
  onTime:
    typeof order?.onTime === 'boolean'
      ? order.onTime
      : order?.onTime == null
      ? null
      : Boolean(order.onTime),
  orderRating:
    typeof order?.orderRating === 'number'
      ? order.orderRating
      : Number(order?.orderRating ?? 0),
  paymentStatus: order?.paymentStatus ? String(order.paymentStatus) : null,
  paymentMethod: order?.paymentMethod ? String(order.paymentMethod) : null,
  paymentReferenceId: order?.paymentReferenceId
    ? String(order.paymentReferenceId)
    : null,
  createdAt: order?.createdAt ? String(order.createdAt) : null,
  createdBy: order?.createdBy ? String(order.createdBy) : null,
  updatedBy: order?.updatedBy ? String(order.updatedBy) : null,
  updatedAt: order?.updatedAt ? String(order.updatedAt) : null,
  finance: order?.orderDetails?.finance || null,
  orderDetails: order?.orderDetails
    ? {
        orderId: String(order.orderDetails?.orderId ?? order?.orderId ?? ''),
        campusId: order.orderDetails?.campusId
          ? String(order.orderDetails.campusId)
          : null,
        shopId:
          typeof order.orderDetails?.shopId === 'number'
            ? order.orderDetails.shopId
            : order.orderDetails?.shopId
            ? Number(order.orderDetails.shopId)
            : null,
        customerId:
          typeof order.orderDetails?.customerId === 'number'
            ? order.orderDetails.customerId
            : order.orderDetails?.customerId
            ? Number(order.orderDetails.customerId)
            : null,
        customerName: order.orderDetails?.customerName
          ? String(order.orderDetails.customerName)
          : null,
        customerMobile: order.orderDetails?.customerMobile
          ? String(order.orderDetails.customerMobile)
          : null,
        customerAddress: order.orderDetails?.customerAddress
          ? String(order.orderDetails.customerAddress)
          : null,
        state: order.orderDetails?.state
          ? String(order.orderDetails.state)
          : null,
        acceptedDate: order.orderDetails?.acceptedDate
          ? String(order.orderDetails.acceptedDate)
          : null,
        completedDate: order.orderDetails?.completedDate
          ? String(order.orderDetails.completedDate)
          : null,
        rejectedDate: order.orderDetails?.rejectedDate
          ? String(order.orderDetails.rejectedDate)
          : null,
        orderItem: Array.isArray(order.orderDetails?.orderItem)
          ? order.orderDetails.orderItem.map((item: any) => ({
              id: Number(item?.id ?? 0),
              name: String(item?.name ?? ''),
              itemCount:
                typeof item?.itemCount === 'number'
                  ? item.itemCount
                  : Number(item?.itemCount ?? 0),
            }))
          : [],
        totalAmount:
          typeof order.orderDetails?.totalAmount === 'number'
            ? order.orderDetails.totalAmount
            : Number(order.orderDetails?.totalAmount ?? 0),
        totalItemCount:
          typeof order.orderDetails?.totalItemCount === 'number'
            ? order.orderDetails.totalItemCount
            : Number(order.orderDetails?.totalItemCount ?? 0),
        productCount:
          typeof order.orderDetails?.productCount === 'number'
            ? order.orderDetails.productCount
            : Number(order.orderDetails?.productCount ?? 0),
        invoiceAmount:
          typeof order.orderDetails?.invoiceAmount === 'number'
            ? order.orderDetails.invoiceAmount
            : Number(order.orderDetails?.invoiceAmount ?? 0),
        fulfillmentOption: order.orderDetails?.fulfillmentOption
          ? String(order.orderDetails.fulfillmentOption)
          : null,
        creationTime: order.orderDetails?.creationTime
          ? String(order.orderDetails.creationTime)
          : null,
        amountExcludingDeliveryFee:
          typeof order.orderDetails?.amountExcludingDeliveryFee === 'number'
            ? order.orderDetails.amountExcludingDeliveryFee
            : Number(order.orderDetails?.amountExcludingDeliveryFee ?? 0),
        deliveryFee:
          typeof order.orderDetails?.deliveryFee === 'number'
            ? order.orderDetails.deliveryFee
            : Number(order.orderDetails?.deliveryFee ?? 0),
        productImageURLs: order.orderDetails?.productImageURLs
          ? String(order.orderDetails.productImageURLs)
          : null,
        stateLabel: order.orderDetails?.stateLabel
          ? String(order.orderDetails.stateLabel)
          : null,
        orderDescription: order.orderDetails?.orderDescription
          ? String(order.orderDetails.orderDescription)
          : null,
        orderLink: order.orderDetails?.orderLink
          ? String(order.orderDetails.orderLink)
          : null,
        paymentMethod: order.orderDetails?.paymentMethod
          ? String(order.orderDetails.paymentMethod)
          : null,
        paymentProofURLImageUrl: order.orderDetails?.paymentProofURLImageUrl
          ? String(order.orderDetails.paymentProofURLImageUrl)
          : null,
      }
    : null,
  shopDetails: order?.shopDetails
    ? {
        shopId: order.shopDetails?.shopId
          ? String(order.shopDetails.shopId)
          : null,
        name: order.shopDetails?.name ? String(order.shopDetails.name) : null,
        logo: order.shopDetails?.logo ? String(order.shopDetails.logo) : null,
        banner: order.shopDetails?.banner
          ? String(order.shopDetails.banner)
          : null,
        owner: order.shopDetails?.owner
          ? String(order.shopDetails.owner)
          : null,
        phone: order.shopDetails?.phone
          ? String(order.shopDetails.phone)
          : null,
        openingTime: order.shopDetails?.openingTime
          ? String(order.shopDetails.openingTime)
          : null,
        closingTime: order.shopDetails?.closingTime
          ? String(order.shopDetails.closingTime)
          : null,
        preparationTime: order.shopDetails?.preparationTime
          ? String(order.shopDetails.preparationTime)
          : null,
        description: order.shopDetails?.description
          ? String(order.shopDetails.description)
          : null,
        category: order.shopDetails?.category
          ? String(order.shopDetails.category)
          : null,
        storeActive: Boolean(order.shopDetails?.storeActive),
        storeEnabled: Boolean(order.shopDetails?.storeEnabled),
        featured: Boolean(order.shopDetails?.featured),
        coordinates: order.shopDetails?.coordinates
          ? {
              latitude:
                typeof order.shopDetails.coordinates?.latitude === 'number'
                  ? order.shopDetails.coordinates.latitude
                  : order.shopDetails.coordinates?.latitude
                  ? Number(order.shopDetails.coordinates.latitude)
                  : null,
              longitude:
                typeof order.shopDetails.coordinates?.longitude === 'number'
                  ? order.shopDetails.coordinates.longitude
                  : order.shopDetails.coordinates?.longitude
                  ? Number(order.shopDetails.coordinates.longitude)
                  : null,
            }
          : null,
        latitude:
          typeof order.shopDetails?.latitude === 'number'
            ? order.shopDetails.latitude
            : typeof order.shopDetails?.coordinates?.latitude === 'number'
            ? order.shopDetails.coordinates.latitude
            : order.shopDetails?.latitude
            ? Number(order.shopDetails.latitude)
            : order.shopDetails?.coordinates?.latitude
            ? Number(order.shopDetails.coordinates.latitude)
            : null,
        longitude:
          typeof order.shopDetails?.longitude === 'number'
            ? order.shopDetails.longitude
            : typeof order.shopDetails?.coordinates?.longitude === 'number'
            ? order.shopDetails.coordinates.longitude
            : order.shopDetails?.longitude
            ? Number(order.shopDetails.longitude)
            : order.shopDetails?.coordinates?.longitude
            ? Number(order.shopDetails.coordinates.longitude)
            : null,
        address: order.shopDetails?.address
          ? {
              id:
                typeof order.shopDetails.address?.id === 'number'
                  ? order.shopDetails.address.id
                  : order.shopDetails.address?.id
                  ? Number(order.shopDetails.address.id)
                  : null,
              address: order.shopDetails.address?.address
                ? String(order.shopDetails.address.address)
                : null,
              city: order.shopDetails.address?.city
                ? String(order.shopDetails.address.city)
                : null,
              state: order.shopDetails.address?.state
                ? String(order.shopDetails.address.state)
                : null,
              postalCode: order.shopDetails.address?.postalCode
                ? String(order.shopDetails.address.postalCode)
                : null,
              latitude:
                typeof order.shopDetails.address?.latitude === 'number'
                  ? order.shopDetails.address.latitude
                  : order.shopDetails.address?.latitude
                  ? Number(order.shopDetails.address.latitude)
                  : null,
              longitude:
                typeof order.shopDetails.address?.longitude === 'number'
                  ? order.shopDetails.address.longitude
                  : order.shopDetails.address?.longitude
                  ? Number(order.shopDetails.address.longitude)
                  : null,
            }
          : null,
      }
    : null,
});

const getAssignedOrdersByPartnerId = async (
  partnerId: string,
  timeRangeFilter?: 'all' | 'today' | 'week' | 'month' | 'custom',
  customRange?: { fromDate: string; toDate: string },
): Promise<DeliveryPartnerOrder[]> => {
  const sessionKey = await TokenStorage.getToken();

  const params: Record<string, any> = { size: 200 };

  if (timeRangeFilter === 'custom' && customRange) {
    // Backend checks fromDate/toDate before timeFilter, so timeFilter is
    // omitted here — no need to send both.
    params.fromDate = customRange.fromDate;
    params.toDate = customRange.toDate;
  } else {
    params.timeFilter = timeRangeFilter ?? 'all';
  }

  const data = await apiCall<any>(
    axiosInstance.get(`/v1/order-master/delivery-partner/${partnerId}`, {
      params,
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );

  if (Array.isArray(data?.content))
    return data.content.map(normalizePartnerOrder);
  if (Array.isArray(data)) return data.map(normalizePartnerOrder);
  if (Array.isArray(data?.data)) return data.data.map(normalizePartnerOrder);
  return [];
};

const updateAssignedOrderStatus = async (
  orderMasterId: string,
  status: 'ACCEPTED' | 'REJECTED' | 'PARTNER_ACCEPTED' | 'ARRIVED_AT_STORE',
): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  await apiCall(
    axiosInstance.patch(
      `/v1/order-master/${orderMasterId}/updateStatus`,
      null,
      {
        params: { status },
        headers: {
          SessionKey: sessionKey || '',
          'Request-Origin': 'CAPTAIN',
        },
        validateStatus: responseStatus =>
          responseStatus >= 200 && responseStatus < 400,
      },
    ),
  );
};

/**
 * Accept a newly-assigned order. Called from the "New Order Request" card
 * (before any delivery-stage progression begins). On success the order's
 * top-level `orderStatus` moves from PARTNER_ASSIGNED -> ACCEPTED, after
 * which it becomes eligible for the normal live-order / "Manage Delivery"
 * flow.
 */
const acceptOrder = async (orderMasterId: string): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  await apiCall(
    axiosInstance.patch(`/v1/order-master/${orderMasterId}/accept`, null, {
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
};

/**
 * Reject a newly-assigned order, with a mandatory reason. Called from the
 * "New Order Request" card as the counterpart to `acceptOrder`.
 */
const rejectOrder = async (
  orderMasterId: string,
  reason: string,
): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  await apiCall(
    axiosInstance.patch(`/v1/order-master/${orderMasterId}/reject`, null, {
      params: { reason },
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
};

export type TopPerformingRider = {
  riderId: string;
  name: string;
  profilePicture: string | null;
  deliveries: number;
  earnings: number;
  perOrderEarning: number;
  totalAssigned: number;
  acceptedCount: number;
  acceptanceRate: number;
};

export type StatsPeriod = 'today' | 'week' | 'month' | 'all_time';

/** Flat stats response — all fields scoped to the requested period. */
export type DeliveryPartnerStats = {
  deliveryPartnerId: string;
  period: string;
  orders: number;
  earnings: number;
  totalAssigned: number;
  acceptedCount: number;
  acceptanceRate: number;
  topPerformingRiders: TopPerformingRider[];
};

const getDeliveryPartnerStats = async (
  partnerId: string,
  period: StatsPeriod = 'today',
): Promise<DeliveryPartnerStats> => {
  const sessionKey = await TokenStorage.getToken();

  const data = await apiCall<DeliveryPartnerStats>(
    axiosInstance.get(`/v1/order-master/deliveryPartner/stats/${partnerId}`, {
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      params: { period },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
  return data;
};

const updateDeliveryPartnerLocation = async (
  partnerId: string,
  latitude: number,
  longitude: number,
): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  await apiCall(
    axiosInstance.patch(
      `/v1/delivery-partner/${partnerId}/location`,
      {
        latitude,
        longitude: longitude,
      },
      {
        headers: {
          SessionKey: sessionKey || '',
          'Request-Origin': 'TRANSPORTER',
        },
        validateStatus: status => status >= 200 && status < 400,
      },
    ),
  );
};

const arriveAtStore = async (orderMasterId: string): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();
  await apiCall(
    axiosInstance.patch(`/v1/order-master/${orderMasterId}/arriveStore`, null, {
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
};

const pickupOrder = async (orderMasterId: string): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();
  await apiCall(
    axiosInstance.patch(`/v1/order-master/${orderMasterId}/pickup`, null, {
      headers: {
        SessionKey: sessionKey || '',
        'Request-Origin': 'CAPTAIN',
      },
      validateStatus: status => status >= 200 && status < 400,
    }),
  );
};

const arriveAtDestination = async (orderMasterId: string): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();
  await apiCall(
    axiosInstance.patch(
      `/v1/order-master/${orderMasterId}/arriveDestination`,
      null,
      {
        headers: {
          SessionKey: sessionKey || '',
          'Request-Origin': 'CAPTAIN',
        },
        validateStatus: status => status >= 200 && status < 400,
      },
    ),
  );
};

const completeDelivery = async (
  orderMasterId: string,
  paymentProofImageUri?: string | null,
): Promise<void> => {
  const sessionKey = await TokenStorage.getToken();

  const formData = new FormData();

  if (paymentProofImageUri) {
    const filename = paymentProofImageUri.split('/').pop() ?? 'proof.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('paymentProofImageUrl', {
      uri: paymentProofImageUri,
      name: filename,
      type,
    } as any);
  } else {
    formData.append('paymentProofImageUrl', '');
  }

  await apiCall(
    axiosInstance.patch(
      `/v1/order-master/${orderMasterId}/completeDelivery`,
      formData,
      {
        headers: {
          SessionKey: sessionKey || '',
          'Request-Origin': 'CAPTAIN',
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: status => status >= 200 && status < 400,
      },
    ),
  );
};

const deliveryPartnerService = {
  getDeliveryPartnerById,
  toggleDeliveryPartnerOnlineStatus,
  getAssignedOrdersByPartnerId,
  updateAssignedOrderStatus,
  acceptOrder,
  rejectOrder,
  updateDeliveryPartnerLocation,
  getDeliveryPartnerStats,
  arriveAtStore,
  pickupOrder,
  arriveAtDestination,
  completeDelivery,
};

export default deliveryPartnerService;
