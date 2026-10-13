import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

type Props = {
  collected: number;
  deposited: number;
  cashInHand: number;
  settlementStatus: string;
  hasIssues: boolean;
};

const CashAccountabilityCard: React.FC<Props> = ({
  collected,
  deposited,
  cashInHand,
  settlementStatus,
  hasIssues,
}) => (
  <View style={styles.card}>
    <Text style={styles.title}>CASH ACCOUNTABILITY</Text>

    <View style={styles.amountsRow}>
      <View style={styles.amountItem}>
        <Text style={styles.amountValue}>
          ₹{collected.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.amountLabel}>Collected</Text>
      </View>
      <View style={styles.amountItem}>
        <Text style={styles.amountValue}>
          ₹{deposited.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.amountLabel}>Deposited</Text>
      </View>
      <View style={styles.amountItem}>
        <Text style={styles.amountValueHighlight}>
          ₹{cashInHand.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.amountLabel}>Cash In Hand</Text>
      </View>
    </View>

    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>Settlement Status</Text>
      <View style={styles.statusBadge}>
        {!hasIssues && (
          <CheckCircle size={14} color="#16A34A" />
        )}
        <Text
          style={[
            styles.statusText,
            hasIssues ? styles.statusIssue : styles.statusOk,
          ]}
        >
          {settlementStatus}
        </Text>
      </View>
    </View>
  </View>
);

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
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  amountItem: {
    alignItems: 'center',
    flex: 1,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  amountValueHighlight: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#F59E0B',
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  statusOk: {
    color: '#16A34A',
  },
  statusIssue: {
    color: '#EF4444',
  },
});

export default CashAccountabilityCard;
