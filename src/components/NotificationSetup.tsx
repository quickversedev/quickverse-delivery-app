import { useEffect, useRef } from 'react';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import useAuthStore from '../hooks/useAuthStore';
import { requestLocationAccess } from '../utils/location';

async function requestNotificationPermission(): Promise<void> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in Settings to receive order updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }

  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('[Notifications] Permission denied');
  }
}

function handleNotificationTap(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) {
  if (!remoteMessage) {
    return;
  }
  console.log('[Notifications] Opened from tap:', remoteMessage.messageId);
}

function NotificationSetup(): null {
  const { isLoggedIn } = useAuthStore();
  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Foreground message:', remoteMessage.notification);
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'New Notification',
          remoteMessage.notification.body || '',
        );
      }
    });

    messaging().onNotificationOpenedApp(handleNotificationTap);

    messaging()
      .getInitialNotification()
      .then(handleNotificationTap);

    return unsubscribeForeground;
  }, []);

  useEffect(() => {
    if (!isLoggedIn || hasRequestedPermissions.current) {
      return;
    }

    hasRequestedPermissions.current = true;

    (async () => {
      await requestNotificationPermission();
      await requestLocationAccess();
    })();
  }, [isLoggedIn]);

  return null;
}

export default NotificationSetup;
