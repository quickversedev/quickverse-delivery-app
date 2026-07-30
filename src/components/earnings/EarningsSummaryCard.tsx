import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsPeriod, EarningsSummary } from '../../types/earnings';

type Props = { data: EarningsSummary; period?: EarningsPeriod };

const StatItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.statItem}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const PERIOD_LABELS: Record<string, string> = {
  today: 'TOTAL EARNINGS TODAY',
  thisWeek: 'TOTAL EARNINGS THIS WEEK',
  thisMonth: 'TOTAL EARNINGS THIS MONTH',
  lifetime: 'TOTAL LIFETIME EARNINGS',
};

const EarningsSummaryCard: React.FC<Props> = ({ data, period }) => {
  const changePositive = data.percentageChange >= 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>{PERIOD_LABELS[period || 'today'] || 'TOTAL EARNINGS TODAY'}</Text>
        {data.percentageChange !== 0 && (
          <View style={[styles.changeBadge, changePositive ? styles.badgePositive : styles.badgeNegative]}>
            <TrendingUp size={12} color={changePositive ? '#16A34A' : '#DC2626'} />
            <Text style={[styles.changeText, changePositive ? styles.changePositive : styles.changeNegative]}>
              {changePositive ? '+' : ''}{data.percentageChange}% {data.comparisonLabel}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.totalAmount}>₹{data.totalEarnings.toLocaleString('en-IN')}</Text>

      <View style={styles.statsRow}>
        <StatItem label="Orders Done" value={String(data.ordersDone)} />
        <StatItem label="Base Pay" value={`₹${data.basePay}`} />
        <StatItem label="Order Earnings" value={`₹${data.orderEarnings}`} />
        <StatItem label="Bonus" value={`₹${data.bonus}`} />
        <StatItem label="Tips" value={`₹${data.tips}`} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePositive: {
    backgroundColor: '#F0FDF4',
  },
  badgeNegative: {
    backgroundColor: '#FEF2F2',
  },
  changeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  changePositive: {
    color: '#16A34A',
  },
  changeNegative: {
    color: '#DC2626',
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
});

export default EarningsSummaryCard;
