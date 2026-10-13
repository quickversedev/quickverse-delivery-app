export type PoolStatus = 'OPEN' | 'CLAIMED' | 'EXPIRED';

export interface PoolOrder {
  poolId: string;
  orderId: string;
  orderMasterId: string | null;
  regionId: string | null;
  vendorName: string | null;
  vendorLatitude: number | null;
  vendorLongitude: number | null;
  customerAddress: string | null;
  estimatedDistanceKm: number | null;
  estimatedEarning: number | null;
  status: PoolStatus;
  expiresAt: number;
  createdAt: string;
}

export type PoolEventType = 'ORDER_ADDED' | 'ORDER_CLAIMED' | 'ORDER_EXPIRED';

export interface PoolWebSocketEvent {
  type: PoolEventType;
  poolEntry?: PoolOrder;
  poolId?: string;
  claimedBy?: string;
}
