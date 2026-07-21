import 'text-encoding-polyfill';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { API_CONFIG } from './axios.config';
import type { PoolWebSocketEvent } from '../types/pool.types';

export type OrderActionEvent = {
  orderId: string;
  totalOrderAmount: string;
  totalQuantity: string;
  orderDescription: string;
  orderItems: { id: number; name: string; itemCount: number }[];
  userType: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  id: string;
  status: string;
  message: string;
  createdAt: string;
  createdBy: string;
};

type OrderUpdateCallback = (event: OrderActionEvent) => void;

function buildWsUrl(): string {
  const base = API_CONFIG.baseURL;
  const hostPath = base.replace(/^https?:\/\//, '');
  const isSecure = base.startsWith('https') || hostPath.includes('ngrok');
  const scheme = isSecure ? 'wss' : 'ws';
  return `${scheme}://${hostPath}/ws/websocket`;
}

type StatusListener = (connected: boolean) => void;

let client: Client | null = null;
let currentPartnerId: string | null = null;
let onOrderUpdate: OrderUpdateCallback | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const statusListeners = new Set<StatusListener>();

function notifyStatus(connected: boolean) {
  statusListeners.forEach(fn => fn(connected));
}

function onStatusChange(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(client?.connected ?? false);
  return () => statusListeners.delete(listener);
}

function connect(partnerId: string, callback: OrderUpdateCallback) {
  if (client?.connected && currentPartnerId === partnerId) {
    onOrderUpdate = callback;
    return;
  }

  disconnect();

  currentPartnerId = partnerId;
  onOrderUpdate = callback;

  const wsUrl = buildWsUrl();

  client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    forceBinaryWSFrames: true,
    appendMissingNULLonIncoming: true,
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      notifyStatus(true);
      const topic = `/topic/deliveryPartner/${partnerId}`;
      client?.subscribe(topic, (message: IMessage) => {
        try {
          const event: OrderActionEvent = JSON.parse(message.body);
          onOrderUpdate?.(event);
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      });
    },
    onStompError: (frame) => {
      console.error('STOMP error', frame.headers?.message);
      notifyStatus(false);
    },
    onWebSocketClose: () => {
      notifyStatus(false);
      scheduleReconnect(partnerId, callback);
    },
  });

  client.activate();
}

function scheduleReconnect(partnerId: string, callback: OrderUpdateCallback) {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (currentPartnerId === partnerId) {
      connect(partnerId, callback);
    }
  }, 5000);
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    try {
      client.deactivate();
    } catch (_) {}
    client = null;
  }
  currentPartnerId = null;
  onOrderUpdate = null;
}

function isConnected(): boolean {
  return client?.connected ?? false;
}

// Subscribe to the global order pool topic — returns unsubscribe fn.
// If client is not yet connected, queues the subscription for when it connects.
function subscribeToPool(
  callback: (event: PoolWebSocketEvent) => void,
): () => void {
  const topic = '/topic/orderPool';
  let sub: StompSubscription | null = null;
  let active = true;

  const doSubscribe = () => {
    if (!active || !client?.connected) return;
    try {
      sub = client.subscribe(topic, (message: IMessage) => {
        try {
          const event: PoolWebSocketEvent = JSON.parse(message.body);
          callback(event);
        } catch (e) {
          console.error('Failed to parse pool WebSocket message', e);
        }
      });
    } catch (e) {
      console.error('Failed to subscribe to pool topic', e);
    }
  };

  if (client?.connected) {
    doSubscribe();
  } else if (client) {
    // Queue subscription once STOMP connects
    const origOnConnect = client.onConnect;
    client.onConnect = (frame) => {
      origOnConnect?.(frame);
      doSubscribe();
    };
  }

  return () => {
    active = false;
    try {
      sub?.unsubscribe();
    } catch (_) {}
  };
}

const websocketService = {
  connect,
  disconnect,
  isConnected,
  onStatusChange,
  subscribeToPool,
};
export default websocketService;
