import axiosInstance, { apiCall } from './axios.config';
import { PricingConfigItem, ServiceType } from '../types/pricing';
import { TokenStorage } from '../utils/storage';

export const fetchPricingConfig = async (
  serviceType: ServiceType,
  regionId: string = 'BEED-431122',
): Promise<PricingConfigItem[]> => {
  const sessionKey = await TokenStorage.getToken();
  return apiCall<PricingConfigItem[]>(
    axiosInstance.get('/quickVerse/v3/pricing-configurations', {
      params: { serviceType, regionId },
      headers: {
        SessionKey: sessionKey || '',
      },
    }),
  );
};
