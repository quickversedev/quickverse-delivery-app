import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { FONT_FAMILY } from '../../theme/typography';
import type { DateRange } from '../../types/earnings';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

// Today's date in India, as a local-midnight Date (what the picker works with)
const istToday = (): Date => {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
};

// Picker Date -> "YYYY-MM-DD" from its local calendar day (no timezone shift)
const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "YYYY-MM-DD" -> local-midnight Date
const fromDateString = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDay = (d: Date) => `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

/** "01 Sep 2026 – 10 Sep 2026" */
export const formatRangeLabel = (range: DateRange) =>
  `${formatDay(fromDateString(range.from))} – ${formatDay(fromDateString(range.to))}`;

type Props = {
  visible: boolean;
  /** Range to start from; null means the last 7 days */
  initial: DateRange | null;
  onApply: (range: DateRange) => void;
  onClose: () => void;
};

const DateRow: React.FC<{ label: string; value: Date; active: boolean; onPress: () => void }> = ({
  label, value, active, onPress,
}) => (
  <TouchableOpacity
    style={[styles.dateRow, active && styles.dateRowActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={styles.dateLabel}>{label}</Text>
    <Text style={styles.dateValue}>{formatDay(value)}</Text>
  </TouchableOpacity>
);

const CustomDateRangeModal: React.FC<Props> = ({ visible, initial, onApply, onClose }) => {
  const [from, setFrom] = useState<Date>(istToday());
  const [to, setTo] = useState<Date>(istToday());
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  // Start from the given range (or the last 7 days) each time the modal opens
  useEffect(() => {
    if (!visible) { return; }
    const end = istToday();
    const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
    setFrom(initial ? fromDateString(initial.from) : start);
    setTo(initial ? fromDateString(initial.to) : end);
    setPicking(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const today = istToday();
  const isValid = from <= to && to <= today;
  const errorText = from > to
    ? 'From date cannot be after To date.'
    : to > today
      ? 'Future dates cannot be selected.'
      : null;

  const onPickerChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') { setPicking(null); }
    if (event.type === 'dismissed' || !date) { return; }
    if (picking === 'from') { setFrom(date); }
    if (picking === 'to') { setTo(date); }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => null}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Date Range</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <DateRow label="From" value={from} active={picking === 'from'} onPress={() => setPicking('from')} />
          <DateRow label="To" value={to} active={picking === 'to'} onPress={() => setPicking('to')} />

          {picking && (
            <DateTimePicker
              value={picking === 'from' ? from : to}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={picking === 'from' ? to : today}
              minimumDate={picking === 'to' ? from : undefined}
              onChange={onPickerChange}
            />
          )}
          {picking && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneBtn} onPress={() => setPicking(null)}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}

          {errorText && <Text style={styles.error}>{errorText}</Text>}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, !isValid && styles.applyBtnDisabled]}
              disabled={!isValid}
              onPress={() => onApply({ from: toDateString(from), to: toDateString(to) })}
            >
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  close: {
    fontSize: 18,
    color: '#64748B',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  dateRowActive: {
    borderColor: '#1D6BFC',
    backgroundColor: '#EBF2FF',
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  dateValue: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#0F172A',
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  doneText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },
  error: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
  },
  applyBtn: {
    backgroundColor: '#1D6BFC',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  applyBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  applyText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
});

export default CustomDateRangeModal;
