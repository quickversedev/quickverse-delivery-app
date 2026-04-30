import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Phone,
  Package,
  CheckCircle2,
  XCircle,
  LogOut,
  X,
  Sparkles,
} from 'lucide-react-native';

import useAuthStore from '../hooks/useAuthStore';
import { FONT_FAMILY } from '../theme/typography';
import LogoutConfirmationModal from '../components/modals/LogoutConfirmationModal';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { partnerProfile, authData, logout } = useAuthStore();
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const name = partnerProfile?.name ?? 'Delivery Partner';
  const phone = authData.phoneNumber ?? 'Unknown number';

  const handleConfirmLogout = async () => {
    setIsLogoutModalVisible(false);
    await logout();
  };

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('') || 'DP';

  const totalOrders = partnerProfile?.totalOrders ?? 0;
  const orderSuccess = partnerProfile?.orderSuccess ?? 0;
  const orderFailed = partnerProfile?.orderFailed ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header Row ── */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Partner details</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
          activeOpacity={0.8}
        >
          <Text style={styles.closeText}>Close</Text>
          <X size={18} color="#1A6BFF" strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Main Profile Card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatarSection}>
          {/* Dot Grids */}
          <View style={styles.dotGridLeft}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={`dl-${i}`} style={styles.dot} />
            ))}
          </View>
          <View style={styles.dotGridRight}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={`dr-${i}`} style={styles.dot} />
            ))}
          </View>

          {/* Sparkle Icons (Lucide) */}
          <View style={styles.sparkleTopLeft}>
            <Sparkles size={16} color="#93C5FD" fill="#93C5FD" />
          </View>
          <View style={styles.sparkleBottomLeft}>
            <Sparkles size={12} color="#93C5FD" fill="#93C5FD" />
          </View>
          <View style={styles.sparkleTopRight}>
            <Sparkles size={14} color="#93C5FD" fill="#93C5FD" />
          </View>

          <View style={styles.avatarRing}>
            <View style={styles.avatarInner}>
              {partnerProfile?.profileImageUrl ? (
                <Image
                  source={{ uri: partnerProfile.profileImageUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.profileName}>{name}</Text>

        <View style={styles.phonePill}>
          <Phone size={14} color="#1A6BFF" strokeWidth={2.5} />
          <Text style={styles.phonePillText}>{phone}</Text>
        </View>

        <View style={styles.cardDivider} />

        {/* ── Stats Tiles ── */}
        <View style={styles.statsContainer}>
          {/* Delivered */}
          <View style={[styles.statTile, { backgroundColor: '#F0F6FF' }]}>
            <View style={styles.statIconBgWhite}>
              <Package size={20} color="#1A6BFF" />
            </View>
            <Text style={[styles.statValue, { color: '#1A6BFF' }]}>
              {totalOrders}
            </Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>

          {/* Success */}
          <View style={[styles.statTile, { backgroundColor: '#F0FDF4' }]}>
            <View style={styles.statIconBgWhite}>
              <CheckCircle2 size={20} color="#22C55E" />
            </View>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>
              {orderSuccess}
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>

          {/* Failed */}
          <View style={[styles.statTile, { backgroundColor: '#FEF2F2' }]}>
            <View style={styles.statIconBgWhite}>
              <XCircle size={20} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>
              {orderFailed}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </View>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => setIsLogoutModalVisible(true)}
        activeOpacity={0.8}
      >
        <LogOut size={20} color="#1A6BFF" strokeWidth={2.5} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <LogoutConfirmationModal
        visible={isLogoutModalVisible}
        onCancel={() => setIsLogoutModalVisible(false)}
        onConfirm={handleConfirmLogout}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0D1526',
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#7A8699',
    marginTop: -4,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF2FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  closeText: {
    color: '#1A6BFF',
    fontFamily: FONT_FAMILY.outfitBold,
    fontSize: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#F0F4FB',
    padding: 6,
    backgroundColor: '#FFF',
  },
  avatarInner: {
    flex: 1,
    borderRadius: 65,
    backgroundColor: '#E8EEF8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#1A6BFF',
  },
  dotGridLeft: {
    position: 'absolute',
    left: 10,
    top: '40%',
    width: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    opacity: 0.2,
  },
  dotGridRight: {
    position: 'absolute',
    right: 10,
    top: '40%',
    width: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    opacity: 0.2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1A6BFF',
  },
  sparkleTopLeft: { position: 'absolute', left: 50, top: 10 },
  sparkleBottomLeft: { position: 'absolute', left: 55, bottom: 0 },
  sparkleTopRight: { position: 'absolute', right: 50, top: 10 },
  profileName: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0D1526',
    textAlign: 'center',
    marginBottom: 12,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#F0F6FF',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 8,
    marginBottom: 24,
  },
  phonePillText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: FONT_FAMILY.outfitRegular,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBgWhite: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    // Subtle shadow for the icon circle
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF2FF',
    marginTop: 24,
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  logoutText: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1A6BFF',
  },
});

export default ProfileScreen;
