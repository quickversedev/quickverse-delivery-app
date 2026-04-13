import axiosInstance, { apiCall } from './axios.config';

export type DeliveryPartnerProfile = {
  id: string;
  name: string;
  profileImageUrl: string | null;
  totalOrders: number;
  orderSuccess: number;
  orderFailed: number;
  earnings: number | null;
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
  };
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
  };
};

const getDeliveryPartnerById = async (
  partnerId: string,
): Promise<DeliveryPartnerProfile> => {
  const data = await apiCall<DeliveryPartnerApiResponse>(
    axiosInstance.get(`/v1/delivery-partner/${partnerId}`, {
      validateStatus: status => status >= 200 && status < 400,
    }),
  );

  return normalizePartnerProfile(data, partnerId);
};

const deliveryPartnerService = {
  getDeliveryPartnerById,
};

export default deliveryPartnerService;
