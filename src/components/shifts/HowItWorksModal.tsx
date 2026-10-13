import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { X, CalendarCheck, Coins, ShieldAlert } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const HowItWorksModal: React.FC<Props> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>How Shifts Work</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.step}>
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <CalendarCheck size={20} color="#1D6BFC" />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>1. Book in Advance</Text>
              <Text style={styles.stepDesc}>
                Select and book your preferred shifts for tomorrow. Booking is 100% free!
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
              <Coins size={20} color="#D97706" />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>2. Guaranteed Earnings</Text>
              <Text style={styles.stepDesc}>
                Work during your booked shift window to earn the estimated amount shown.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.iconBox, { backgroundColor: '#FEE2E2' }]}>
              <ShieldAlert size={20} color="#DC2626" />
            </View>
            <View style={styles.stepText}>
              <Text style={styles.stepTitle}>3. Cancellation Rules</Text>
              <Text style={styles.stepDesc}>
                Cancel any shift a day prior for free. Same-day cancellation incurs a ₹10 penalty.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.gotItBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.gotItBtnText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    lineHeight: 20,
  },
  gotItBtn: {
    backgroundColor: '#1D6BFC',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  gotItBtnText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});

export default HowItWorksModal;
