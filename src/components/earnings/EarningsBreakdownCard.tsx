import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsBreakdown } from '../../types/earnings';

type Props = { data: EarningsBreakdown };

const Row: React.FC<{ label: string; sub?: string; value: string; bold?: boolean }> = ({
  label, sub, value, bold,
}) => (
  <View style={styles.row}>
    <View style={styles.rowLeft}>
      <Text style={[styles.rowLabel, bold && styles.rowLabelBold]} numberOfLines={1}>{label}{sub ? ` ${sub}` : ''}</Text>
    </View>
    <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
  </View>
);

const EarningsBreakdownCard: React.FC<Props> = ({ data }) => (
  <View style={styles.card}>
    <Text style={styles.title}>EARNINGS BREAKDOWN</Text>

    <Row label="Base Pay" value={`₹${data.basePay}`} />
    <Row label="Order Earnings" sub={`(${data.orderEarningsFormula})`} value={`₹${data.orderEarnings}`} />
    <Row label="Bonus" sub={`(${data.bonusLabel})`} value={`₹${data.bonus}`} />
    <Row label="Tips Received" value={`₹${data.tipsReceived}`} />

    <View style={styles.divider} />
    <Row label="Total Earnings" value={`₹${data.total}`} bold />
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLeft: {
    flexShrink: 1,
    marginRight: 8,
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#334155',
  },
  rowLabelBold: {
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    fontSize: 13,
  },
  rowValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    flexShrink: 0,
  },
  rowValueBold: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 8,
  },
});

export default EarningsBreakdownCard;
