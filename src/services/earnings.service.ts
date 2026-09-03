/**
 * earnings.service.ts — v3 API
 *
 * Base Path: /quickVerse/v3/delivery-partner
 * Auth:      JWT Bearer Token (injected automatically by axiosInstance interceptor)
 * Security:  Token-based identity — NO riderId in URL (Zero IDOR)
 */
import axiosInstance, { apiCall } from './axios.config';
import type {
  EarningsPeriod,
  EarningsSummaryV3,
  EarningsChartV3,
  TodayOrdersSummaryV3,
} from '../types/earnings';

// ─── Filter Param Mapping ────────────────────────────────────────────────────
const FILTER_MAP: Record<EarningsPeriod, string> = {
  today: 'today',
  thisWeek: 'this_week',
  thisMonth: 'this_month',
  lifetime: 'lifetime',
};

// ─── Comparison Labels (for UI display) ─────────────────────────────────────
export const COMPARISON_LABEL: Record<EarningsPeriod, string> = {
  today: 'vs yesterday',
  thisWeek: 'vs prev. week',
  thisMonth: 'vs last month',
  lifetime: '',
};

// ─── API 1: Earnings Summary ─────────────────────────────────────────────────
// GET /quickVerse/v3/delivery-partner/earnings-summary?filter=<filter>
const getEarningsSummary = async (
  period: EarningsPeriod,
): Promise<EarningsSummaryV3> => {
  const filter = FILTER_MAP[period];
  console.log(`[EarningsService] getEarningsSummary — filter=${filter}`);

  const raw = await apiCall<EarningsSummaryV3>(
    axiosInstance.get('/quickVerse/v3/delivery-partner/earnings-summary', {
      params: { filter },
    }),
  );

  console.log('[EarningsService] Summary response:', JSON.stringify(raw, null, 2));
  return raw;
};

// ─── API 2: 7-Day Earnings Chart ─────────────────────────────────────────────
// GET /quickVerse/v3/delivery-partner/earnings-chart
// Always returns last 7 days — no filter param
const getEarningsChart = async (): Promise<EarningsChartV3> => {
  console.log('[EarningsService] getEarningsChart');

  const raw = await apiCall<EarningsChartV3>(
    axiosInstance.get('/quickVerse/v3/delivery-partner/earnings-chart'),
  );

  console.log('[EarningsService] Chart response:', JSON.stringify(raw, null, 2));
  return raw;
};

// ─── API 3: Today Orders & Payment Summary ───────────────────────────────────
// GET /quickVerse/v3/delivery-partner/today-orders-summary
// Always returns today's data — no filter param
const getTodayOrdersSummary = async (): Promise<TodayOrdersSummaryV3> => {
  console.log('[EarningsService] getTodayOrdersSummary');

  const raw = await apiCall<TodayOrdersSummaryV3>(
    axiosInstance.get('/quickVerse/v3/delivery-partner/today-orders-summary'),
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
