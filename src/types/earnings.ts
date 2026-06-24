export type EarningsPeriod = 'today' | 'thisWeek' | 'thisMonth' | 'lifetime';

export type TransactionType = 'ALL' | 'COD' | 'UPI' | 'REFUND' | 'BONUS';

export interface EarningsSummary {
  totalEarnings: number;
  percentageChange: number;
  comparisonLabel: string;
  ordersDone: number;
  basePay: number;
  orderEarnings: number;
  bonus: number;
  tips: number;
}

export interface DailyEarning {
  day: string;
  amount: number;
  isToday: boolean;
}

export interface EarningsBreakdown {
  basePay: number;
  orderEarnings: number;
  orderEarningsFormula: string;
  bonus: number;
  bonusLabel: string;
  tipsReceived: number;
  total: number;
}

export interface TipsDashboard {
  cashTips: number;
  upiTips: number;
  totalTips: number;
  topTipper: {
    name: string;
    amount: number;
  } | null;
}

export interface CashReconciliation {
  collected: number;
  deposited: number;
  cashInHand: number;
  difference: number;
  status: 'balanced' | 'surplus' | 'deficit';
}

export interface Transaction {
  id: string;
  orderId: string;
  type: TransactionType;
  amount: number;
  timestamp: string;
  description: string;
}

export interface EarningsData {
  summary: EarningsSummary;
  last7Days: DailyEarning[];
  breakdown: EarningsBreakdown;
  tips: TipsDashboard;
  cashReconciliation: CashReconciliation;
  transactions: Transaction[];
}
