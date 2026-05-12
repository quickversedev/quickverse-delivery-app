import 'text-encoding-polyfill';
import { Client, IMessage } from '@stomp/stompjs';
import { API_CONFIG } from './axios.config';

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
  const isLocal = hostPath.startsWith('10.0.2.2') || hostPath.startsWith('localhost') || hostPath.startsWith('127.');
  return `${scheme}://${hostPath}/${isLocal ? 'ws-raw' : 'ws/websocket'}`;
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

const websocketService = { connect, disconnect, isConnected, onStatusChange };
export default websocketService;
