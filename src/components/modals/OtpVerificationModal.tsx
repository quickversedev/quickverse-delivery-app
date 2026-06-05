import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { OtpInput } from 'react-native-otp-entry';
import { ShieldCheck } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';

type OtpVerificationModalProps = {
  visible: boolean;
  title: string;
  message: string;
  isLoading: boolean;
  errorText: string;
  onSubmit: (otp: string) => void;
  onCancel: () => void;
};

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  title,
  message,
  isLoading,
  errorText,
  onSubmit,
  onCancel,
}) => {
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (!visible) {
      setOtp('');
    }
  }, [visible]);

  const isValid = /^[0-9]{4,6}$/.test(otp);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              <View style={styles.iconWrap}>
                <ShieldCheck size={28} color="#16A34A" strokeWidth={2.5} />
              </View>

              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.otpContainer}>
                <OtpInput
                  numberOfDigits={6}
                  onTextChange={setOtp}
                  focusColor="#1A6BFF"
                  autoFocus
                  theme={{
                    containerStyle: {gap: 12},
                    pinCodeContainerStyle: styles.otpBox,
                    pinCodeTextStyle: styles.otpText,
                    focusedPinCodeContainerStyle: styles.otpBoxFocused,
                  }}
                />
              </View>

              {errorText ? (
                <Text style={styles.errorText}>{errorText}</Text>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onCancel}
                  disabled={isLoading}
                  style={({pressed}) => [
                    styles.button,
                    styles.cancelButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => isValid && onSubmit(otp)}
                  disabled={!isValid || isLoading}
                  style={({pressed}) => [
                    styles.button,
                    styles.confirmButton,
                    (!isValid || isLoading) && styles.buttonDisabled,
                    pressed && isValid && !isLoading && styles.pressed,
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmText}>Verify</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 23, 48, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 10,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0D1526',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  otpContainer: {
    marginTop: 24,
    marginBottom: 8,
    width: '100%',
    alignItems: 'center',
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F2',
    backgroundColor: '#F8FAFD',
  },
  otpBoxFocused: {
    borderColor: '#1A6BFF',
    backgroundColor: '#FFFFFF',
  },
  otpText: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#121A2B',
  },
  errorText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#F1F5F9',
    marginTop: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 20,
  },
  button: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EFF4FF',
  },
  confirmButton: {
    backgroundColor: '#1A6BFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelText: {
    color: '#123A7A',
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  pressed: {
    opacity: 0.8,
    transform: [{scale: 0.98}],
  },
});

export default OtpVerificationModal;
