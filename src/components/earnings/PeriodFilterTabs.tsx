import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsPeriod } from '../../types/earnings';

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
];

type Props = {
  selected: EarningsPeriod;
  onSelect: (period: EarningsPeriod) => void;
};

const PeriodFilterTabs: React.FC<Props> = ({ selected, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
    {PERIODS.map(p => {
      const active = p.key === selected;
      return (
        <TouchableOpacity
          key={p.key}
          activeOpacity={0.8}
          onPress={() => onSelect(p.key)}
          style={[styles.chip, active && styles.chipActive]}
        >
          <Text style={[styles.chipText, active && styles.chipTextActive]}>
            {p.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F2F5FA',
  },
  chipActive: {
    backgroundColor: '#0E6DFD',
  },
  chipText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
});

export default PeriodFilterTabs;
