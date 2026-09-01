import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export const checkLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    const coarseGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    );
    const fineGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    );
    return coarseGranted || fineGranted;
  }
  // On iOS, checking without requesting requires a specific library, so we just assume true or handle differently
  // Since requestLocationAccess does it, we return true and let the system handle it for now.
  return true;
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

export const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const GOOGLE_MAPS_API_KEY = 'AIzaSyBBPlj-9FMg7QqmCNZSR_dWijrMROb3Uxk';
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const components = data.results[0].address_components;
      
      const streetNumber = components.find((c: any) => c.types.includes('street_number'))?.long_name || '';
      const route = components.find((c: any) => c.types.includes('route'))?.long_name || '';
      const sublocality1 = components.find((c: any) => c.types.includes('sublocality_level_1'))?.long_name || '';
      const sublocality2 = components.find((c: any) => c.types.includes('sublocality_level_2'))?.long_name || '';
      const sublocality3 = components.find((c: any) => c.types.includes('sublocality_level_3'))?.long_name || '';
      
      // Combine available parts for a detailed Address Line 1
      const lineParts = [streetNumber, route, sublocality3, sublocality2, sublocality1].filter(Boolean);
      let addressLine1 = lineParts.join(', ');
      
      if (!addressLine1) {
        addressLine1 = data.results[0].formatted_address;
      }

      const city = components.find((c: any) => c.types.includes('locality'))?.long_name || 
                   components.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name || '';
      const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
      const pincode = components.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
      
      const landmark = components.find((c: any) => c.types.includes('point_of_interest'))?.long_name || 
                       components.find((c: any) => c.types.includes('premise'))?.long_name || '';

      return {
        addressLine1,
        city,
        state,
        pincode,
        landmark,
      };
    }
  } catch (error) {
    console.warn('Reverse geocode error:', error);
  }
  return null;
};
