import { useEffect, useMemo, useState } from 'react';
import deliveryPartnerService, {
  type OrderEstimate,
} from '../services/delivery-partner.service';
import type { Coordinate } from '../utils/location';

/**
 * Backend pickup/drop/total distance and earnings for orders the rider has not accepted yet
 * (Home "new" cards and the Live Order Pool), keyed by orderId.
 *
 * The request is sent as soon as the rider's GPS is available and repeated when the order list changes or the
 * rider moves about 100 m, so the figures always follow the latest coordinates. Until the backend answers an
 * order has no entry and the card shows its "calculating" state.
 */
const useOrderEstimates = (
  orderIds: string[],
  location: Coordinate | null,
): Record<string, OrderEstimate> => {
  const [estimates, setEstimates] = useState<Record<string, OrderEstimate>>({});

  const idsKey = useMemo(
    () => [...new Set(orderIds.filter(Boolean))].sort().join(','),
    [orderIds],
  );
  const latitude = location?.latitude ?? null;
  const longitude = location?.longitude ?? null;
  // 3 decimals of a degree is roughly 110 m: re-estimate only after a meaningful move.
  const gpsKey =
    latitude != null && longitude != null
      ? `${latitude.toFixed(3)},${longitude.toFixed(3)}`
      : null;

  useEffect(() => {
    if (!idsKey || latitude == null || longitude == null) {
      return;
    }
    let cancelled = false;
    deliveryPartnerService
      .getOrderEstimates(idsKey.split(','), latitude, longitude)
      .then(list => {
        if (cancelled) return;
        setEstimates(prev => {
          const next = { ...prev };
          list.forEach(estimate => {
            next[estimate.orderId] = estimate;
          });
          return next;
        });
      })
      .catch(error => console.warn('Order estimates unavailable:', error));
    return () => {
      cancelled = true;
    };
    // latitude/longitude are covered by gpsKey on purpose (re-run only after a ~100 m move).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, gpsKey]);

  return estimates;
};

export default useOrderEstimates;
