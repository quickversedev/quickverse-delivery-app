import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';

type Props = {
  successCount: number;
  failedCount: number;
  totalDistance: number;
};

const BottomStatsRow: React.FC<Props> = ({
  successCount,
  failedCount,
  totalDistance,
}) => (
  <View style={styles.container}>
    <View style={styles.card}>
      <Text style={styles.cardTitle}>COMPLETED TODAY</Text>
      <View style={styles.completedRow}>
        <View style={styles.completedItem}>
          <Text style={styles.successCount}>{successCount}</Text>
          <Text style={styles.completedLabel}>Success</Text>
        </View>
        <View style={styles.completedItem}>
          <Text style={styles.failedCount}>{failedCount}</Text>
          <Text style={styles.completedLabel}>Failed</Text>
        </View>
      </View>
    </View>

    <View style={styles.card}>
      <Text style={styles.cardTitle}>TODAY'S TRAVEL</Text>
      <Text style={styles.distanceValue}>{totalDistance} km</Text>
      <Text style={styles.distanceLabel}>Total Distance</Text>
      <View style={styles.travelBar}>
        <View style={styles.travelSegment1} />
        <View style={styles.travelDot} />
        <View style={styles.travelSegment2} />
        <View style={styles.travelDot} />
        <View style={styles.travelSegment3} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#0A1730',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  completedRow: {
    flexDirection: 'row',
    gap: 20,
  },
  completedItem: {
    alignItems: 'center',
  },
  successCount: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  failedCount: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#EF4444',
  },
  completedLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },
  distanceValue: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  distanceLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
    marginBottom: 10,
  },
  travelBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  travelSegment1: {
    flex: 1,
    height: 3,
    backgroundColor: '#16A34A',
    borderRadius: 2,
  },
  travelSegment2: {
    flex: 1,
    height: 3,
    backgroundColor: '#0E6DFD',
    borderRadius: 2,
  },
  travelSegment3: {
    flex: 1,
    height: 3,
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  travelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0F172A',
    marginHorizontal: 2,
  },
});

export default BottomStatsRow;
