import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarCheck, Info } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import type { ShiftResponse } from '../types/shift.types';
import { SHIFT_LABELS, SHIFT_WINDOWS } from '../types/shift.types';

type RootStackParamList = {
  MyShifts: { shifts: ShiftResponse[] };
  MainTabs: undefined;
  ShiftSelection: undefined;
};

const MyShiftsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'MyShifts'>>();
  const shifts: ShiftResponse[] = route.params?.shifts ?? [];

  const shiftDate = shifts[0]?.shiftDate ?? '';
  const formattedDate = shiftDate
    ? new Date(shiftDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const totalEarnings = shifts.reduce(
    (sum, s) => sum + (s.estimatedEarnings ?? 0),
    0,
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Shifts</Text>
          <View style={styles.calendarBadge}>
            <CalendarCheck size={20} color="#16A34A" strokeWidth={2} />
          </View>
        </View>

        {/* Date Card */}
        <View style={styles.dateCard}>
          <Text style={styles.dateLabel}>Your Shifts for</Text>
          <Text style={styles.datePrimary}>Tomorrow</Text>
          <Text style={styles.dateSecondary}>{formattedDate}</Text>
        </View>

        <Text style={styles.sectionTitle}>Confirmed Shifts</Text>

        {shifts.map(shift => (
          <View key={shift.id} style={styles.shiftRow}>
            <View style={styles.dot} />
            <View style={styles.shiftInfo}>
              <Text style={styles.shiftWindow}>
                {SHIFT_WINDOWS[shift.shiftType]}
              </Text>
              <Text style={styles.shiftLabel}>
                {SHIFT_LABELS[shift.shiftType]}
              </Text>
            </View>
            <Text style={styles.shiftEarnings}>
              ₹{shift.estimatedEarnings}
            </Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Estimated</Text>
          <Text style={styles.totalValue}>₹{totalEarnings}</Text>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={16} color="#1A6BFF" strokeWidth={2} />
          <Text style={styles.infoText}>
            You will get orders only during your selected shifts.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.gotItBtn}
          onPress={() => navigation.navigate('MainTabs')}
          activeOpacity={0.85}>
          <Text style={styles.gotItText}>GOT IT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  calendarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginBottom: 2,
  },
  datePrimary: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  dateSecondary: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  shiftRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 12,
  },
  shiftInfo: {
    flex: 1,
  },
  shiftWindow: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  shiftLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  shiftEarnings: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#1A6BFF',
    lineHeight: 19,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  gotItBtn: {
    backgroundColor: '#1A6BFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  gotItText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default MyShiftsScreen;
