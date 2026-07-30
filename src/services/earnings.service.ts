import axiosInstance, { apiCall } from './axios.config';
import { TokenStorage } from '../utils/storage';
import type {
  EarningsData,
  EarningsPeriod,
  TransactionType,
} from '../types/earnings';

type EarningsApiResponse = {
  riderInfo: {
    id: string;
    name: string;
    profilePicture: string;
    isOnline: boolean;
  };
  earningsSummary: {
    totalEarnings: number;
    increasePercent: number;
    decreasePercent: number;
    earningsBreakdown: {
      ordersDone: number;
      basePay: number;
      orderEarnings: number;
      bonus: number;
      tips: number;
      codAmount: number;
      codQrAmount: number;
      prepaidAmount: number;
    };
  };
  charts: Array<{
    day: string;
    amount: number;
  }>;
};

type OrderHistoryApiResponse = {
  orders: Array<{
    orderId: string;
    orderStatus: string;
    time: string;
    route: {
      pickupLocation: string;
      dropoffLocation: string;
    };
    amount: number;
    paymentMethod: string;
  }>;
};

const EARNINGS_FILTER_MAP: Record<EarningsPeriod, string> = {
  today: 'today',
  thisWeek: 'this_week',
  thisMonth: 'this_month',
  lifetime: 'lifetime',
};

const ORDER_HISTORY_FILTER_MAP: Record<EarningsPeriod, string> = {
  today: 'today',
  thisWeek: 'this_week',
  thisMonth: 'this_month',
  lifetime: 'lifetime',
};

const COMPARISON_LABELS: Record<EarningsPeriod, string> = {
  today: 'vs yesterday',
  thisWeek: 'vs last week',
  thisMonth: 'vs last month',
  lifetime: 'all time',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatTimestamp = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const hours = d.getHours();
  const mins = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const timeStr = `${h}:${String(mins).padStart(2, '0')} ${ampm}`;

  if (isToday) { return `Today, ${timeStr}`; }
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${timeStr}`;
};

const mapPaymentMethod = (method: string): TransactionType => {
  const lower = (method || '').toLowerCase();
  if (lower === 'upi' || lower === 'online') { return 'UPI'; }
  return 'COD';
};

const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Order Delivered',
  REJECTED: 'Order Rejected',
  CANCELLED: 'Order Cancelled',
  PICKED_UP: 'Order Picked Up',
  ACCEPTED: 'Order Accepted',
  PARTNER_ASSIGNED: 'Partner Assigned',
  ARRIVED_AT_STORE: 'Arrived at Store',
  ARRIVED_AT_DESTINATION: 'Arrived at Destination',
};

const getEarningsData = async (
  partnerId: string,
  period: EarningsPeriod,
): Promise<EarningsData> => {
  const sessionKey = await TokenStorage.getToken();
  const earningsFilter = EARNINGS_FILTER_MAP[period];
  const orderFilter = ORDER_HISTORY_FILTER_MAP[period];
  const headers = {
    SessionKey: sessionKey || '',
    'Request-Origin': 'TRANSPORTER',
  };
  const validateStatus = (status: number) => status >= 200 && status < 400;

  console.log(`[Earnings] Fetching — earnings filter=${earningsFilter}, order filter=${orderFilter}, partner=${partnerId}`);

  const [earningsResponse, orderHistoryResponse] = await Promise.all([
    apiCall<EarningsApiResponse>(
      axiosInstance.get(`/v1/delivery-partner/${partnerId}/earnings-summary`, {
        params: { filter: earningsFilter },
        headers,
        validateStatus,
      }),
    ),
    apiCall<OrderHistoryApiResponse>(
      axiosInstance.get(`/v1/delivery-partner/${partnerId}/order-history`, {
        params: { filter: orderFilter },
        headers,
        validateStatus,
      }),
    ).catch(err => {
      console.warn('[Earnings] Order history fetch failed:', JSON.stringify(err, null, 2));
      return { orders: [] } as OrderHistoryApiResponse;
    }),
  ]);

  console.log('[Earnings] Summary response:', JSON.stringify(earningsResponse, null, 2));
  console.log('[Earnings] Order history raw response:', JSON.stringify(orderHistoryResponse, null, 2));

  const payload = (earningsResponse as any)?.data ?? earningsResponse;
  const earningsSummary = payload?.earningsSummary ?? {};
  const charts = payload?.charts ?? [];
  const bd = earningsSummary?.earningsBreakdown ?? {};

  const percentageChange =
    (earningsSummary.increasePercent ?? 0) > 0
      ? earningsSummary.increasePercent
      : (earningsSummary.decreasePercent ?? 0) > 0
        ? -earningsSummary.decreasePercent
        : 0;

  const orderPayload = (orderHistoryResponse as any)?.data ?? orderHistoryResponse;
  const orders = orderPayload?.orders ?? [];
  console.log(`[Earnings] Parsed ${orders.length} orders from history`);

  const transactions = orders.map((order: any) => ({
    id: order.orderId,
    orderId: `#${order.orderId}`,
    type: mapPaymentMethod(order.paymentMethod),
    amount: order.amount,
    timestamp: formatTimestamp(order.time),
    description: STATUS_LABELS[order.orderStatus] || order.orderStatus,
  }));

  return {
    summary: {
      totalEarnings: earningsSummary.totalEarnings ?? 0,
      percentageChange,
      comparisonLabel: COMPARISON_LABELS[period] || 'vs yesterday',
      ordersDone: bd.ordersDone ?? 0,
      basePay: bd.basePay ?? 0,
      orderEarnings: bd.orderEarnings ?? 0,
      bonus: bd.bonus ?? 0,
      tips: bd.tips ?? 0,
      codAmount: bd.codAmount ?? 0,
      codQrAmount: bd.codQrAmount ?? 0,
      prepaidAmount: bd.prepaidAmount ?? 0,
    },
    last7Days: (charts ?? []).map((d: {day: string; amount: number}) => ({
      day: d.day,
      amount: d.amount,
      isToday: ['Today', 'This Week', 'This Month'].includes(d.day),
    })),
    breakdown: {
      basePay: bd.basePay ?? 0,
      orderEarnings: bd.orderEarnings ?? 0,
      orderEarningsFormula: '',
      bonus: bd.bonus ?? 0,
      bonusLabel: '',
      tipsReceived: bd.tips ?? 0,
      total: earningsSummary.totalEarnings ?? 0,
    },
    tips: {
      cashTips: 0,
      upiTips: 0,
      totalTips: bd.tips ?? 0,
      topTipper: null,
    },
    cashReconciliation: {
      collected: 0,
      deposited: 0,
      cashInHand: 0,
      difference: 0,
      status: 'balanced',
    },
    transactions,
  };
};

const earningsService = { getEarningsData };
export default earningsService;
