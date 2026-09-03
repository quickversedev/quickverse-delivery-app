import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ClipboardList,
  BadgeCheck,
  Banknote,
  Info,
} from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { TodayOrdersSummaryV3 } from '../../types/earnings';

type Props = { data: TodayOrdersSummaryV3 };

// ─── Stat card item ───────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  count: number;
  label: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, count, label }) => (
  <View style={styles.statCard}>
    <View style={styles.statIconWrap}>{icon}</View>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── Component ────────────────────────────────────────────────────────────────
const OrdersPaymentSummary: React.FC<Props> = ({ data }) => {
  const { totalOrders, prepaidOrders, codOrders, cashToSubmit } = data;

  return (
    <View style={styles.card}>
      {/* ── Section title ── */}
      <Text style={styles.sectionTitle}>ORDERS & PAYMENTS SUMMARY</Text>

      {/* ── 3 stat cards ── */}
      <View style={styles.statRow}>
        <StatCard
          icon={<ClipboardList size={22} color="#1D6BFC" strokeWidth={2} />}
          count={totalOrders}
          label="Total Orders"
        />
        <View style={styles.statDivider} />
        <StatCard
          icon={<BadgeCheck size={22} color="#16A34A" strokeWidth={2} />}
          count={prepaidOrders}
          label="Prepaid"
        />
        <View style={styles.statDivider} />
        <StatCard
          icon={<Banknote size={22} color="#EA580C" strokeWidth={2} />}
          count={codOrders}
          label="Cash on COD"
        />
      </View>

      {/* ── Horizontal divider ── */}
      <View style={styles.divider} />

      {/* ── Cash to Submit row ── */}
      <View style={styles.cashRow}>
        <View style={styles.cashLeft}>
          <View style={styles.cashLabelRow}>
            <Text style={styles.cashTitle}>Cash to Submit</Text>
            <Info size={13} color="#94A3B8" strokeWidth={2} style={styles.infoIcon} />
          </View>
          <Text style={styles.cashSubtitle}>
            Cash on COD + UPI on COD (Outstanding)
          </Text>
        </View>
        <Text style={styles.cashAmount}>
          ₹{cashToSubmit.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 4,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 16,
  },
  // ── Stat row ──
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statDivider: {
    width: 1,
    height: 52,
    backgroundColor: '#F1F5F9',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statCount: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    lineHeight: 24,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 0,
  },
  // ── Cash to Submit row ──
  cashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginTop: 12,
    marginBottom: 14,
  },
  cashLeft: {
    flex: 1,
    marginRight: 12,
  },
  cashLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  cashTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginRight: 4,
  },
  infoIcon: {
    marginTop: 1,
  },
  cashSubtitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    lineHeight: 15,
  },
  cashAmount: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#DC2626',
  },
});

export default OrdersPaymentSummary;
