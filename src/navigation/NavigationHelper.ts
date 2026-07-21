import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { TokenStorage } from '../utils/storage';
import deliveryPartnerService from '../services/delivery-partner.service';
import { consumePendingOrderId } from '../services/notification/notificationRedirect';
import useAuthStore from '../hooks/useAuthStore';

export const navigationRef = createNavigationContainerRef<any>();

let navigationInFlight = false;

// The order id lives in MMKV (written by every tap entry point) and is only
// drained here, once the authenticated tab tree is actually mounted. Gating on
// auth matters because navigationRef.isReady() is also true while the login
// stack is mounted — dispatching MainTabs/OrderDelivery there is an unhandled
// action and would silently drop the pending redirect.
const canNavigateToOrder = (): boolean =>
  navigationRef.isReady() && !!useAuthStore.getState().authData?.token;

export const flushPendingOrderNavigation = async (): Promise<void> => {
  if (navigationInFlight || !canNavigateToOrder()) {
    return;
  }

  // Only consume (delete) once we are certain we can route into the authed
  // tree — otherwise the id would be lost while sitting on the login screen.
  const orderId = consumePendingOrderId();
  if (!orderId) {
    return;
  }

  navigationInFlight = true;
  try {
    // Land on the tabs first so the back stack is sane even if the lookup
    // below fails — HomeTab lists assigned orders.
    navigationRef.dispatch(CommonActions.navigate('MainTabs'));

    const partnerId = await TokenStorage.getPartnerId();
    if (!partnerId) {
      return;
    }

    const orders = await deliveryPartnerService.getAssignedOrdersByPartnerId(
      partnerId,
      'all',
    );

    const order = orders.find(o => o.orderId === orderId || o.id === orderId);

    // Re-check auth/readiness: the user may have logged out during the fetch.
    if (order && canNavigateToOrder()) {
      navigationRef.dispatch(CommonActions.navigate('OrderDelivery', { order }));
    }
  } catch (error) {
    console.warn('[Notifications] Failed to open order from notification:', error);
  } finally {
    navigationInFlight = false;
    // A tap that arrived while we were busy left a fresh id behind; drain it so
    // the most recent tap wins.
    if (canNavigateToOrder()) {
      flushPendingOrderNavigation();
    }
  }
};

export const onRootNavigationReady = (): void => {
  flushPendingOrderNavigation();
};
