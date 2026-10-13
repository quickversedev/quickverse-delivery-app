export interface PricingConfigItem {
  id: string;
  serviceType: string;
  configKey: string;
  actualValue: number;
  expectedValue: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ServiceType = 'FOOD' | 'GROCERY';

export interface PricingValues {
  platformFee: number;
  platformFeeOriginal: number;
  deliveryFee: number;
  deliveryFeeOriginal: number;
  gstRate: number;
  commissionRate: number;
  packagingCharges: number;
  packagingChargesOriginal: number;
}
