
import axiosInstance, { apiCall } from './axios.config';
import type {
  EarningsPeriod,
  EarningsSummaryV3,
  EarningsChartV3,
  TodayOrdersSummaryV3,
} from '../types/earnings';
import { TokenStorage } from '../utils/storage';

// ─── Filter Param Mapping ────────────────────────────────────────────────────
const FILTER_MAP: Record<EarningsPeriod, string> = {
  today: 'today',
  thisWeek: 'this_week',
  thisMonth: 'this_month',
  lifetime: 'lifetime',
};

const getHeaders = async () => {
  const sessionKey = await TokenStorage.getToken();
  return {
    SessionKey: sessionKey || '',
    'Request-Origin': 'TRANSPORTER',
  };
};

// ─── Comparison Labels (for UI display) ─────────────────────────────────────
export const COMPARISON_LABEL: Record<EarningsPeriod, string> = {
  today: 'vs yesterday',
  thisWeek: 'vs prev. week',
  thisMonth: 'vs last month',
  lifetime: '',
};

// ─── API 1: Earnings Summary ─────────────────────────────────────────────────
// GET /quickVerse/v3/delivery-partner/{partnerId}/earnings-summary?filter=<filter>
const getEarningsSummary = async (
  partnerId: string,
  period: EarningsPeriod,
): Promise<EarningsSummaryV3> => {
  const filter = FILTER_MAP[period];
  console.log(`[EarningsService] getEarningsSummary — filter=${filter}`);

  const headers = await getHeaders();

  const raw = await apiCall<EarningsSummaryV3>(
    axiosInstance.get(`/quickVerse/v3/delivery-partner/${partnerId}/earnings-summary`, {
      params: { filter },
      headers,
    }),
  );

  console.log('[EarningsService] Summary response:', JSON.stringify(raw, null, 2));
  return raw;
};

// ─── API 2: 7-Day Earnings Chart ─────────────────────────────────────────────

const getEarningsChart = async (partnerId: string): Promise<EarningsChartV3> => {
  console.log('[EarningsService] getEarningsChart');

  const headers = await getHeaders();

  const raw = await apiCall<EarningsChartV3>(
    axiosInstance.get(`/quickVerse/v3/delivery-partner/${partnerId}/earnings-chart`, {
      headers,
    }),
  );

  console.log('[EarningsService] Chart response:', JSON.stringify(raw, null, 2));
  return raw;
};

// ─── API 3: Today Orders & Payment Summary ───────────────────────────────────

const getTodayOrdersSummary = async (
  partnerId: string,
  period: EarningsPeriod,
): Promise<TodayOrdersSummaryV3> => {
  const filter = FILTER_MAP[period];
  console.log(`[EarningsService] getTodayOrdersSummary — filter=${filter}`);

  const headers = await getHeaders();

  const raw = await apiCall<TodayOrdersSummaryV3>(
    axiosInstance.get(`/quickVerse/v3/delivery-partner/${partnerId}/today-orders-summary`, {
      params: { filter },
      headers,
    }),
  );

  console.log('[EarningsService] Orders summary response:', JSON.stringify(raw, null, 2));
  return raw;
};

const earningsService = {
  getEarningsSummary,
  getEarningsChart,
  getTodayOrdersSummary,
};

export default earningsService;
