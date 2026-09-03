import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';
import type { EarningsPeriod } from '../../types/earnings';

const PERIODS: { key: EarningsPeriod; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lifetime', label: 'Lifetime' },
];

type Props = {
  selected: EarningsPeriod;
  onSelect: (period: EarningsPeriod) => void;
};

const PeriodFilterTabs: React.FC<Props> = ({ selected, onSelect }) => (
  <View style={styles.wrapper}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
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
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginBottom: 14,
  },
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: '#1D6BFC',
    borderRadius: 12,
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
