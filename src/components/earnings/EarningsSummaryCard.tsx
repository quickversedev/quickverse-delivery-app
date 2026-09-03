import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Navigation,
  Coins,
  Zap,
  Info,
} from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsPeriod, EarningsSummaryV3 } from '../../types/earnings';
import { COMPARISON_LABEL } from '../../services/earnings.service';

// ─── Filter-aware header label ────────────────────────────────────────────────
const PERIOD_LABELS: Record<EarningsPeriod, string> = {
  today: 'TOTAL EARNINGS TODAY',
  thisWeek: 'TOTAL EARNINGS THIS WEEK',
  thisMonth: 'TOTAL EARNINGS THIS MONTH',
  lifetime: 'TOTAL LIFETIME EARNINGS',
};

// ─── Breakdown item config ────────────────────────────────────────────────────
interface BreakdownItemConfig {
  label: string;
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  iconColor: string;
  iconBg: string;
}

const BREAKDOWN_ITEMS: BreakdownItemConfig[] = [
  {
    label: 'Base\nEarning',
    Icon: Wallet,
    iconColor: '#1D6BFC',
    iconBg: '#EBF2FF',
  },
  {
    label: 'Distance\nEarning',
    Icon: Navigation,
    iconColor: '#7C3AED',
    iconBg: '#F3EEFF',
  },
  {
    label: 'Tips',
    Icon: Coins,
    iconColor: '#D97706',
    iconBg: '#FFFBEB',
  },
  {
    label: 'Surge\nIncentive',
    Icon: Zap,
    iconColor: '#EA580C',
    iconBg: '#FFF7ED',
  },
];

type Props = { data: EarningsSummaryV3; period: EarningsPeriod };


// ─── Breakdown Item ───────────────────────────────────────────────────────────
// Fixed 3-row layout: icon row + label row + amount row
// Heights are fixed so 1-line or 2-line labels never break the grid
interface BreakdownItemProps {
  config: BreakdownItemConfig;
  amount: number;
}

const BreakdownItem: React.FC<BreakdownItemProps> = ({ config, amount }) => {
  const { Icon, iconColor, iconBg, label } = config;
  return (
    <View style={styles.breakdownItem}>
      {/* Row 1: icon — fixed height */}
      <View style={styles.breakdownIconRow}>
        <View style={[styles.breakdownIconWrap, { backgroundColor: iconBg }]}>
          <Icon size={16} color={iconColor} strokeWidth={2} />
        </View>
      </View>
      {/* Row 2: label — fixed height, 2 lines reserved */}
      <View style={styles.breakdownLabelRow}>
        <Text style={styles.breakdownLabel} numberOfLines={2}>{label}</Text>
      </View>
      {/* Row 3: amount — fixed height */}
      <View style={styles.breakdownAmountRow}>
        <Text style={styles.breakdownAmount} numberOfLines={1}>
          ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const EarningsSummaryCard: React.FC<Props> = ({ data, period }) => {
  const { totalEarnings, percentage, percentageStatus, payoutBalance, breakdown } = data;
  const isPositive = percentageStatus === 'positive';
  const showBadge = period !== 'lifetime';
  const compLabel = COMPARISON_LABEL[period];

  const breakdownAmounts = [
    breakdown.baseEarning,
    breakdown.distanceEarning,
    breakdown.tips,
    breakdown.surgeEarning,
  ];

  return (
    <View style={styles.card}>
      {/* ── Header row: label + comparison badge ── */}
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>
          {PERIOD_LABELS[period]}
        </Text>
        {showBadge && (
          <View
            style={[
              styles.badge,
              isPositive ? styles.badgePositive : styles.badgeNegative,
            ]}
          >
            {isPositive ? (
              <TrendingUp size={11} color="#16A34A" strokeWidth={2.5} />
            ) : (
              <TrendingDown size={11} color="#DC2626" strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.badgeText,
                isPositive ? styles.badgeTextPositive : styles.badgeTextNegative,
              ]}
            >
              {isPositive ? '+' : '-'}{Math.abs(percentage)}%{' '}
              <Text style={styles.badgeSub}>{compLabel}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* ── Total amount ── */}
      <Text style={styles.totalAmount}>
        ₹{totalEarnings.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Text>

      {/* ── Payout Balance row ── */}
      <View style={styles.payoutRow}>
        <Text style={styles.payoutLabel}>Payout Balance</Text>
        <Info size={13} color="#94A3B8" strokeWidth={2} style={styles.infoIcon} />
        <Text style={styles.payoutAmount}>
          ₹{payoutBalance.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      </View>

      {/* ── Divider ── */}
      <View style={styles.divider} />

      {/* ── Breakdown section ── */}
      <Text style={styles.breakdownTitle}>BREAKDOWN</Text>
      <View style={styles.breakdownGrid}>
        {BREAKDOWN_ITEMS.map((config, index) => (
          <React.Fragment key={config.label}>
            <BreakdownItem
              config={config}
              amount={breakdownAmounts[index]}
            />
            {/* "+" connector between items */}
            {index < BREAKDOWN_ITEMS.length - 1 && (
              <View style={styles.connectorWrap}>
                <Text style={styles.connectorPlus}>+</Text>
              </View>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgePositive: {
    backgroundColor: '#F0FDF4',
  },
  badgeNegative: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  badgeTextPositive: {
    color: '#16A34A',
  },
  badgeTextNegative: {
    color: '#DC2626',
  },
  badgeSub: {
    fontFamily: FONT_FAMILY.outfitRegular,
    fontSize: 10,
  },
  totalAmount: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  payoutLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginRight: 4,
  },
  infoIcon: {
    marginRight: 8,
  },
  payoutAmount: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8, // reduced gap between divider and BREAKDOWN title
  },
  breakdownTitle: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  // ── Breakdown grid — single row, all 4 items + connectors
  breakdownGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Each item has 3 fixed-height rows: icon / label / amount
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  // Row 1 — icon
  breakdownIconRow: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  breakdownIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Row 2 — label (fixed height = 2 lines @ 13px lineHeight)
  breakdownLabelRow: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  breakdownLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 14,
  },
  // Row 3 — amount
  breakdownAmountRow: {
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownAmount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    textAlign: 'center',
  },
  // "+" connector between breakdown items
  connectorWrap: {
    width: 20,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  connectorPlus: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#CBD5E1',
  },
});

export default EarningsSummaryCard;
