import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { NativeModules } from 'react-native';

const ORDER_ALERT_ENABLED_KEY = '@OrderAlertSoundEnabled';
const ACTIVE_ORDER_ALERT_ID_KEY = '@ActiveOrderAlertNotificationId';
export const ORDER_ALERT_CHANNEL_ID = 'order_assigned_channel';

const { OrderAlertSound } = NativeModules as {
  OrderAlertSound?: {
    start: () => Promise<void>;
    stop: () => Promise<void>;
  };
};

export const getOrderAlertSoundEnabled = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(ORDER_ALERT_ENABLED_KEY);
    return value == null ? true : JSON.parse(value) === true;
  } catch (error) {
    console.warn('[OrderAlert] Failed to read sound setting:', error);
    return true;
  }
};

export const setOrderAlertSoundEnabled = async (
  enabled: boolean,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(ORDER_ALERT_ENABLED_KEY, JSON.stringify(enabled));
    if (!enabled) {
      await stopOrderAlert();
    }
  } catch (error) {
    console.error('[OrderAlert] Failed to save sound setting:', error);
    throw error;
  }
};

export const stopOrderAlert = async (): Promise<void> => {
  try {
    if (!OrderAlertSound) {
      throw new Error('OrderAlertSound native module is unavailable');
    }
    await OrderAlertSound.stop();
    const activeId = await AsyncStorage.getItem(ACTIVE_ORDER_ALERT_ID_KEY);
    if (activeId) {
      await notifee.cancelNotification(activeId);
      await AsyncStorage.removeItem(ACTIVE_ORDER_ALERT_ID_KEY);
    }
  } catch (error) {
    console.error('[OrderAlert] Failed to stop alert:', error);
  }
};

export const playOrderAlert = async (
  orderCount: number,
): Promise<void> => {
  if (!(await getOrderAlertSoundEnabled()) || orderCount <= 0) {
    await stopOrderAlert();
    return;
  }

  try {
    if (!OrderAlertSound) {
      throw new Error('OrderAlertSound native module is unavailable');
    }
    await OrderAlertSound.start();
    console.log('[OrderAlert] Native continuous playback started.');

    await notifee.createChannel({
      id: ORDER_ALERT_CHANNEL_ID,
      name: 'Order Assigned',
      sound: 'noti1',
      importance: AndroidImportance.HIGH,
    });
    const activeId = await AsyncStorage.getItem(ACTIVE_ORDER_ALERT_ID_KEY);
    if (!activeId) {
      const notificationId = `order-alert-${Date.now()}`;
      await notifee.displayNotification({
        id: notificationId,
        title: 'New order waiting',
        body: `${orderCount} order${orderCount === 1 ? '' : 's'} waiting for your response`,
        data: { orderAlert: 'true' },
        android: {
          channelId: ORDER_ALERT_CHANNEL_ID,
          smallIcon: 'ic_notification',
          color: '#0E6DFD',
          ongoing: true,
          autoCancel: false,
          onlyAlertOnce: true,
          pressAction: { id: 'default' },
        },
      });
      await AsyncStorage.setItem(ACTIVE_ORDER_ALERT_ID_KEY, notificationId);
    }
  } catch (error) {
    console.error('[OrderAlert] Failed to play alert:', error);
  }
};
