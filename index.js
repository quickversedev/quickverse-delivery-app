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

messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    const title = remoteMessage.notification?.title || remoteMessage.data?.title;
    const body = remoteMessage.notification?.body || remoteMessage.data?.body;

    if (!title && !body) {
      return;
    }

    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    await notifee.displayNotification({
      title,
      body,
      data: remoteMessage.data,
      android: {
        channelId,
        pressAction: { id: 'default' },
      },
    });
  } catch (error) {
    console.warn('[FCM] Background notification display failed:', error);
  }
});

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    console.log('[Notifee] Background press:', detail.notification?.data);
  }
});

enableScreens();
AppRegistry.registerComponent(appName, () => App);
