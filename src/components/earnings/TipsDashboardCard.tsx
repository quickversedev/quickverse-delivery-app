import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { TipsDashboard } from '../../types/earnings';

type Props = { data: TipsDashboard };

const TipsDashboardCard: React.FC<Props> = ({ data }) => (
  <View style={styles.card}>
    <Text style={styles.title}>TIPS DASHBOARD</Text>

    <View style={styles.tipsRow}>
      <View style={styles.tipItem}>
        <View style={[styles.dot, { backgroundColor: '#0E6DFD' }]} />
        <Text style={styles.tipLabel}>Cash Tips</Text>
        <Text style={styles.tipValue}>₹{data.cashTips}</Text>
      </View>
      <View style={styles.tipItem}>
        <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />
        <Text style={styles.tipLabel}>UPI Tips</Text>
        <Text style={styles.tipValue}>₹{data.upiTips}</Text>
      </View>
    </View>

    <View style={styles.totalRow}>
      <Text style={styles.totalLabel}>Total Tips</Text>
      <Text style={styles.totalValue}>₹{data.totalTips}</Text>
    </View>

    {data.topTipper && (
      <View style={styles.topTipperRow}>
        <Text style={styles.topTipperLabel}>Top Tipper</Text>
        <View style={styles.topTipperInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {data.topTipper.name.charAt(0)}
            </Text>
          </View>
          <Text style={styles.topTipperName}>{data.topTipper.name}</Text>
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.topTipperAmount}>₹{data.topTipper.amount}</Text>
        </View>
      </View>
    )}
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
  tipsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 14,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tipLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  tipValue: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  topTipperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
  },
  topTipperLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  topTipperInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#4F46E5',
  },
  topTipperName: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  topTipperAmount: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
});

export default TipsDashboardCard;
