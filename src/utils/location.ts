import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

const requestAndroidLocationPermission = async (): Promise<boolean> => {
  const coarseGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  const fineGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  if (coarseGranted || fineGranted) {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: 'Location access required',
      message:
        'We need your location to calculate delivery distances and keep tracking updated.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    },
  );

  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const requestLocationAccess = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    return requestAndroidLocationPermission();
  }

  if (
    Platform.OS === 'ios' &&
    typeof Geolocation.requestAuthorization === 'function'
  ) {
    return new Promise(resolve => {
      Geolocation.requestAuthorization();
      resolve(true);
    });
  }

  return true;
};

const getCurrentPosition = (options: {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
}): Promise<Coordinate> => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      error => {
        reject(error);
      },
      options,
    );
  });
};

export const getBestEffortCurrentLocation = async (): Promise<Coordinate> => {
  const hasAccess = await requestLocationAccess();
  if (!hasAccess) {
    throw new Error('Location permission denied');
  }

  try {
    return await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 25000,
      maximumAge: 0,
    });
  } catch (error: any) {
    const errorCode = typeof error?.code === 'number' ? error.code : null;

    if (errorCode === 3 || errorCode === 2 || errorCode === 4) {
      return getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      });
    }

    throw error;
  }
};
