import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import useAuthStore from '../hooks/useAuthStore';
import deliveryPartnerService from '../services/delivery-partner.service';
import LogoutIcon from '../assets/icons/LogoutIcon';
import { FONT_FAMILY } from '../theme/typography';

type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
};

const HomeScreen: React.FC = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { partnerProfile, isPartnerLoading, logout, authData } = useAuthStore();
  const [isOnline, setIsOnline] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders'>(
    'dashboard',
  );

  useEffect(() => {
    if (typeof partnerProfile?.isOnline === 'boolean') {
      setIsOnline(partnerProfile.isOnline);
    }
  }, [partnerProfile]);

  const partnerId = partnerProfile?.id || authData.partnerId || '';

  const handleToggleOnline = async () => {
    if (!partnerId) {
      Alert.alert('Partner ID missing', 'Unable to update online status.');
      return;
    }

    const nextStatus = !isOnline;
    setIsToggling(true);

    try {
      await deliveryPartnerService.toggleDeliveryPartnerOnlineStatus(
        partnerId,
        nextStatus,
      );
      setIsOnline(nextStatus);
    } catch (error) {
      console.error('Toggle online status failed', error);
      Alert.alert(
        'Status update failed',
        'Unable to switch your online status. Please try again.',
      );
    } finally {
      setIsToggling(false);
    }
  };

  const partnerName = partnerProfile?.name || 'Delivery Partner';
  const stats = [
    {
      label: 'Completed Orders',
      value: String(partnerProfile?.orderSuccess ?? 0),
      accent: '#16A34A',
    },
    {
      label: 'Failed Orders',
      value: String(partnerProfile?.orderFailed ?? 0),
      accent: '#DC2626',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />
      <View style={styles.content}>
        <View style={styles.customHeader}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Home</Text>
            <Text style={styles.headerSubtitle}>Your dashboard</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerLogoutButton}
              onPress={logout}
              activeOpacity={0.8}
            >
              <LogoutIcon size={16} color="#0E6DFD" />
              <Text style={styles.headerLogoutText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              style={styles.headerAvatarWrap}
              activeOpacity={0.8}
            >
              {isPartnerLoading ? (
                <Text style={styles.headerAvatarLoading}>...</Text>
              ) : partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.headerAvatarImage}
                />
              ) : (
                <Text style={styles.headerAvatarFallback}>
                  {partnerName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(part => part[0]?.toUpperCase())
                    .join('') || 'DP'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusBar}>
          <View
            style={[
              styles.statusBadge,
              isOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isOnline ? styles.statusOnlineText : styles.statusOfflineText,
              ]}
            >
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </Text>
          </View>
          <View style={styles.statusSwitchWrap}>
            <Text style={styles.switchLabel}>
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              disabled={isToggling}
              trackColor={{ false: '#D1D5DB', true: '#34D399' }}
              thumbColor={isOnline ? '#10B981' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'dashboard' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('dashboard')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'dashboard' && styles.tabButtonTextActive,
              ]}
            >
              Dashboard
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'orders' && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'orders' && styles.tabButtonTextActive,
              ]}
            >
              Orders
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'dashboard' ? (
          <>
            <Text style={styles.eyebrow}>Transporter account</Text>
            <Text style={styles.title}>Welcome back {partnerName}</Text>
            <Text style={styles.subtitle}>
              Here is your delivery summary for today.
            </Text>

            <View style={styles.grid}>
              {stats.map(stat => (
                <View key={stat.label} style={styles.statCard}>
                  <View
                    style={[
                      styles.statAccent,
                      { backgroundColor: stat.accent },
                    ]}
                  />
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.ordersTab}>
            <Text style={styles.sectionTitle}>Orders</Text>
            <Text style={styles.sectionText}>
              Here is where your order list will appear.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  backgroundGlowOne: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(14, 109, 253, 0.14)',
  },
  backgroundGlowTwo: {
    position: 'absolute',
    bottom: 50,
    left: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(17, 24, 39, 0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#EAF1FF',
  },
  headerLogoutText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
  },
  headerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  headerAvatarFallback: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0E6DFD',
  },
  headerAvatarLoading: {
    fontSize: 12,
    color: '#0E6DFD',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.outfitBold,
  },
  statusOnline: {
    backgroundColor: '#ECFDF5',
  },
  statusOffline: {
    backgroundColor: '#F8FAFC',
  },
  statusOnlineText: {
    color: '#047857',
  },
  statusOfflineText: {
    color: '#475569',
  },
  statusSwitchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#0E6DFD',
    marginRight: 12,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 6,
    gap: 8,
    marginBottom: 20,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
  },
  tabButtonActive: {
    backgroundColor: '#0E6DFD',
  },
  tabButtonText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitExtraBold,
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  ordersTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  eyebrow: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bricolageMedium,
    color: '#0E6DFD',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    lineHeight: 24,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  statAccent: {
    width: 38,
    height: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#5C6980',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  sectionCard: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    lineHeight: 20,
  },
});

export default HomeScreen;
