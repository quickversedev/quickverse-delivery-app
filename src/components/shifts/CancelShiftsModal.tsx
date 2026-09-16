import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { FONT_FAMILY } from '../../theme/typography';
import shiftService from '../../services/shift.service';
import { CheckCircle, XCircle, X, Info } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isToday: boolean;
  partnerId: string;
  shiftId: string | null;
}

type ModalState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED';

const CancelShiftsModal: React.FC<Props> = ({ visible, onClose, onSuccess, isToday, partnerId, shiftId }) => {
  const [modalState, setModalState] = useState<ModalState>('IDLE');
  const [responseMsg, setResponseMsg] = useState('');

  // Reset state when opened
  React.useEffect(() => {
    if (visible) {
      setModalState('IDLE');
      setResponseMsg('');
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (!shiftId) return;
    setModalState('LOADING');
    try {
      const res = await shiftService.cancelShift(partnerId, shiftId);
      setResponseMsg(res?.message || 'Shift cancelled successfully.');
      setModalState('SUCCESS');
      
      // Auto close and reload after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setResponseMsg(err?.message || 'Failed to cancel shift. Please try again.');
      setModalState('FAILED');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button top right */}
          {(modalState === 'IDLE' || modalState === 'FAILED' || modalState === 'SUCCESS') && (
            <TouchableOpacity style={styles.closeIcon} onPress={modalState === 'SUCCESS' ? onSuccess : onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          )}

          {modalState === 'IDLE' && (
            <>
              <Text style={styles.title}>Cancel Shift?</Text>
              {isToday ? (
                <Text style={styles.desc}>
                  Are you sure you want to cancel this shift? Canceling a same-day shift will incur a ₹10 penalty, which will be auto-deducted from your next payout.
                </Text>
              ) : (
                <Text style={styles.desc}>
                  Are you sure you want to cancel this shift? (Free cancellation)
                </Text>
              )}

              <TouchableOpacity 
                style={[styles.confirmBtn, !isToday && { backgroundColor: '#1D6BFC' }]} 
                onPress={handleConfirm} 
                activeOpacity={0.85}
              >
                <Text style={styles.confirmBtnText}>
                  {isToday ? 'CANCEL & PAY PENALTY' : 'CONFIRM'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.goBackBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.goBackBtnText}>GO BACK</Text>
              </TouchableOpacity>
            </>
          )}

          {modalState === 'LOADING' && (
            <View style={styles.stateContainer}>
              <View style={styles.loadingCircle}>
                <ActivityIndicator size="large" color="#DC2626" />
              </View>
              <Text style={styles.stateTitle}>Cancelling shift...</Text>
            </View>
          )}

          {modalState === 'SUCCESS' && (
            <View style={styles.stateContainer}>
              <CheckCircle size={56} color="#16A34A" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <Text style={styles.stateTitle}>Successfully Cancelled</Text>
              <Text style={styles.stateDesc}>{responseMsg}</Text>
            </View>
          )}

          {modalState === 'FAILED' && (
            <View style={styles.stateContainer}>
              <XCircle size={56} color="#DC2626" strokeWidth={1.5} style={{ marginBottom: 16 }} />
              <Text style={styles.stateTitle}>Failed to cancel</Text>
              <Text style={styles.stateDesc}>{responseMsg}</Text>
              
              <TouchableOpacity style={[styles.confirmBtn, { width: '100%', marginTop: 24 }]} onPress={handleConfirm} activeOpacity={0.85}>
                <Text style={styles.confirmBtnText}>TRY AGAIN</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.goBackBtn, { width: '100%' }]} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.goBackBtnText}>GO BACK</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#0A1730',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  closeIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 12,
  },
  desc: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  goBackBtn: {
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  goBackBtnText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  stateDesc: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default CancelShiftsModal;
