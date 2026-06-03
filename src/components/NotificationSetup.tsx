import { useEffect, useRef } from 'react';
import { Linking, PermissionsAndroid, Platform, Alert } from 'react-native';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import useAuthStore from '../hooks/useAuthStore';
import { requestLocationAccess } from '../utils/location';

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

async function displayNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const title = (
    remoteMessage.notification?.title || remoteMessage.data?.title || ''
  ).toString().trim();
  const body = (
    remoteMessage.notification?.body || remoteMessage.data?.body || ''
  ).toString().trim();

  if (!title && !body) {
    console.log('[Notifications] Skipping display — empty title and body');
    return;
  }

  const channelId = await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });

  await notifee.displayNotification({
    title: title || undefined,
    body: body || undefined,
    data: remoteMessage.data,
    android: {
      channelId,
      pressAction: { id: 'default' },
    },
  });
}

function NotificationSetup(): null {
  const { isLoggedIn } = useAuthStore();
  const hasRequestedPermissions = useRef(false);

  useEffect(() => {
    const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Foreground message:', remoteMessage.notification);
      await displayNotification(remoteMessage);
    });

    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log(
        '[Notifications] Opened from background:',
        remoteMessage.messageId,
      );
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log(
            '[Notifications] Opened from quit state:',
            remoteMessage.messageId,
          );
        }
      });

    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        console.log('[Notifee] Foreground press:', detail.notification?.data);
      }
    });

    return () => {
      unsubscribeForeground();
      unsubscribeOpenedApp();
      unsubscribeNotifee();
    };
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
