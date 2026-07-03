import React, { useCallback, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import { getBestEffortCurrentLocation } from '../utils/location';

const LOCATION_SYNC_INTERVAL_MS = 1000;

const GlobalLocationSync: React.FC = () => {
  const partnerId = useAuthStore(state => state.authData.partnerId);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const isBootstrapping = useAuthStore(state => state.isBootstrapping);

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
    if (!partnerId) {
      console.log('[LocationSync] Skipped — no partnerId');
      return;
    }

    if (appStateRef.current !== 'active') {
      console.log(
        '[LocationSync] Skipped — app not active:',
        appStateRef.current,
      );
      return;
    }

    try {
      isSyncInProgressRef.current = true;
      console.log('[LocationSync] Fetching location for partnerId:', partnerId);

      const coordinate = await getBestEffortCurrentLocation();
      console.log('[LocationSync] Location obtained:', coordinate);

      const response =
        await deliveryPartnerService.updateDeliveryPartnerLocation(
          partnerId,
          coordinate.latitude,
          coordinate.longitude,
        );
      console.log('[LocationSync] Sync successful:', response);
    } catch (error) {
      console.error('[LocationSync] Sync failed:', error);
    } finally {
      isSyncInProgressRef.current = false;
    }
  }, [partnerId]);

  useEffect(() => {
    const clearSyncInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('[LocationSync] Interval cleared');
      }
    };

    if (isBootstrapping || !isLoggedIn || !partnerId) {
      console.log('[LocationSync] Conditions not met — clearing interval', {
        isBootstrapping,
        isLoggedIn,
        partnerId,
      });
      clearSyncInterval();
      return;
    }

    console.log(
      '[LocationSync] Starting sync interval for partnerId:',
      partnerId,
    );
    syncLocation();
    intervalRef.current = setInterval(syncLocation, LOCATION_SYNC_INTERVAL_MS);

    return clearSyncInterval;
  }, [partnerId, isBootstrapping, isLoggedIn, syncLocation]);

  return null;
};

export default GlobalLocationSync;
