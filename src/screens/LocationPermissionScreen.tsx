import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  AppState,
} from 'react-native';
import { FONT_FAMILY } from '../theme/typography';
import {
  checkLocationPermission,
  requestLocationAccess,
} from '../utils/location';
import { isLocationEnabled } from 'react-native-device-info';
import { promptForEnableLocationIfNeeded } from 'react-native-android-location-enabler';
import { MapPinOff } from 'lucide-react-native';

const LocationPermissionScreen: React.FC<{
  onPermissionGranted: () => void;
}> = ({ onPermissionGranted }) => {
  const [hasPermission, setHasPermission] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const checkStatus = async () => {
    const permission = await checkLocationPermission();
    setHasPermission(permission);
    const enabled = await isLocationEnabled();
    setLocationEnabled(enabled);

    if (permission && enabled) {
      onPermissionGranted();
    }
  };

  useEffect(() => {
    checkStatus();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleGrantPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await requestLocationAccess();
      if (granted) {
        checkStatus();
      } else {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  const handleEnableLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        await promptForEnableLocationIfNeeded();
        // const enableResult = await RNLocationEnabler.promptForEnableLocationIfNeeded({
        //   interval: 10000,
        //   fastInterval: 5000,
        // });
        // if (enableResult === 'enabled' || enableResult === 'already-enabled') {
        //   checkStatus();
        // }
      } catch (error) {
        console.log('Location enabler error:', error);
      }
    } else {
      Linking.openSettings();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <MapPinOff size={64} color="#EF4444" />
      </View>
      <Text style={styles.title}>Location Required</Text>

      {!hasPermission ? (
        <>
          <Text style={styles.description}>
            We need your location permission to calculate delivery distances and
            keep tracking updated. Please allow location access in your device
            settings.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleGrantPermission}
          >
            <Text style={styles.buttonText}>Allow Location Permission</Text>
          </TouchableOpacity>
        </>
      ) : !locationEnabled ? (
        <>
          <Text style={styles.description}>
            Your device's location services are currently disabled. Please
            enable your phone's location to continue.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={handleEnableLocation}
          >
            <Text style={styles.buttonText}>Enable Phone Location</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.description}>
          Location is enabled. Redirecting...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
    backgroundColor: '#FEE2E2',
    padding: 24,
    borderRadius: 64,
  },
  title: {
    fontFamily: FONT_FAMILY.outfitBold,
    fontSize: 24,
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontFamily: FONT_FAMILY.outfitRegular,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#0E6DFD',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default LocationPermissionScreen;
