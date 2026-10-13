import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { LocationPermissionScreen } from '../screens';
import { checkLocationPermission } from '../utils/location';
import { isLocationEnabled } from 'react-native-device-info';
import LoadingScreen from './LoadingScreen';

const LocationGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  const checkStatus = async () => {
    const permission = await checkLocationPermission();
    const enabled = await isLocationEnabled();
    setHasLocation(permission && enabled);
  };

  useEffect(() => {
    checkStatus();
    
    // Check when app comes to foreground
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    // Also poll every 3 seconds to catch status changes if the app doesn't background
    const intervalId = setInterval(() => {
      checkStatus();
    }, 3000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, []);

  if (hasLocation === null) {
    return <LoadingScreen />;
  }

  if (!hasLocation) {
    return <LocationPermissionScreen onPermissionGranted={checkStatus} />;
  }

  return <>{children}</>;
};

export default LocationGuard;
