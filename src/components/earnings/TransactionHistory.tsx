import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { Transaction, TransactionType } from '../../types/earnings';

const FILTERS: { key: TransactionType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'COD', label: 'COD' },
  { key: 'UPI', label: 'UPI' },
  { key: 'REFUND', label: 'Refund' },
  { key: 'BONUS', label: 'Bonus' },
];

const TYPE_COLORS: Record<string, string> = {
  COD: '#0E6DFD',
  UPI: '#8B5CF6',
  REFUND: '#DC2626',
  BONUS: '#16A34A',
};

type Props = { data: Transaction[] };

const TransactionItem: React.FC<{ item: Transaction }> = ({ item }) => (
  <View style={styles.txRow}>
    <View style={styles.txLeft}>
      <View style={styles.txIconWrap}>
        <View style={[styles.txDot, { backgroundColor: TYPE_COLORS[item.type] || '#64748B' }]} />
      </View>
      <View>
        <Text style={styles.txOrderId}>{item.orderId}</Text>
        <Text style={styles.txDesc}>{item.description}</Text>
      </View>
    </View>
    <View style={styles.txRight}>
      <Text style={styles.txAmount}>₹{item.amount}</Text>
      <Text style={styles.txTime}>{item.timestamp}</Text>
    </View>
  </View>
);

const TransactionHistory: React.FC<Props> = ({ data }) => {
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');

  const filtered = filter === 'ALL' ? data : data.filter(t => t.type === filter);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>TRANSACTION HISTORY</Text>

      <View style={styles.filterRow}>
        {FILTERS.map(f => {
          const active = f.key === filter;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={0.8}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No transactions found</Text>
      ) : (
        filtered.map(item => <TransactionItem key={item.id} item={item} />)
      )}
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
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F2F5FA',
  },
  filterChipActive: {
    backgroundColor: '#0E6DFD',
  },
  filterText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F5FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  txOrderId: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  txDesc: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  txTime: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 24,
  },
});

export default TransactionHistory;
