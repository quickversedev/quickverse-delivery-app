import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';
import { getBestEffortCurrentLocation } from '../utils/location';

interface DeviceRegistryRequest {
  phone: string;
  role: 'TRANSPORTER';
  deviceId: string;
  deviceType: string;
  deviceModel: string;
  deviceBrand: string;
  osVersion: string;
  appVersion: string;
  fcmToken: string;
  tokenType: string;
  lastActiveTimestamp: string;
  notificationEnabled: boolean;
  longitude: number;
  latitude: number;
  loginTimestamp: string;
}

async function getDeviceDetails(): Promise<
  Pick<
    DeviceRegistryRequest,
    | 'deviceId'
    | 'deviceType'
    | 'deviceModel'
    | 'deviceBrand'
    | 'osVersion'
    | 'appVersion'
  >
> {
  const [uniqueId, model, brand, systemVersion, version] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.getModel(),
    DeviceInfo.getBrand(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getVersion(),
  ]);

  return {
    deviceId: uniqueId,
    deviceType: Platform.OS.toUpperCase(),
    deviceModel: model,
    deviceBrand: brand,
    osVersion: systemVersion,
    appVersion: version,
  };
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function getFcmToken(): Promise<string> {
  try {
    const messaging = require('@react-native-firebase/messaging').default;
    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
      console.warn('[DeviceRegistry] Notification permission not granted');
      return '';
    }
    const token = await messaging().getToken();
    console.log('[DeviceRegistry] FCM token:', token || '(empty)');
    return token;
  } catch (e) {
    console.warn('[DeviceRegistry] FCM token fetch failed:', e);
    return '';
  }
}

async function updateDeviceRegistry(
  phoneOverride?: string,
  tokenOverride?: string,
): Promise<void> {
  const phone = phoneOverride || await TokenStorage.getPhoneNumber();
  if (!phone) {
    return;
  }
  const sessionKey = tokenOverride || await TokenStorage.getToken();

  const [device, fcmToken, location] = await Promise.all([
    withTimeout(getDeviceDetails(), 5000, {
      deviceId: 'unknown',
      deviceType: Platform.OS.toUpperCase(),
      deviceModel: 'unknown',
      deviceBrand: 'unknown',
      osVersion: 'unknown',
      appVersion: '1.0',
    }),
    withTimeout(getFcmToken(), 10000, ''),
    withTimeout(
      getBestEffortCurrentLocation().catch(() => ({
        latitude: 0,
        longitude: 0,
      })),
      10000,
      { latitude: 0, longitude: 0 },
    ),
  ]);

  const now = new Date().toISOString();

  const body: DeviceRegistryRequest = {
    phone,
    role: 'TRANSPORTER',
    ...device,
    fcmToken,
    tokenType: 'FCM',
    lastActiveTimestamp: now,
    notificationEnabled: fcmToken.length > 0,
    latitude: location.latitude,
    longitude: location.longitude,
    loginTimestamp: now,
  };

  console.log(
    '[DeviceRegistry] Registering device — fcmToken:',
    fcmToken ? 'present' : 'MISSING',
    '| phone:',
    phone,
  );

  await apiCall<void>(
    axiosInstance.post('/quickVerse/v1/updateDeviceRegistry', body, {
      headers: {
        SessionKey: sessionKey || '',
      },
    }),
  );

  console.log(
    '[DeviceRegistry] Registration successful — fcmToken:',
    fcmToken.substring(0, 20) + '...',
  );
}

async function updateDeviceRegistrySafe(
  phone?: string,
  token?: string,
): Promise<void> {
  try {
    await updateDeviceRegistry(phone, token);
  } catch (error) {
    console.warn('[DeviceRegistry] Update failed:', error);
  }
}

const deviceRegistryService = {
  updateDeviceRegistry,
  updateDeviceRegistrySafe,
  getFcmToken,
};
export default deviceRegistryService;
