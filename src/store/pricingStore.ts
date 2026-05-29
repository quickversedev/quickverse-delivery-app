import { create } from 'zustand';
import { fetchPricingConfig } from '../services/pricing.service';
import { PricingConfigItem, PricingValues, ServiceType } from '../types/pricing';

interface PricingStore {
  configs: Record<ServiceType, PricingConfigItem[]>;
  loading: boolean;
  error: string | null;
  fetchPricing: (serviceType: ServiceType) => Promise<void>;
  getPricingValues: (serviceType: ServiceType) => PricingValues;
}

const DEFAULT_PRICING: Record<ServiceType, PricingValues> = {
  FOOD: {
    platformFee: 5,
    platformFeeOriginal: 12,
    deliveryFee: 20,
    deliveryFeeOriginal: 39,
    gstRate: 0.18,
    commissionRate: 0.10,
    packagingCharges: 0,
    packagingChargesOriginal: 8,
  },
  GROCERY: {
    platformFee: 3,
    platformFeeOriginal: 12,
    deliveryFee: 17,
    deliveryFeeOriginal: 39,
    gstRate: 0.18,
    commissionRate: 0.02,
    packagingCharges: 0,
    packagingChargesOriginal: 4,
  },
};

function configToValue(items: PricingConfigItem[], key: string): number | undefined {
  const item = items.find(i => i.configKey === key && i.isActive);
  return item?.actualValue;
}

function configToExpected(items: PricingConfigItem[], key: string): number | undefined {
  const item = items.find(i => i.configKey === key && i.isActive);
  return item?.expectedValue ?? undefined;
}

function parsePricingValues(items: PricingConfigItem[], serviceType: ServiceType): PricingValues {
  const defaults = DEFAULT_PRICING[serviceType];
  return {
    platformFee: configToValue(items, 'PLATFORM_FEE') ?? defaults.platformFee,
    platformFeeOriginal: configToExpected(items, 'PLATFORM_FEE') ?? defaults.platformFeeOriginal,
    deliveryFee: configToValue(items, 'DELIVERY_FEE') ?? defaults.deliveryFee,
    deliveryFeeOriginal: configToExpected(items, 'DELIVERY_FEE') ?? defaults.deliveryFeeOriginal,
    gstRate: (configToValue(items, 'GST') ?? defaults.gstRate * 100) / 100,
    commissionRate: (configToValue(items, 'COMMISSION') ?? defaults.commissionRate * 100) / 100,
    packagingCharges: configToValue(items, 'PACKAGING_CHARGE') ?? defaults.packagingCharges,
    packagingChargesOriginal: configToExpected(items, 'PACKAGING_CHARGE') ?? defaults.packagingChargesOriginal,
  };
}

const usePricingStore = create<PricingStore>((set, get) => ({
  configs: { FOOD: [], GROCERY: [] },
  loading: false,
  error: null,

  fetchPricing: async (serviceType: ServiceType) => {
    set({ loading: true, error: null });
    try {
      const items = await fetchPricingConfig(serviceType);
      set(state => ({
        configs: { ...state.configs, [serviceType]: items },
        loading: false,
      }));
    } catch (err: unknown) {
      set({
        loading: false,
        error: (err as Error)?.message || 'Failed to fetch pricing config',
      });
    }
  },

  getPricingValues: (serviceType: ServiceType) => {
    const items = get().configs[serviceType];
    if (items.length === 0) {
      return DEFAULT_PRICING[serviceType];
    }
    return parsePricingValues(items, serviceType);
  },
}));

export default usePricingStore;
