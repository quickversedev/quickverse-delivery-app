import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  ToastAndroid,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Star,
  Bike,
  ThumbsUp,
  Settings,
  HelpCircle,
  Gift,
  ChevronRight,
  BadgeCheck,
  LogOut,
  ClipboardList,
} from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import useAuthStore from '../hooks/useAuthStore';
import { FONT_FAMILY } from '../theme/typography';
import LogoutConfirmationModal from '../components/modals/LogoutConfirmationModal';
import NotificationSettingsModal from '../components/modals/NotificationSettingsModal';
import CustomToast from '../components/ui/CustomToast';

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { partnerProfile, authData, refreshPartnerProfile, logout } = useAuthStore();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = React.useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = React.useState(false);
  const [toastConfig, setToastConfig] = React.useState({ visible: false, message: '' });

  useEffect(() => {
    // Refresh profile in background to get latest stats/verification status
    refreshPartnerProfile();
  }, [refreshPartnerProfile]);

  const name = partnerProfile?.name ?? 'Delivery Partner';
  const phone = partnerProfile?.mobileNumber 
    ? `+${partnerProfile.mobileNumber}` 
    : (authData.phoneNumber ?? 'Unknown number');
  const isVerified = partnerProfile?.isVerified ?? false;
  
  const rating = partnerProfile?.rating ?? 0.0;
  const deliveries = partnerProfile?.totalOrders ?? 0;
  const acceptance = partnerProfile?.acceptanceRate ?? 0;

  const handleComingSoon = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show('Coming Soon', ToastAndroid.SHORT);
    } else {
      Alert.alert('Coming Soon', 'This feature is coming soon!');
    }
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  const handleSaveNotificationSettings = () => {
    setToastConfig({ visible: true, message: 'Notification Updated' });
    // Refresh profile in background to sync settings if needed
    refreshPartnerProfile();
  };

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('') || 'DP';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top Sky Background Gradient ── */}
        <View style={styles.topSkyBackground}>
          <Svg height="100%" width="100%">
            <Defs>
              <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#E0F2FE" stopOpacity="1" />
                <Stop offset="0.6" stopColor="#F0F9FF" stopOpacity="1" />
                <Stop offset="1" stopColor="#F8FAFC" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
          </Svg>
        </View>

        {/* ── Navbar ── */}
        <View style={[styles.navbar, { paddingTop: insets.top + 16 }]}>
          <View style={styles.navLeft}>
            <View style={styles.navAvatarWrap}>
              {partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.navAvatar}
                />
              ) : (
                <View style={styles.navInitialsBox}>
                  <Text style={styles.navInitialsText}>{initials[0]}</Text>
                </View>
              )}
            </View>
            <Text style={styles.navTitle}>Hello, Captain!</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={handleComingSoon}>
            <Bell size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* ── Main Profile Detail ── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              {partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitials}>{initials[0]}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.nameRow}>
            <Text style={styles.profileName}>{name}</Text>
            {isVerified && (
              <BadgeCheck size={20} color="#1D6BFC" fill="#FFFFFF" style={{ marginLeft: 6 }} />
            )}
          </View>
          
          <Text style={styles.phoneText}>{phone}</Text>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          {/* Rating */}
          <View style={styles.statBox}>
            <Star size={24} color="#F5A623" fill="#F5A623" style={styles.statIcon} />
            <Text style={styles.statValue}>{rating > 0 ? rating.toFixed(1) : '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          
          {/* Deliveries */}
          <View style={styles.statBox}>
            <Bike size={24} color="#16A34A" style={styles.statIcon} />
            <Text style={styles.statValue}>{deliveries > 0 ? `${deliveries}+` : '0'}</Text>
            <Text style={styles.statLabel}>Deliveries</Text>
          </View>
          
          {/* Acceptance */}
          <View style={styles.statBox}>
            <ThumbsUp size={24} color="#1D6BFC" fill="#1D6BFC" style={styles.statIcon} />
            <Text style={styles.statValue}>{acceptance}%</Text>
            <Text style={styles.statLabel}>Acceptance</Text>
          </View>
        </View>

        {/* ── Menu Options ── */}
        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('OrderHistory')} activeOpacity={0.8}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <ClipboardList size={20} color="#475569" />
              </View>
              <Text style={styles.menuItemText}>Order History</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setIsNotificationModalVisible(true)} 
            activeOpacity={0.8}
          >
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Settings size={20} color="#475569" />
              </View>
              <Text style={styles.menuItemText}>Notification Settings</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Support')} activeOpacity={0.8}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <HelpCircle size={20} color="#475569" />
              </View>
              <Text style={styles.menuItemText}>Support & Help</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ReferAndEarn')} activeOpacity={0.8}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#F1F5F9' }]}>
                <Gift size={20} color="#475569" />
              </View>
              <Text style={styles.menuItemText}>Refer & Earn</Text>
            </View>
            <ChevronRight size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        
        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setIsLogoutModalVisible(true)}
          activeOpacity={0.8}
        >
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

          <LogoutConfirmationModal
            visible={isLogoutModalVisible}
            onCancel={() => setIsLogoutModalVisible(false)}
            onConfirm={handleConfirmLogout}
          />
          
          <NotificationSettingsModal
            visible={isNotificationModalVisible}
            onClose={() => setIsNotificationModalVisible(false)}
            onSaveSuccess={handleSaveNotificationSettings}
          />
        </View>
      </ScrollView>

      <CustomToast
        visible={toastConfig.visible}
        message={toastConfig.message}
        onHide={() => setToastConfig({ visible: false, message: '' })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  /* Top Sky Background */
  topSkyBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280, // Extended height slightly for a smoother fade
  },
  
  /* Navbar */
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  navAvatar: {
    width: '100%',
    height: '100%',
  },
  navInitialsBox: {
    flex: 1,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navInitialsText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#F8FAFC',
  },
  navTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },
  bellBtn: {
    padding: 6,
  },
  
  /* Main Scroll Content */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
  },

  /* Profile Details Section */
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 16,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 36,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#64748B',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  profileName: {
    fontSize: 22,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
  },
  phoneText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0F172A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },

  /* Menu Section */
  menuSection: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#0F172A',
  },

  /* Logout Button */
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },
});

export default ProfileScreen;
