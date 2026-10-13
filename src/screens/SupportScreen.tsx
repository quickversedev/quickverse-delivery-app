import React, { useState } from 'react';
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
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Info,
  ShieldAlert,
  Phone,
  CarFront,
  CreditCard,
  ShoppingBag,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { FONT_FAMILY } from '../theme/typography';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type SupportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Support'>;

const SUPPORT_NUMBER = '8459418525';

const handleComingSoon = () => {
  if (Platform.OS === 'android') {
    ToastAndroid.show('Coming Soon', ToastAndroid.SHORT);
  } else {
    Alert.alert('Coming Soon', 'This feature is coming soon!');
  }
};

const FAQItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  answer: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ icon, title, answer, isExpanded, onToggle }) => {
  return (
    <View style={styles.faqItemContainer}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onToggle();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.faqHeaderLeft}>
          {icon}
          <Text style={styles.faqTitle}>{title}</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color="#64748B" />
        ) : (
          <ChevronDown size={20} color="#64748B" />
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswerContainer}>
          <Text style={styles.faqAnswer}>{answer}</Text>
        </View>
      )}
    </View>
  );
};

const SupportScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SupportScreenNavigationProp>();
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const toggleFaq = (faqId: string) => {
    if (expandedFaq === faqId) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(faqId);
    }
  };

  const handleCallSupport = () => {
    Linking.openURL(`tel:${SUPPORT_NUMBER}`).catch((err) =>
      console.error('Error opening dialer', err)
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support & SOS</Text>
        <TouchableOpacity onPress={handleComingSoon} style={styles.iconButton}>
          <Info size={24} color="#1D6BFC" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Emergency Assistance */}
        <Text style={styles.sectionTitle}>Emergency Assistance</Text>
        <View style={styles.emergencyRow}>
          {/* SOS Card */}
          <TouchableOpacity
            style={[styles.emergencyCard, styles.sosCard]}
            onPress={handleComingSoon}
            activeOpacity={0.8}
          >
            <Text style={styles.sosLogo}>SOS</Text>
            <Text style={styles.sosTitle}>SOS</Text>
            <Text style={styles.sosSubtitle}>Emergency Only</Text>
          </TouchableOpacity>

          {/* Call Police Card */}
          <TouchableOpacity
            style={[styles.emergencyCard, styles.policeCard]}
            onPress={handleComingSoon}
            activeOpacity={0.8}
          >
            <ShieldAlert size={28} color="#B91C1C" />
            <Text style={styles.policeTitle}>Call Police</Text>
            <Text style={styles.policeSubtitle}>Dial 100</Text>
          </TouchableOpacity>
        </View>

        {/* Contact Support */}
        <Text style={styles.sectionTitle}>Contact Support</Text>
        
        {/* Call Rider Support */}
        <TouchableOpacity
          style={styles.supportCard}
          onPress={handleCallSupport}
          activeOpacity={0.8}
        >
          <View style={styles.supportCardLeft}>
            <View style={[styles.supportIconWrap, { backgroundColor: '#1D6BFC' }]}>
              <Phone size={20} color="#FFFFFF" fill="#FFFFFF" />
            </View>
            <View style={styles.supportTextWrap}>
              <Text style={styles.supportTitle}>Call Rider Support</Text>
              <Text style={styles.supportSubtitle}>Available 24/7</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Report an Accident */}
        <TouchableOpacity
          style={styles.supportCard}
          onPress={handleComingSoon}
          activeOpacity={0.8}
        >
          <View style={styles.supportCardLeft}>
            <View style={[styles.supportIconWrap, { backgroundColor: '#FEE2E2' }]}>
              <CarFront size={20} color="#DC2626" />
            </View>
            <View style={styles.supportTextWrap}>
              <Text style={styles.supportTitle}>Report an Accident</Text>
              <Text style={styles.supportSubtitle}>Log incident details</Text>
            </View>
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* Quick Help / FAQs */}
        <Text style={styles.sectionTitle}>Quick Help / FAQs</Text>
        
        <View style={styles.faqListContainer}>
          <FAQItem
            icon={<CreditCard size={20} color="#1D6BFC" />}
            title="Payment Issues"
            answer="Please call on rider support for this issue okay"
            isExpanded={expandedFaq === 'payment'}
            onToggle={() => toggleFaq('payment')}
          />
          <View style={styles.faqDivider} />
          <FAQItem
            icon={<ShoppingBag size={20} color="#1D6BFC" />}
            title="Order Problems"
            answer="Please call on rider support for this issue okay"
            isExpanded={expandedFaq === 'order'}
            onToggle={() => toggleFaq('order')}
          />
        </View>

        {/* View All FAQs Button */}
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={handleComingSoon}
          activeOpacity={0.8}
        >
          <Text style={styles.viewAllText}>View All FAQs</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Same as ProfileScreen background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1E293B',
    marginBottom: 12,
    marginTop: 8,
  },
  emergencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  emergencyCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sosCard: {
    backgroundColor: '#B91C1C',
    borderColor: '#B91C1C',
    marginRight: 8,
  },
  policeCard: {
    backgroundColor: '#F1F5F9', // Light greyish background from image
    borderColor: '#E2E8F0',
    marginLeft: 8,
  },
  sosLogo: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 2,
  },
  sosTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sosSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#FCA5A5',
  },
  policeTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#B91C1C',
    marginBottom: 2,
    marginTop: 8,
  },
  policeSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#DC2626',
  },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  supportCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  supportTextWrap: {
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
    marginBottom: 2,
  },
  supportSubtitle: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  faqListContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 24,
  },
  faqItemContainer: {
    backgroundColor: '#FFFFFF',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitMedium,
    color: '#0F172A',
    marginLeft: 12,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  faqAnswerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  faqAnswer: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#475569',
    lineHeight: 20,
  },
  viewAllBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  viewAllText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
  },
});

export default SupportScreen;
