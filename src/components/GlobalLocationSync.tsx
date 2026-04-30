import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import { getBestEffortCurrentLocation } from '../utils/location';

const LOCATION_SYNC_INTERVAL_MS = 4 * 60 * 1000;

const GlobalLocationSync: React.FC = () => {
  const { authData, isLoggedIn, isBootstrapping } = useAuthStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncInProgressRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const syncLocation = useCallback(async () => {
    if (
      !authData.partnerId ||
      isSyncInProgressRef.current ||
      appStateRef.current !== 'active'
    ) {
      return;
    }

    try {
      isSyncInProgressRef.current = true;

      const coordinate = await getBestEffortCurrentLocation();

      await deliveryPartnerService.updateDeliveryPartnerLocation(
        authData.partnerId,
        coordinate.latitude,
        coordinate.longitude,
      );
    } catch (error) {
      console.error('Global location sync failed', error);
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, [authData.partnerId]);

  useEffect(() => {
    const clearSyncInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (isBootstrapping || !isLoggedIn || !authData.partnerId) {
      clearSyncInterval();
      return;
    }

    syncLocation();
    intervalRef.current = setInterval(syncLocation, LOCATION_SYNC_INTERVAL_MS);

    return clearSyncInterval;
  }, [authData.partnerId, isBootstrapping, isLoggedIn, syncLocation]);

  return null;
};

export default GlobalLocationSync;
