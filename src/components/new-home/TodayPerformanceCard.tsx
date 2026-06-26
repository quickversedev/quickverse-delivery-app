import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Star, Award } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

type Props = {
  earningsToday: number;
  ordersDone: number;
  ordersTarget: number;
  rating: number;
  riderTier: string;
  xp: number;
  xpToNext: number;
  nextTier: string;
  progressPercent: number;
};

const TodayPerformanceCard: React.FC<Props> = ({
  earningsToday,
  ordersDone,
  ordersTarget,
  rating,
  riderTier,
  xp,
  xpToNext,
  nextTier,
  progressPercent,
}) => (
  <View style={styles.card}>
    <Text style={styles.title}>TODAY'S PERFORMANCE</Text>

    <View style={styles.statsRow}>
      <View style={styles.stat}>
        <Text style={styles.statValueGreen}>
          ₹{earningsToday.toLocaleString('en-IN')}
        </Text>
        <Text style={styles.statLabel}>Earnings Today</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.statValue}>{ordersDone}</Text>
        <Text style={styles.statLabel}>Orders Done</Text>
        <Text style={styles.statSub}>Target {ordersTarget}</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <View style={styles.ratingRow}>
          <Text style={styles.statValue}>{rating}</Text>
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
        </View>
        <Text style={styles.statLabel}>Rating</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.tierStat}>
        <Award size={24} color="#94A3B8" />
        <Text style={styles.tierLabel}>{riderTier}</Text>
        <Text style={styles.xpText}>{xp.toLocaleString('en-IN')} XP</Text>
      </View>
    </View>

    <View style={styles.progressSection}>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progressPercent}%` }]}
        />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressText}>
          {xpToNext} XP to {nextTier}
        </Text>
        <Text style={styles.progressPercent}>{progressPercent}%</Text>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  tierStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },
  statValueGreen: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  statValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  statSub: {
    fontSize: 9,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tierLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  xpText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  progressSection: {
    gap: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  progressPercent: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#F59E0B',
  },
});

export default TodayPerformanceCard;
