import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  ToastAndroid,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Info, Sun, Coffee, Utensils, SunDim, Sunset, Moon, Check, Lock, X } from 'lucide-react-native';
import { FONT_FAMILY } from '../theme/typography';
import useAuthStore from '../hooks/useAuthStore';
import shiftService from '../services/shift.service';
import type { ShiftResponse } from '../types/shift.types';
import CancelShiftsModal from '../components/shifts/CancelShiftsModal';
import HowItWorksModal from '../components/shifts/HowItWorksModal';
import CustomToast from '../components/ui/CustomToast';

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
    month: 'short',
    year: 'numeric',
  });
};

const TODAY_STR = getDateStr(0);
const TOMORROW_STR = getDateStr(1);

const getShiftIcon = (code: string, color: string) => {
  const size = 20;
  if (!code) return <Sun size={size} color={color} />;
  const c = code.toUpperCase();
  if (c.includes('MORNING')) return <Sun size={size} color={color} />;
  if (c.includes('BREAKFAST')) return <Coffee size={size} color={color} />;
  if (c.includes('BRUNCH')) return <Sun size={size} color={color} />;
  if (c.includes('LUNCH')) return <Utensils size={size} color={color} />;
  if (c.includes('AFTERNOON')) return <SunDim size={size} color={color} />;
  if (c.includes('EVENING')) return <Sunset size={size} color={color} />;
  if (c.includes('NIGHT')) return <Moon size={size} color={color} />;
  return <Sun size={size} color={color} />;
};

const ShiftSelectionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { authData } = useAuthStore();
  const partnerId = authData?.partnerId ?? '';

  const [activeTab, setActiveTab] = useState<DayTab>('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Server state for active tab
  const [shifts, setShifts] = useState<ShiftResponse[]>([]);

  const [selectedForBooking, setSelectedForBooking] = useState<Set<string>>(new Set());
  const [selectedForCancellation, setSelectedForCancellation] = useState<Set<string>>(new Set());

  // Modals & Toasts
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [toastConfig, setToastConfig] = useState({ visible: false, message: '', duration: 3000 });

  const activeDateStr = activeTab === 'today' ? TODAY_STR : TOMORROW_STR;

  const loadShifts = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const data = await shiftService.getShifts(partnerId, activeDateStr);
      setShifts(data || []);
      setSelectedForBooking(new Set());
      setSelectedForCancellation(new Set());
    } catch (e) {
      console.error("Failed to load shifts: ", e);
      setShifts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partnerId, activeDateStr]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const toggleBooking = (shiftConfigId: string) => {
    setSelectedForBooking(prev => {
      const next = new Set(prev);
      next.has(shiftConfigId) ? next.delete(shiftConfigId) : next.add(shiftConfigId);
      return next;
    });
  };

  const toggleCancellation = (shiftId: string) => {
    setSelectedForCancellation(prev => {
      if (prev.has(shiftId)) {
        const next = new Set(prev);
        next.delete(shiftId);
        return next;
      }
      if (prev.size >= 1) {
        if (Platform.OS === 'android') {
          ToastAndroid.show('You can only cancel one shift at a time.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Single Cancellation', 'You can only cancel one shift at a time.');
        }
        return prev;
      }
      const next = new Set(prev);
      next.add(shiftId);
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedForBooking(new Set());
    setSelectedForCancellation(new Set());
  };

  const totalEstimatedEarnings = useMemo(() => {
    let sum = 0;
    shifts.forEach(s => {
      const isCancelling = s.id && selectedForCancellation.has(s.id);
      const isBooking = selectedForBooking.has(s.shiftConfigId);
      if ((s.isBooked && !isCancelling) || (!s.isBooked && isBooking)) {
        sum += s.estimatedEarnings || 0;
      }
    });
    return sum;
  }, [shifts, selectedForBooking, selectedForCancellation]);

  const hasChanges = selectedForBooking.size > 0 || selectedForCancellation.size > 0;

  const handleSave = async () => {
    if (!hasChanges) return;

    if (selectedForCancellation.size > 0) {
      setShowCancelModal(true);
    } else {
      executeBooking();
    }
  };

  const executeBooking = async () => {
    setSaving(true);
    try {
      if (selectedForBooking.size > 0) {
        await shiftService.bookShiftsBatch(partnerId, {
          shiftDate: activeDateStr,
          shiftConfigIds: Array.from(selectedForBooking),
        });
      }

      // Schedule local notifications for these shifts in future update
      // scheduleShiftNotifications(Array.from(selectedForBooking));

      if (Platform.OS === 'android') {
        ToastAndroid.show('Shifts updated successfully', ToastAndroid.SHORT);
      } else {
        Alert.alert('Updated', 'Your shifts have been saved.');
      }
      loadShifts();
    } catch (err: any) {
      Alert.alert('Failed', err?.message ?? 'Could not update shifts. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A6BFF']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>My Shifts</Text>
            <Text style={styles.headerSubtitle}>Choose your shifts</Text>
          </View>
          <TouchableOpacity style={styles.howItWorksBtn} onPress={() => setShowHowItWorks(true)}>
            <Info size={14} color="#1D6BFC" style={{ marginRight: 4 }} />
            <Text style={styles.howItWorksText}>How it works</Text>
          </TouchableOpacity>
        </View>

        {/* Day Tabs */}
        <View style={styles.tabRow}>
          <View style={styles.tabsContainer}>
            {(['today', 'tomorrow'] as DayTab[]).map(tab => {
              const isActive = activeTab === tab;
              const dateStr = tab === 'today' ? TODAY_STR : TOMORROW_STR;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.75}>
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                    {tab === 'today' ? 'Today' : 'Tomorrow'}
                  </Text>
                  <Text style={[styles.tabDate, isActive && styles.tabDateActive]}>
                    {formatDateDisplay(dateStr)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.calendarIconBox}>
            <CalendarIcon size={20} color="#64748B" />
          </View>
        </View>

        {/* Static Info Box */}
        <View style={styles.infoBox}>
          <Info size={18} color="#475569" />
          <View style={styles.infoTextCol}>
            <Text style={styles.infoTitle}>High demand expected tomorrow!</Text>
            <Text style={styles.infoSubtitle}>Book your shifts early to earn more.</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#1A6BFF" />
          </View>
        ) : (
          <View style={styles.scroll}>
            {shifts.map((shift, index) => {
              const isCancelling = shift.id ? selectedForCancellation.has(shift.id) : false;
              const isBooking = selectedForBooking.has(shift.shiftConfigId);

              const demandText = shift.demandLevel?.toLowerCase() || '';
              let demandColor = '#64748B'; // Default
              if (demandText.includes('high')) demandColor = '#16A34A'; // Green
              else if (demandText.includes('medium')) demandColor = '#F59E0B'; // Amber
              else if (demandText.includes('low')) demandColor = '#FCA5A5'; // Light Red

              const durationDisplay = shift.shiftDuration || shift.totalShiftHours || shift.durationText || '2h';

              return (
                <TouchableOpacity
                  key={`${shift.id || 'none'}-${shift.shiftConfigId || 'none'}-${index}`}
                  style={[
                    styles.shiftRow,
                    isBooking && styles.shiftRowSelected,
                    isCancelling && styles.shiftRowCancel,
                    !shift.canBook && !shift.isBooked && styles.shiftRowDisabled,
                  ]}
                  onPress={() => {
                    if (shift.isBooked && shift.id) {
                      toggleCancellation(shift.id);
                    } else if (shift.canBook) {
                      toggleBooking(shift.shiftConfigId);
                    } else {
                      setToastConfig({ visible: true, message: "Can't create today's shift. You can only cancel an existing shift with a penalty.", duration: 3000 });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.shiftRowMain}>
                    {/* Left Icon */}
                    <View style={[styles.iconWrap, (isBooking || shift.isBooked) ? styles.iconWrapActive : {}]}>
                      {getShiftIcon(shift.shiftCode, (isBooking || shift.isBooked) ? '#FFFFFF' : '#1D6BFC')}
                    </View>

                    {/* Middle Info */}
                    <View style={styles.shiftInfo}>
                      <Text style={[styles.shiftWindow, (isBooking || shift.isBooked) && { color: '#0F172A' }]}>
                        {shift.shiftWindow}
                      </Text>
                      <Text style={styles.shiftName}>{shift.shiftName}</Text>
                      <Text style={styles.shiftMeta}>
                        <Text style={{ fontSize: 11 }}>🕓</Text> {durationDisplay}  •
                        <Text style={{ color: demandColor, fontFamily: FONT_FAMILY.outfitBold }}> {shift.demandLevel || 'Normal'}</Text>
                      </Text>
                      {!shift.isBooked && shift.penaltyStatus === 'PENDING_DEDUCTION' && (
                        <View style={styles.penaltyAppliedTag}>
                          <Text style={styles.penaltyAppliedText}>Penalty Applied: ₹10 (Auto-deduction pending)</Text>
                        </View>
                      )}
                    </View>

                    {/* Right Area */}
                    <View style={styles.shiftRight}>
                      <Text style={styles.earning}>
                        <Text style={{ fontSize: 12 }}>₹</Text>{shift.estimatedEarnings}
                      </Text>
                      <Text style={styles.estLabel}>Est. Earnings</Text>

                      <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                        {shift.isBooked ? (
                          <View style={[styles.greenTick, { width: 24, height: 24, borderRadius: 12 }]}>
                            <Check size={14} color="#FFF" strokeWidth={3} />
                          </View>
                        ) : shift.canBook ? (
                          <View style={[styles.checkbox, isBooking && styles.checkboxActive]}>
                            {isBooking && <Check size={12} color="#FFF" strokeWidth={3} />}
                          </View>
                        ) : (
                          <View style={styles.checkboxDisabled} />
                        )}
                      </View>
                    </View>
                  </View>

                  {shift.isBooked && (
                    <View style={styles.shiftRowFooter}>
                      <TouchableOpacity
                        style={[styles.cancelBtn, isCancelling && styles.cancelBtnActive]}
                        onPress={() => shift.id && toggleCancellation(shift.id)}
                        activeOpacity={0.8}
                      >
                        {isCancelling ? (
                          <Text style={styles.undoBtnText}>Undo</Text>
                        ) : (
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {!loading && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {hasChanges && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearAllBtn}>
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerTop}>
            <Text style={styles.footerLabel}>Estimated Total Earnings</Text>
            <Text style={styles.footerValue}>₹{totalEstimatedEarnings}</Text>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
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

      <CancelShiftsModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSuccess={() => {
          setShowCancelModal(false);
          setSelectedForCancellation(new Set());
          loadShifts();
          // If they also selected shifts to book, trigger that
          if (selectedForBooking.size > 0) {
            executeBooking();
          }
        }}
        isToday={activeTab === 'today'}
        partnerId={partnerId}
        shiftId={selectedForCancellation.size > 0 ? Array.from(selectedForCancellation)[0] : null}
      />

      <HowItWorksModal
        visible={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />

      <CustomToast
        visible={toastConfig.visible}
        message={toastConfig.message}
        duration={toastConfig.duration}
        onHide={() => setToastConfig({ visible: false, message: '', duration: 3000 })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  howItWorksBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  howItWorksText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tabActive: {
    borderColor: '#1D6BFC',
    backgroundColor: '#1D6BFC',
  },
  tabLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginBottom: 2,
  },
  tabLabelActive: { color: '#FFFFFF' },
  tabDate: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  tabDateActive: { color: '#DBEAFE' },

  calendarIconBox: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },

  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoTextCol: {
    marginLeft: 10,
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#334155',
  },
  infoSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },

  shiftRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shiftRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftRowFooter: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  shiftRowSelected: {
    borderColor: '#F5A623',
    backgroundColor: '#FFFBF2',
  },
  shiftRowCancel: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  shiftRowDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconWrapActive: {
    backgroundColor: '#1D6BFC',
  },

  shiftInfo: { flex: 1 },
  shiftWindow: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#334155',
    marginBottom: 2,
  },
  shiftName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    marginBottom: 4,
  },
  shiftMeta: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },
  penaltyAppliedTag: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  penaltyAppliedText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },

  shiftRight: { alignItems: 'flex-end' },
  earning: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  estLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    marginTop: 2,
  },

  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenTick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  cancelBtn: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#DCFCE7',
  },
  undoBtnText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
  },
  cancelBtnText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
  },
  checkboxDisabled: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
  clearAllBtn: {
    alignSelf: 'center',
    padding: 8,
    marginBottom: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  footerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerLabel: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  footerValue: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
  },
  saveBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default ShiftSelectionScreen;
