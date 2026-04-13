import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FONT_FAMILY } from '../theme/typography';

const HomeScreen: React.FC = () => {
  const { partnerProfile, isPartnerLoading } = useAuth();

  const partnerName = partnerProfile?.name || 'Delivery Partner';
  const stats = [
    {
      label: 'Total Delivered Orders',
      value: String(partnerProfile?.totalOrders ?? 0),
      accent: '#0E6DFD',
    },
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
    {
      label: 'Earnings',
      value:
        typeof partnerProfile?.earnings === 'number'
          ? `₹${partnerProfile.earnings}`
          : 'Coming soon',
      accent: '#F59E0B',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlowOne} />
      <View style={styles.backgroundGlowTwo} />
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Transporter account</Text>
        <Text style={styles.title}>Welcome back {partnerName}</Text>
        <Text style={styles.subtitle}>
          Here is your delivery summary for today.
        </Text>

        <View style={styles.grid}>
          {stats.map(stat => (
            <View key={stat.label} style={styles.statCard}>
              <View style={[styles.statAccent, { backgroundColor: stat.accent }]} />
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ongoing Orders</Text>
          <Text style={styles.sectionText}>
            We will render the ongoing orders list here next.
          </Text>
        </View>
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
    marginTop: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
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
    fontFamily: FONT_FAMILY.outfitMedium,
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
