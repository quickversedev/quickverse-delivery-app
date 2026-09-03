import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Dimensions,
  Keyboard,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

// ─── Types ────────────────────────────────────────────────────────────────────
type SheetState = 'input' | 'loading' | 'success' | 'error';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
const VerifyCashBottomSheet: React.FC<Props> = ({ visible, onClose }) => {
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const [sheetState, setSheetState] = useState<SheetState>('input');
  const [errorMsg, setErrorMsg] = useState('');

  // Only box 0 can be focused freely; boxes 1-3 are programmatically focused
  // by the input handler once the previous box is filled
  const inputRefs = useRef<Array<TextInput | null>>([null, null, null, null]);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const isComplete = otp.every(d => d !== '');

  // ── Slide-in / slide-out animation ──
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 22,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  // ── Reset state every time sheet opens ──
  useEffect(() => {
    if (visible) {
      setOtp(['', '', '', '']);
      setSheetState('input');
      setErrorMsg('');
      // Focus box 0 after animation starts
      const timer = setTimeout(() => inputRefs.current[0]?.focus(), 350);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // ── OTP change handler — sequential: only fills current box, then moves forward ──
  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      // Strip non-digits, take only last character
      const digit = text.replace(/[^0-9]/g, '').slice(-1);

      setOtp(prev => {
        const next = [...prev];
        next[index] = digit;
        return next;
      });

      // Move focus forward only when a digit was entered
      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  // ── Backspace handler — move backward ──
  const handleKeyPress = useCallback(
    (key: string, index: number) => {
      if (key === 'Backspace') {
        if (otp[index] === '' && index > 0) {
          // Current box already empty — clear previous and focus it
          setOtp(prev => {
            const next = [...prev];
            next[index - 1] = '';
            return next;
          });
          inputRefs.current[index - 1]?.focus();
        } else {
          // Clear current box
          setOtp(prev => {
            const next = [...prev];
            next[index] = '';
            return next;
          });
        }
      }
    },
    [otp],
  );

  // ── Prevent jumping to later boxes directly ──
  // Each box is editable only if all previous boxes are filled
  const handleFocus = useCallback(
    (index: number) => {
      if (index === 0) { return; } // box 0 always focusable
      // Find first empty box — force focus there instead
      const firstEmpty = otp.findIndex(d => d === '');
      if (firstEmpty !== -1 && firstEmpty < index) {
        inputRefs.current[firstEmpty]?.focus();
      }
    },
    [otp],
  );

  // ── Submit (API placeholder) ──
  const handleSubmit = useCallback(async () => {
    if (!isComplete) { return; }
    Keyboard.dismiss();
    setSheetState('loading');
    setErrorMsg('');

    try {
      // TODO: Replace with actual API call when backend is ready
      await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

      const enteredOtp = otp.join('');
      if (enteredOtp === '0000') {
        setErrorMsg('Invalid OTP. Please check with your City Manager.');
        setSheetState('error');
      } else {
        setSheetState('success');
      }
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setSheetState('error');
    }
  }, [isComplete, otp]);

  // ── Close: dismiss keyboard + close sheet in one tap ──
  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setOtp(['', '', '', '']);
    setSheetState('input');
    setErrorMsg('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* ── Backdrop — tap to close ── */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={handleClose}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : undefined}
        style={styles.keyboardAvoid}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Drag handle ── */}
          <TouchableOpacity
            style={styles.handleWrap}
            activeOpacity={1}
            onPress={handleClose}
          >
            <View style={styles.handle} />
          </TouchableOpacity>

          {sheetState === 'success' ? (
            /* ── Success State ── */
            <View style={styles.successWrap}>
              <View style={styles.successIconWrap}>
                <CheckCircle size={56} color="#16A34A" strokeWidth={1.5} />
              </View>
              <Text style={styles.successTitle}>Payment Successful!</Text>
              <Text style={styles.successDesc}>
                Your cash submission has been verified successfully.
              </Text>
              <TouchableOpacity
                style={styles.doneBtn}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Input State ── */
            <>
              <Text style={styles.title}>Verify Cash Submission</Text>
              <Text style={styles.description}>
                Please enter the{' '}
                <Text style={styles.descBold}>4-digit OTP</Text>
                {' '}provided by your City Manager to verify this cash submission.
              </Text>

              {/* ── OTP Boxes ── */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={ref => { inputRefs.current[i] = ref; }}
                    style={[
                      styles.otpBox,
                      digit !== '' && styles.otpBoxFilled,
                    ]}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, i)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                    onFocus={() => handleFocus(i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectionColor="#1D6BFC"
                    caretHidden={false}
                    returnKeyType="done"
                  // Boxes 1-3 are not directly interactive until previous ones are filled
                  // (enforced by handleFocus which redirects focus to first empty box)
                  />
                ))}
              </View>

              {/* ── Error message ── */}
              {sheetState === 'error' && errorMsg ? (
                <Text style={styles.errorMsg}>{errorMsg}</Text>
              ) : null}

              {/* ── Verify & Submit button ── */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!isComplete || sheetState === 'loading') && styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={!isComplete || sheetState === 'loading'}
              >
                {sheetState === 'loading' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Verify & Submit</Text>
                )}
              </TouchableOpacity>

              {/* ── Cancel — single tap closes sheet immediately ── */}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  keyboardAvoid: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  title: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#1D2A78',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  descBold: {
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  // ── OTP boxes ──
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 24,
  },
  otpBox: {
    width: 56,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 2.5,
    borderBottomColor: '#CBD5E1',
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderBottomColor: '#1D6BFC',
    backgroundColor: '#EBF2FF',
  },
  // ── Error ──
  errorMsg: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  // ── Buttons ──
  submitBtn: {
    height: 54,
    backgroundColor: '#1D6BFC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1D6BFC',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  // ── Success state ──
  successWrap: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 8,
  },
  successIconWrap: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#16A34A',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 12,
  },
  doneBtn: {
    height: 52,
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
});

export default VerifyCashBottomSheet;
