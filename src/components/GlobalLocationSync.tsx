import React, { useEffect, useRef } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import BackgroundService from 'react-native-background-actions';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import { getBestEffortCurrentLocation } from '../utils/location';

const LOCATION_SYNC_INTERVAL_MS = 20000;

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const hasForegroundLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') { return true; }
  return PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
};

const requestBackgroundLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android' || Platform.Version < 29) { return true; }

  const hasForeground = await hasForegroundLocationPermission();
  if (!hasForeground) { return false; }

  const hasBg = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
  );
  if (hasBg) { return true; }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
    {
      title: 'Background Location Access',
      message:
        'QV Delivery needs access to your location in the background so customers can track their delivery even when the app is minimized.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const locationTask = async (taskData?: { partnerId: string }) => {
  const { partnerId } = taskData || {};
  if (!partnerId) { return; }

  await new Promise<void>(async resolve => {
    while (BackgroundService.isRunning()) {
      try {
        const coordinate = await getBestEffortCurrentLocation();
        console.log('[LocationSync] Got location:', coordinate.latitude, coordinate.longitude);
        await deliveryPartnerService.updateDeliveryPartnerLocation(
          partnerId,
          coordinate.latitude,
          coordinate.longitude,
        );
        console.log('[LocationSync] Sync successful');
      } catch (error) {
        console.error('[LocationSync] Sync failed:', error);
      }
      await sleep(LOCATION_SYNC_INTERVAL_MS);
    }
    resolve();
  });
};

const bgOptions = {
  taskName: 'LocationSync',
  taskTitle: 'QV Delivery',
  taskDesc: 'Sharing your location with customers',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#0E6DFD',
  linkingURI: undefined,
  foregroundServiceType: ['location'],
  parameters: { partnerId: '' },
};

const GlobalLocationSync: React.FC = () => {
  const partnerId = useAuthStore(state => state.authData.partnerId);
  const isLoggedIn = useAuthStore(state => state.isLoggedIn);
  const isBootstrapping = useAuthStore(state => state.isBootstrapping);
  const isRunningRef = useRef(false);

  // Request background location permission on startup and when app comes to foreground
  useEffect(() => {
    if (isBootstrapping || !isLoggedIn) { return; }

    requestBackgroundLocationPermission();

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        requestBackgroundLocationPermission();
      }
    });
    return () => subscription.remove();
  }, [isBootstrapping, isLoggedIn]);

  // Start/stop background service — only after foreground location is granted
  useEffect(() => {
    const shouldRun = !isBootstrapping && isLoggedIn && !!partnerId;

    if (!shouldRun) {
      if (isRunningRef.current) {
        console.log('[LocationSync] Stopping background service');
        BackgroundService.stop().then(() => {
          isRunningRef.current = false;
        });
      }
      return;
    }

    const start = async () => {
      if (isRunningRef.current) { return; }

      const hasPermission = await hasForegroundLocationPermission();
      if (!hasPermission) {
        console.log('[LocationSync] Waiting for foreground location permission');
        return;
      }

      try {
        isRunningRef.current = true;
        await BackgroundService.start(locationTask, {
          ...bgOptions,
          parameters: { partnerId },
        });
        console.log('[LocationSync] Background service started for:', partnerId);
      } catch (error) {
        console.error('[LocationSync] Failed to start background service:', error);
        isRunningRef.current = false;
      }
    };

    start();

    // Retry when app comes to foreground (user may have just granted permission via LocationGuard)
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') { start(); }
    });

    return () => {
      subscription.remove();
      if (isRunningRef.current) {
        BackgroundService.stop().then(() => {
          isRunningRef.current = false;
        });
      }
    };
  }, [partnerId, isBootstrapping, isLoggedIn]);

  return null;
};

export default GlobalLocationSync;
