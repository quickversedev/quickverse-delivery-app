import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import useAuthStore from '../hooks/useAuthStore';
import { AuthError } from '../services/auth.service';
import { FONT_FAMILY } from '../theme/typography';
import images from '../assets/images';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [apiError, setApiError] = useState('');
  const { login } = useAuthStore();

  const digitPhone = phoneNumber.replace(/\D/g, '').slice(0, 10);
  const isPhoneValid = /^[0-9]{10}$/.test(digitPhone);

  const toAuthMessage = (error: unknown): string => {
    const err = error as Partial<AuthError>;
    if (err?.isCancelled) {
      return 'Request was cancelled. Please try again.';
    }
    if (typeof err?.message === 'string' && err.message.trim().length > 0) {
      return err.message;
    }
    return 'Failed to send OTP. Please try again.';
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(cleaned);
    if (fieldError) {
      setFieldError('');
    }
    if (apiError) {
      setApiError('');
    }
  };

  const handleLogin = async () => {
    if (!digitPhone) {
      setFieldError('Please enter your phone number.');
      return;
    }

    if (!isPhoneValid) {
      setFieldError('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      setIsLoading(true);
      setFieldError('');
      setApiError('');
      await login(digitPhone);
      navigation.navigate('OTP');
    } catch (error) {
      setApiError(toAuthMessage(error));
    } finally {
      setIsLoading(false);
    }
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
            <Text style={styles.eyebrow}>QuickVerse Transporter</Text>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Use your registered mobile number to continue.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputRow}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit number"
                placeholderTextColor="#8B97A8"
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={10}
              />
            </View>
            {!!fieldError && <Text style={styles.errorText}>{fieldError}</Text>}
            {!!apiError && <Text style={styles.apiErrorText}>{apiError}</Text>}

            <TouchableOpacity
              style={[
                styles.button,
                (!isPhoneValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading || !isPhoneValid}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms and Privacy Policy.
            </Text>
          </View>
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
  form: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bricolageMedium,
    color: '#334155',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8E0EB',
    borderRadius: 14,
    backgroundColor: '#F8FAFD',
    paddingHorizontal: 14,
  },
  countryCode: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#121A2B',
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#121A2B',
  },
  button: {
    marginTop: 18,
    backgroundColor: '#0E6DFD',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
  errorText: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#C22727',
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
  footer: {
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default LoginScreen;
