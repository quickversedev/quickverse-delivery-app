import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../hooks/useAuthStore';
import { FONT_FAMILY } from '../theme/typography';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { partnerProfile, authData } = useAuthStore();

  const name = partnerProfile?.name ?? 'Delivery Partner';
  const phone = authData.phoneNumber ?? 'Unknown number';

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('') || 'DP';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Partner details</Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileImageWrap}>
          {partnerProfile?.profileImageUrl ? (
            <Image
              source={{ uri: partnerProfile.profileImageUrl }}
              style={styles.profileImage}
            />
          ) : (
            <Text style={styles.profileInitials}>{initials}</Text>
          )}
        </View>

        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileNumber}>{phone}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValueLarge}>
              {partnerProfile?.totalOrders ?? 0}
            </Text>
            <Text style={styles.statText}>Delivered</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValueLarge}>
              {partnerProfile?.orderSuccess ?? 0}
            </Text>
            <Text style={styles.statText}>Success</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValueLarge}>
              {partnerProfile?.orderFailed ?? 0}
            </Text>
            <Text style={styles.statText}>Failed</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F5FA',
  },
  content: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EAF1FF',
  },
  closeText: {
    color: '#0E6DFD',
    fontFamily: FONT_FAMILY.outfitBold,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
    marginBottom: 24,
    alignItems: 'center',
  },
  profileImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EAF1FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileInitials: {
    fontSize: 28,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#0E6DFD',
  },
  profileName: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 6,
    textAlign: 'center',
  },
  profileNumber: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#5C6980',
    marginBottom: 18,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 18,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValueLarge: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 4,
  },
  statText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
  documentsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 14,
  },
  documentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0A1730',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  documentTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bricolageBold,
    color: '#121A2B',
    marginBottom: 6,
  },
  documentSubtitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
  },
});

export default ProfileScreen;
