import { MMKV } from 'react-native-mmkv';

const notificationStorage = new MMKV({ id: 'notification-redirect' });
const PENDING_ORDER_ID_KEY = 'pending-order-id';

const parseJsonSafe = (value: unknown): Record<string, unknown> | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch (_error) {
    // Ignore invalid JSON strings in notification payload.
  }

  return undefined;
};

const extractNumericIdFromText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }

  const match = value.match(/\d{8,}/);
  return match?.[0] ? String(match[0]) : '';
};

type NotificationLikePayload = {
  data?: Record<string, unknown>;
  notification?: {
    body?: unknown;
  };
  body?: unknown;
};

export const extractOrderIdFromNotificationPayload = (
  payload: NotificationLikePayload | undefined,
): string => {
  const data = payload?.data;

  const nestedPayload =
    parseJsonSafe(data?.data) ??
    parseJsonSafe(data?.payload) ??
    parseJsonSafe(data?.meta);

  const value =
    data?.orderId ??
    data?.orderID ??
    data?.OrderId ??
    data?.ORDER_ID ??
    nestedPayload?.orderId ??
    nestedPayload?.orderID ??
    nestedPayload?.OrderId ??
    nestedPayload?.ORDER_ID ??
    extractNumericIdFromText(payload?.notification?.body ?? payload?.body);

  return value ? String(value).trim() : '';
};

export const persistPendingOrderId = (orderId: string) => {
  const normalizedOrderId = String(orderId || '').trim();
  if (!normalizedOrderId) {
    return;
  }

  notificationStorage.set(PENDING_ORDER_ID_KEY, normalizedOrderId);
};

export const consumePendingOrderId = (): string => {
  const pendingOrderId = notificationStorage.getString(PENDING_ORDER_ID_KEY);

  if (pendingOrderId) {
    notificationStorage.delete(PENDING_ORDER_ID_KEY);
  }

  return pendingOrderId ? String(pendingOrderId).trim() : '';
};
