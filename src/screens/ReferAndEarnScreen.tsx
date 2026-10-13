import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ToastAndroid,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Gift, Copy, Share2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
// import Clipboard from '@react-native-clipboard/clipboard';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FONT_FAMILY } from '../theme/typography';

type ReferAndEarnScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ReferAndEarn'
>;

const APP_PLAY_STORE_LINK = 'market://details?id=com.qvtransportersappui';
const REFERRAL_CODE = 'CAPTAIN100'; // Hardcoded for now based on the image

const ReferAndEarnScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<ReferAndEarnScreenNavigationProp>();

  const handleCopyCode = () => {
    // Clipboard.setString(REFERRAL_CODE);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
      Alert.alert('Success', 'Copied to clipboard');
    }
  };

  const handleShareLink = () => {
    Linking.openURL(APP_PLAY_STORE_LINK).catch(err =>
      console.error('Error opening Play Store', err),
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.giftCircle}>
            <Gift size={48} color="#1D6BFC" strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>
            Earn ₹100 for every Captain you bring on board!
          </Text>
          <Text style={styles.heroSubtitle}>
            Get rewarded when your referred friend completes 1 month of active
            deliveries.
          </Text>
        </View>

        {/* Code Section */}
        <View style={styles.codeCard}>
          <Text style={styles.codeCardTitle}>Your Unique Referral Code</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{REFERRAL_CODE}</Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopyCode}
              activeOpacity={0.7}
            >
              <Copy size={16} color="#1D6BFC" />
              <Text style={styles.copyText}>COPY</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShareLink}
          activeOpacity={0.8}
        >
          <Share2 size={20} color="#FFFFFF" style={styles.shareIcon} />
          <Text style={styles.shareBtnText}>Share Referral Link</Text>
        </TouchableOpacity>

        {/* How it works */}
        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>How it works</Text>
          <View style={styles.howItWorksDivider} />

          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>Share your code</Text>
              <Text style={styles.stepSubtitle}>
                Send your unique code or link to your friends via WhatsApp, SMS,
                or any other app.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>They join as a Captain</Text>
              <Text style={styles.stepSubtitle}>
                Your friend signs up using your code and completes their
                onboarding.
              </Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepTextWrap}>
              <Text style={styles.stepTitle}>You get rewarded</Text>
              <Text style={styles.stepSubtitle}>
                Receive ₹100 in your earnings wallet after their active 1 month.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  iconButton: {
    padding: 4,
  },
  headerPlaceholder: {
    width: 32,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  giftCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#004DB3', // Darker blue to match image
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 30,
    paddingHorizontal: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  codeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  codeCardTitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#475569',
    marginBottom: 10,
  },
  codeBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9', // Light bluish grey tint
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#0F172A',
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
    marginLeft: 6,
  },
  shareBtn: {
    backgroundColor: '#004DB3',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  shareIcon: {
    marginRight: 8,
  },
  shareBtnText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
  },
  howItWorksCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 40,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 16,
  },
  howItWorksDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    marginTop: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#1E293B',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    lineHeight: 18,
  },
});

export default ReferAndEarnScreen;
