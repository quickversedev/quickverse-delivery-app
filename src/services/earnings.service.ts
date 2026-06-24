import type {
  EarningsData,
  EarningsPeriod,
} from '../types/earnings';

const MOCK_EARNINGS: EarningsData = {
  summary: {
    totalEarnings: 850,
    percentageChange: 12,
    comparisonLabel: 'vs yesterday',
    ordersDone: 8,
    basePay: 400,
    orderEarnings: 270,
    bonus: 50,
    tips: 130,
  },
  last7Days: [
    { day: 'Mon', amount: 620, isToday: false },
    { day: 'Tue', amount: 810, isToday: false },
    { day: 'Wed', amount: 760, isToday: false },
    { day: 'Thu', amount: 930, isToday: false },
    { day: 'Fri', amount: 580, isToday: false },
    { day: 'Sat', amount: 920, isToday: false },
    { day: 'Today', amount: 850, isToday: true },
  ],
  breakdown: {
    basePay: 400,
    orderEarnings: 270,
    orderEarningsFormula: '18 x ₹15',
    bonus: 50,
    bonusLabel: '30 Orders',
    tipsReceived: 130,
    total: 850,
  },
  tips: {
    cashTips: 80,
    upiTips: 50,
    totalTips: 130,
    topTipper: { name: 'Priya Sharma', amount: 30 },
  },
  cashReconciliation: {
    collected: 8250,
    deposited: 6450,
    cashInHand: 1800,
    difference: 0,
    status: 'balanced',
  },
  transactions: [
    {
      id: '1',
      orderId: '#ORD-7821',
      type: 'COD',
      amount: 350,
      timestamp: 'Today, 11:45 AM',
      description: 'COD Collection',
    },
    {
      id: '2',
      orderId: '#ORD-7819',
      type: 'UPI',
      amount: 220,
      timestamp: 'Today, 10:30 AM',
      description: 'UPI Payment',
    },
    {
      id: '3',
      orderId: '#ORD-7815',
      type: 'COD',
      amount: 480,
      timestamp: 'Today, 09:15 AM',
      description: 'COD Collection',
    },
    {
      id: '4',
      orderId: '#ORD-7810',
      type: 'BONUS',
      amount: 50,
      timestamp: 'Yesterday, 08:00 PM',
      description: 'Daily Bonus',
    },
  ],
};

const getEarningsData = async (
  _period: EarningsPeriod,
): Promise<EarningsData> => {
  // TODO: Replace with real API call when backend is ready
  // const sessionKey = TokenStorage.getToken();
  // return apiCall<EarningsData>(
  //   axiosInstance.get('/v1/delivery-partner/earnings', {
  //     params: { period },
  //     headers: { SessionKey: sessionKey || '', 'Request-Origin': 'CAPTAIN' },
  //   }),
  // );
  return MOCK_EARNINGS;
};

const earningsService = { getEarningsData };
export default earningsService;
