import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import useAuthStore from '../hooks/useAuthStore';
import { OtpInput } from 'react-native-otp-entry';
import { AuthError } from '../services/auth.service';
import { FONT_FAMILY } from '../theme/typography';

interface OTPScreenProps {
  navigation: any;
}

const OTPScreen: React.FC<OTPScreenProps> = ({ navigation }) => {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [infoText, setInfoText] = useState('');
  const { user, verifyOTP, login } = useAuthStore();

  const isOtpValid = /^[0-9]{4}$/.test(otp);

  const toAuthMessage = (error: unknown): string => {
    const err = error as Partial<AuthError>;
    if (err?.isCancelled) {
      return 'Request was cancelled. Please try again.';
    }
    if (typeof err?.message === 'string' && err.message.trim().length > 0) {
      return err.message;
    }
    return 'Something went wrong. Please try again.';
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpFilled = (code: string) => {
    setOtp(code);
    if (errorText) {
      setErrorText('');
    }
    if (infoText) {
      setInfoText('');
    }
  };

  const handleVerifyOTP = async () => {
    if (!isOtpValid) {
      setErrorText('Please enter the complete 4-digit OTP.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorText('');
      setInfoText('');
      await verifyOTP(otp);
      // Auth state change will switch navigator to App stack
    } catch (error) {
      setOtp('');
      setErrorText(toAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!user?.phoneNumber) {
      setErrorText(
        'Phone number is missing. Please go back and sign in again.',
      );
      return;
    }

    try {
      setIsLoading(true);
      setErrorText('');
      setInfoText('');
      await login(user.phoneNumber);
      setTimer(60);
      setCanResend(false);
      setOtp('');
      setInfoText('A new OTP has been sent to your number.');
    } catch (error) {
      setErrorText(toAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Mask the phone number for privacy
    if (phone.length > 4) {
      return phone.slice(0, 2) + '****' + phone.slice(-2);
    }
    return phone;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.backgroundTop} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Verification</Text>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              We sent a 4-digit code to{'\n'}
              <Text style={styles.phoneNumber}>
                {user?.phoneNumber ? formatPhoneNumber(user.phoneNumber) : ''}
              </Text>
            </Text>
          </View>

          <View style={styles.otpContainer}>
            <OtpInput
              numberOfDigits={4}
              onTextChange={setOtp}
              onFilled={handleOtpFilled}
              focusColor="#0E6DFD"
              theme={{
                containerStyle: { width: '100%' },
                pinCodeContainerStyle: {
                  width: 52,
                  height: 58,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: '#D8E0EB',
                  backgroundColor: '#F8FAFD',
                },
                pinCodeTextStyle: {
                  fontSize: 20,
                  fontFamily: FONT_FAMILY.outfitExtraBold,
                  color: '#121A2B',
                },
                focusedPinCodeContainerStyle: {
                  borderColor: '#0E6DFD',
                  backgroundColor: '#FFFFFF',
                },
              }}
            />
          </View>

          {!!errorText && <Text style={styles.apiErrorText}>{errorText}</Text>}
          {!!infoText && <Text style={styles.infoText}>{infoText}</Text>}

          <TouchableOpacity
            style={[
              styles.button,
              (!isOtpValid || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleVerifyOTP}
            disabled={isLoading || !isOtpValid}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity onPress={handleResendOTP} disabled={isLoading}>
                <Text style={styles.resendText}>Resend OTP</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Change phone number</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: '#0E6DFD',
  },
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#0A1730',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    marginBottom: 26,
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageMedium,
    color: '#0E6DFD',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    lineHeight: 22,
  },
  phoneNumber: {
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#121A2B',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#0E6DFD',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0E6DFD',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9DB9E8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitExtraBold,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 22,
  },
  resendText: {
    color: '#0E6DFD',
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  timerText: {
    color: '#6B7280',
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
  },
  backButton: {
    alignItems: 'center',
  },
  backButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  apiErrorText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#B91C1C',
    backgroundColor: '#FEEDEE',
    borderWidth: 1,
    borderColor: '#F7CBCD',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#155E75',
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});

export default OTPScreen;
