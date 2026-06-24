import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CircleCheck, AlertTriangle } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { CashReconciliation } from '../../types/earnings';

type Props = { data: CashReconciliation };

const CashReconciliationCard: React.FC<Props> = ({ data }) => {
  const isBalanced = data.status === 'balanced';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>CASH RECONCILIATION</Text>

      <View style={styles.grid}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Collected</Text>
          <Text style={styles.gridValue}>₹{data.collected.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Deposited</Text>
          <Text style={styles.gridValue}>₹{data.deposited.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Cash In Hand</Text>
          <Text style={styles.gridValue}>₹{data.cashInHand.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Difference</Text>
          <View style={styles.statusRow}>
            {isBalanced ? (
              <>
                <CircleCheck size={14} color="#16A34A" />
                <Text style={styles.statusGreen}>No Issues</Text>
              </>
            ) : (
              <>
                <AlertTriangle size={14} color="#DC2626" />
                <Text style={styles.statusRed}>₹{Math.abs(data.difference)}</Text>
              </>
            )}
          </View>
        </View>
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
  title: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '46%',
  },
  gridLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginBottom: 4,
  },
  gridValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusGreen: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  statusRed: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },
});

export default CashReconciliationCard;
