// ─── Filter Period ──────────────────────────────────────────────────────────
export type EarningsPeriod = 'today' | 'thisWeek' | 'thisMonth' | 'lifetime';

// ─── API 1: Earnings Summary (v3) ───────────────────────────────────────────
// GET /quickVerse/v3/delivery-partner/earnings-summary?filter=<filter>
export type PercentageStatus = 'positive' | 'negative';

export interface EarningsBreakdownV3 {
  baseEarning: number;
  distanceEarning: number;
  surgeEarning: number;
  tips: number;
}

export interface EarningsSummaryV3 {
  totalEarnings: number;
  percentage: number;
  percentageStatus: PercentageStatus;
  payoutBalance: number;
  breakdown: EarningsBreakdownV3;
}

// ─── API 2: Weekly 7-Day Chart (v3) ─────────────────────────────────────────
// GET /quickVerse/v3/delivery-partner/earnings-chart
export interface ChartDayV3 {
  day: string;
  amount: number;
  ordersCount: number;
}

export interface EarningsChartV3 {
  totalAmount: number;
  chartData: ChartDayV3[];
}

// ─── API 3: Today Orders & Payment Summary (v3) ──────────────────────────────
// GET /quickVerse/v3/delivery-partner/today-orders-summary
export interface TodayOrdersSummaryV3 {
  totalOrders: number;
  prepaidOrders: number;
  codOrders: number;
  cashToSubmit: number;
}

// ─── Legacy types (kept for backward compat — not used in new Earnings Screen) ──
/** @deprecated Use EarningsSummaryV3 instead */
export type TransactionType = 'ALL' | 'COD' | 'UPI' | 'REFUND' | 'BONUS';

/** @deprecated */
export interface EarningsSummary {
  totalEarnings: number;
  percentageChange: number;
  comparisonLabel: string;
  ordersDone: number;
  basePay: number;
  orderEarnings: number;
  bonus: number;
  tips: number;
  codAmount: number;
  codQrAmount: number;
  prepaidAmount: number;
}

/** @deprecated */
export interface DailyEarning {
  day: string;
  amount: number;
  isToday: boolean;
}

/** @deprecated */
export interface EarningsBreakdown {
  basePay: number;
  orderEarnings: number;
  orderEarningsFormula: string;
  bonus: number;
  bonusLabel: string;
  tipsReceived: number;
  total: number;
}

/** @deprecated */
export interface TipsDashboard {
  cashTips: number;
  upiTips: number;
  totalTips: number;
  topTipper: { name: string; amount: number } | null;
}

/** @deprecated */
export interface CashReconciliation {
  collected: number;
  deposited: number;
  cashInHand: number;
  difference: number;
  status: 'balanced' | 'surplus' | 'deficit';
}

/** @deprecated */
export interface Transaction {
  id: string;
  orderId: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
  description: string;
}

/** @deprecated */
export interface EarningsData {
  summary: EarningsSummary;
  last7Days: DailyEarning[];
  breakdown: EarningsBreakdown;
  tips: TipsDashboard;
  cashReconciliation: CashReconciliation;
  transactions: Transaction[];
}
