/**
 * @format
 */

import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

import {
  extractOrderIdFromNotificationPayload,
  persistPendingOrderId,
} from './src/services/notification/notificationRedirect';

const CHANNELS = [
  {
    id: 'default_channel',
    name: 'Default Notifications',
    sound: 'noti',
  },
  {
    id: 'order_assigned_channel',
    name: 'Order Assigned',
    sound: 'noti1',
  },
  {
    id: 'order_unassigned_channel',
    name: 'Order Unassigned',
    sound: 'noti2',
  },
];

const createNotificationChannels = async () => {
  await Promise.all(
    CHANNELS.map(channel =>
      notifee.createChannel({
        id: channel.id,
        name: channel.name,
        sound: channel.sound,
        importance: AndroidImportance.HIGH,
      }),
    ),
  );

  // Remove stale channels from older builds
  await Promise.all([
    notifee.deleteChannel('default'),
    notifee.deleteChannel('new_order_channel'),
    notifee.deleteChannel('order_cancelled_channel'),
    notifee.deleteChannel('order_delivered'),
  ]).catch(() => {});
};

// Create channels immediately on app startup
createNotificationChannels();

const getStableNotificationId = remoteMessage => {
  const orderId = extractOrderIdFromNotificationPayload(remoteMessage);

  if (remoteMessage?.messageId) {
    return `msg-${remoteMessage.messageId}`;
  }

  if (orderId) {
    return `order-${orderId}`;
  }

  return `fallback-${Date.now()}`;
};

const displayForegroundNotification = async remoteMessage => {
  const title =
    remoteMessage?.notification?.title ?? remoteMessage?.data?.title ?? '';

  const body =
    remoteMessage?.notification?.body ?? remoteMessage?.data?.body ?? '';

  if (!title && !body) {
    return;
  }

  const channelId =
    remoteMessage?.data?.channelId ||
    remoteMessage?.notification?.android?.channelId ||
    'default_channel';

  await notifee.displayNotification({
    id: getStableNotificationId(remoteMessage),
    title,
    body,
    data: remoteMessage?.data,

    android: {
      channelId,
      smallIcon: 'ic_notification',
      color: '#0E6DFD',
      pressAction: {
        id: 'default',
      },
    },
  });
};

/**
 * Foreground
 *
 * Android DOES NOT show notification payload automatically
 * while app is open.
 *
 * We display it manually.
 */
messaging().onMessage(async remoteMessage => {
  console.log('Foreground Message:', remoteMessage);

  // Navigation happens only when the partner taps the notification
  // (see notifee event handlers), never on arrival.
  await displayForegroundNotification(remoteMessage);
});

/**
 * Background / Killed
 *
 * Notification payload:
 * Android OS handles it.
 *
 * Data payload:
 * Handle it yourself if needed.
 */
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Notification payload?
  // Android OS already displayed it.
  if (remoteMessage.notification) {
    return;
  }

  // Data-only payload?
  await displayForegroundNotification(remoteMessage);
});

/**
 * Notification Tap
 */
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.PRESS && type !== EventType.ACTION_PRESS) {
    return;
  }

  const orderId = extractOrderIdFromNotificationPayload({
    data: detail.notification?.data,
    body: detail.notification?.body,
  });

  if (orderId) {
    persistPendingOrderId(orderId);
  }
});

enableScreens();
AppRegistry.registerComponent(appName, () => App);
