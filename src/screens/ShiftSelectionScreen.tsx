import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import useAuthStore from '../hooks/useAuthStore';
import shiftService from '../services/shift.service';
import type { ShiftType, ShiftResponse } from '../types/shift.types';
import {
  ALL_SHIFT_TYPES,
  SHIFT_EARNINGS,
  SHIFT_LABELS,
  SHIFT_WINDOWS,
} from '../types/shift.types';

type DayTab = 'today' | 'tomorrow';

// Local date string YYYY-MM-DD (offset 0 = today, 1 = tomorrow)
const getDateStr = (offset: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateDisplay = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

// A shift is "past" for today if its end hour has already passed
const SHIFT_END_HOUR: Record<ShiftType, number> = {
  BREAKFAST: 10,
  LUNCH: 14,
  EVENING: 18,
  DINNER: 22,
  NIGHT: 2, // 2 AM next day — treated specially below
};

const isShiftPastToday = (type: ShiftType): boolean => {
  const hour = new Date().getHours();
  if (type === 'NIGHT') {
    // NIGHT is 10 PM–2 AM; past when hour is 2–21 (i.e. after 2 AM but before 10 PM)
    return hour >= 2 && hour < 22;
  }
  return hour >= SHIFT_END_HOUR[type];
};

const TODAY_STR = getDateStr(0);
const TOMORROW_STR = getDateStr(1);

const ShiftSelectionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId ?? '';

  const [activeTab, setActiveTab] = useState<DayTab>('today');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Server state
  const [todayBooked, setTodayBooked] = useState<ShiftResponse[]>([]);
  const [tomorrowBooked, setTomorrowBooked] = useState<ShiftResponse[]>([]);

  // UI selection state (what the user currently has checked)
  const [todaySelected, setTodaySelected] = useState<Set<ShiftType>>(new Set());
  const [tomorrowSelected, setTomorrowSelected] = useState<Set<ShiftType>>(new Set());

  const loadShifts = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const [td, tm] = await Promise.all([
        shiftService.getShifts(partnerId, TODAY_STR),
        shiftService.getShifts(partnerId, TOMORROW_STR),
      ]);
      setTodayBooked(td);
      setTomorrowBooked(tm);
      setTodaySelected(
        new Set(td.filter(s => s.status === 'CONFIRMED').map(s => s.shiftType)),
      );
      setTomorrowSelected(
        new Set(tm.filter(s => s.status === 'CONFIRMED').map(s => s.shiftType)),
      );
    } catch {
      // network failure — leave lists empty, user can retry
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  // Derived: booked types for the active tab (confirmed only)
  const activeBooked = activeTab === 'today' ? todayBooked : tomorrowBooked;
  const activeSelected = activeTab === 'today' ? todaySelected : tomorrowSelected;
  const setActiveSelected =
    activeTab === 'today' ? setTodaySelected : setTomorrowSelected;
  const activeDateStr = activeTab === 'today' ? TODAY_STR : TOMORROW_STR;

  const confirmedTypes = new Set(
    activeBooked.filter(s => s.status === 'CONFIRMED').map(s => s.shiftType),
  );

  const toAdd = Array.from(activeSelected).filter(t => !confirmedTypes.has(t));
  const toRemove = activeBooked.filter(
    s => s.status === 'CONFIRMED' && !activeSelected.has(s.shiftType),
  );
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  const totalEarnings = Array.from(activeSelected).reduce(
    (sum, t) => sum + SHIFT_EARNINGS[t],
    0,
  );

  const toggleShift = (type: ShiftType) => {
    if (activeTab === 'today' && isShiftPastToday(type)) return;
    setActiveSelected(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      const ops: Promise<any>[] = [];
      if (toAdd.length > 0) {
        ops.push(
          shiftService.bookShifts(partnerId, {
            shiftDate: activeDateStr,
            shiftTypes: toAdd,
          }),
        );
      }
      toRemove.forEach(s => ops.push(shiftService.cancelShift(partnerId, s.id)));
      await Promise.all(ops);
      await loadShifts();
      Alert.alert('Updated', 'Your shifts have been saved.');
    } catch (err: any) {
      Alert.alert('Failed', err?.message ?? 'Could not update shifts. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Shifts</Text>
      </View>

      {/* Day Tabs */}
      <View style={styles.tabRow}>
        {(['today', 'tomorrow'] as DayTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.75}>
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'today' ? 'Today' : 'Tomorrow'}
            </Text>
            <Text style={[styles.tabDate, activeTab === tab && styles.tabDateActive]}>
              {formatDateDisplay(tab === 'today' ? TODAY_STR : TOMORROW_STR)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#1A6BFF" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionLabel}>Available Shifts</Text>

          {ALL_SHIFT_TYPES.map(type => {
            const isSelected = activeSelected.has(type);
            const isPast = activeTab === 'today' && isShiftPastToday(type);
            const isConfirmed = confirmedTypes.has(type);

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.shiftRow,
                  isSelected && !isPast && styles.shiftRowSelected,
                  isPast && styles.shiftRowPast,
                ]}
                onPress={() => toggleShift(type)}
                disabled={isPast}
                activeOpacity={0.75}>
                <View style={styles.shiftInfo}>
                  <View style={styles.shiftTopRow}>
                    <Text
                      style={[
                        styles.shiftWindow,
                        isSelected && !isPast && styles.shiftWindowSelected,
                        isPast && styles.dimText,
                      ]}>
                      {SHIFT_WINDOWS[type]}
                    </Text>
                    {isConfirmed && (
                      <View style={styles.confirmedBadge}>
                        <Text style={styles.confirmedBadgeText}>Confirmed</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.shiftLabel, isPast && styles.dimText]}>
                    {SHIFT_LABELS[type]}
                    {isPast ? '  ·  Past' : ''}
                  </Text>
                </View>

                <View style={styles.shiftRight}>
                  <Text style={[styles.earning, isPast && styles.dimText]}>
                    ₹{SHIFT_EARNINGS[type]}
                  </Text>
                  <View
                    style={[
                      styles.checkbox,
                      isSelected && !isPast && styles.checkboxSelected,
                      isPast && styles.checkboxPast,
                    ]}>
                    {isSelected && !isPast && (
                      <Check size={13} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Footer */}
      {!loading && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.footerTop}>
            <Text style={styles.footerLabel}>Estimated Total</Text>
            <Text style={styles.footerValue}>₹{totalEarnings}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!hasChanges || saving) && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
            activeOpacity={0.85}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveBtnText}>
                {hasChanges ? 'SAVE CHANGES' : 'UP TO DATE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  tabActive: {
    borderColor: '#1A6BFF',
    backgroundColor: '#EFF6FF',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    marginBottom: 2,
  },
  tabLabelActive: { color: '#1A6BFF' },
  tabDate: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  tabDateActive: { color: '#3B82F6' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  shiftRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  shiftRowSelected: {
    borderColor: '#F5A623',
    backgroundColor: '#FFFBF2',
  },
  shiftRowPast: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.55,
  },
  shiftInfo: { flex: 1, paddingRight: 12 },
  shiftTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  shiftWindow: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  shiftWindowSelected: { color: '#D97706' },
  confirmedBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  confirmedBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
    letterSpacing: 0.3,
  },
  shiftLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  dimText: { color: '#CBD5E1' },

  shiftRight: { alignItems: 'center', gap: 8 },
  earning: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  checkboxPast: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F1F5F9',
  },

  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  footerLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  footerValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  saveBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default ShiftSelectionScreen;
