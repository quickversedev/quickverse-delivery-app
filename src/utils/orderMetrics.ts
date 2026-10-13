import type {
  DeliveryPartnerOrder,
  OrderEstimate,
} from '../services/delivery-partner.service';

/** Shown while a value is still being resolved (waiting for the rider's GPS or the backend). */
export const CALCULATING_LABEL = 'Calculating…';
/** Shown when a value does not exist (never a made-up number). */
export const EMPTY_LABEL = '--';

/**
 * Distance + earnings figures for one order card. Every number comes from the backend:
 * - before accept: the backend estimate for the rider's GPS (`OrderEstimate`),
 * - after accept: the order's own backend values.
 * The app never calculates distance or earnings itself; null means "not available yet".
 */
export type OrderMetrics = {
  pickupKm: number | null;
  dropKm: number | null;
  totalKm: number | null;
  earnings: number | null;
  /** earnings / totalKm, derived from the two backend values above. */
  perKm: number | null;
  /** True while pickup / total / earnings are not final yet. */
  pending: boolean;
};

const derivePerKm = (earnings: number | null, totalKm: number | null) =>
  earnings != null && totalKm != null && totalKm > 0 ? earnings / totalKm : null;

/** Metrics for an order the rider has not accepted yet. */
export const metricsFromEstimate = (
  estimate: OrderEstimate | null | undefined,
  fallbackDropKm: number | null = null,
): OrderMetrics => {
  const earnings = estimate?.estimatedEarning ?? null;
  const totalKm = estimate?.totalDistance ?? null;
  return {
    pickupKm: estimate?.pickupDistance ?? null,
    dropKm: estimate?.dropDistance ?? fallbackDropKm,
    totalKm,
    earnings,
    perKm: derivePerKm(earnings, totalKm),
    pending: estimate == null || estimate.locationPending,
  };
};

/**
 * Metrics for an order the rider has accepted: the backend values on the order as they are. Only while the
 * backend has no pickup distance yet (`locationPending`) the live estimate is used, so a drop-only amount is
 * never shown as the earnings.
 */
export const metricsFromOrder = (
  order: DeliveryPartnerOrder,
  estimate?: OrderEstimate | null,
): OrderMetrics => {
  if (order.locationPending) {
    return metricsFromEstimate(estimate, order.dropDistance);
  }
  const earnings = order.riderEarnings ?? null;
  const totalKm = order.totalDistance;
  return {
    pickupKm: order.pickupDistance,
    dropKm: order.dropDistance,
    totalKm,
    earnings,
    perKm: derivePerKm(earnings, totalKm),
    pending: false,
  };
};

/** "3.2 km", or the given label when the value is not available. */
export const formatKm = (
  value: number | null | undefined,
  emptyLabel: string = EMPTY_LABEL,
): string => (value == null ? emptyLabel : `${value.toFixed(1)} km`);

/** "₹35.88", or the given label when the value is not available. */
export const formatRupees = (
  value: number | null | undefined,
  emptyLabel: string = EMPTY_LABEL,
): string => (value == null ? emptyLabel : `₹${value.toFixed(2)}`);

/** Plain number with 2 decimals (for the "₹ [value]" per-km box), or the label when not available. */
export const formatAmount = (
  value: number | null | undefined,
  emptyLabel: string = EMPTY_LABEL,
): string => (value == null ? emptyLabel : value.toFixed(2));
