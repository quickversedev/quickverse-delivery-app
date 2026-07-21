import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';
import type { PoolOrder } from '../types/pool.types';

const getHeaders = async () => {
  const sessionKey = await TokenStorage.getToken();
  return {
    SessionKey: sessionKey || '',
    'Request-Origin': 'TRANSPORTER',
  };
};

const getOpenPoolOrders = async (regionId?: string): Promise<PoolOrder[]> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: PoolOrder[] }>(
    axiosInstance.get('/quickVerse/v3/order-pool', {
      headers,
      params: regionId ? { regionId } : {},
    }),
  );
  return data?.data ?? [];
};

const claimOrder = async (
  poolId: string,
  partnerId: string,
): Promise<PoolOrder> => {
  const headers = await getHeaders();
  const data = await apiCall<{ data: PoolOrder }>(
    axiosInstance.post(
      `/quickVerse/v3/order-pool/${poolId}/claim`,
      null,
      {
        headers,
        params: { partnerId },
        validateStatus: s => s < 500,
      },
    ),
  );
  return data.data;
};

const poolService = { getOpenPoolOrders, claimOrder };
export default poolService;
