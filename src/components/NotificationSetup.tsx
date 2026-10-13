import { useEffect, useRef } from 'react';
import {
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  Alert,
} from 'react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import useAuthStore from '../hooks/useAuthStore';
import { requestLocationAccess } from '../utils/location';
import deviceRegistryService from '../services/device-registry.service';
import {
  extractOrderIdFromNotificationPayload,
  persistPendingOrderId,
} from '../services/notification/notificationRedirect';
import { flushPendingOrderNavigation } from '../navigation/NavigationHelper';

async function requestNotificationPermission(): Promise<void> {
  try {
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
      return;
    }

    if (Platform.OS === 'ios') {
      await messaging().registerDeviceForRemoteMessages();
    }
  } catch (error) {
    console.warn('[Notifications] Permission setup failed:', error);
  }
}

// Every tap entry point funnels through here: persist the order id to the
// single MMKV buffer, then attempt to drain it. Routing all sources (FCM and
// notifee, foreground and killed) through one buffer + one guarded consumer
// avoids the double-handling race where a killed-state notifee press is
// delivered both directly and via the headless background handler.
function queueOrderFromNotification(
  payload: { data?: Record<string, unknown>; body?: unknown } | undefined,
): void {
  const orderId = extractOrderIdFromNotificationPayload(payload);
  if (!orderId) {
    return;
  }

  persistPendingOrderId(orderId);
  flushPendingOrderNavigation();
}

function NotificationSetup(): null {
  const { isLoggedIn } = useAuthStore();
  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    // FCM-displayed notification tapped while app was in background.
    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp(
      (remoteMessage: FirebaseMessagingTypes.RemoteMessage) =>
        queueOrderFromNotification(remoteMessage),
    );

    // FCM-displayed notification tapped while app was killed.
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          queueOrderFromNotification(remoteMessage);
        }
      });

    // Notifee-displayed notification tapped while app is in foreground.
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
        return;
      }
      queueOrderFromNotification({
        data: detail.notification?.data,
        body: detail.notification?.body,
      });
    });

    // Notifee-displayed notification tapped while app was killed.
    notifee.getInitialNotification().then(initial => {
      if (initial) {
        queueOrderFromNotification({
          data: initial.notification?.data,
          body: initial.notification?.body,
        });
      }
    });

    const unsubscribeTokenRefresh = messaging().onTokenRefresh(() => {
      deviceRegistryService.updateDeviceRegistrySafe();
    });

    // Drain any id persisted by the headless background press handler (index.js)
    // on launch and every time the app returns to the foreground.
    flushPendingOrderNavigation();

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        flushPendingOrderNavigation();
      }
    });

    return () => {
      unsubscribeOpenedApp();
      unsubscribeNotifee();
      unsubscribeTokenRefresh();
      appStateSubscription.remove();
    };
  }, []);

  // A tap that arrived while logged out stays buffered until auth is ready;
  // drain it once the authenticated navigator is mounted.
  useEffect(() => {
    if (isLoggedIn) {
      flushPendingOrderNavigation();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || hasRequestedPermissions.current) {
      return;
    }

    hasRequestedPermissions.current = true;

    (async () => {
      await requestNotificationPermission();
      await requestLocationAccess();
      // Re-registers the current FCM token; covers tokens rotated while
      // the app was closed or logged out.
      deviceRegistryService.updateDeviceRegistrySafe();
    })();
  }, [isLoggedIn]);

  return null;
}

export default NotificationSetup;
