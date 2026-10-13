import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OtpInput } from 'react-native-otp-entry';
import useAuthStore from '../hooks/useAuthStore';
import { AuthError } from '../services/auth.service';
import { FONT_FAMILY } from '../theme/typography';
import { ChevronLeftIcon, ChevronRight, RotateCcw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

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

  // ── Animated values ──
  const headerY = useRef(new Animated.Value(-40)).current;
  const headerO = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(40)).current;
  const cardO = useRef(new Animated.Value(0)).current;
  const errorO = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  // Mount animation
  useEffect(() => {
    Animated.stagger(100, [
      Animated.parallel([
        Animated.spring(headerY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(headerO, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(cardY, {
          toValue: 0,
          tension: 60,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(cardO, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Error shake
  const triggerShake = () => {
    shakeX.setValue(0);
    Animated.sequence([
      Animated.timing(shakeX, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: -6,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeX, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (errorText) {
      triggerShake();
      Animated.timing(errorO, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(errorO, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [errorText]);

  const isOtpValid = /^[0-9]{4}$/.test(otp);

  const formatPhoneNumber = (phone: string) => phone;

  const handleVerifyOTP = async () => {
    if (!isOtpValid) {
      setErrorText('Please enter the complete 4-digit OTP.');
      return;
    }
    try {
      setIsLoading(true);
      setErrorText('');
      await verifyOTP(otp);
    } catch (error) {
      setOtp('');
      setErrorText(
        (error as AuthError)?.message || 'Invalid OTP. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!user?.phoneNumber) return;
    try {
      setIsLoading(true);
      setErrorText('');
      await login(user.phoneNumber);
      setTimer(60);
      setCanResend(false);
      setInfoText('A new OTP has been sent.');
      setTimeout(() => setInfoText(''), 3000);
    } catch (error) {
      setErrorText('Failed to resend. Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePressIn = () =>
    Animated.spring(buttonScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  const handlePressOut = () =>
    Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: '#F8FAFC' }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1A6BFF"
        translucent
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.flex}>
            {/* ── Hero Blue Band ── */}
            <View style={styles.heroBand}>
              {/* Decorative circles */}
              <View style={[styles.circle, styles.circleL]} />
              <View style={[styles.circle, styles.circleR]} />

              {/* ── Back Button ── */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <ChevronLeftIcon color="#FFF" />
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.heroContent,
                  { opacity: headerO, transform: [{ translateY: headerY }] },
                ]}
              >
                {/* Logo row */}
                <View style={styles.logoRow}>
                  <View style={styles.logoIcon}>
                    <Text style={styles.logoIconText}>QV</Text>
                  </View>
                  <Text style={styles.logoLabel}>QuickVerse Transporter</Text>
                </View>

                {/* Title row — text left, 3D shield right */}
                <View style={styles.titleShieldRow}>
                  <View style={styles.titleBlock}>
                    <Text style={styles.heroTitle}>Verification</Text>
                    <Text style={styles.heroSubtitle}>
                      Enter the code sent to{' '}
                      {formatPhoneNumber(user?.phoneNumber || '')}
                    </Text>
                  </View>

                  {/* 3D Shield + Lock decorative cluster */}
                  <View style={styles.shieldCluster}>
                    {/* Sparkles */}
                    <Text style={styles.sparkle1}>✦</Text>
                    <Text style={styles.sparkle2}>✦</Text>
                    <Text style={styles.sparkle3}>✦</Text>

                    {/* Shield */}
                    <View style={styles.shield3d}>
                      <View style={styles.shieldInner}>
                        <Text style={styles.shieldCheck}>✓</Text>
                      </View>
                    </View>

                    {/* Lock badge */}
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockEmoji}>🔒</Text>
                    </View>
                  </View>
                </View>
              </Animated.View>
            </View>

            {/* ── Floating Card ── */}
            <View style={styles.cardWrapper}>
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: cardO,
                    transform: [{ translateY: cardY }, { translateX: shakeX }],
                  },
                ]}
              >
                {/* Card header — envelope icon + title */}
                <View style={styles.sectionHeader}>
                  <View style={styles.envelopeCircle}>
                    <Text style={styles.envelopeEmoji}>✉️</Text>
                  </View>
                  <View style={styles.sectionTextBlock}>
                    <Text style={styles.sectionLabel}>4-Digit OTP</Text>
                    <Text style={styles.sectionHint}>
                      Please enter the verification code to continue.
                    </Text>
                  </View>
                </View>

                {/* ── OTP Boxes ── */}
                <View style={styles.otpWrapper}>
                  <OtpInput
                    numberOfDigits={4}
                    onTextChange={text => {
                      setOtp(text);
                      if (errorText) setErrorText('');
                    }}
                    focusColor="#1A6BFF"
                    theme={{
                      containerStyle: styles.otpContainer,
                      pinCodeContainerStyle: styles.otpBox,
                      pinCodeTextStyle: styles.otpText,
                      focusedPinCodeContainerStyle: styles.otpBoxFocused,
                    }}
                  />
                </View>

                {/* Error Box */}
                {!!errorText && (
                  <Animated.View style={[styles.errorBox, { opacity: errorO }]}>
                    <Text style={styles.errorIcon}>⚠</Text>
                    <Text style={styles.errorText}>{errorText}</Text>
                  </Animated.View>
                )}

                {/* Info Box */}
                {!!infoText && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxText}>{infoText}</Text>
                  </View>
                )}

                {/* ── Verify & Proceed Button ── */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      (!isOtpValid || isLoading) && styles.buttonDisabled,
                    ]}
                    onPress={handleVerifyOTP}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading || !isOtpValid}
                    activeOpacity={0.9}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>Verify & Proceed</Text>
                        <Text style={styles.buttonArrow}>→</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                {/* ── "or" Divider ── */}
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.orLine} />
                </View>

                {/* ── Resend Row — gray pill button ── */}
                {canResend ? (
                  <TouchableOpacity
                    style={styles.resendPill}
                    onPress={handleResendOTP}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={16} />
                    <Text style={styles.resendPillTextActive}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.resendPill}>
                    <RotateCcw size={16} />
                    <Text style={styles.resendPillText}>
                      Resend code in{' '}
                      <Text style={styles.resendPillTimer}>{timer}s</Text>
                    </Text>
                  </View>
                )}

                {/* ── Change Phone Number Row ── */}
                <TouchableOpacity
                  style={styles.changePhoneRow}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.8}
                >
                  <View style={styles.phoneCircle}>
                    <Text style={styles.phoneCircleEmoji}>📞</Text>
                  </View>
                  <Text style={styles.changePhoneText}>
                    Change Phone Number
                  </Text>
                  <ChevronRight size={16} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1A6BFF',
  },
  flex: {
    flex: 1,
    backgroundColor: '#F0F4FB',
  },

  // ── Hero Band ──
  heroBand: {
    backgroundColor: '#1A6BFF',
    paddingTop: 12,
    paddingBottom: 72, // extra so card overlaps
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    // NO overflow:hidden — card must float on top without clipping
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  circleL: { width: 200, height: 200, top: -70, left: -60 },
  circleR: { width: 150, height: 150, bottom: -50, right: -30 },

  // ── Back Button ──
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(10,20,60,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    fontFamily: FONT_FAMILY.bricolageBold,
    marginTop: -2,
  },

  heroContent: { zIndex: 1 },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoIconText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoLabel: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: 'rgba(255,255,255,0.9)',
  },

  // Title + Shield side by side
  titleShieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },

  // ── 3D Shield Cluster ──
  shieldCluster: {
    width: 120,
    height: 120,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -10,
  },
  sparkle1: {
    position: 'absolute',
    top: 2,
    right: 18,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  sparkle2: {
    position: 'absolute',
    top: 28,
    left: 4,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
  },
  sparkle3: {
    position: 'absolute',
    bottom: 20,
    right: 4,
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
  },
  shield3d: {
    width: 82,
    height: 90,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    // Shield pentagon shape via borderRadius asymmetry
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  shieldInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheck: {
    fontSize: 24,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 15,
  },

  // ── Card Wrapper ──
  cardWrapper: {
    paddingHorizontal: 16,
    marginTop: -40,
    zIndex: 10,
  },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 26,
    shadowColor: '#0A1730',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 10,
  },

  // Card header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 22,
    gap: 14,
  },
  envelopeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  envelopeEmoji: { fontSize: 22 },
  sectionTextBlock: { flex: 1, paddingTop: 2 },
  sectionLabel: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#7A8699',
    lineHeight: 19,
  },

  // ── OTP Boxes ──
  otpWrapper: {
    marginBottom: 6,
  },
  otpContainer: {
    gap: 12,
  },
  otpBox: {
    width: (width - 32 - 44 - 36) / 4, // full card width divided evenly
    height: 64,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F2',
    backgroundColor: '#F8FAFD',
  },
  otpBoxFocused: {
    borderColor: '#1A6BFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A6BFF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  otpText: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#121A2B',
  },

  // ── Error Box ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  errorIcon: { fontSize: 13, color: '#E11D48', marginTop: 1 },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#BE123C',
    lineHeight: 18,
  },

  // ── Info Box ──
  infoBox: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  infoBoxText: {
    color: '#0369A1',
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    textAlign: 'center',
  },

  // ── Button ──
  button: {
    marginTop: 20,
    backgroundColor: '#1A6BFF',
    borderRadius: 16,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#1A6BFF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#C5D8F8',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    letterSpacing: 0.3,
  },
  buttonArrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 20,
    fontFamily: FONT_FAMILY.outfitRegular,
  },

  // ── "or" Divider ──
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEF2F8',
  },
  orText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
  },

  // ── Resend Pill ──
  resendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  resendPillIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  resendPillText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
  },
  resendPillTimer: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#1A6BFF',
  },
  resendPillTextActive: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1A6BFF',
  },

  // ── Change Phone Number Row ──
  changePhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  phoneCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneCircleEmoji: { fontSize: 16 },
  changePhoneText: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1A6BFF',
  },
  changePhoneChevron: {
    fontSize: 20,
    color: '#1A6BFF',
    fontFamily: FONT_FAMILY.outfitRegular,
  },
});

export default OTPScreen;
