import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { QrCode, Clock } from 'lucide-react-native';
import { FONT_FAMILY } from '../../theme/typography';
import VerifyCashBottomSheet from './VerifyCashBottomSheet';

// ─── Component ────────────────────────────────────────────────────────────────
const SettlementSection: React.FC = () => {
  const [qrComingSoon, setQrComingSoon] = useState(false);
  const [verifySheetOpen, setVerifySheetOpen] = useState(false);

  const handleQrPress = () => {
    setQrComingSoon(true);
    setTimeout(() => setQrComingSoon(false), 3000);
  };

  return (
    <>
      {/* ── Outer card — same style as other section cards ── */}
      <View style={styles.card}>
        {/* ── Section title — top-left inside card ── */}
        <Text style={styles.sectionTitle}>SETTLEMENT & CASH SUBMISSION</Text>

        {/* ── 2 inner cards ── */}
        <View style={styles.cardsRow}>
          {/* ── Card 1: Generate QR ── */}
          <TouchableOpacity
            style={styles.qrCard}
            activeOpacity={0.85}
            onPress={handleQrPress}
          >
            {/* Icon — centered */}
            <View style={styles.iconWrap}>
              <QrCode size={26} color="#1D6BFC" strokeWidth={2} />
            </View>
            <Text style={styles.qrTitle}>Generate QR</Text>
            <Text style={styles.qrDesc}>
              Generate QR to submit manual cash amount
            </Text>
            {qrComingSoon && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ── Card 2: Outstanding Amount ── */}
          <TouchableOpacity
            style={styles.outstandingCard}
            activeOpacity={0.85}
            onPress={() => setVerifySheetOpen(true)}
          >
            {/* Icon — centered */}
            <View style={styles.iconWrap}>
              <Clock size={26} color="#1D6BFC" strokeWidth={2} />
            </View>
            <Text style={styles.outstandingTitle}>
              Outstanding{'\n'}Amount
            </Text>
            <Text style={styles.outstandingDesc}>
              View and submit your amount
            </Text>
            {/* Coming Soon — always visible on outstanding card per requirements */}
            <View style={styles.comingSoonBadgeAlt}>
              <Text style={styles.comingSoonTextAlt}>Coming Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Verify Cash Bottom Sheet ── */}
      <VerifyCashBottomSheet
        visible={verifySheetOpen}
        onClose={() => setVerifySheetOpen(false)}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Outer card (matches other section cards) ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    shadowColor: '#0A1730',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  // ── Shared inner card base ──
  // Both cards: same shadow, same border style
  qrCard: {
    flex: 1,
    backgroundColor: '#EBF2FF', // light blue (not dark blue)
    borderRadius: 16,
    padding: 16,
    alignItems: 'center', // icon centered
    shadowColor: '#1D6BFC',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#C8DEFF',
  },
  outstandingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center', // icon centered
    shadowColor: '#0A1730',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // ── Icon wrap — centered in both cards ──
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#DDEAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  // ── QR card text ──
  qrTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
    marginBottom: 5,
    textAlign: 'center',
  },
  qrDesc: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
  },
  comingSoonBadge: {
    marginTop: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },
  // ── Outstanding card text ──
  outstandingTitle: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#1D6BFC',
    marginBottom: 5,
    textAlign: 'center',
    lineHeight: 20,
  },
  outstandingDesc: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitRegular,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
  comingSoonBadgeAlt: {
    marginTop: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonTextAlt: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.outfitBold,
    color: '#DC2626',
  },
});

export default SettlementSection;
